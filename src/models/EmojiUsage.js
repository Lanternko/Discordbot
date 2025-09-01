const database = require('../config/database');
const { ERROR_MESSAGES } = require('../utils/constants');

class EmojiUsage {
  constructor(data) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.guild_id = data.guild_id;
    this.emoji_id = data.emoji_id;
    this.emoji_name = data.emoji_name;
    this.emoji_type = data.emoji_type; // 'custom' or 'unicode'
    this.usage_count = data.usage_count;
    this.first_used = data.first_used;
    this.last_used = data.last_used;
  }

  static async recordUsage(userId, guildId, emojiData) {
    return await this.recordUsageWithCount(userId, guildId, { ...emojiData, count: 1 });
  }

  static async recordUsageWithCount(userId, guildId, emojiData) {
    try {
      const count = emojiData.count || 1;
      console.log(`📝 Recording ${emojiData.name} with count ${count} for user ${userId}`);
      
      // Use INSERT OR IGNORE + UPDATE approach to handle race conditions
      // First, try to insert a new record
      const insertResult = await database.run(
        `INSERT OR IGNORE INTO emoji_usage 
         (user_id, guild_id, emoji_id, emoji_name, emoji_type, usage_count, first_used, last_used) 
         VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          userId,
          guildId,
          emojiData.id || null,
          emojiData.name,
          emojiData.type || 'unicode',
          count
        ]
      );

      if (insertResult.changes > 0) {
        console.log(`➕ Created new ${emojiData.name} record with count ${count}`);
        return await this.findById(insertResult.id);
      } else {
        console.log(`✏️ Record exists, updating ${emojiData.name} by adding ${count}`);
        // Record already exists, update it
        await database.run(
          `UPDATE emoji_usage 
           SET usage_count = usage_count + ?, last_used = CURRENT_TIMESTAMP 
           WHERE user_id = ? AND guild_id = ? AND emoji_name = ?`,
          [count, userId, guildId, emojiData.name]
        );
        
        // Get the updated record
        const updated = await database.get(
          `SELECT * FROM emoji_usage 
           WHERE user_id = ? AND guild_id = ? AND emoji_name = ?`,
          [userId, guildId, emojiData.name]
        );
        
        return updated ? new EmojiUsage(updated) : null;
      }
    } catch (error) {
      console.error('Error recording emoji usage with count:', error);
      throw new Error(ERROR_MESSAGES.DATABASE_ERROR);
    }
  }

  static async findById(id) {
    try {
      const row = await database.get('SELECT * FROM emoji_usage WHERE id = ?', [id]);
      return row ? new EmojiUsage(row) : null;
    } catch (error) {
      console.error('Error finding emoji usage by ID:', error);
      throw new Error(ERROR_MESSAGES.DATABASE_ERROR);
    }
  }

  static async getUserEmojiStats(userId, guildId = null) {
    try {
      let query = `
        SELECT 
          emoji_name,
          emoji_type,
          usage_count,
          first_used,
          last_used
        FROM emoji_usage 
        WHERE user_id = ?
      `;
      
      const params = [userId];
      
      if (guildId) {
        query += ' AND guild_id = ?';
        params.push(guildId);
      }
      
      query += ' ORDER BY usage_count DESC';
      
      const rows = await database.all(query, params);
      return rows.map(row => new EmojiUsage(row));
    } catch (error) {
      console.error('Error getting user emoji stats:', error);
      throw new Error(ERROR_MESSAGES.DATABASE_ERROR);
    }
  }

  static async getGuildEmojiStats(guildId, limit = 20) {
    try {
      console.log(`🔎 Querying guild emoji stats for guild ${guildId}`);
      const rows = await database.all(
        `SELECT 
           emoji_name,
           emoji_type,
           SUM(usage_count) as total_usage,
           COUNT(DISTINCT user_id) as unique_users,
           COUNT(*) as record_count,
           MIN(first_used) as first_used_ever,
           MAX(last_used) as last_used_ever
         FROM emoji_usage 
         WHERE guild_id = ?
         GROUP BY emoji_name, emoji_type
         ORDER BY total_usage DESC
         LIMIT ?`,
        [guildId, limit]
      );

      console.log(`📊 Query results:`, rows.map(r => `${r.emoji_name}: ${r.total_usage} (${r.record_count} records)`));
      return rows;
    } catch (error) {
      console.error('Error getting guild emoji stats:', error);
      throw new Error(ERROR_MESSAGES.DATABASE_ERROR);
    }
  }

  static async getTopEmojiUsers(guildId, emojiName, limit = 10) {
    try {
      const rows = await database.all(
        `SELECT 
           user_id,
           usage_count,
           first_used,
           last_used
         FROM emoji_usage 
         WHERE guild_id = ? AND emoji_name = ?
         ORDER BY usage_count DESC
         LIMIT ?`,
        [guildId, emojiName, limit]
      );

      return rows;
    } catch (error) {
      console.error('Error getting top emoji users:', error);
      throw new Error(ERROR_MESSAGES.DATABASE_ERROR);
    }
  }

  static async getUnusedEmojis(guildId, allGuildEmojis) {
    try {
      const usedEmojis = await database.all(
        'SELECT DISTINCT emoji_name FROM emoji_usage WHERE guild_id = ? AND emoji_type = "custom"',
        [guildId]
      );

      const usedEmojiNames = new Set(usedEmojis.map(row => row.emoji_name));
      const unusedEmojis = allGuildEmojis.filter(emoji => !usedEmojiNames.has(emoji.name));
      
      return unusedEmojis;
    } catch (error) {
      console.error('Error getting unused emojis:', error);
      throw new Error(ERROR_MESSAGES.DATABASE_ERROR);
    }
  }

  static async getMostPopularEmojis(guildId, timeframe = null, limit = 10) {
    try {
      let query = `
        SELECT 
          emoji_name,
          emoji_type,
          SUM(usage_count) as total_usage
        FROM emoji_usage 
        WHERE guild_id = ?
      `;
      
      const params = [guildId];
      
      if (timeframe) {
        query += ' AND last_used >= datetime(?, "unixepoch")';
        params.push(timeframe);
      }
      
      query += ' GROUP BY emoji_name, emoji_type ORDER BY total_usage DESC LIMIT ?';
      params.push(limit);

      const rows = await database.all(query, params);
      return rows;
    } catch (error) {
      console.error('Error getting most popular emojis:', error);
      throw new Error(ERROR_MESSAGES.DATABASE_ERROR);
    }
  }

  static async getEmojiTrends(guildId, days = 7) {
    try {
      const timeframe = Math.floor(Date.now() / 1000) - (days * 24 * 3600);
      
      const rows = await database.all(
        `SELECT 
           date(last_used) as date,
           emoji_name,
           SUM(usage_count) as daily_usage
         FROM emoji_usage 
         WHERE guild_id = ? AND last_used >= datetime(?, 'unixepoch')
         GROUP BY date, emoji_name
         ORDER BY date DESC, daily_usage DESC`,
        [guildId, timeframe]
      );

      return rows;
    } catch (error) {
      console.error('Error getting emoji trends:', error);
      throw new Error(ERROR_MESSAGES.DATABASE_ERROR);
    }
  }

  static async getUserEmojiDiversity(userId, guildId = null) {
    try {
      let query = `
        SELECT 
          COUNT(DISTINCT emoji_name) as unique_emojis,
          SUM(usage_count) as total_usage,
          AVG(usage_count) as avg_usage_per_emoji
        FROM emoji_usage 
        WHERE user_id = ?
      `;
      
      const params = [userId];
      
      if (guildId) {
        query += ' AND guild_id = ?';
        params.push(guildId);
      }

      const row = await database.get(query, params);
      return row || { unique_emojis: 0, total_usage: 0, avg_usage_per_emoji: 0 };
    } catch (error) {
      console.error('Error getting user emoji diversity:', error);
      throw new Error(ERROR_MESSAGES.DATABASE_ERROR);
    }
  }

  static async getEmojiLeaderboard(guildId, type = 'total', limit = 10) {
    try {
      let orderBy;
      switch (type) {
        case 'total':
          orderBy = 'SUM(usage_count) DESC';
          break;
        case 'unique_users':
          orderBy = 'COUNT(DISTINCT user_id) DESC';
          break;
        case 'recent':
          orderBy = 'MAX(last_used) DESC';
          break;
        default:
          orderBy = 'SUM(usage_count) DESC';
      }

      const rows = await database.all(
        `SELECT 
           emoji_name,
           emoji_type,
           SUM(usage_count) as total_usage,
           COUNT(DISTINCT user_id) as unique_users,
           MAX(last_used) as last_used
         FROM emoji_usage 
         WHERE guild_id = ?
         GROUP BY emoji_name, emoji_type
         ORDER BY ${orderBy}
         LIMIT ?`,
        [guildId, limit]
      );

      return rows;
    } catch (error) {
      console.error('Error getting emoji leaderboard:', error);
      throw new Error(ERROR_MESSAGES.DATABASE_ERROR);
    }
  }

  async delete() {
    try {
      await database.run('DELETE FROM emoji_usage WHERE id = ?', [this.id]);
      return true;
    } catch (error) {
      console.error('Error deleting emoji usage:', error);
      throw new Error(ERROR_MESSAGES.DATABASE_ERROR);
    }
  }

  static async cleanupOldUsage(daysOld = 365) {
    try {
      const cutoffDate = Math.floor(Date.now() / 1000) - (daysOld * 24 * 3600);
      const result = await database.run(
        'DELETE FROM emoji_usage WHERE last_used < datetime(?, "unixepoch")',
        [cutoffDate]
      );
      
      return result.changes;
    } catch (error) {
      console.error('Error cleaning up old emoji usage:', error);
      throw new Error(ERROR_MESSAGES.DATABASE_ERROR);
    }
  }
}

module.exports = EmojiUsage;