const EmojiUsage = require('../models/EmojiUsage');
const { ERROR_MESSAGES } = require('../utils/constants');

class EmojiStatsService {
  constructor() {
    this.emojiCache = new Map();
    this.lastCacheUpdate = 0;
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  async recordEmojiUsage(userId, guildId, emojis) {
    try {
      console.log(`🔄 EmojiStatsService.recordEmojiUsage called with ${emojis.length} emojis`);
      const results = [];

      // Group emojis by name to count occurrences
      const emojiCounts = {};
      for (const emoji of emojis) {
        const key = `${emoji.type}:${emoji.name}`;
        if (!emojiCounts[key]) {
          emojiCounts[key] = {
            emoji: emoji,
            count: 0
          };
        }
        emojiCounts[key].count++;
      }
      
      console.log(`💾 Grouped emojis:`, Object.keys(emojiCounts).map(key => `${emojiCounts[key].emoji.name}:${emojiCounts[key].count}`));

      // Record each unique emoji once with the correct count
      for (const [key, data] of Object.entries(emojiCounts)) {
        const emojiData = {
          id: data.emoji.id,
          name: data.emoji.name,
          type: data.emoji.type,
          count: data.count // Pass the count to recordUsage
        };

        const result = await EmojiUsage.recordUsageWithCount(userId, guildId, emojiData);
        results.push(result);
      }

      // Clear cache to force refresh
      this.clearCache();

      return results;
    } catch (error) {
      console.error('Error recording emoji usage:', error);
      throw new Error(ERROR_MESSAGES.DATABASE_ERROR);
    }
  }

  async getUserEmojiStats(userId, guildId = null) {
    try {
      const stats = await EmojiUsage.getUserEmojiStats(userId, guildId);
      const diversity = await EmojiUsage.getUserEmojiDiversity(userId, guildId);

      return {
        favoriteEmojis: stats.slice(0, 10), // Top 10
        diversity: diversity,
        totalEmojisUsed: diversity.unique_emojis,
        totalUsage: diversity.total_usage
      };
    } catch (error) {
      console.error('Error getting user emoji stats:', error);
      throw new Error(ERROR_MESSAGES.DATABASE_ERROR);
    }
  }

  async getGuildEmojiStats(guildId, limit = 20) {
    try {
      const cacheKey = `guild_${guildId}_${limit}`;
      
      // Check cache first
      if (this.shouldUseCache(cacheKey)) {
        return this.emojiCache.get(cacheKey);
      }

      const stats = await EmojiUsage.getGuildEmojiStats(guildId, limit);
      
      // Cache the results
      this.emojiCache.set(cacheKey, stats);
      this.lastCacheUpdate = Date.now();

      return stats;
    } catch (error) {
      console.error('Error getting guild emoji stats:', error);
      throw new Error(ERROR_MESSAGES.DATABASE_ERROR);
    }
  }

  async getPopularEmojis(guildId, timeframe = null, limit = 10) {
    try {
      const popular = await EmojiUsage.getMostPopularEmojis(guildId, timeframe, limit);
      return popular;
    } catch (error) {
      console.error('Error getting popular emojis:', error);
      throw new Error(ERROR_MESSAGES.DATABASE_ERROR);
    }
  }

  async getEmojiLeaderboard(guildId, type = 'total', limit = 10) {
    try {
      const leaderboard = await EmojiUsage.getEmojiLeaderboard(guildId, type, limit);
      return leaderboard;
    } catch (error) {
      console.error('Error getting emoji leaderboard:', error);
      throw new Error(ERROR_MESSAGES.DATABASE_ERROR);
    }
  }

  async getUnusedEmojis(guildId, allGuildEmojis) {
    try {
      const unused = await EmojiUsage.getUnusedEmojis(guildId, allGuildEmojis);
      return unused;
    } catch (error) {
      console.error('Error getting unused emojis:', error);
      throw new Error(ERROR_MESSAGES.DATABASE_ERROR);
    }
  }

  async getEmojiTrends(guildId, days = 7) {
    try {
      const trends = await EmojiUsage.getEmojiTrends(guildId, days);
      
      // Group by date for better presentation
      const trendsByDate = {};
      trends.forEach(trend => {
        if (!trendsByDate[trend.date]) {
          trendsByDate[trend.date] = [];
        }
        trendsByDate[trend.date].push({
          emoji: trend.emoji_name,
          usage: trend.daily_usage
        });
      });

      return trendsByDate;
    } catch (error) {
      console.error('Error getting emoji trends:', error);
      throw new Error(ERROR_MESSAGES.DATABASE_ERROR);
    }
  }

  async getTopEmojiUsers(guildId, emojiName, limit = 10) {
    try {
      const topUsers = await EmojiUsage.getTopEmojiUsers(guildId, emojiName, limit);
      return topUsers;
    } catch (error) {
      console.error('Error getting top emoji users:', error);
      throw new Error(ERROR_MESSAGES.DATABASE_ERROR);
    }
  }

  async generateEmojiReport(guildId, guild) {
    try {
      // Get guild custom emojis
      const customEmojis = Array.from(guild.emojis.cache.values());
      
      // Get usage stats
      const allStats = await this.getGuildEmojiStats(guildId, 100);
      const popularEmojis = await this.getPopularEmojis(guildId, null, 10);
      const unusedEmojis = await this.getUnusedEmojis(guildId, customEmojis);
      
      // Calculate usage rates
      const usageStats = {
        totalCustomEmojis: customEmojis.length,
        usedEmojis: customEmojis.length - unusedEmojis.length,
        unusedEmojis: unusedEmojis.length,
        usageRate: customEmojis.length > 0 ? 
          ((customEmojis.length - unusedEmojis.length) / customEmojis.length * 100).toFixed(1) : 0
      };

      // Get emoji diversity stats
      const diversityStats = {
        totalUniqueEmojis: allStats.length,
        averageUsagePerEmoji: allStats.length > 0 ? 
          (allStats.reduce((sum, stat) => sum + stat.total_usage, 0) / allStats.length).toFixed(1) : 0
      };

      return {
        usageStats,
        diversityStats,
        popularEmojis: popularEmojis.slice(0, 5),
        unusedEmojis: unusedEmojis.slice(0, 10),
        recommendations: this.generateRecommendations(usageStats, unusedEmojis, popularEmojis)
      };
    } catch (error) {
      console.error('Error generating emoji report:', error);
      throw new Error(ERROR_MESSAGES.DATABASE_ERROR);
    }
  }

  generateRecommendations(usageStats, unusedEmojis, popularEmojis) {
    const recommendations = [];

    // Too many unused emojis
    if (unusedEmojis.length > 10) {
      recommendations.push({
        type: 'cleanup',
        message: `考慮移除 ${unusedEmojis.length} 個未使用的貼圖來節省空間`,
        priority: 'medium'
      });
    }

    // Low usage rate
    if (parseFloat(usageStats.usageRate) < 50) {
      recommendations.push({
        type: 'engagement',
        message: '貼圖使用率較低，可考慮舉辦活動鼓勵使用',
        priority: 'low'
      });
    }

    // Very popular emojis suggest adding similar ones
    if (popularEmojis.length > 0 && popularEmojis[0].total_usage > 100) {
      recommendations.push({
        type: 'expansion',
        message: `"${popularEmojis[0].emoji_name}" 很受歡迎，可考慮添加相似貼圖`,
        priority: 'low'
      });
    }

    return recommendations;
  }

  shouldUseCache(cacheKey) {
    const now = Date.now();
    return this.emojiCache.has(cacheKey) && 
           (now - this.lastCacheUpdate) < this.cacheTimeout;
  }

  clearCache() {
    this.emojiCache.clear();
    this.lastCacheUpdate = 0;
  }

  async cleanupOldData(daysOld = 365) {
    try {
      const deletedCount = await EmojiUsage.cleanupOldUsage(daysOld);
      this.clearCache();
      
      return {
        success: true,
        deletedRecords: deletedCount,
        message: `Cleaned up ${deletedCount} old emoji usage records`
      };
    } catch (error) {
      console.error('Error cleaning up old emoji data:', error);
      throw new Error(ERROR_MESSAGES.DATABASE_ERROR);
    }
  }

  formatEmojiName(emoji) {
    if (emoji.type === 'custom') {
      return `<:${emoji.name}:${emoji.id}>`;
    }
    return emoji.name;
  }

  categorizeEmojis(emojis) {
    const categories = {
      custom: [],
      unicode: []
    };

    emojis.forEach(emoji => {
      if (emoji.emoji_type === 'custom') {
        categories.custom.push(emoji);
      } else {
        categories.unicode.push(emoji);
      }
    });

    return categories;
  }
}

module.exports = EmojiStatsService;