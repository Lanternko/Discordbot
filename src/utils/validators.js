const { ERROR_MESSAGES } = require('./constants');

class Validators {
  static isValidDiscordId(id) {
    return /^\d{17,19}$/.test(id);
  }

  static isValidGuildId(id) {
    return this.isValidDiscordId(id);
  }

  static isValidChannelId(id) {
    return this.isValidDiscordId(id);
  }

  static isValidMessageContent(content) {
    return typeof content === 'string' && content.length <= 2000;
  }

  static isValidUsername(username) {
    return typeof username === 'string' && 
           username.length >= 2 && 
           username.length <= 32;
  }

  static isValidPoints(points) {
    return Number.isInteger(points) && points >= 0;
  }

  static isValidLevel(level) {
    return Number.isInteger(level) && level >= 1 && level <= 100;
  }

  static isValidCoins(coins) {
    return Number.isInteger(coins) && coins >= 0;
  }

  static validateUser(userData) {
    const errors = [];

    if (!userData.discord_id || !this.isValidDiscordId(userData.discord_id)) {
      errors.push('Invalid Discord ID');
    }

    if (!userData.username || !this.isValidUsername(userData.username)) {
      errors.push('Invalid username');
    }

    if (userData.total_points !== undefined && !this.isValidPoints(userData.total_points)) {
      errors.push('Invalid points value');
    }

    if (userData.level !== undefined && !this.isValidLevel(userData.level)) {
      errors.push('Invalid level value');
    }

    if (userData.coins !== undefined && !this.isValidCoins(userData.coins)) {
      errors.push('Invalid coins value');
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  static validateMessage(messageData) {
    const errors = [];

    if (!messageData.discord_id || !this.isValidDiscordId(messageData.discord_id)) {
      errors.push('Invalid message Discord ID');
    }

    if (!messageData.user_id || !this.isValidDiscordId(messageData.user_id)) {
      errors.push('Invalid user ID');
    }

    if (!messageData.guild_id || !this.isValidGuildId(messageData.guild_id)) {
      errors.push('Invalid guild ID');
    }

    if (!messageData.channel_id || !this.isValidChannelId(messageData.channel_id)) {
      errors.push('Invalid channel ID');
    }

    if (messageData.content !== undefined && !this.isValidMessageContent(messageData.content)) {
      errors.push('Invalid message content');
    }

    if (!messageData.message_type || typeof messageData.message_type !== 'string') {
      errors.push('Invalid message type');
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  static sanitizeInput(input) {
    if (typeof input !== 'string') {
      return String(input);
    }
    
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML/markdown
      .substring(0, 500); // Limit length
  }

  static isRateLimited(lastActionTime, cooldownSeconds) {
    const now = Date.now();
    const timeDiff = (now - lastActionTime) / 1000;
    return timeDiff < cooldownSeconds;
  }

  static getTimeUntilReset(lastActionTime, cooldownSeconds) {
    const now = Date.now();
    const timeDiff = (now - lastActionTime) / 1000;
    return Math.max(0, cooldownSeconds - timeDiff);
  }
}

module.exports = Validators;