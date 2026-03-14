#!/bin/bash
set -e

# --- Configuration ---
# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

LOG_FILE="deploy.log"

# --- Helper Functions ---
log() {
    local level=$1
    local message=$2
    local timestamp=$(date "+%Y-%m-%d %H:%M:%S")
    local color=$NC
    
    case $level in
        "INFO") color=$BLUE ;;
        "SUCCESS") color=$GREEN ;;
        "WARN") color=$YELLOW ;;
        "ERROR") color=$RED ;;
    esac

    echo -e "${color}[${timestamp}] [${level}] ${message}${NC}"
    echo "[${timestamp}] [${level}] ${message}" >> "$LOG_FILE"
}

# Determine SUDO usage
SUDO=""
if [ "$(id -u)" -ne 0 ]; then
  if command -v sudo >/dev/null 2>&1; then
    SUDO="sudo"
  fi
fi

# --- 1. Environment Check ---
log "INFO" "Checking system dependencies..."

# Check Docker
if ! command -v docker >/dev/null 2>&1; then
  log "WARN" "Docker not found. Installing..."
  curl -fsSL https://get.docker.com | sh
  if [ -n "${SUDO}" ]; then
    $SUDO usermod -aG docker "$USER"
    log "WARN" "Added user to docker group. You may need to re-login."
  fi
else
  log "INFO" "Docker is installed."
fi

# Check Docker Compose
COMPOSE_CMD="docker compose"
if ! docker compose version >/dev/null 2>&1; then
  if command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD="docker-compose"
  else
    log "WARN" "Docker Compose plugin not found. Installing..."
    if command -v apt-get >/dev/null 2>&1; then
        $SUDO apt-get update -y
        $SUDO apt-get install -y docker-compose-plugin
    else
        log "ERROR" "Cannot install docker-compose-plugin automatically. Please install it manually."
        exit 1
    fi
  fi
fi
log "INFO" "Using compose command: $COMPOSE_CMD"

# Check OpenSSL
if ! command -v openssl >/dev/null 2>&1; then
    log "WARN" "OpenSSL not found. Installing..."
    if command -v apt-get >/dev/null 2>&1; then
        $SUDO apt-get update -y
        $SUDO apt-get install -y openssl
    fi
fi

# --- 1.5. Configure Docker Registry Mirrors (Hong Kong friendly, auto-select) ---
log "INFO" "Configuring Docker registry mirrors (auto-select reachable mirror)..."

MIRROR_FILE="/etc/docker/daemon.json"
MIRROR_CANDIDATES=("https://mirror.ccs.tencentyun.com" "https://docker.mirrors.ustc.edu.cn" "https://hub-mirror.c.163.com" "https://f1361db2.m.daocloud.io")
SELECTED_MIRROR=""

write_docker_config() {
  local mirror="$1"
  if [ -n "$mirror" ]; then
    MIRROR_JSON=$(cat <<JSON
{
  "registry-mirrors": ["$mirror"],
  "dns": ["8.8.8.8", "1.1.1.1"]
}
JSON
)
  else
    MIRROR_JSON=$(cat <<JSON
{
  "dns": ["8.8.8.8", "1.1.1.1"]
}
JSON
)
  fi
  echo "$MIRROR_JSON" | ${SUDO:+$SUDO }tee "$MIRROR_FILE" >/dev/null
}

restart_docker() {
  ${SUDO:+$SUDO }systemctl daemon-reload || true
  ${SUDO:+$SUDO }systemctl restart docker || true
}

for m in "${MIRROR_CANDIDATES[@]}"; do
  if curl -I --connect-timeout 5 --max-time 8 "$m" >/dev/null 2>&1; then
    SELECTED_MIRROR="$m"
    break
  fi
done

if [ -n "$SELECTED_MIRROR" ]; then
  log "INFO" "Selected mirror: $SELECTED_MIRROR"
  if [ -w "/etc/docker" ] || [ -n "${SUDO}" ]; then
    write_docker_config "$SELECTED_MIRROR"
    restart_docker
    log "INFO" "Docker mirror & DNS updated, daemon restarted."
  else
    log "WARN" "Insufficient permission to update Docker mirrors. Skipping."
  fi
else
  log "WARN" "No mirror reachable from this server. Using default DockerHub."
fi

# --- 2. Configuration Setup ---
log "INFO" "Configuring environment variables..."

if [ -f ".env" ]; then
  set -a
  . ./.env
  set +a
fi

