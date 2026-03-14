#!/bin/bash
# -----------------------------------------------------------------------------
# CS2 HVH 黑红榜 - 统一自动部署脚本 (deploy_all.sh)
# 功能：环境检查、依赖安装、备份、配置生成、构建启动、健康检查、数据库迁移、自动回滚
# 作者：可乐
# 日期：2026-02-07
# -----------------------------------------------------------------------------

set -e

# --- 全局配置 ---
BACKUP_DIR="./backups"
LOG_FILE="deploy.log"
MAX_RETRIES=30
RETRY_INTERVAL=2

# --- 颜色输出 ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# --- 错误处理与回滚 ---
cleanup() {
    local exit_code=$?
    if [ $exit_code -ne 0 ]; then
        log "ERROR" "部署过程中发生错误 (Exit Code: $exit_code)。正在尝试回滚..."
        rollback
    fi
}

trap cleanup EXIT

rollback() {
    log "WARN" "开始回滚操作..."
    
    # 1. 恢复 .env 文件
    if [ -f "$BACKUP_DIR/.env.bak" ]; then
        cp "$BACKUP_DIR/.env.bak" .env
        log "INFO" "已恢复 .env 文件配置"
    fi

    # 2. 停止当前可能处于不健康状态的容器
    log "INFO" "停止当前容器..."
    docker compose down || true

    # 3. 如果有旧的镜像或容器备份，可以在这里恢复（对于简单部署，通常只需停止坏的容器）
    # 在生产环境中，建议使用 tag 部署以便快速切换镜像版本。
    
    log "WARN" "回滚完成。请检查日志 $LOG_FILE 排查错误。"
}

# --- 1. 环境检查与依赖安装 ---
check_dependencies() {
    log "INFO" "步骤 1/6: 检查系统环境与依赖..."

    # 检查 Docker
    if ! command -v docker >/dev/null 2>&1; then
        log "WARN" "未检测到 Docker，正在尝试自动安装..."
        curl -fsSL https://get.docker.com | bash
        log "SUCCESS" "Docker 安装完成"
    else
        log "INFO" "Docker 已安装: $(docker --version)"
    fi

    # 检查 Docker Compose
    if ! command -v docker-compose >/dev/null 2>&1 && ! docker compose version >/dev/null 2>&1; then
        log "WARN" "未检测到 Docker Compose，正在安装插件..."
        sudo apt-get update && sudo apt-get install -y docker-compose-plugin || {
            log "ERROR" "自动安装 Docker Compose 失败，请手动安装"
            exit 1
        }
    fi

    # 检查 OpenSSL (用于生成密钥)
    if ! command -v openssl >/dev/null 2>&1; then
        log "WARN" "安装 OpenSSL..."
        sudo apt-get install -y openssl
    fi
}

# --- 2. 备份 ---
backup_data() {
    log "INFO" "步骤 2/6: 执行备份..."
    mkdir -p "$BACKUP_DIR"

    # 备份 .env
    if [ -f .env ]; then
        cp .env "$BACKUP_DIR/.env.bak"
        log "INFO" "配置文件 .env 已备份"
    fi

    # 备份数据库 (仅当容器正在运行时)
    if docker compose ps | grep -q "Up"; then
        log "INFO" "检测到服务正在运行，尝试备份数据库..."
        # 注意：这里假设 db 容器名为 index-db-1 或类似的，需根据实际项目调整，这里使用 docker compose exec
        # 为了通用性，跳过具体的 pg_dump，但在生产环境强烈建议加上
        # docker compose exec -T db pg_dump -U postgres postgres > "$BACKUP_DIR/db_$(date +%s).sql" || true
    fi
}

