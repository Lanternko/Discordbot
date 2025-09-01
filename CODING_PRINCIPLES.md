# 編程原則與開發規範

## 核心設計原則

### 1. 單一職責原則 (Single Responsibility Principle)
每個模組、類別、函數都應該只負責一個明確的功能：

```javascript
// ✅ 好的設計 - 職責單一
class MessageCounter {
  increment(userId) { /* 只負責計數 */ }
}

class ExperienceCalculator {
  calculate(messageCount) { /* 只負責計算經驗值 */ }
}

// ❌ 錯誤設計 - 職責混亂
class MessageHandler {
  increment(userId) { /* 計數 */ }
  calculateExp(userId) { /* 計算經驗 */ }
  sendNotification(userId) { /* 發送通知 */ }
  updateDatabase(userId) { /* 更新資料庫 */ }
}
```

### 2. 清晰分割與模組化
系統各部分應該有明確的界線，低耦合高內聚：

- **事件處理層**: 只負責接收Discord事件
- **業務邏輯層**: 處理核心功能邏輯
- **資料存取層**: 負責資料庫操作
- **工具函數層**: 提供通用工具

### 3. 資料夾結構規範

```
src/
├── commands/           # 指令處理器
│   ├── stats/         # 統計相關指令
│   ├── rewards/       # 獎勵相關指令
│   └── admin/         # 管理員指令
├── events/            # Discord事件處理
│   ├── message.js     # 訊息事件
│   └── ready.js       # 機器人啟動事件
├── services/          # 核心業務邏輯
│   ├── PointsService.js      # 積分服務
│   ├── EmojiStatsService.js  # 貼圖統計服務
│   └── RewardService.js      # 獎勵服務
├── models/            # 資料模型
│   ├── User.js        # 用戶模型
│   ├── Message.js     # 訊息模型
│   └── EmojiUsage.js  # 貼圖使用模型
├── database/          # 資料庫相關
│   ├── connection.js  # 連接設定
│   └── migrations/    # 資料庫遷移
├── utils/             # 工具函數
│   ├── validators.js  # 驗證函數
│   ├── formatters.js  # 格式化函數
│   └── constants.js   # 常數定義
└── config/            # 設定檔
    ├── database.js    # 資料庫設定
    └── bot.js         # 機器人設定
```

### 4. 廢棄功能清理原則

#### 4.1 替換流程
```javascript
// 步驟1: 實作新功能
const newPointsCalculator = new EnhancedPointsCalculator();

// 步驟2: 標記廢棄功能 (加上 @deprecated)
/**
 * @deprecated Use EnhancedPointsCalculator instead
 * Will be removed in v2.0.0
 */
class OldPointsCalculator {
  // ...
}

// 步驟3: 測試新功能完整性
// 步驟4: 更新所有引用
// 步驟5: 完全移除舊代碼
```

#### 4.2 清理檢查清單
- [ ] 移除未使用的import
- [ ] 刪除註釋掉的舊代碼
- [ ] 清理無用的資料庫欄位
- [ ] 移除廢棄的環境變數
- [ ] 更新相關文檔

## 代碼品質標準

### 1. 命名規範
```javascript
// 變數和函數: camelCase
const userMessageCount = 10;
function calculateExperience() {}

// 常數: UPPER_SNAKE_CASE
const MAX_MESSAGE_PER_MINUTE = 20;
const DEFAULT_POINTS_PER_MESSAGE = 1;

// 類別: PascalCase
class UserStatsService {}
class EmojiAnalyzer {}

// 檔案名: kebab-case或camelCase
user-stats.service.js
emojiAnalyzer.js
```

### 2. 函數設計原則
```javascript
// ✅ 好的函數設計
function calculateUserLevel(totalPoints) {
  if (typeof totalPoints !== 'number' || totalPoints < 0) {
    throw new Error('Invalid points value');
  }
  return Math.floor(totalPoints / 100) + 1;
}

// ❌ 避免的設計
function doStuff(data) {
  // 功能不明確
  // 參數型別不明
  // 沒有錯誤處理
}
```

### 3. 錯誤處理策略
```javascript
// 業務邏輯錯誤
class BusinessError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
    this.name = 'BusinessError';
  }
}

// 統一錯誤處理
async function handleCommand(interaction) {
  try {
    await executeCommand(interaction);
  } catch (error) {
    if (error instanceof BusinessError) {
      await interaction.reply({ content: error.message, ephemeral: true });
    } else {
      console.error('Unexpected error:', error);
      await interaction.reply({ content: '發生未預期錯誤', ephemeral: true });
    }
  }
}
```

## 資料庫設計原則

### 1. 正規化與效能平衡
- 避免過度正規化影響查詢效能
- 適當使用冗余提升讀取速度
- 建立必要的索引

### 2. 遷移管理
```javascript
// migrations/001_create_users_table.js
exports.up = function(knex) {
  return knex.schema.createTable('users', function(table) {
    table.string('discord_id').primary();
    table.integer('total_messages').defaultTo(0);
    table.integer('total_points').defaultTo(0);
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('users');
};
```

## 測試策略

### 1. 測試分層
- **單元測試**: 測試個別函數和類別
- **整合測試**: 測試服務間互動
- **端到端測試**: 測試完整功能流程

### 2. 測試範例
```javascript
// tests/services/PointsService.test.js
describe('PointsService', () => {
  test('should calculate correct experience points', () => {
    const service = new PointsService();
    expect(service.calculatePoints(5)).toBe(5);
  });
  
  test('should handle invalid input', () => {
    const service = new PointsService();
    expect(() => service.calculatePoints(-1)).toThrow();
  });
});
```

## 安全性考量

### 1. 輸入驗證
- 驗證所有用戶輸入
- 防止SQL注入攻擊
- 限制查詢結果數量

### 2. 權限控制
```javascript
function requireAdmin(interaction) {
  if (!interaction.member.permissions.has('ADMINISTRATOR')) {
    throw new BusinessError('需要管理員權限', 'INSUFFICIENT_PERMISSIONS');
  }
}
```

## 效能優化原則

### 1. 資料庫查詢優化
- 使用批次操作減少查詢次數
- 適當使用快取機制
- 避免N+1查詢問題

### 2. 記憶體管理
- 及時清理不需要的資料
- 使用Map而非Object存儲大量鍵值對
- 監控記憶體使用狀況

## 版本控制規範

### 1. 提交訊息格式
```
feat: 新增貼圖使用統計功能
fix: 修復積分計算錯誤
refactor: 重構資料庫查詢邏輯
docs: 更新API文檔
test: 新增單元測試
```

### 2. 分支策略
- `main`: 正式版本
- `develop`: 開發分支
- `feature/*`: 功能分支
- `hotfix/*`: 緊急修復分支

## 監控與日誌

### 1. 日誌分級
```javascript
logger.info('User command executed', { userId, command });
logger.warn('Rate limit approaching', { userId, count });
logger.error('Database connection failed', error);
```

### 2. 效能監控
- 追蹤關鍵功能執行時間
- 監控資料庫查詢效能
- 記錄錯誤發生頻率

遵循這些原則將確保代碼的可維護性、可擴展性和穩定性。