# Detect free ports for frontend/backend
is_port_in_use() {
  local port="$1"
  (ss -tuln 2>/dev/null || netstat -tuln 2>/dev/null) | grep -qE "[.:]${port}\s" || \
  lsof -iTCP -sTCP:LISTEN -P 2>/dev/null | grep -q ":${port}"
}

is_valid_port() {
  local port="$1"
  [[ "$port" =~ ^[0-9]+$ ]] && [ "$port" -ge 1 ] && [ "$port" -le 65535 ]
}

is_ipv4() {
  local ip="$1"
  [[ "$ip" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]]
}

pick_port() {
  local candidates=("$@")
  for p in "${candidates[@]}"; do
    if ! is_port_in_use "$p"; then
      echo "$p"
      return 0
    fi
  done
  echo "${candidates[-1]}"
}

FRONTEND_PORT="${FRONTEND_PORT:-$(pick_port 8080 8888 18080)}"
BACKEND_PORT="${BACKEND_PORT:-$(pick_port 3001 3002 13001)}"
if ! is_valid_port "$FRONTEND_PORT" || is_port_in_use "$FRONTEND_PORT"; then
  FRONTEND_PORT="$(pick_port 8080 18080)"
  log "WARN" "Frontend port in use; switched to ${FRONTEND_PORT}"
fi
if ! is_valid_port "$BACKEND_PORT" || is_port_in_use "$BACKEND_PORT"; then
  BACKEND_PORT="$(pick_port 3001 3002 13001)"
  log "WARN" "Backend port in use; switched to ${BACKEND_PORT}"
fi

# Optional host IP binding (default 0.0.0.0). Prevent accidental IP set into PORT.
FRONTEND_HOST="${FRONTEND_HOST:-0.0.0.0}"
BACKEND_HOST="${BACKEND_HOST:-0.0.0.0}"
if ! is_ipv4 "$FRONTEND_HOST"; then FRONTEND_HOST="0.0.0.0"; fi
if ! is_ipv4 "$BACKEND_HOST"; then BACKEND_HOST="0.0.0.0"; fi

FRONTEND_BIND="${FRONTEND_HOST}:${FRONTEND_PORT}:80"
BACKEND_BIND="${BACKEND_HOST}:${BACKEND_PORT}:3001"

# Configure reverse proxy on port 80 if nginx present
configure_reverse_proxy() {
  local fe_port="$1"
  local be_port="$2"
  local conf_path=""
  if command -v nginx >/dev/null 2>&1; then
    if [ -d "/www/server/nginx/conf/vhost" ]; then
      conf_path="/www/server/nginx/conf/vhost/hvh.conf"
    elif [ -d "/www/server/panel/vhost/nginx" ]; then
      conf_path="/www/server/panel/vhost/nginx/hvh.conf"
    elif [ -d "/etc/nginx/conf.d" ]; then
      conf_path="/etc/nginx/conf.d/hvh.conf"
    else
      conf_path="/etc/nginx/sites-available/hvh.conf"
      ${SUDO:+$SUDO }mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled || true
      ${SUDO:+$SUDO }ln -sf /etc/nginx/sites-available/hvh.conf /etc/nginx/sites-enabled/hvh.conf || true
    fi
    cat <<NGINX | ${SUDO:+$SUDO }tee "$conf_path" >/dev/null
server {
  listen 80;
  server_name _;
  location / {
    proxy_pass http://127.0.0.1:${fe_port};
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
  }
  location /api/ {
    proxy_pass http://127.0.0.1:${be_port}/;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
  }
  location /uploads/ {
    proxy_pass http://127.0.0.1:${be_port}/uploads/;
  }
}
NGINX
    ${SUDO:+$SUDO }nginx -t && ${SUDO:+$SUDO }systemctl reload nginx || ${SUDO:+$SUDO }service nginx reload || true
    log "INFO" "Reverse proxy configured on port 80 -> FE:${fe_port}, API:${be_port}"
  fi
}

# If port 80 is occupied by nginx or other, create reverse proxy
if is_port_in_use "80"; then
  configure_reverse_proxy "$FRONTEND_PORT" "$BACKEND_PORT"
fi

# Generate Secrets if missing
if [ -z "${JWT_SECRET:-}" ]; then
  JWT_SECRET="$(openssl rand -hex 32)"
  log "INFO" "Generated new JWT_SECRET"
fi

if [ -z "${ADMIN_KEY:-}" ]; then
  ADMIN_KEY="$(openssl rand -hex 16)"
  log "INFO" "Generated new ADMIN_KEY"
fi

