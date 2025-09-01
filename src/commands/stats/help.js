const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/constants');
const config = require('../../config/bot');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('顯示機器人使用說明'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('發言稽查員')
      .setDescription('1. **發言統計與積分系統** - 追蹤發言次數，自動積分升級\n2. **貼圖使用分析** - 統計emoji使用情況，生成熱門排行')
      .setColor(COLORS.INFO)
      .setTimestamp();

    // Commands overview
    embed.addFields({
      name: '主要指令',
      value: [
        '`/profile [user]` - 查看個人統計資料',
        '`/leaderboard [type]` - 查看排行榜',
        '`/emoji [limit]` - 查看貼圖統計'
      ].join('\n'),
      inline: true
    });

    // Points system
    embed.addFields({
      name: '積分規則',
      value: [
        `發言獲得 ${config.bot.pointsPerMessage} 積分（${config.bot.cooldownSeconds}秒冷卻）`,
        `每 ${config.bot.pointsPerLevel} 積分升1級`,
        `升級獲得 ${config.rewards.levelUpBonusCoins} 金幣`,
        '訊息品質影響積分加成'
      ].join('\n'),
      inline: true
    });

    // Message analysis - simplified
    embed.addFields({
      name: '分析功能',
      value: [
        '文字討論、表情回應、連結分享、圖片上傳',
        '根據使用習慣識別互動風格',
        '生成個人統計報告和排行榜'
      ].join('\n'),
      inline: false
    });

    await interaction.reply({ embeds: [embed] });
  },

  formatUptime(uptimeMs) {
    const totalSeconds = Math.floor(uptimeMs / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    const parts = [];
    if (days > 0) parts.push(`${days}天`);
    if (hours > 0) parts.push(`${hours}小時`);
    if (minutes > 0) parts.push(`${minutes}分鐘`);

    return parts.join(' ') || '不到1分鐘';
  }
};