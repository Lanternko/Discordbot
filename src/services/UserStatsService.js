const User = require('../models/User');
const Message = require('../models/Message');
const MessageAnalyzer = require('./MessageAnalyzer');
const { ERROR_MESSAGES } = require('../utils/constants');
const config = require('../config/bot');

class UserStatsService {
  constructor() {
    this.messageAnalyzer = new MessageAnalyzer();
    this.statsCache = new Map();
    this.cacheTimeout = 2 * 60 * 1000; // 2 minutes
  }

  async updateUserStats(userId, guildId) {
    try {
      const messageStats = await Message.getMessageStats(userId, guildId);
      const user = await User.findById(userId);
      
      if (!user) {
        throw new Error(ERROR_MESSAGES.USER_NOT_FOUND);
      }

      // Calculate interaction style
      const interactionStyle = this.messageAnalyzer.analyzeInteractionStyle(messageStats);

      // Update or create user_stats record
      const statsData = {
        user_id: userId,
        guild_id: guildId,
        total_text_messages: messageStats.text_messages || 0,
        total_emoji_messages: messageStats.emoji_messages || 0,
        total_link_messages: messageStats.link_messages || 0,
        total_image_messages: messageStats.image_messages || 0,
        avg_text_length: messageStats.avg_text_length || 0,
        interaction_style: interactionStyle
      };

      // Store in user_stats table
      await this.upsertUserStats(statsData);

      // Clear cache for this user
      this.clearUserCache(userId);

      return {
        success: true,
        stats: statsData
      };

    } catch (error) {
      console.error('Error updating user stats:', error);
      throw error;
    }
  }

