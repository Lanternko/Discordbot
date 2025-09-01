// Emoji and URL regex patterns
const EMOJI_REGEX = /(\p{Emoji}|<a?:\w+:\d+>)/gu;
const URL_REGEX = /https?:\/\/[^\s]+/g;
const DISCORD_EMOJI_REGEX = /<a?:(\w+):(\d+)>/g;
const UNICODE_EMOJI_REGEX = /\p{Emoji}/gu;

// Time constants
const TIME_CONSTANTS = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
};

// Color constants for embeds
const COLORS = {
  PRIMARY: 0x007bff,
  SUCCESS: 0x28a745,
  WARNING: 0xffc107,
  DANGER: 0xdc3545,
  INFO: 0x17a2b8,
  LIGHT: 0xf8f9fa,
  DARK: 0x343a40,
};

// Error messages
const ERROR_MESSAGES = {
  USER_NOT_FOUND: '找不到該用戶資料',
  INSUFFICIENT_POINTS: '積分不足',
  INSUFFICIENT_COINS: '金幣不足',
  COOLDOWN_ACTIVE: '請等待冷卻時間結束',
  DATABASE_ERROR: '資料庫錯誤，請稍後再試',
  PERMISSION_DENIED: '權限不足',
  INVALID_INPUT: '輸入格式錯誤',
};

// Success messages
const SUCCESS_MESSAGES = {
  POINTS_AWARDED: '獲得積分',
  LEVEL_UP: '恭喜升級',
  PURCHASE_SUCCESS: '購買成功',
  LOTTERY_WIN: '恭喜中獎',
  DATA_UPDATED: '資料已更新',
};

// Interaction style thresholds
const STYLE_THRESHOLDS = {
  TEXT_FOCUSED: { minTextRatio: 0.7, minAvgLength: 20 },
  EMOJI_EXPRESSIVE: { minEmojiRatio: 0.4 },
  LINK_SHARER: { minLinkRatio: 0.3 },
  VISUAL_CONTRIBUTOR: { minImageRatio: 0.2 },
  BALANCED: { /* default fallback */ },
};

// Achievement definitions
const ACHIEVEMENTS = {
  FIRST_MESSAGE: {
    id: 'first_message',
    name: '初次發言',
    description: '發送第一條訊息',
    reward: 10,
  },
  CHATTY: {
    id: 'chatty',
    name: '健談者',
    description: '發送100條訊息',
    requirement: 100,
    reward: 50,
  },
  SOCIAL_BUTTERFLY: {
    id: 'social_butterfly',
    name: '社交蝴蝶',
    description: '使用50種不同的貼圖',
    requirement: 50,
    reward: 75,
  },
  LEVEL_MASTER: {
    id: 'level_master',
    name: '等級大師',
    description: '達到等級20',
    requirement: 20,
    reward: 100,
  },
};

// Rate limiting
const RATE_LIMITS = {
  COMMANDS_PER_MINUTE: 10,
  POINTS_COOLDOWN: 30, // seconds
  LOTTERY_COOLDOWN: 3600, // 1 hour
};

module.exports = {
  EMOJI_REGEX,
  URL_REGEX,
  DISCORD_EMOJI_REGEX,
  UNICODE_EMOJI_REGEX,
  TIME_CONSTANTS,
  COLORS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  STYLE_THRESHOLDS,
  ACHIEVEMENTS,
  RATE_LIMITS,
};