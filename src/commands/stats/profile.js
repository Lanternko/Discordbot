const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const UserStatsService = require('../../services/UserStatsService');
const Formatters = require('../../utils/formatters');
const { COLORS } = require('../../utils/constants');

const userStatsService = new UserStatsService();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('查看用戶的詳細統計資料')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('要查看的用戶（留空查看自己）')
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const targetUser = interaction.options.getUser('user') || interaction.user;
      const member = interaction.guild.members.cache.get(targetUser.id);

      // Get detailed user stats
      const stats = await userStatsService.getUserDetailedStats(
        targetUser.id,
        interaction.guild.id
      );

      // Create main profile embed
      const embed = new EmbedBuilder()
        .setTitle(`${member?.displayName || targetUser.username}`)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .setColor(COLORS.PRIMARY)
        .setTimestamp();

      // Basic info - simplified
      embed.addFields({
        name: '等級',
        value: `${Formatters.formatLevel(stats.user.level)} (${Formatters.formatPoints(stats.user.totalPoints)})`,
        inline: true
      });

      embed.addFields({
        name: '金幣',
        value: `${stats.user.coins.toLocaleString()}`,
        inline: true
      });

      // Simplified analysis
      const totalActivity = stats.activity.textMessages + stats.activity.emojiMessages + 
                           stats.activity.linkMessages + stats.activity.imageMessages;
      
      if (totalActivity > 0) {
        const styleText = Formatters.formatInteractionStyle(stats.analysis.interactionStyle);
        const styleIcon = styleText.split(' ')[0]; // Get just the emoji
        const styleName = styleText.split(' - ')[0].replace(/📝|😀|🔗|🖼️|⚖️/g, '').trim();
        
        embed.addFields({
          name: '分析',
          value: `${styleName}\n訊息: ${stats.user.totalMessages} | 參與度: ${stats.analysis.engagementScore}/100`,
          inline: true
        });
      }

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error in profile command:', error);
      const errorEmbed = Formatters.createErrorEmbed(
        error.message || '無法獲取用戶統計資料，請稍後再試'
      );
      await interaction.editReply({ embeds: [errorEmbed] });
    }
  },

  getActivityLevelEmoji(level) {
    const emojis = {
      'new': '🌱',
      'casual': '🚶',
      'active': '🏃',
      'regular': '⚡',
      'power_user': '🚀'
    };
    return emojis[level] || '❓';
  },

  getActivityLevelText(level) {
    const texts = {
      'new': ' 新手',
      'casual': ' 偶爾參與',
      'active': ' 活躍用戶',
      'regular': ' 常客',
      'power_user': ' 超級用戶'
    };
    return texts[level] || ' 未知';
  }
};