  async upsertUserStats(statsData) {
    const database = require('../config/database');
    
    try {
      // Check if stats exist
      const existing = await database.get(
        'SELECT user_id FROM user_stats WHERE user_id = ? AND guild_id = ?',
        [statsData.user_id, statsData.guild_id]
      );

      if (existing) {
        // Update existing
        await database.run(
          `UPDATE user_stats SET 
           total_text_messages = ?,
           total_emoji_messages = ?,
           total_link_messages = ?,
           total_image_messages = ?,
           avg_text_length = ?,
           interaction_style = ?,
           last_calculated = CURRENT_TIMESTAMP
           WHERE user_id = ? AND guild_id = ?`,
          [
            statsData.total_text_messages,
            statsData.total_emoji_messages,
            statsData.total_link_messages,
            statsData.total_image_messages,
            statsData.avg_text_length,
            statsData.interaction_style,
            statsData.user_id,
            statsData.guild_id
          ]
        );
      } else {
        // Insert new
        await database.run(
          `INSERT INTO user_stats 
           (user_id, guild_id, total_text_messages, total_emoji_messages, 
            total_link_messages, total_image_messages, avg_text_length, interaction_style)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            statsData.user_id,
            statsData.guild_id,
            statsData.total_text_messages,
            statsData.total_emoji_messages,
            statsData.total_link_messages,
            statsData.total_image_messages,
            statsData.avg_text_length,
            statsData.interaction_style
          ]
        );
      }

      return true;
    } catch (error) {
      console.error('Error upserting user stats:', error);
      throw new Error(ERROR_MESSAGES.DATABASE_ERROR);
    }
  }

  async getUserDetailedStats(userId, guildId = null) {
    const cacheKey = `user_${userId}_${guildId || 'all'}`;
    
    // Check cache
    if (this.shouldUseCache(cacheKey)) {
      return this.statsCache.get(cacheKey);
    }

    try {
      // Get basic user data
      const user = await User.findById(userId);
      if (!user) {
        throw new Error(ERROR_MESSAGES.USER_NOT_FOUND);
      }

      // Get message statistics
      const messageStats = await Message.getMessageStats(userId, guildId);
      
      // Get user stats from user_stats table
      const database = require('../config/database');
      let userStats = null;
      
      if (guildId) {
        userStats = await database.get(
          'SELECT * FROM user_stats WHERE user_id = ? AND guild_id = ?',
          [userId, guildId]
        );
      }

      // Calculate comprehensive stats
      const stats = {
        user: {
          id: user.discord_id,
          username: user.username,
          displayName: user.display_name,
          totalMessages: user.total_messages,
          totalPoints: user.total_points,
          level: user.level,
          coins: user.coins,
          joinDate: user.created_at
        },
        activity: {
          textMessages: messageStats.text_messages || 0,
          emojiMessages: messageStats.emoji_messages || 0,
          linkMessages: messageStats.link_messages || 0,
          imageMessages: messageStats.image_messages || 0,
          avgTextLength: parseFloat(messageStats.avg_text_length || 0).toFixed(1),
          totalEmojisUsed: messageStats.total_emojis || 0,
          totalLinksShared: messageStats.total_links || 0,
          totalImagesShared: messageStats.total_images || 0
        },
        analysis: {
          interactionStyle: userStats?.interaction_style || 
            this.messageAnalyzer.analyzeInteractionStyle(messageStats),
          activityLevel: this.calculateActivityLevel(user.total_messages),
          contentDiversity: this.calculateContentDiversity(messageStats),
          engagementScore: this.calculateEngagementScore(user, messageStats)
        },
        progress: user.getNextLevelProgress(),
        lastUpdated: userStats?.last_calculated || new Date().toISOString()
      };

      // Cache the results
      this.statsCache.set(cacheKey, stats);

      return stats;

    } catch (error) {
      console.error('Error getting detailed user stats:', error);
      throw error;
    }
  }

  async getGuildUserStats(guildId, orderBy = 'points', limit = 50) {
    try {
      const database = require('../config/database');
      
      let orderClause;
      switch (orderBy) {
        case 'points':
          orderClause = 'u.total_points DESC';
          break;
        case 'level':
          orderClause = 'u.level DESC, u.total_points DESC';
          break;
        case 'messages':
          orderClause = 'u.total_messages DESC';
          break;
        case 'activity':
          orderClause = '(us.total_text_messages + us.total_emoji_messages + us.total_link_messages + us.total_image_messages) DESC';
          break;
        default:
          orderClause = 'u.total_points DESC';
      }

      const query = `
        SELECT 
          u.*,
          us.total_text_messages,
          us.total_emoji_messages,
          us.total_link_messages,
          us.total_image_messages,
          us.avg_text_length,
          us.interaction_style
        FROM users u
        LEFT JOIN user_stats us ON u.discord_id = us.user_id AND us.guild_id = ?
        WHERE u.total_messages > 0
        ORDER BY ${orderClause}
        LIMIT ?
      `;

      const rows = await database.all(query, [guildId, limit]);
      
      return rows.map(row => ({
        user: new User(row),
        stats: {
          textMessages: row.total_text_messages || 0,
          emojiMessages: row.total_emoji_messages || 0,
          linkMessages: row.total_link_messages || 0,
          imageMessages: row.total_image_messages || 0,
          avgTextLength: row.avg_text_length || 0,
          interactionStyle: row.interaction_style || 'balanced'
        }
      }));

    } catch (error) {
      console.error('Error getting guild user stats:', error);
      throw new Error(ERROR_MESSAGES.DATABASE_ERROR);
    }
  }

  calculateActivityLevel(totalMessages) {
    if (totalMessages < 10) return 'new';
    if (totalMessages < 50) return 'casual';
    if (totalMessages < 200) return 'active';
    if (totalMessages < 500) return 'regular';
    return 'power_user';
  }

  calculateContentDiversity(messageStats) {
    const total = (messageStats.text_messages || 0) + 
                  (messageStats.emoji_messages || 0) + 
                  (messageStats.link_messages || 0) + 
                  (messageStats.image_messages || 0);
    
    if (total === 0) return 0;

    const types = [
      messageStats.text_messages || 0,
      messageStats.emoji_messages || 0,
      messageStats.link_messages || 0,
      messageStats.image_messages || 0
    ].filter(count => count > 0).length;

    return (types / 4 * 100).toFixed(1); // Percentage of message types used
  }

  calculateEngagementScore(user, messageStats) {
    let score = 0;

    // Base score from level and points
    score += user.level * 2;
    
    // Message frequency bonus
    const avgMessagesPerDay = user.total_messages / Math.max(1, this.getDaysSinceJoin(user.created_at));
    score += Math.min(avgMessagesPerDay * 5, 50);

    // Content quality bonus
    const avgTextLength = parseFloat(messageStats.avg_text_length || 0);
    if (avgTextLength > 30) score += 20;
    else if (avgTextLength > 15) score += 10;
    else if (avgTextLength > 5) score += 5;

    // Diversity bonus
    const diversity = parseFloat(this.calculateContentDiversity(messageStats));
    score += diversity * 0.3;

    return Math.min(100, Math.round(score));
  }

  getDaysSinceJoin(joinDate) {
    const now = new Date();
    const joined = new Date(joinDate);
    const diffTime = Math.abs(now - joined);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(1, diffDays);
  }

  shouldUseCache(cacheKey) {
    const cached = this.statsCache.get(cacheKey);
    if (!cached) return false;
    
    const now = Date.now();
    const cacheTime = cached.lastUpdated ? new Date(cached.lastUpdated).getTime() : 0;
    
    return (now - cacheTime) < this.cacheTimeout;
  }

  clearUserCache(userId) {
    const keysToDelete = [];
    for (const [key] of this.statsCache) {
      if (key.includes(`user_${userId}`)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.statsCache.delete(key));
  }

  clearCache() {
    this.statsCache.clear();
  }

  async refreshAllStats(guildId) {
    try {
      const database = require('../config/database');
      const users = await database.all(
        'SELECT DISTINCT user_id FROM messages WHERE guild_id = ?',
        [guildId]
      );

      let updated = 0;
      for (const user of users) {
        try {
          await this.updateUserStats(user.user_id, guildId);
          updated++;
        } catch (error) {
          console.error(`Error updating stats for user ${user.user_id}:`, error);
        }
      }

      return {
        success: true,
        updatedUsers: updated,
        totalUsers: users.length
      };

    } catch (error) {
      console.error('Error refreshing all stats:', error);
      throw new Error(ERROR_MESSAGES.DATABASE_ERROR);
    }
  }
}

module.exports = UserStatsService;