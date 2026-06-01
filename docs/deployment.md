# Quasar 生产部署指南

部署分三步：**本地准备 → 上传文件 → 服务器启动**。所有配置文件在本地创建好再上传，服务器上不需要手动编辑任何文件。

---

## 服务器前提

- Node.js 18+（`node -v` 验证）
- PM2：`npm install -g pm2`

---

## 第一步：本地准备配置文件

在 Quasar 项目根目录创建 `.env.local`（本地新建文件，填入以下内容）：

```
QUASAR_PASSWORD=你的登录密码
QUASAR_SECRET=随机长字符串（建议32位以上）
```

在你的本地用户目录创建 `quasar-config.json`（上传后放到服务器的 `~/.quasar/config.json`），填入要监控的服务地址：

```json
{
  "skillsDirs": [],
  "projectsDirs": [],
  "appearance": "dark",
  "autoScan": false,
  "scanIntervalMs": 1800000,
  "obsServices": [
    {
      "id": "wiki-app",
      "name": "Wiki App",
      "baseUrl": "http://内网IP:端口",
      "enabled": true
    },
    {
      "id": "voicerecorder",
      "name": "VoiceRecorder",
      "baseUrl": "http://内网IP:端口",
      "enabled": true
    },
    {
      "id": "echomind",
      "name": "EchoMind",
      "baseUrl": "http://内网IP:端口",
      "enabled": true
    }
  ],
  "alertRules": []
}
```

> `obsServices` 也可以部署后在界面的 **Obs → 服务配置** Tab 里添加，不一定要提前写好。

---

## 第二步：上传文件

用你习惯的方式（FTP / SFTP / rsync）将以下内容上传到服务器：

| 本地 | 上传到服务器 |
|------|------------|
| Quasar 项目目录（排除 `node_modules`、`.next`） | `/srv/quasar/`（路径可自定义） |
| `.env.local` | `/srv/quasar/.env.local` |
| `quasar-config.json` | `~/.quasar/config.json`（需要先建目录 `mkdir -p ~/.quasar`） |

---

## 第三步：服务器启动

```bash
# 安装依赖 + 构建
cd /srv/quasar
npm install
npm run build

# 用 PM2 启动（端口可改，默认 3100）
pm2 start npm --name quasar -- start -- -p 3100
pm2 save
pm2 startup
```

完成后访问 `http://服务器IP:3100`，输入 `.env.local` 中设置的密码登录。

---

## 告警 Cron（可选）

如需无人值守告警，在服务器上配置 cron：

```bash
crontab -e
# 加入以下一行（每15分钟评估一次告警规则）
*/15 * * * * curl -s -X POST http://127.0.0.1:3100/api/obs/poll > /dev/null
```

> 不配置 cron 时，只有在 Obs 页面手动点击「评估告警」才会触发规则检查。

---

## 升级

```bash
# 上传新版本文件后，在服务器上执行：
cd /srv/quasar
npm install
npm run build
pm2 restart quasar
```

---

## 注意事项

| 事项 | 说明 |
|------|------|
| **obsServices baseUrl** | 填内网 IP，Quasar 直接走内网拉取数据 |
| **Projects/Skills 页面** | 服务器上无本地项目目录时显示为空，属正常现象 |
| **鉴权** | httpOnly Cookie + HMAC 签名，Session 有效期 7 天 |
| **Python 依赖** | 不使用本地 SQLite 时，Python3 缺失不影响 Obs 核心功能 |
