const User = require('../models/User');
const config = require('../config/bot');
const Validators = require('../utils/validators');
const { ERROR_MESSAGES, SUCCESS_MESSAGES } = require('../utils/constants');

class PointsService {
  constructor() {
    this.pointsPerMessage = config.bot.pointsPerMessage;
    this.cooldownSeconds = config.bot.cooldownSeconds;
    this.pointsPerLevel = config.bot.pointsPerLevel;
  }

  async awardPoints(userId, username, displayName, guildId, messageAnalysis) {
    try {
      // Find or create user
      const user = await User.findOrCreate(userId, username, displayName);
      
      // Check if user can earn points (cooldown)
      if (!user.canEarnPoints()) {
        const timeLeft = Validators.getTimeUntilReset(user.last_message_time, this.cooldownSeconds);
        return {
          success: false,
          reason: 'cooldown',
          timeLeft: timeLeft,
          user: user
        };
      }

      // Calculate points based on message quality
      const basePoints = this.pointsPerMessage;
      const qualityMultiplier = this.calculateQualityMultiplier(messageAnalysis);
      const pointsToAward = Math.floor(basePoints * qualityMultiplier);

      // Award points and update user
      const result = await user.addPoints(pointsToAward);
      await user.incrementMessageCount();

      return {
        success: true,
        pointsAwarded: pointsToAward,
        totalPoints: user.total_points,
        levelUp: result.levelUp,
        newLevel: result.newLevel,
        coinsEarned: result.coinsEarned,
        user: user
      };

    } catch (error) {
      console.error('Error awarding points:', error);
      throw new Error(ERROR_MESSAGES.DATABASE_ERROR);
    }
  }

  calculateQualityMultiplier(analysis) {
    let multiplier = 1.0;

    // Text length bonus (up to 1.5x)
    if (analysis.textLength > 50) {
      multiplier += 0.3;
    } else if (analysis.textLength > 20) {
      multiplier += 0.2;
    } else if (analysis.textLength > 10) {
      multiplier += 0.1;
    }

    // Content diversity bonus
    let diversityBonus = 0;
    if (analysis.hasEmojis) diversityBonus += 0.1;
    if (analysis.hasLinks) diversityBonus += 0.1;
    if (analysis.hasImages) diversityBonus += 0.2;
    
    multiplier += diversityBonus;

    // Message type bonuses
    switch (analysis.messageType) {
      case config.messageTypes.TEXT_ONLY:
        // No penalty or bonus for mixed content (as requested)
        break;
      case config.messageTypes.IMAGE_UPLOAD:
        multiplier += 0.2; // Encourage image sharing
        break;
      case config.messageTypes.LINK_SHARE:
        multiplier += 0.1; // Encourage link sharing
        break;
      case config.messageTypes.EMOJI_RICH:
        // No bonus to avoid emoji spam
        break;
    }

    // Penalties for low quality
    if (analysis.textLength < 3 && !analysis.hasImages && !analysis.hasLinks) {
      multiplier *= 0.5; // Half points for very short messages
    }

    // Excessive emoji penalty
    if (analysis.emojiCount > 5 && analysis.textLength < analysis.emojiCount * 2) {
      multiplier *= 0.7;
    }

    return Math.max(0.1, Math.min(2.0, multiplier)); // Clamp between 0.1x and 2.0x
  }

  async getUserStats(userId, guildId = null) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error(ERROR_MESSAGES.USER_NOT_FOUND);
      }

      // Get next level progress
      const progress = user.getNextLevelProgress();

      // Calculate rank
      const leaderboard = await User.getLeaderboard('points', 1000);
      const rank = leaderboard.findIndex(u => u.discord_id === userId) + 1;

      return {
        user: user,
        progress: progress,
        rank: rank || 'N/A',
        totalUsers: leaderboard.length
      };
    } catch (error) {
      console.error('Error getting user stats:', error);
      throw error;
    }
  }

  async getLeaderboard(type = 'points', limit = 10) {
    try {
      const users = await User.getLeaderboard(type, limit);
      return users;
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      throw new Error(ERROR_MESSAGES.DATABASE_ERROR);
    }
  }

  calculateLevel(totalPoints) {
    return Math.floor(totalPoints / this.pointsPerLevel) + 1;
  }

  getPointsForNextLevel(currentLevel) {
    return currentLevel * this.pointsPerLevel;
  }

  getPointsProgress(totalPoints) {
    const currentLevel = this.calculateLevel(totalPoints);
    const currentLevelPoints = (currentLevel - 1) * this.pointsPerLevel;
    const nextLevelPoints = currentLevel * this.pointsPerLevel;
    const progress = totalPoints - currentLevelPoints;
    const required = nextLevelPoints - currentLevelPoints;
    
    return {
      currentLevel: currentLevel,
      progress: progress,
      required: required,
      percentage: Math.floor((progress / required) * 100)
    };
  }

  async addBonusPoints(userId, points, reason = 'bonus') {
    try {
      if (!Validators.isValidPoints(points) || points <= 0) {
        throw new Error(ERROR_MESSAGES.INVALID_INPUT);
      }

      const user = await User.findById(userId);
      if (!user) {
        throw new Error(ERROR_MESSAGES.USER_NOT_FOUND);
      }

      const result = await user.addPoints(points);

      return {
        success: true,
        pointsAdded: points,
        totalPoints: user.total_points,
        levelUp: result.levelUp,
        newLevel: result.newLevel,
        reason: reason
      };
    } catch (error) {
      console.error('Error adding bonus points:', error);
      throw error;
    }
  }

  async removePoints(userId, points, reason = 'penalty') {
    try {
      if (!Validators.isValidPoints(points) || points <= 0) {
        throw new Error(ERROR_MESSAGES.INVALID_INPUT);
      }

      const user = await User.findById(userId);
      if (!user) {
        throw new Error(ERROR_MESSAGES.USER_NOT_FOUND);
      }

      if (user.total_points < points) {
        throw new Error('Cannot remove more points than user has');
      }

      const newPoints = Math.max(0, user.total_points - points);
      const newLevel = this.calculateLevel(newPoints);

      await user.update({
        total_points: newPoints,
        level: newLevel
      });

      return {
        success: true,
        pointsRemoved: points,
        totalPoints: newPoints,
        newLevel: newLevel,
        reason: reason
      };
    } catch (error) {
      console.error('Error removing points:', error);
      throw error;
    }
  }

  async resetUserPoints(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error(ERROR_MESSAGES.USER_NOT_FOUND);
      }

      await user.update({
        total_points: 0,
        level: 1
      });

      return {
        success: true,
        message: 'User points reset successfully'
      };
    } catch (error) {
      console.error('Error resetting user points:', error);
      throw error;
    }
  }

  async getDailyStats(guildId) {
    try {
      // This would typically query messages from the last 24 hours
      // For now, return basic structure
      return {
        totalPointsAwarded: 0,
        activeUsers: 0,
        averagePointsPerUser: 0,
        topEarner: null
      };
    } catch (error) {
      console.error('Error getting daily stats:', error);
      throw new Error(ERROR_MESSAGES.DATABASE_ERROR);
    }
  }
}

module.exports = PointsService;