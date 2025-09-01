const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const UserStatsService = require('../../services/UserStatsService');
const User = require('../../models/User');
const Formatters = require('../../utils/formatters');
const { COLORS } = require('../../utils/constants');

const userStatsService = new UserStatsService();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('查看排行榜')
    .addStringOption(option =>
      option.setName('type')
        .setDescription('排行榜類型')
        .setRequired(false)
        .addChoices(
          { name: '積分排行', value: 'points' },
          { name: '等級排行', value: 'level' },
          { name: '訊息數排行', value: 'messages' },
          { name: '活躍度排行', value: 'activity' }
        )
    )
    .addIntegerOption(option =>
      option.setName('limit')
        .setDescription('顯示人數 (1-50)')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(50)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const type = interaction.options.getString('type') || 'points';
      const limit = interaction.options.getInteger('limit') || 10;

      let users;
      let title;
      let description;

      switch (type) {
        case 'points':
          users = await User.getLeaderboard('points', limit);
          title = '🏆 積分排行榜';
          description = '根據總積分排序';
          break;
        case 'level':
          users = await User.getLeaderboard('level', limit);
          title = '⭐ 等級排行榜';
          description = '根據等級和積分排序';
          break;
        case 'messages':
          users = await User.getLeaderboard('messages', limit);
          title = '💬 訊息數排行榜';
          description = '根據總訊息數排序';
          break;
        case 'activity':
          users = await userStatsService.getGuildUserStats(interaction.guild.id, 'activity', limit);
          title = '⚡ 活躍度排行榜';
          description = '根據綜合活躍度排序';
          break;
        default:
          users = await User.getLeaderboard('points', limit);
          title = '🏆 積分排行榜';
          description = '根據總積分排序';
      }

      if (!users || users.length === 0) {
        const embed = Formatters.createInfoEmbed('排行榜', '目前沒有任何資料');
        return await interaction.editReply({ embeds: [embed] });
      }

      // Create leaderboard embed
      const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(COLORS.PRIMARY)
        .setTimestamp()
        .setFooter({ text: `顯示前 ${users.length} 名用戶` });

      // Build leaderboard text
      let leaderboardText = '';
      
      for (let i = 0; i < users.length; i++) {
        const userData = type === 'activity' ? users[i].user : users[i];
        const rank = i + 1;
        const medal = this.getRankMedal(rank);
        
        // Get member from guild
        const member = interaction.guild.members.cache.get(userData.discord_id);
        const displayName = member?.displayName || userData.display_name || userData.username;

        let valueText;
        switch (type) {
          case 'points':
            valueText = `${Formatters.formatPoints(userData.total_points)} 積分`;
            break;
          case 'level':
            valueText = `${Formatters.formatLevel(userData.level)} (${Formatters.formatPoints(userData.total_points)} 積分)`;
            break;
          case 'messages':
            valueText = `${userData.total_messages.toLocaleString()} 訊息`;
            break;
          case 'activity':
            const stats = users[i].stats;
            const totalMessages = stats.textMessages + stats.emojiMessages + stats.linkMessages + stats.imageMessages;
            valueText = `${totalMessages.toLocaleString()} 活動 | ${Formatters.formatInteractionStyle(stats.interactionStyle).split(' - ')[0]}`;
            break;
        }

        leaderboardText += `${medal} **${displayName}**\n${valueText}\n\n`;
      }

      embed.setDescription(`${description}\n\n${leaderboardText}`);

      // Add select menu for switching leaderboard types
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('leaderboard_type')
        .setPlaceholder('選擇其他排行榜')
        .addOptions([
          {
            label: '積分排行榜',
            description: '根據總積分排序',
            value: 'points',
            emoji: '🏆'
          },
          {
            label: '等級排行榜', 
            description: '根據等級排序',
            value: 'level',
            emoji: '⭐'
          },
          {
            label: '訊息數排行榜',
            description: '根據總訊息數排序',
            value: 'messages',
            emoji: '💬'
          },
          {
            label: '活躍度排行榜',
            description: '根據綜合活躍度排序',
            value: 'activity',
            emoji: '⚡'
          }
        ]);

      const row = new ActionRowBuilder().addComponents(selectMenu);

      await interaction.editReply({ 
        embeds: [embed], 
        components: [row] 
      });

    } catch (error) {
      console.error('Error in leaderboard command:', error);
      const errorEmbed = Formatters.createErrorEmbed(
        error.message || '無法獲取排行榜資料，請稍後再試'
      );
      await interaction.editReply({ embeds: [errorEmbed] });
    }
  },

  async handleSelectMenu(interaction) {
    if (interaction.customId !== 'leaderboard_type') return;

    await interaction.deferUpdate();

    try {
      const type = interaction.values[0];
      const limit = 10; // Default limit for select menu interactions

      let users;
      let title;
      let description;

      switch (type) {
        case 'points':
          users = await User.getLeaderboard('points', limit);
          title = '🏆 積分排行榜';
          description = '根據總積分排序';
          break;
        case 'level':
          users = await User.getLeaderboard('level', limit);
          title = '⭐ 等級排行榜';
          description = '根據等級和積分排序';
          break;
        case 'messages':
          users = await User.getLeaderboard('messages', limit);
          title = '💬 訊息數排行榜';
          description = '根據總訊息數排序';
          break;
        case 'activity':
          users = await userStatsService.getGuildUserStats(interaction.guild.id, 'activity', limit);
          title = '⚡ 活躍度排行榜';
          description = '根據綜合活躍度排序';
          break;
      }

      if (!users || users.length === 0) {
        const embed = Formatters.createInfoEmbed('排行榜', '目前沒有任何資料');
        return await interaction.editReply({ embeds: [embed], components: [] });
      }

      // Create updated embed
      const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(COLORS.PRIMARY)
        .setTimestamp()
        .setFooter({ text: `顯示前 ${users.length} 名用戶` });

      // Build leaderboard text
      let leaderboardText = '';
      
      for (let i = 0; i < users.length; i++) {
        const userData = type === 'activity' ? users[i].user : users[i];
        const rank = i + 1;
        const medal = this.getRankMedal(rank);
        
        const member = interaction.guild.members.cache.get(userData.discord_id);
        const displayName = member?.displayName || userData.display_name || userData.username;

        let valueText;
        switch (type) {
          case 'points':
            valueText = `${Formatters.formatPoints(userData.total_points)} 積分`;
            break;
          case 'level':
            valueText = `${Formatters.formatLevel(userData.level)} (${Formatters.formatPoints(userData.total_points)} 積分)`;
            break;
          case 'messages':
            valueText = `${userData.total_messages.toLocaleString()} 訊息`;
            break;
          case 'activity':
            const stats = users[i].stats;
            const totalMessages = stats.textMessages + stats.emojiMessages + stats.linkMessages + stats.imageMessages;
            valueText = `${totalMessages.toLocaleString()} 活動 | ${Formatters.formatInteractionStyle(stats.interactionStyle).split(' - ')[0]}`;
            break;
        }

        leaderboardText += `${medal} **${displayName}**\n${valueText}\n\n`;
      }

      embed.setDescription(`${description}\n\n${leaderboardText}`);

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error handling leaderboard select menu:', error);
      const errorEmbed = Formatters.createErrorEmbed('處理選單時發生錯誤');
      await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
    }
  },

  getRankMedal(rank) {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `**${rank}.**`;
    }
  }
};