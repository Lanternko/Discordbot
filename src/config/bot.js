require('dotenv').config();

module.exports = {
  // Discord Configuration
  discord: {
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.CLIENT_ID,
    guildId: process.env.GUILD_ID,
  },

  // Bot Settings
  bot: {
    pointsPerMessage: parseInt(process.env.POINTS_PER_MESSAGE) || 1,
    cooldownSeconds: parseInt(process.env.COOLDOWN_SECONDS) || 30,
    pointsPerLevel: parseInt(process.env.POINTS_PER_LEVEL) || 100,
    maxLevel: 100,
  },

  // Feature Flags
  features: {
    enableEmojiStats: process.env.ENABLE_EMOJI_STATS === 'true',
    enableContentAnalysis: process.env.ENABLE_CONTENT_ANALYSIS === 'true',
    enableRewardsSystem: process.env.ENABLE_REWARDS_SYSTEM === 'true',
  },

  // Message Types
  messageTypes: {
    TEXT_ONLY: 'text_only',
    EMOJI_RICH: 'emoji_rich',
    LINK_SHARE: 'link_share',
    IMAGE_UPLOAD: 'image_upload',
    MIXED_CONTENT: 'text_only', // 混合內容歸類為文字討論
  },

  // Interaction Styles
  interactionStyles: {
    TEXT_FOCUSED: 'text_focused',    // 文字派
    EMOJI_EXPRESSIVE: 'emoji_expressive', // 表情派
    LINK_SHARER: 'link_sharer',      // 分享派
    VISUAL_CONTRIBUTOR: 'visual_contributor', // 視覺派
    BALANCED: 'balanced',            // 平衡型
  },

  // Rewards Configuration
  rewards: {
    dailyBonusCoins: 10,
    levelUpBonusCoins: 25,
    lotteryTicketCost: 50,
    shopItems: {
      'color_role': { cost: 100, description: '自訂顏色身份組' },
      'lottery_ticket': { cost: 50, description: '抽獎券' },
      'nickname_change': { cost: 200, description: '暱稱修改權' },
    }
  },

  // Database Configuration
  database: {
    path: process.env.DATABASE_PATH || './database/bot.db',
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    enableFileLogging: process.env.NODE_ENV === 'production',
  }
};