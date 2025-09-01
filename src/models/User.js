const database = require('../config/database');
const Validators = require('../utils/validators');
const { ERROR_MESSAGES } = require('../utils/constants');
const config = require('../config/bot');

class User {
  constructor(data) {
    this.discord_id = data.discord_id;
    this.username = data.username;
    this.display_name = data.display_name;
    this.total_messages = data.total_messages || 0;
    this.total_points = data.total_points || 0;
    this.level = data.level || 1;
    this.coins = data.coins || 0;
    this.last_message_time = data.last_message_time || 0;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  static async findById(discordId) {
    try {
      const row = await database.get(
        'SELECT * FROM users WHERE discord_id = ?',
        [discordId]
      );
      return row ? new User(row) : null;
    } catch (error) {
      console.error('Error finding user by ID:', error);
      throw new Error(ERROR_MESSAGES.DATABASE_ERROR);
    }
  }

  static async findOrCreate(discordId, username, displayName = null) {
    try {
      let user = await this.findById(discordId);
      
      if (!user) {
        user = await this.create({
          discord_id: discordId,
          username: username,
          display_name: displayName
        });
      } else if (user.username !== username || user.display_name !== displayName) {
        // Update username/display_name if changed
        await user.update({
          username: username,
          display_name: displayName
        });
      }
      
      return user;
    } catch (error) {
      console.error('Error finding or creating user:', error);
      throw new Error(ERROR_MESSAGES.DATABASE_ERROR);
    }
  }

  static async create(userData) {
    const validation = Validators.validateUser(userData);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    try {
      await database.run(
        `INSERT INTO users 
         (discord_id, username, display_name, total_messages, total_points, level, coins, last_message_time) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userData.discord_id,
          userData.username,
          userData.display_name || null,
          userData.total_messages || 0,
          userData.total_points || 0,
          userData.level || 1,
          userData.coins || 0,
          userData.last_message_time || 0
        ]
      );

      return await this.findById(userData.discord_id);
    } catch (error) {
      console.error('Error creating user:', error);
      throw new Error(ERROR_MESSAGES.DATABASE_ERROR);
    }
  }

  async update(updateData) {
    try {
      const setClause = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
      const values = [...Object.values(updateData), this.discord_id];
      
      await database.run(
        `UPDATE users SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE discord_id = ?`,
        values
      );

      // Update local properties
      Object.assign(this, updateData);
      return this;
    } catch (error) {
      console.error('Error updating user:', error);
      throw new Error(ERROR_MESSAGES.DATABASE_ERROR);
    }
  }

  async addPoints(points) {
    if (!Validators.isValidPoints(points)) {
      throw new Error(ERROR_MESSAGES.INVALID_INPUT);
    }

    const newPoints = this.total_points + points;
    const currentLevel = this.level;
    const newLevel = Math.floor(newPoints / config.bot.pointsPerLevel) + 1;
    
    const updateData = {
      total_points: newPoints,
      level: Math.min(newLevel, config.bot.maxLevel)
    };

    // Add level up bonus coins
    if (newLevel > currentLevel) {
      updateData.coins = this.coins + (config.rewards.levelUpBonusCoins * (newLevel - currentLevel));
    }

    await this.update(updateData);

    return {
      pointsAdded: points,
      levelUp: newLevel > currentLevel,
      newLevel: updateData.level,
      coinsEarned: updateData.coins - this.coins
    };
  }

  async addCoins(coins) {
    if (!Validators.isValidCoins(coins)) {
      throw new Error(ERROR_MESSAGES.INVALID_INPUT);
    }

    await this.update({ coins: this.coins + coins });
    return this.coins + coins;
  }

  async spendCoins(amount) {
    if (!Validators.isValidCoins(amount)) {
      throw new Error(ERROR_MESSAGES.INVALID_INPUT);
    }

    if (this.coins < amount) {
      throw new Error(ERROR_MESSAGES.INSUFFICIENT_COINS);
    }

    await this.update({ coins: this.coins - amount });
    return this.coins - amount;
  }

  async incrementMessageCount() {
    await this.update({ 
      total_messages: this.total_messages + 1,
      last_message_time: Date.now()
    });
  }

  canEarnPoints() {
    const now = Date.now();
    const timeSinceLastMessage = (now - this.last_message_time) / 1000;
    return timeSinceLastMessage >= config.bot.cooldownSeconds;
  }

  getNextLevelProgress() {
    const currentLevelPoints = (this.level - 1) * config.bot.pointsPerLevel;
    const nextLevelPoints = this.level * config.bot.pointsPerLevel;
    const progress = this.total_points - currentLevelPoints;
    const required = nextLevelPoints - currentLevelPoints;
    
    return {
      current: progress,
      required: required,
      percentage: Math.floor((progress / required) * 100)
    };
  }

  static async getLeaderboard(type = 'points', limit = 10) {
    try {
      let orderBy;
      switch (type) {
        case 'points':
          orderBy = 'total_points DESC';
          break;
        case 'level':
          orderBy = 'level DESC, total_points DESC';
          break;
        case 'messages':
          orderBy = 'total_messages DESC';
          break;
        default:
          orderBy = 'total_points DESC';
      }

      const rows = await database.all(
        `SELECT * FROM users ORDER BY ${orderBy} LIMIT ?`,
        [limit]
      );

      return rows.map(row => new User(row));
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      throw new Error(ERROR_MESSAGES.DATABASE_ERROR);
    }
  }

  static async getUserCount() {
    try {
      const row = await database.get('SELECT COUNT(*) as count FROM users');
      return row.count;
    } catch (error) {
      console.error('Error getting user count:', error);
      throw new Error(ERROR_MESSAGES.DATABASE_ERROR);
    }
  }

  async delete() {
    try {
      await database.run('DELETE FROM users WHERE discord_id = ?', [this.discord_id]);
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw new Error(ERROR_MESSAGES.DATABASE_ERROR);
    }
  }
}

module.exports = User;