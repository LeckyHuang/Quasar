# Quasar 生产部署指南

## 前提条件

服务器需要：

- Node.js 18+（`node -v` 验证）
- Python3（`/api/obs` 本地查询用，没有也不影响核心功能）
- PM2（进程管理）：`npm install -g pm2`
- Nginx（反向代理 + 鉴权）

---

## 1. 上传代码

**方式 A：Git（推荐）**

```bash
git clone https://github.com/LeckyHuang/Quasar.git /srv/quasar
```

**方式 B：rsync 本地推送**

```bash
rsync -avz --exclude node_modules --exclude .next \
  /Users/leckyhuang/Desktop/project/quasar/ \
  user@server:/srv/quasar/
```

---

## 2. 配置环境变量

```bash
cd /srv/quasar
cp .env.example .env.local
nano .env.local
```

填写以下两项（缺一不可）：

```env
QUASAR_PASSWORD=你的强密码
QUASAR_SECRET=随机长字符串（建议 32 位以上）
```

> `QUASAR_PASSWORD` 留空则关闭鉴权，仅限本地开发使用。

---

## 3. 构建

```bash
cd /srv/quasar
npm install
npm run build
```

---

## 4. 初始化 Quasar 配置

在服务器上创建配置文件 `~/.quasar/config.json`，填入需要监控的服务地址：

```bash
mkdir -p ~/.quasar
cat > ~/.quasar/config.json << 'EOF'
{
  "skillsDirs": [],
  "projectsDirs": [],
  "appearance": "dark",
  "autoScan": false,
  "scanIntervalMs": 1800000,
  "obsServices": [
    {
      "id": "api-gateway",
      "name": "API Gateway",
      "baseUrl": "http://内网IP:8000",
      "enabled": true
    },
    {
      "id": "wiki-app",
      "name": "Wiki App",
      "baseUrl": "http://内网IP:8001",
      "enabled": true
    }
  ],
  "alertRules": []
}
EOF
```

> `baseUrl` 填各服务的内网地址，Quasar 直接走内网拉取，无需经过公网。  
> 也可以部署后在界面的 **Obs → 服务配置** Tab 中管理。

---

## 5. PM2 启动

```bash
cd /srv/quasar
pm2 start npm --name quasar -- start -- -p 3100
pm2 save
pm2 startup   # 跟随系统自动启动
```

> 端口 3100 可自行调整，避免与其他服务冲突。

---

## 6. Nginx 反向代理

```bash
# 安装 Nginx（如未安装）
sudo apt install nginx -y
```

创建站点配置 `/etc/nginx/sites-available/quasar`：

```nginx
server {
    listen 80;
    server_name quasar.yourdomain.com;   # 或直接填服务器 IP

    location / {
        proxy_pass http://127.0.0.1:3100;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/quasar /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

**启用 HTTPS（推荐）：**

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d quasar.yourdomain.com
```

---

## 7. 告警 Cron（可选）

Quasar 的告警规则需要主动触发才会评估。如需无人值守监测，在服务器上配置 cron：

```bash
crontab -e
# 每 15 分钟评估一次告警规则
*/15 * * * * curl -s -X POST http://127.0.0.1:3100/api/obs/poll > /dev/null
```

> 不配置 cron 时，只有在 Obs 页面点击「评估告警」按钮才会触发规则检查。

---

## 8. 部署后验证

```bash
# 确认进程在跑
pm2 status

# 确认聚合 API 能拿到数据
curl -s http://127.0.0.1:3100/api/obs/aggregate?days=7 | python3 -m json.tool | head -20
```

浏览器访问 `http://quasar.yourdomain.com`，输入 `.env.local` 中设置的密码登录。

---

## 升级

```bash
cd /srv/quasar
git pull
npm install
npm run build
pm2 restart quasar
```

---

## 注意事项

| 事项 | 说明 |
|------|------|
| **内网访问优先** | `obsServices` 的 `baseUrl` 尽量填内网 IP，避免流量绕公网 |
| **本地扫描功能** | 生产服务器上没有本地 project 目录，Projects / Skills 页面会是空的，属正常现象 |
| **Python 依赖** | 不使用本地 SQLite 读取时，Python3 缺失不影响 Obs 核心功能 |
| **鉴权** | Quasar 内置 httpOnly Cookie + HMAC 签名，Session 有效期 7 天 |
| **告警** | 无人值守预警需配置外部 cron 调用 `POST /api/obs/poll` |
