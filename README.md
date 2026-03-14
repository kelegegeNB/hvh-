# 奇源情报局 (HvH 黑红榜)

[English version](#intelligence-agency-hvh-blacklist)

**作者**：可乐\
**开源网址**：https://github.com/kelegegeNB/hvh-

## 📖 网站介绍

**奇源情报局** (HvH 黑红榜) 是一个专为游戏社区（如 CS2 HvH 等）打造的违规曝光与审核公示平台。致力于“记录曝光 · 审核公示 · 安全可信”，为玩家提供一个公平、公开的举报与查询环境。通过本平台，玩家可以提交违规者的相关证据，经过审核后在全站公示，同时支持评论、评分、申诉等丰富的社区互动功能。

## ✨ 核心功能

1. **曝光与举报系统**
   - 玩家可自由提交违规曝光（支持多平台标签配置）。
   - 支持上传图片、链接等多种证据形式。
   - 曝光内容自动计算热度（Hot Score）与流量，支持按热度排序。
2. **审核与公示机制**
   - 完善的后台管理系统，管理员/审核员可对用户提交的曝光进行审核。
   - 审核通过后全站公示，拒绝的曝光将标明原因，防止恶意抹黑。
3. **违规人员查询**
   - 提供便捷的搜索功能，支持通过人物昵称、ID 等快速查询违规记录。
4. **社区互动（评分与评论）**
   - 用户可对已公示的曝光进行真实评分与自由评论。
   - 支持楼中楼回复与评论附件上传。
5. **申诉与处理系统**
   - 被曝光者如果认为判定有误，可通过系统提交申诉及联系方式。
   - 管理员可跟进申诉并进行处理及回复。
6. **防滥用与安全机制**
   - **频率限制**：每日曝光、评论、申诉次数限制，防止恶意刷屏。
   - **黑名单系统**：管理员可将恶意捣乱的 IP 永久或限时封禁。
7. **广告与公告管理**
   - 首页提供专属广告位，支持后台配置图片与跳转链接。
   - 支持全站公告发布，方便传达平台最新动态。
8. **现代化 UI 界面**
   - 前端采用 React + Vite + Ant Design 构建，提供响应式、丝滑的用户体验。
   - 后端基于 Node.js + Express + Prisma + PostgreSQL，稳定高效。

## 🚀 部署教程

本项目推荐使用 Docker Compose 进行一键部署，过程简单快捷。

### 1. 环境准备

请确保您的服务器（推荐 Ubuntu 20.04/22.04）已安装 Docker 与 Docker Compose。

1. \# 安装 Docker
2. curl -fsSL <https://get.docker.com> | sh
3. sudo usermod -aG docker $USER
4. <br />
5. \# 验证安装
6. docker --version
7. docker compose version

### 2. 获取源码

克隆本开源项目到您的服务器中：

git clone <https://github.com/kelegegeNB/hvh.git>

cd hvh

### 3. 一键部署脚本 (推荐)

项目内提供了一键部署脚本 `deploy.sh`，自动处理环境检测、端口分配、数据库初始化等：

chmod +x deploy.sh

./deploy.sh

*执行后脚本会自动生成需要的密钥并启动 Docker 容器，请留意终端输出的初始访问地址与* *`ADMIN_KEY`。*

### 4. 手动 Docker Compose 部署 (备选)

如果您希望手动控制部署过程：

1. **配置环境变量**
   创建或修改 `.env` 文件：

   \# 数据库配置

   DATABASE\_URL="postgresql://hvh:hvh\_password\@db:5432/hvh\_blacklist"

   \# 安全密钥 (请替换为随机字符串)

   JWT\_SECRET="your\_jwt\_secret\_here"

   ADMIN\_KEY="your\_admin\_init\_key\_here"

   \# 端口配置

   FRONTEND\_PORT=8080

   BACKEND\_PORT=3001
2. **启动服务**

   docker compose up -d --build
3. **初始化数据库**
   等待容器启动后，执行数据库结构推送：

   docker compose exec backend npm run db:push

### 5. 初始化管理员

1. 部署完成后，在浏览器访问前端管理员初始化页面：`http://您的服务器IP:8080/admin` （端口根据您的配置可能有所不同，默认为 8080）。
2. 页面中会要求输入 `ADMIN_KEY`，请填入 `.env` 文件或脚本生成的对应值。
3. 创建您的初始管理员账号和密码。
4. 创建成功后，使用该管理员账号登录后台，即可开始管理网站！

### 6. 生产环境建议

- **域名与 HTTPS**：强烈建议使用 Nginx 反向代理绑定域名，并配置 SSL 证书。
- **端口安全**：通过防火墙仅开放必要的 HTTP/HTTPS 端口（如 80/443），关闭数据库 (5432) 和 Redis 的外部访问权限。
- **数据备份**：定期备份 PostgreSQL 数据库及映射出的 `uploads_data` 目录。

***

<br />

# Intelligence Agency (HvH Blacklist)

<br />

**Author**: Kele\
**Open Source URL**: <https://github.com/kelegegeNB/hvh->

## 📖 Introduction

**Intelligence Agency** (HvH Blacklist) is a violation exposure and review public platform designed specifically for gaming communities (such as CS2 HvH). Dedicated to "Recording Exposures · Auditing Publicly · Safe and Trustworthy", it provides players with a fair and open environment for reporting and querying. Through this platform, players can submit relevant evidence of violators, which will be published site-wide after review. It also supports rich community interactive features such as commenting, rating, and appealing.

## ✨ Core Features

1. **Exposure & Reporting System**
   - Players can freely submit violation exposures (supports multi-platform tag configuration).
   - Supports uploading multiple forms of evidence such as images and links.
   - Exposure content automatically calculates Hot Score and traffic, supporting sorting by popularity.
2. **Review & Publication Mechanism**
   - Comprehensive backend management system where admins/moderators can review user-submitted exposures.
   - Approved exposures are published site-wide; rejected ones will state the reason to prevent malicious smearing.
3. **Violator Query**
   - Provides convenient search functionality, allowing quick queries of violation records via character nicknames, IDs, etc.
4. **Community Interaction (Rating & Commenting)**
   - Users can leave authentic ratings and free comments on published exposures.
   - Supports nested replies and comment attachment uploads.
5. **Appeal & Processing System**
   - Exposed individuals who believe the judgment is incorrect can submit appeals and contact information through the system.
   - Admins can follow up on appeals, process them, and reply.
6. **Anti-Abuse & Security Mechanisms**
   - **Rate Limiting**: Daily limits on exposures, comments, and appeals to prevent malicious spamming.
   - **Blacklist System**: Admins can permanently or temporarily ban malicious IPs.
7. **Ads & Announcement Management**
   - The homepage provides exclusive ad spaces, supporting backend configuration of images and redirect links.
   - Supports site-wide announcement publishing for easy communication of the latest platform updates.
8. **Modern UI Design**
   - The frontend is built with React + Vite + Ant Design, providing a responsive and smooth user experience.
   - The backend is based on Node.js + Express + Prisma + PostgreSQL, ensuring stability and efficiency.

## 🚀 Deployment Guide

It is highly recommended to use Docker Compose for one-click deployment, as the process is simple and fast.

### 1. Environment Preparation

Please ensure your server (Ubuntu 20.04/22.04 recommended) has Docker and Docker Compose installed.

\# Install Docker

curl -fsSL <https://get.docker.com> | sh

sudo usermod -aG docker $USER

<br />

\# Verify Installation

docker --version

docker compose version

### 2. Get the Source Code

Clone this open-source project to your server:

git clone <https://github.com/kelegegeNB/hvh.git>

cd hvh

### 3. One-Click Deployment Script (Recommended)

The project provides a one-click deployment script `deploy.sh`, which automatically handles environment detection, port allocation, database initialization, etc.:

chmod +x deploy.sh

./deploy.sh

*After execution, the script will automatically generate the required keys and start the Docker containers. Please pay attention to the initial access address and* *`ADMIN_KEY`* *output in the terminal.*

### 4. Manual Docker Compose Deployment (Alternative)

If you prefer to manually control the deployment process:

1. **Configure Environment Variables**\
   Create or modify the `.env` file:

   \# Database Configuration

   DATABASE\_URL="postgresql://hvh:hvh\_password\@db:5432/hvh\_blacklist"

   \# Security Keys (Please replace with random strings)

   JWT\_SECRET="your\_jwt\_secret\_here"

   ADMIN\_KEY="your\_admin\_init\_key\_here"

   \# Port Configuration

   FRONTEND\_PORT=8080

   BACKEND\_PORT=3001
2. **Start Services**

   docker compose up -d --build
3. **Initialize Database**\
   Wait for the containers to start, then push the database schema:

   docker compose exec backend npm run db:push

### 5. Initialize Administrator

1. After deployment, visit the frontend admin initialization page in your browser: `http://YOUR_SERVER_IP:8080/admin` (The port may vary based on your configuration, default is 8080).
2. The page will prompt you to enter the `ADMIN_KEY`. Please fill in the corresponding value generated in the `.env` file or by the script.
3. Create your initial admin account and password.
4. Once successfully created, log in to the backend using this admin account to start managing the website!

### 6. Production Environment Recommendations

- **Domain & HTTPS**: It is highly recommended to use an Nginx reverse proxy to bind a domain and configure an SSL certificate.
- **Port Security**: Only open necessary HTTP/HTTPS ports (e.g., 80/443) through the firewall, and close external access to the database (5432) and Redis.
- **Data Backup**: Regularly back up the PostgreSQL database and the mapped `uploads_data` directory.

