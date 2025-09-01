const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/constants');
const database = require('../../config/database');
const emojiStatsService = require('../../services/EmojiStatsService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reset')
    .setDescription('[管理員] 重置統計資料')
    .addStringOption(option =>
      option.setName('type')
        .setDescription('要重置的資料類型')
        .setRequired(true)
        .addChoices(
          { name: '貼圖統計', value: 'emoji' },
          { name: '所有統計', value: 'all' }
        )
    )
    .addStringOption(option =>
      option.setName('confirm')
        .setDescription('輸入 "CONFIRM" 確認重置（不可復原）')
        .setRequired(true)
    )
    .setDefaultMemberPermissions('0'), // Require admin permission

  async execute(interaction) {
    // Multiple permission checks for safety
    
    // 1. Check if user has administrator permission
    if (!interaction.member.permissions.has('Administrator')) {
      const errorEmbed = new EmbedBuilder()
        .setTitle('❌ 權限不足')
        .setDescription('此指令需要管理員權限')
        .setColor(COLORS.DANGER);
      
      return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }

    // 2. Check confirmation string
    const confirmText = interaction.options.getString('confirm');
    if (confirmText !== 'CONFIRM') {
      const errorEmbed = new EmbedBuilder()
        .setTitle('❌ 確認失敗')
        .setDescription('請輸入 "CONFIRM" 來確認重置操作\n\n⚠️ **此操作不可復原！**')
        .setColor(COLORS.WARNING);
      
      return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }

    // 3. Additional safety check - only guild owner or specific users
    const isGuildOwner = interaction.user.id === interaction.guild.ownerId;
    const allowedUsers = ['你的Discord用戶ID']; // 可以添加特定用戶ID
    
    if (!isGuildOwner && !allowedUsers.includes(interaction.user.id)) {
      const errorEmbed = new EmbedBuilder()
        .setTitle('❌ 權限不足')
        .setDescription('只有伺服器擁有者可以執行重置操作')
        .setColor(COLORS.DANGER);
      
      return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const resetType = interaction.options.getString('type');
      let deletedRecords = 0;

      // Log the reset operation
      console.log(`🛡️ RESET OPERATION: User ${interaction.user.tag} (${interaction.user.id}) is resetting ${resetType} data for guild ${interaction.guild.name} (${interaction.guild.id})`);

      switch (resetType) {
        case 'emoji':
          // Reset emoji usage data
          const emojiResult = await database.run('DELETE FROM emoji_usage WHERE guild_id = ?', [interaction.guild.id]);
          deletedRecords = emojiResult.changes || 0;
          break;

        case 'all':
          // Reset all data for this guild
          const results = await Promise.all([
            database.run('DELETE FROM emoji_usage WHERE guild_id = ?', [interaction.guild.id]),
            database.run('DELETE FROM messages WHERE guild_id = ?', [interaction.guild.id]),
            database.run('DELETE FROM user_stats WHERE guild_id = ?', [interaction.guild.id])
          ]);
          deletedRecords = results.reduce((sum, result) => sum + (result.changes || 0), 0);
          break;

        default:
          throw new Error('無效的重置類型');
      }

      // Clear emoji stats cache to ensure consistency
      emojiStatsService.clearCache();
      console.log('🗑️ Emoji stats cache cleared due to reset.');

      const successEmbed = new EmbedBuilder()
        .setTitle('✅ 重置完成')
        .setDescription(
          `**已清除 ${deletedRecords} 筆記錄**\n` +
          `類型: ${resetType === 'emoji' ? '貼圖統計' : '所有統計'}\n` +
          `執行者: ${interaction.user.tag}\n` +
          `時間: ${new Date().toLocaleString('zh-TW')}`
        )
        .setColor(COLORS.SUCCESS)
        .setTimestamp()
        .setFooter({ text: '此操作已被記錄' });

      await interaction.editReply({ embeds: [successEmbed] });

      // Additional logging to console
      console.log(`✅ Reset completed: ${deletedRecords} records deleted`);

    } catch (error) {
      console.error('❌ Error in reset command:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setTitle('❌ 重置失敗')
        .setDescription(error.message || '發生未知錯誤')
        .setColor(COLORS.DANGER);

      await interaction.editReply({ embeds: [errorEmbed] });
    }
  },
};