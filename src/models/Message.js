const database = require('../config/database');
const Validators = require('../utils/validators');
const { ERROR_MESSAGES } = require('../utils/constants');

class Message {
  constructor(data) {
    this.id = data.id;
    this.discord_id = data.discord_id;
    this.user_id = data.user_id;
    this.guild_id = data.guild_id;
    this.channel_id = data.channel_id;
    this.content = data.content;
    this.message_type = data.message_type;
    this.text_length = data.text_length || 0;
    this.emoji_count = data.emoji_count || 0;
    this.link_count = data.link_count || 0;
    this.image_count = data.image_count || 0;
    this.points_awarded = data.points_awarded || 0;
    this.timestamp = data.timestamp;
  }

  static async create(messageData) {
    const validation = Validators.validateMessage(messageData);
    if (!validation.isValid) {
      throw new Error(`Message validation failed: ${validation.errors.join(', ')}`);
    }

    try {
      const result = await database.run(
        `INSERT INTO messages 
         (discord_id, user_id, guild_id, channel_id, content, message_type, 
          text_length, emoji_count, link_count, image_count, points_awarded) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          messageData.discord_id,
          messageData.user_id,
          messageData.guild_id,
          messageData.channel_id,
          messageData.content,
          messageData.message_type,
          messageData.text_length || 0,
          messageData.emoji_count || 0,
          messageData.link_count || 0,
          messageData.image_count || 0,
          messageData.points_awarded || 0
        ]
      );

      return await this.findById(result.id);
    } catch (error) {
      console.error('Error creating message:', error);
      throw new Error(ERROR_MESSAGES.DATABASE_ERROR);
    }
  }

  static async findById(id) {
    try {
      const row = await database.get('SELECT * FROM messages WHERE id = ?', [id]);
      return row ? new Message(row) : null;
    } catch (error) {
      console.error('Error finding message by ID:', error);
      throw new Error(ERROR_MESSAGES.DATABASE_ERROR);
    }
  }

  static async findByUserId(userId, limit = 50) {
    try {
      const rows = await database.all(
        'SELECT * FROM messages WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?',
        [userId, limit]
      );
      return rows.map(row => new Message(row));
    } catch (error) {
      console.error('Error finding messages by user ID:', error);
      throw new Error(ERROR_MESSAGES.DATABASE_ERROR);
    }
  }

  static async getMessageStats(userId, guildId = null) {
    try {
      let query = `
        SELECT 
          COUNT(*) as total_messages,
          SUM(CASE WHEN message_type = 'text_only' THEN 1 ELSE 0 END) as text_messages,
          SUM(CASE WHEN message_type = 'emoji_rich' THEN 1 ELSE 0 END) as emoji_messages,
          SUM(CASE WHEN message_type = 'link_share' THEN 1 ELSE 0 END) as link_messages,
          SUM(CASE WHEN message_type = 'image_upload' THEN 1 ELSE 0 END) as image_messages,
          AVG(text_length) as avg_text_length,
          SUM(emoji_count) as total_emojis,
          SUM(link_count) as total_links,
          SUM(image_count) as total_images,
          SUM(points_awarded) as total_points_from_messages
        FROM messages 
        WHERE user_id = ?
      `;
      
      const params = [userId];
      
      if (guildId) {
        query += ' AND guild_id = ?';
        params.push(guildId);
      }

      const row = await database.get(query, params);
      return row || {};
    } catch (error) {
      console.error('Error getting message stats:', error);
      throw new Error(ERROR_MESSAGES.DATABASE_ERROR);
    }
  }

  static async getGuildMessageStats(guildId, timeframe = null) {
    try {
      let query = `
        SELECT 
          COUNT(*) as total_messages,
          COUNT(DISTINCT user_id) as active_users,
          SUM(CASE WHEN message_type = 'text_only' THEN 1 ELSE 0 END) as text_messages,
          SUM(CASE WHEN message_type = 'emoji_rich' THEN 1 ELSE 0 END) as emoji_messages,
          SUM(CASE WHEN message_type = 'link_share' THEN 1 ELSE 0 END) as link_messages,
          SUM(CASE WHEN message_type = 'image_upload' THEN 1 ELSE 0 END) as image_messages,
          AVG(text_length) as avg_text_length
        FROM messages 
        WHERE guild_id = ?
      `;
      
      const params = [guildId];
      
      if (timeframe) {
        query += ' AND timestamp >= datetime(?, "unixepoch")';
        params.push(timeframe);
      }

      const row = await database.get(query, params);
      return row || {};
    } catch (error) {
      console.error('Error getting guild message stats:', error);
      throw new Error(ERROR_MESSAGES.DATABASE_ERROR);
    }
  }

  static async getTopActiveUsers(guildId, limit = 10, timeframe = null) {
    try {
      let query = `
        SELECT 
          user_id,
          COUNT(*) as message_count,
          SUM(points_awarded) as points_earned
        FROM messages 
        WHERE guild_id = ?
      `;
      
      const params = [guildId];
      
      if (timeframe) {
        query += ' AND timestamp >= datetime(?, "unixepoch")';
        params.push(timeframe);
      }
      
      query += ' GROUP BY user_id ORDER BY message_count DESC LIMIT ?';
      params.push(limit);

      const rows = await database.all(query, params);
      return rows;
    } catch (error) {
      console.error('Error getting top active users:', error);
      throw new Error(ERROR_MESSAGES.DATABASE_ERROR);
    }
  }

  static async getMessagesByTimeframe(guildId, hours = 24) {
    try {
      const timeframe = Math.floor(Date.now() / 1000) - (hours * 3600);
      
      const rows = await database.all(
        `SELECT 
           strftime('%H', datetime(timestamp, 'unixepoch')) as hour,
           COUNT(*) as count
         FROM messages 
         WHERE guild_id = ? AND timestamp >= datetime(?, 'unixepoch')
         GROUP BY hour
         ORDER BY hour`,
        [guildId, timeframe]
      );
      
      return rows;
    } catch (error) {
      console.error('Error getting messages by timeframe:', error);
      throw new Error(ERROR_MESSAGES.DATABASE_ERROR);
    }
  }

  static async getMessageTypeDistribution(userId, guildId = null) {
    try {
      let query = `
        SELECT 
          message_type,
          COUNT(*) as count,
          (COUNT(*) * 100.0 / (SELECT COUNT(*) FROM messages WHERE user_id = ?)) as percentage
        FROM messages 
        WHERE user_id = ?
      `;
      
      const params = [userId, userId];
      
      if (guildId) {
        query = query.replace(/user_id = \?/g, 'user_id = ? AND guild_id = ?');
        params.push(guildId);
        params.push(guildId);
      }
      
      query += ' GROUP BY message_type ORDER BY count DESC';
      
      const rows = await database.all(query, params);
      return rows;
    } catch (error) {
      console.error('Error getting message type distribution:', error);
      throw new Error(ERROR_MESSAGES.DATABASE_ERROR);
    }
  }

  async delete() {
    try {
      await database.run('DELETE FROM messages WHERE id = ?', [this.id]);
      return true;
    } catch (error) {
      console.error('Error deleting message:', error);
      throw new Error(ERROR_MESSAGES.DATABASE_ERROR);
    }
  }

  static async deleteOldMessages(daysOld = 365) {
    try {
      const cutoffDate = Math.floor(Date.now() / 1000) - (daysOld * 24 * 3600);
      const result = await database.run(
        'DELETE FROM messages WHERE timestamp < datetime(?, "unixepoch")',
        [cutoffDate]
      );
      
      return result.changes;
    } catch (error) {
      console.error('Error deleting old messages:', error);
      throw new Error(ERROR_MESSAGES.DATABASE_ERROR);
    }
  }
}

module.exports = Message;