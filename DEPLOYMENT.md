一键部署（推荐）

1. 进入项目目录并授权脚本

```bash
cd /你的项目目录
chmod +x deploy.sh
```

2. 运行部署脚本

```bash
./deploy.sh
```

脚本会自动完成：
- 安装 Docker 与 docker compose（如未安装）
- 生成 JWT_SECRET 与 ADMIN_KEY，并写入 .env
- 使用本地 Postgres 容器初始化数据库（或使用自定义数据库配置）
- 构建并启动前后端
- 自动执行 db:push

部署完成后，终端会输出：
- JWT_SECRET
- ADMIN_KEY
- 管理员初始化地址

初始化管理员

访问：
http://你的服务器IP:8080/admin

在初始化管理员表单中填写 ADMIN_KEY，即可完成管理员创建。

自定义数据库（可选）

如果你想连接自有数据库，可提前配置环境变量：

```bash
export DB_HOST="数据库地址"
export DB_USER="数据库用户"
export DB_PASS="数据库密码"
export DB_NAME="数据库名"
export DB_PORT="数据库端口"
./deploy.sh
```

脚本会自动生成 DATABASE_URL 并写入 .env。

更新部署

拉取最新代码后执行：

```bash
docker compose up -d --build
docker compose exec backend npm run db:push
```

常用信息

- 前台地址： http://你的服务器IP:8080
- 后端地址： http://你的服务器IP:3001
- 管理员后台： http://你的服务器IP:8080/admin
 - 后端健康检查： http://你的服务器IP:3001/health
 - 上传文件访问： http://你的服务器IP:8080/uploads/

排错

1. 无法登录管理员
确认 JWT_SECRET 与 ADMIN_KEY 已注入：

```bash
docker compose exec backend printenv JWT_SECRET
docker compose exec backend printenv ADMIN_KEY
```

2. 数据库未同步
执行：

```bash
docker compose exec backend npm run db:push
```

3. 外部数据库连接失败

- 检查 DATABASE_URL 格式是否正确
- 确认数据库允许服务器 IP 访问
- 端口未放行时，请在云安全组或防火墙中放行 DB_PORT
```
