# CS2 HVH 黑信榜部署指南

## 方案 A：Docker Compose 一键部署（推荐）

### 1. 服务器准备
- Ubuntu 20.04/22.04
- 安装 Docker 与 Compose：
  ```bash
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker $USER
  newgrp docker
  docker --version
  docker compose version
  ```

### 2. 上传代码到服务器
- 方式一：服务器上 git clone
- 方式二：本地打包后上传

### 3. 设置环境变量
在服务器项目根目录执行：
```bash
export JWT_SECRET="替换为复杂字符串"
export ADMIN_KEY="替换为初始化管理员密钥"
```

### 4. 启动服务
```bash
docker compose up -d --build
```

### 5. 初始化管理员
前端访问：http://服务器IP:8080/admin
- 使用“初始化管理员”表单
- ADMIN_KEY 填入环境变量里的值
 - 创建完成后使用管理员账号登录

### 6. 访问入口
- 前端：http://服务器IP:8080
- 后端健康检查：http://服务器IP:3001/health
 - 上传文件：http://服务器IP:8080/uploads/

## 方案 B：手动部署（无 Docker）

### 1. 安装依赖
- Node.js 20.x
- PostgreSQL 16

### 2. 配置后端环境变量
```bash
export DATABASE_URL="postgresql://用户名:密码@127.0.0.1:5432/hvh_blacklist"
export JWT_SECRET="替换为复杂字符串"
export ADMIN_KEY="替换为初始化管理员密钥"
```

### 3. 初始化数据库
```bash
cd backend
npm install
npm run db:generate
npm run db:push
```

### 4. 启动后端
```bash
npm run build
npm run start
```

### 5. 构建并部署前端
```bash
cd frontend
npm install
export VITE_API_BASE_URL="http://服务器IP:3001/api"
npm run build
```
将 `frontend/dist` 上传到 Nginx 静态目录，并配置反向代理 `/api` 到后端。
同时建议配置 `/uploads/` 代理到后端，确保附件访问正常。

## 自动化部署（GitHub Actions）

### 1. 设置仓库 Secrets
在 GitHub 仓库 Settings → Secrets and variables → Actions 添加：
- SSH_HOST：服务器地址
- SSH_USER：服务器用户名
- SSH_KEY：服务器私钥
- SSH_PORT：SSH 端口
- DEPLOY_PATH：服务器部署目录

### 2. 服务器准备
服务器上创建部署目录并确保有 Docker：
```bash
mkdir -p /opt/hvh-blacklist
```

### 3. 推送 main 分支自动部署
GitHub Actions 会自动上传代码并执行：
```bash
docker compose up -d --build
```

## 常见问题

### 端口冲突
- 修改 `docker-compose.yml` 的端口映射

### 管理员登录失败
- 确认 `JWT_SECRET` 与 `ADMIN_KEY` 已设置
- 首次需要先初始化管理员
 - 管理员账号创建后请使用新账号登录

### 生产建议
- 配置域名与 HTTPS（Nginx 或 Caddy）
- PostgreSQL 定期备份
- 增加防火墙规则，仅开放 80/443/8080/3001 需要的端口
