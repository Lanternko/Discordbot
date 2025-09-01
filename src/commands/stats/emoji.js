const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const EmojiStatsService = require('../../services/EmojiStatsService');
const Formatters = require('../../utils/formatters');
const { COLORS } = require('../../utils/constants');

const emojiStatsService = new EmojiStatsService();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('emoji')
    .setDescription('貼圖使用統計')
    .addIntegerOption(option =>
      option.setName('limit')
        .setDescription('顯示數量 (1-20)')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(20)
    ),

  async execute(interaction) {
    try {
      console.log(`🔍 Processing emoji command for guild ${interaction.guild.id}`);
      
      // 立即回應，不使用 defer
      // await interaction.deferReply();
      const limit = interaction.options.getInteger('limit') || 10;
      const guildId = interaction.guild.id;

      const stats = await emojiStatsService.getGuildEmojiStats(guildId, limit);

      if (!stats || stats.length === 0) {
        const embed = Formatters.createInfoEmbed('貼圖統計', '目前沒有任何貼圖使用記錄');
        return await interaction.editReply({ embeds: [embed] });
      }

      const embed = new EmbedBuilder()
        .setTitle('貼圖使用統計')
        .setColor(COLORS.PRIMARY)
        .setTimestamp();

      // Simple numbered list
      let statsText = '';
      for (let i = 0; i < Math.min(stats.length, limit); i++) {
        const stat = stats[i];
        const rank = i + 1;
        
        let emojiDisplay = '';
        if (stat.emoji_type === 'custom') {
          if (stat.emoji_id && stat.emoji_id !== 'unknown') {
            emojiDisplay = `<:${stat.emoji_name}:${stat.emoji_id}>`;
          } else {
            const guildEmoji = interaction.guild.emojis.cache.find(e => e.name === stat.emoji_name);
            if (guildEmoji) {
              emojiDisplay = `<:${stat.emoji_name}:${guildEmoji.id}>`;
            } else {
              emojiDisplay = `:${stat.emoji_name}:`;
            }
          }
        } else {
          emojiDisplay = stat.emoji_name;
        }
        
        statsText += `${rank}. ${emojiDisplay} - ${stat.total_usage} 次\n`;
      }

      embed.setDescription(statsText);
      embed.setFooter({ text: `顯示前 ${Math.min(stats.length, limit)} 個貼圖` });

      await interaction.reply({ embeds: [embed] });

    } catch (error) {
      console.error('❌ Error executing emoji command:', error);
      
      const errorEmbed = Formatters.createErrorEmbed(
        error.message || '無法獲取貼圖統計資料，請稍後再試'
      );
      try {
        await interaction.reply({ embeds: [errorEmbed] });
      } catch (replyError) {
        console.error('❌ Failed to send error reply:', replyError);
      }
    }
  }
};