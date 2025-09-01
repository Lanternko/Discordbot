const { COLORS, TIME_CONSTANTS } = require('./constants');

class Formatters {
  static formatPoints(points) {
    if (points < 1000) {
      return points.toString();
    } else if (points < 1000000) {
      return `${(points / 1000).toFixed(1)}K`;
    } else {
      return `${(points / 1000000).toFixed(1)}M`;
    }
  }

  static formatLevel(level) {
    return `Lv.${level}`;
  }

  static formatCoins(coins) {
    return `${coins.toLocaleString()} 💰`;
  }

  static formatPercentage(value, total) {
    if (total === 0) return '0%';
    return `${((value / total) * 100).toFixed(1)}%`;
  }

  static formatDuration(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}天 ${hours % 24}小時`;
    } else if (hours > 0) {
      return `${hours}小時 ${minutes % 60}分鐘`;
    } else if (minutes > 0) {
      return `${minutes}分鐘 ${seconds % 60}秒`;
    } else {
      return `${seconds}秒`;
    }
  }

  static formatDate(date) {
    return new Date(date).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  static formatRelativeTime(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < TIME_CONSTANTS.MINUTE) {
      return '剛剛';
    } else if (diff < TIME_CONSTANTS.HOUR) {
      const minutes = Math.floor(diff / TIME_CONSTANTS.MINUTE);
      return `${minutes}分鐘前`;
    } else if (diff < TIME_CONSTANTS.DAY) {
      const hours = Math.floor(diff / TIME_CONSTANTS.HOUR);
      return `${hours}小時前`;
    } else if (diff < TIME_CONSTANTS.WEEK) {
      const days = Math.floor(diff / TIME_CONSTANTS.DAY);
      return `${days}天前`;
    } else {
      return this.formatDate(timestamp);
    }
  }

  static createProgressBar(current, max, length = 10) {
    const progress = Math.min(current / max, 1);
    const filled = Math.floor(progress * length);
    const empty = length - filled;
    
    return '█'.repeat(filled) + '░'.repeat(empty);
  }

  static formatUserStats(stats) {
    return {
      level: this.formatLevel(stats.level),
      points: this.formatPoints(stats.total_points),
      coins: this.formatCoins(stats.coins),
      messages: stats.total_messages.toLocaleString(),
      joinDate: this.formatDate(stats.created_at)
    };
  }

  static formatLeaderboard(users, type = 'points') {
    return users.map((user, index) => {
      const rank = index + 1;
      const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;
      
      let value;
      switch (type) {
        case 'points':
          value = this.formatPoints(user.total_points);
          break;
        case 'level':
          value = this.formatLevel(user.level);
          break;
        case 'messages':
          value = user.total_messages.toLocaleString();
          break;
        default:
          value = user[type];
      }
      
      return `${medal} **${user.display_name || user.username}** - ${value}`;
    }).join('\n');
  }

  static formatMessageTypeStats(stats) {
    const total = stats.total_text_messages + stats.total_emoji_messages + 
                 stats.total_link_messages + stats.total_image_messages;
    
    if (total === 0) return '尚無資料';

    return [
      `📝 文字討論: ${stats.total_text_messages} (${this.formatPercentage(stats.total_text_messages, total)})`,
      `😀 表情回應: ${stats.total_emoji_messages} (${this.formatPercentage(stats.total_emoji_messages, total)})`,
      `🔗 連結分享: ${stats.total_link_messages} (${this.formatPercentage(stats.total_link_messages, total)})`,
      `🖼️ 圖片上傳: ${stats.total_image_messages} (${this.formatPercentage(stats.total_image_messages, total)})`
    ].join('\n');
  }

  static formatInteractionStyle(style) {
    const styleMap = {
      'text_focused': '📝 文字派 - 喜歡深度討論',
      'emoji_expressive': '😀 表情派 - 愛用貼圖表達',
      'link_sharer': '🔗 分享派 - 經常分享連結',
      'visual_contributor': '🖼️ 視覺派 - 愛分享圖片',
      'balanced': '⚖️ 平衡型 - 多元互動風格'
    };
    
    return styleMap[style] || '🔍 分析中...';
  }

  static createEmbed(title, description, color = COLORS.PRIMARY) {
    return {
      title,
      description,
      color,
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Discord Stats Bot'
      }
    };
  }

  static createErrorEmbed(message) {
    return this.createEmbed('❌ 錯誤', message, COLORS.DANGER);
  }

  static createSuccessEmbed(message) {
    return this.createEmbed('✅ 成功', message, COLORS.SUCCESS);
  }

  static createInfoEmbed(title, message) {
    return this.createEmbed(title, message, COLORS.INFO);
  }

  static createWarningEmbed(message) {
    return this.createEmbed('⚠️ 警告', message, COLORS.WARNING);
  }
}

module.exports = Formatters;