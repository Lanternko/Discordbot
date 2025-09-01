# Discord 統計機器人安裝指南

## 前置需求

- Node.js 18 或更新版本
- npm 或 yarn
- Discord 帳號及伺服器管理權限

## 步驟 1: 建立 Discord 應用程式

1. 前往 [Discord Developer Portal](https://discord.com/developers/applications)
2. 點擊「New Application」建立新應用程式
3. 輸入應用程式名稱，例如「統計機器人」

### 設定 Bot

1. 點擊左側「Bot」選項
2. 點擊「Add Bot」建立機器人
3. 複製「Token」（稍後會用到）
4. 開啟以下權限：
   - Send Messages
   - Use Slash Commands
   - Read Message History
   - View Channels

### 設定 OAuth2

1. 點擊左側「OAuth2」> 「URL Generator」
2. 勾選 Scopes:
   - `bot`
   - `applications.commands`
3. 勾選 Bot Permissions:
   - Send Messages
   - Use Slash Commands
   - Read Message History
   - View Channels
   - Add Reactions
4. 複製生成的 URL 並開啟，將機器人邀請到你的伺服器

## 步驟 2: 安裝專案

```bash
# 1. 進入專案目錄
cd D:\CODING\discordbot

# 2. 安裝依賴套件
npm install

# 3. 複製環境設定檔案
copy .env.example .env
```

## 步驟 3: 設定環境變數

編輯 `.env` 檔案，填入以下資訊：

```env
# Discord Bot Configuration
DISCORD_TOKEN=你的機器人Token
CLIENT_ID=你的應用程式ID
GUILD_ID=你的伺服器ID

# 其他設定保持預設即可
```

### 如何獲取 ID

- **應用程式 ID**: Discord Developer Portal > 你的應用程式 > General Information > Application ID
- **伺服器 ID**: Discord 中右鍵點擊伺服器名稱 > 複製 ID（需開啟開發者模式）

## 步驟 4: 部署指令

```bash
# 部署斜線指令到 Discord
npm run deploy:commands
```

成功後應該會看到類似訊息：
```
✅ Successfully deployed 4 guild commands
```

## 步驟 5: 啟動機器人

```bash
# 開發模式（自動重啟）
npm run dev

# 或正式啟動
npm start
```

成功啟動後會看到：
```
🤖 統計機器人 is now online!
🎯 Serving 1 guild(s)
✅ Bot is ready and fully operational!
```

## 測試機器人

在你的 Discord 伺服器中輸入以下指令測試：

```
/help - 查看說明
/profile - 查看個人資料
/leaderboard - 查看排行榜
```

## 常見問題

### Q: 機器人沒有回應
A: 檢查：
- Bot Token 是否正確
- 機器人是否已邀請到伺服器
- 機器人是否有必要權限

### Q: 指令沒有顯示
A: 
- 確保已執行 `npm run deploy:commands`
- 檢查 CLIENT_ID 和 GUILD_ID 是否正確
- 等待幾分鐘讓 Discord 同步

### Q: 資料庫錯誤
A:
- 確保 `database/` 資料夾存在
- 檢查檔案寫入權限
- 查看控制台錯誤訊息

## 部署到雲端（可選）

### Railway 部署

1. 前往 [Railway](https://railway.app/)
2. 連接 GitHub 倉庫
3. 設定環境變數
4. 部署專案

### Render 部署

1. 前往 [Render](https://render.com/)
2. 建立新的 Web Service
3. 連接 GitHub 倉庫
4. 設定環境變數
5. 部署專案

## 維護

### 定期任務

```bash
# 清理舊資料（可選）
# 在 Discord 中使用管理員指令或直接在資料庫中執行

# 備份資料庫
cp database/bot.db database/backup_$(date +%Y%m%d).db
```

### 更新機器人

```bash
# 拉取最新代碼
git pull origin main

# 安裝新依賴
npm install

# 重新部署指令（如有新指令）
npm run deploy:commands

# 重啟機器人
npm start
```

## 支援

如果遇到問題：
1. 查看控制台錯誤訊息
2. 檢查 Discord Developer Portal 中的機器人狀態
3. 參考 [Discord.js 文檔](https://discord.js.org/)
4. 查看專案的 GitHub Issues