# Database Config
DB_PORT="${DB_PORT:-5432}"
if [ -z "${DATABASE_URL:-}" ]; then
  if [ -n "${DB_HOST:-}" ] && [ -n "${DB_USER:-}" ] && [ -n "${DB_PASS:-}" ] && [ -n "${DB_NAME:-}" ]; then
    DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
  else
    DATABASE_URL="postgresql://hvh:hvh_password@db:5432/hvh_blacklist"
  fi
fi

# Update .env file
touch .env
upsert_env() {
  local key="$1"
  local value="$2"
  if grep -q "^${key}=" .env; then
    # Escape special characters for sed if necessary, but simple replacement usually works for these keys
    # Using a safer approach with temporary file to avoid sed issues with special chars
    grep -v "^${key}=" .env > .env.tmp
    echo "${key}=${value}" >> .env.tmp
    mv .env.tmp .env
  else
    echo "${key}=${value}" >> .env
  fi
}

upsert_env "JWT_SECRET" "${JWT_SECRET}"
upsert_env "ADMIN_KEY" "${ADMIN_KEY}"
upsert_env "DATABASE_URL" "${DATABASE_URL}"
[ -n "${FRONTEND_PORT:-}" ] && upsert_env "FRONTEND_PORT" "${FRONTEND_PORT}"
[ -n "${BACKEND_PORT:-}" ] && upsert_env "BACKEND_PORT" "${BACKEND_PORT}"
[ -n "${FRONTEND_HOST:-}" ] && upsert_env "FRONTEND_HOST" "${FRONTEND_HOST}"
[ -n "${BACKEND_HOST:-}" ] && upsert_env "BACKEND_HOST" "${BACKEND_HOST}"
[ -n "${FRONTEND_BIND:-}" ] && upsert_env "FRONTEND_BIND" "${FRONTEND_BIND}"
[ -n "${BACKEND_BIND:-}" ] && upsert_env "BACKEND_BIND" "${BACKEND_BIND}"
[ -n "${DB_HOST:-}" ] && upsert_env "DB_HOST" "${DB_HOST}"
[ -n "${DB_USER:-}" ] && upsert_env "DB_USER" "${DB_USER}"
[ -n "${DB_PASS:-}" ] && upsert_env "DB_PASS" "${DB_PASS}"
[ -n "${DB_NAME:-}" ] && upsert_env "DB_NAME" "${DB_NAME}"
[ -n "${DB_PORT:-}" ] && upsert_env "DB_PORT" "${DB_PORT}"

# Ensure current shell env matches updated .env (override previously sourced values)
export FRONTEND_PORT BACKEND_PORT FRONTEND_HOST BACKEND_HOST FRONTEND_BIND BACKEND_BIND DATABASE_URL JWT_SECRET ADMIN_KEY

# --- 3. Pre-pull Base Images & Deploy ---
log "INFO" "Pre-pulling base images to avoid TLS timeouts..."

# Clean possibly corrupted layers
docker image rm -f postgres:16 >/dev/null 2>&1 || true
docker image rm -f redis:alpine >/dev/null 2>&1 || true
docker system prune -af >/dev/null 2>&1 || true

try_pull() {
  local image="$1"
  if docker pull "$image"; then
    return 0
  fi
  # Rotate mirrors
  for m in "${MIRROR_CANDIDATES[@]}"; do
    log "WARN" "Pull $image failed. Switching mirror to: $m"
    if [ -w "/etc/docker" ] || [ -n "${SUDO}" ]; then
      write_docker_config "$m"
      restart_docker
      sleep 2
      if docker pull "$image"; then
        log "SUCCESS" "Pulled $image via $m"
        return 0
      fi
    fi
  done
  # Final fallback: no mirror (use default DockerHub)
  log "WARN" "Trying default DockerHub without mirrors for $image"
  if [ -w "/etc/docker" ] || [ -n "${SUDO}" ]; then
    write_docker_config ""
    restart_docker
    sleep 2
  fi
  docker pull "$image" || return 1
}

try_pull "postgres:16" || log "WARN" "Postgres image pull still failing. Will rely on compose to retry."
try_pull "redis:alpine" || log "WARN" "Redis image pull still failing. Will rely on compose to retry."

# --- 3.1 Fallback: Install DB & Redis on host if pulls keep failing ---
INSTALL_HOST_INFRA=false
if ! docker image inspect postgres:16 >/dev/null 2>&1 || ! docker image inspect redis:alpine >/dev/null 2>&1; then
  INSTALL_HOST_INFRA=true
fi