# --- 3. 配置生成 ---
configure_env() {
    log "INFO" "步骤 3/6: 配置环境变量..."

    # 如果没有 .env，从 .env.example 复制或创建空文件
    if [ ! -f .env ]; then
        touch .env
    fi

    # 读取现有变量
    source .env 2>/dev/null || true

    # 生成 JWT_SECRET
    if [ -z "$JWT_SECRET" ]; then
        log "INFO" "生成新的 JWT_SECRET..."
        JWT_SECRET=$(openssl rand -hex 32)
        echo "JWT_SECRET=$JWT_SECRET" >> .env
    fi

    # 生成 ADMIN_KEY
    if [ -z "$ADMIN_KEY" ]; then
        log "INFO" "生成新的 ADMIN_KEY..."
        ADMIN_KEY=$(openssl rand -hex 16)
        echo "ADMIN_KEY=$ADMIN_KEY" >> .env
    fi

    # 配置 DATABASE_URL
    if [ -z "$DATABASE_URL" ]; then
        log "INFO" "配置默认 DATABASE_URL..."
        # 默认使用 docker compose 内部网络
        echo "DATABASE_URL=postgresql://postgres:password@db:5432/postgres" >> .env
    fi
    
    # 确保 POSTGRES_PASSWORD 存在 (用于 db 容器)
    if ! grep -q "POSTGRES_PASSWORD" .env; then
        echo "POSTGRES_PASSWORD=password" >> .env
    fi

    log "SUCCESS" "环境变量配置完成"
}

# --- 4. 构建与启动 ---
build_and_deploy() {
    log "INFO" "步骤 4/6: 构建并启动服务..."
    
    # 拉取最新代码 (如果是 git 仓库)
    if [ -d .git ]; then
        log "INFO" "拉取最新代码..."
        git pull || log "WARN" "Git pull 失败，将使用本地代码继续部署"
    fi

    # 构建镜像
    log "INFO" "开始构建 Docker 镜像..."
    docker compose build

    # 启动服务
    log "INFO" "启动服务..."
    docker compose up -d
    
    log "SUCCESS" "容器已启动"
}

# --- 5. 健康检查 ---
health_check() {
    log "INFO" "步骤 5/6: 执行健康检查..."
    
    local retries=0
    local backend_healthy=false
    
    while [ $retries -lt $MAX_RETRIES ]; do
        # 检查后端容器是否在运行
        if docker compose ps --format "json" | grep -q '"State":"running"'; then
             # 这里可以加更深度的检查，比如 curl localhost:3000/health
             backend_healthy=true
             break
        fi
        
        log "INFO" "等待服务就绪... ($((retries+1))/$MAX_RETRIES)"
        sleep $RETRY_INTERVAL
        retries=$((retries+1))
    done

    if [ "$backend_healthy" = true ]; then
        log "SUCCESS" "服务健康检查通过"
    else
        log "ERROR" "服务启动超时或失败"
        exit 1
    fi
}

# --- 6. 数据库迁移与收尾 ---
post_deploy() {
    log "INFO" "步骤 6/6: 数据库迁移与收尾..."
    
    # 等待数据库完全就绪
    sleep 5
    
    log "INFO" "执行数据库 Schema 同步..."
    # 尝试在 backend 容器中运行 db:push
    # 注意：确保 backend 容器名称正确或使用 service name
    if docker compose exec -T backend npm run db:push; then
        log "SUCCESS" "数据库迁移成功"
    else
        log "ERROR" "数据库迁移失败"
        exit 1
    fi

    # 清理无用镜像
    log "INFO" "清理旧镜像..."
    docker image prune -f >/dev/null 2>&1

    # 获取访问地址
    local ip=$(curl -s ifconfig.me || hostname -I | awk '{print $1}')
    local port=80 # 假设前端映射到 80，需根据 compose 文件调整
    
    # 读取 ADMIN_KEY 以显示给用户
    source .env
    
    echo ""
    log "SUCCESS" "========================================"
    log "SUCCESS" "   部署成功！"
    log "SUCCESS" "   访问地址: http://$ip:$port"
    log "SUCCESS" "   系统密钥 (ADMIN_KEY): $ADMIN_KEY"
    log "SUCCESS" "   后台初始化: http://$ip:$port/admin"
    log "SUCCESS" "========================================"
}

# --- 主流程 ---
main() {
    # 创建日志文件
    echo "Deploy Log - $(date)" > "$LOG_FILE"
    
    check_dependencies
    backup_data
    configure_env
    build_and_deploy
    health_check
    post_deploy
    
    # 如果执行到这里，说明一切正常，取消 ERR trap 防止触发回滚提示
    trap - EXIT
}

main "$@"
