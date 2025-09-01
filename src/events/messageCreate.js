const { Events } = require('discord.js');
const User = require('../models/User');
const Message = require('../models/Message');
const MessageAnalyzer = require('../services/MessageAnalyzer');
const PointsService = require('../services/PointsService');
const EmojiStatsService = require('../services/EmojiStatsService');
const Formatters = require('../utils/formatters');
const config = require('../config/bot');

const messageAnalyzer = new MessageAnalyzer();
const pointsService = new PointsService();
const emojiStatsService = new EmojiStatsService();

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    // Ignore bot messages and system messages
    if (message.author.bot || message.system) {
      return;
    }
    
    // Ignore messages that are replies to slash commands (interaction responses)
    if (message.interaction) {
      return;
    }
    
    // Additional filter: ignore any message from the bot itself (by ID)
    const currentBotId = message.client.user.id;
    if (message.author.id === currentBotId) {
      return;
    }

    // Only process guild messages
    if (!message.guild) {
      return;
    }

    try {
      const userId = message.author.id;
      const username = message.author.username;
      const displayName = message.member?.displayName || message.author.displayName;
      const guildId = message.guild.id;
      const channelId = message.channel.id;

      // Analyze the message
      const analysis = messageAnalyzer.analyzeMessage(message);
      
      // Debug: Log emoji analysis
      if (analysis.hasEmojis) {
        console.log(`📊 Emoji Debug - User: ${username}`);
        console.log(`📊 Message content: "${message.content}"`);
        console.log(`📊 Detected emojis:`, analysis.emojis.map(e => `${e.name} (${e.type})`));
      }
      
      // Find or create user to check last message time
      const user = await User.findOrCreate(userId, username, displayName);
      
      // Check if we should award points
      const shouldAward = messageAnalyzer.shouldAwardPoints(
        message, 
        user.last_message_time, 
        analysis
      );

      let pointsResult = null;
      if (shouldAward) {
        // Award points
        pointsResult = await pointsService.awardPoints(
          userId,
          username,
          displayName,
          guildId,
          analysis
        );

        // Send level up notification
        if (pointsResult.success && pointsResult.levelUp) {
          await sendLevelUpNotification(message, pointsResult);
        }
      }

      // Record emoji usage if enabled
      if (config.features.enableEmojiStats && analysis.hasEmojis) {
        console.log(`🔢 Recording ${analysis.emojis.length} emojis for user ${username}`);
        await emojiStatsService.recordEmojiUsage(userId, guildId, analysis.emojis);
      }

      // Store message record if content analysis is enabled
      if (config.features.enableContentAnalysis) {
        await Message.create({
          discord_id: message.id,
          user_id: userId,
          guild_id: guildId,
          channel_id: channelId,
          content: message.content || '',
          message_type: analysis.messageType,
          text_length: analysis.textLength,
          emoji_count: analysis.emojiCount,
          link_count: analysis.linkCount,
          image_count: analysis.imageCount,
          points_awarded: pointsResult?.success ? pointsResult.pointsAwarded : 0
        });
      }

      // Log activity (optional, for debugging)
      if (process.env.NODE_ENV === 'development') {
        console.log(`📝 ${username} in #${message.channel.name}: ${analysis.messageType} | Points: ${pointsResult?.success ? pointsResult.pointsAwarded : 0}`);
      }

    } catch (error) {
      console.error('❌ Error processing message:', error);
      
      // Don't send error messages to users for message processing failures
      // to avoid spam, just log the error
    }
  },
};

async function sendLevelUpNotification(message, pointsResult) {
  try {
    const user = pointsResult.user;
    const progress = user.getNextLevelProgress();
    
    const embed = Formatters.createSuccessEmbed(
      `🎉 **${message.member?.displayName || message.author.username}** 升級了！\n\n` +
      `${Formatters.formatLevel(pointsResult.newLevel - 1)} → ${Formatters.formatLevel(pointsResult.newLevel)}\n` +
      `總積分: ${Formatters.formatPoints(user.total_points)}\n` +
      (pointsResult.coinsEarned > 0 ? `獲得金幣: ${Formatters.formatCoins(pointsResult.coinsEarned)}\n` : '') +
      `\n下一級進度: ${progress.current}/${progress.required} (${progress.percentage}%)\n` +
      `${Formatters.createProgressBar(progress.current, progress.required)}`
    );

    embed.title = '🎊 等級提升！';
    embed.thumbnail = { url: message.author.displayAvatarURL({ dynamic: true }) };

    await message.reply({ embeds: [embed] });

  } catch (error) {
    console.error('❌ Error sending level up notification:', error);
  }
}

// Helper function to handle rate limiting and cooldowns
async function handleCooldownMessage(message, timeLeft) {
  try {
    // Only send cooldown message occasionally to avoid spam
    if (Math.random() < 0.1) { // 10% chance
      const embed = Formatters.createWarningEmbed(
        `請等待 ${Math.ceil(timeLeft)} 秒後再發言獲得積分`
      );
      
      const reply = await message.reply({ embeds: [embed] });
      
      // Delete the warning after 5 seconds
      setTimeout(async () => {
        try {
          await reply.delete();
        } catch (deleteError) {
          // Ignore deletion errors
        }
      }, 5000);
    }
  } catch (error) {
    console.error('❌ Error sending cooldown message:', error);
  }
}