if [ "$INSTALL_HOST_INFRA" = true ]; then
  log "WARN" "Container images unavailable. Installing PostgreSQL & Redis on host as fallback..."
  if command -v apt-get >/dev/null 2>&1; then
    ${SUDO:+$SUDO }apt-get update -y
    ${SUDO:+$SUDO }apt-get install -y postgresql redis-server
    ${SUDO:+$SUDO }systemctl enable postgresql redis-server || true
    ${SUDO:+$SUDO }systemctl start postgresql redis-server || true
    # Configure DB user
    ${SUDO:+$SUDO }-u postgres psql -v ON_ERROR_STOP=1 <<SQL || true
DO \$\$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'hvh') THEN
    CREATE USER hvh WITH LOGIN PASSWORD 'hvh_password';
  END IF;
END \$\$;
CREATE DATABASE hvh_blacklist OWNER hvh;
SQL
  elif command -v yum >/dev/null 2>&1; then
    ${SUDO:+$SUDO }yum install -y postgresql-server redis
    # initialize postgres if needed
    if [ ! -d "/var/lib/pgsql/data" ]; then
      ${SUDO:+$SUDO }postgresql-setup initdb || true
    fi
    ${SUDO:+$SUDO }systemctl enable postgresql redis || true
    ${SUDO:+$SUDO }systemctl start postgresql redis || true
    ${SUDO:+$SUDO }-u postgres psql -v ON_ERROR_STOP=1 <<SQL || true
DO \$\$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'hvh') THEN
    CREATE USER hvh WITH LOGIN PASSWORD 'hvh_password';
  END IF;
END \$\$;
CREATE DATABASE hvh_blacklist OWNER hvh;
SQL
  else
    log "ERROR" "Unsupported package manager. Please install PostgreSQL and Redis manually."
  fi
  # Override env to use host services
  upsert_env "DATABASE_URL" "postgresql://hvh:hvh_password@127.0.0.1:5432/hvh_blacklist"
  upsert_env "REDIS_URL" "redis://127.0.0.1:6379"
fi

log "INFO" "Building and starting services (with pull and wait)..."
# Start only app services if using host infra
if [ "$INSTALL_HOST_INFRA" = true ]; then
  FRONTEND_BIND="$FRONTEND_BIND" BACKEND_BIND="$BACKEND_BIND" $COMPOSE_CMD up -d --build --wait backend frontend || \
  FRONTEND_BIND="$FRONTEND_BIND" BACKEND_BIND="$BACKEND_BIND" $COMPOSE_CMD up -d backend frontend
else
  FRONTEND_BIND="$FRONTEND_BIND" BACKEND_BIND="$BACKEND_BIND" $COMPOSE_CMD up -d --pull=always --build --wait || \
  FRONTEND_BIND="$FRONTEND_BIND" BACKEND_BIND="$BACKEND_BIND" $COMPOSE_CMD up -d --build
fi

# --- 4. Database Migration ---
log "INFO" "Waiting for database to initialize..."
sleep 5

MAX_RETRIES=10
RETRY_COUNT=0
MIGRATION_SUCCESS=false

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if $COMPOSE_CMD exec backend npm run db:push; then
    MIGRATION_SUCCESS=true
    break
  fi
  log "WARN" "Database migration failed. Retrying in 5s... ($((RETRY_COUNT+1))/$MAX_RETRIES)"
  sleep 5
  RETRY_COUNT=$((RETRY_COUNT+1))
done

if [ "$MIGRATION_SUCCESS" = false ]; then
  log "ERROR" "Database migration failed after multiple attempts."
  exit 1
else
  log "SUCCESS" "Database migration completed."
fi

# --- 5. Cleanup ---
log "INFO" "Cleaning up old images..."
docker image prune -f >/dev/null 2>&1 || true

# --- 6. Final Output ---
PUBLIC_IP="$(curl -s ifconfig.me || true)"
if [ -z "${PUBLIC_IP}" ]; then
  PUBLIC_IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
fi
[ -z "${PUBLIC_IP}" ] && PUBLIC_IP="localhost"

FRONTEND_PORT="${FRONTEND_PORT:-8080}"

log "SUCCESS" "=============================================="
log "SUCCESS" "   Deployment Successful!"
log "SUCCESS" "   - Frontend: http://${PUBLIC_IP}:${FRONTEND_PORT}"
log "SUCCESS" "   - Admin Init: http://${PUBLIC_IP}:${FRONTEND_PORT}/admin"
log "SUCCESS" "   - System Key (ADMIN_KEY): ${ADMIN_KEY}"
log "SUCCESS" "=============================================="
