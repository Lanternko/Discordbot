const { EMOJI_REGEX, URL_REGEX, DISCORD_EMOJI_REGEX, UNICODE_EMOJI_REGEX } = require('../utils/constants');
const config = require('../config/bot');

class MessageAnalyzer {
  constructor() {
    this.emojiRegex = EMOJI_REGEX;
    this.urlRegex = URL_REGEX;
    this.discordEmojiRegex = DISCORD_EMOJI_REGEX;
    this.unicodeEmojiRegex = UNICODE_EMOJI_REGEX;
  }

  analyzeMessage(message) {
    const content = message.content || '';
    const attachments = message.attachments;
    
    const analysis = {
      hasText: false,
      hasEmojis: false,
      hasLinks: false,
      hasImages: false,
      textLength: 0,
      emojiCount: 0,
      linkCount: 0,
      imageCount: 0,
      messageType: '',
      emojis: [],
      links: []
    };

    // Analyze text content
    if (content.length > 0) {
      analysis.hasText = true;
      analysis.textLength = content.length;
    }

    // Analyze emojis
    const emojiMatches = this.extractEmojis(content);
    if (emojiMatches.length > 0) {
      analysis.hasEmojis = true;
      analysis.emojiCount = emojiMatches.length;
      analysis.emojis = emojiMatches;
    }

    // Analyze links
    const linkMatches = content.match(this.urlRegex);
    if (linkMatches) {
      analysis.hasLinks = true;
      analysis.linkCount = linkMatches.length;
      analysis.links = linkMatches;
    }

    // Analyze attachments (images)
    if (attachments && attachments.size > 0) {
      const imageAttachments = attachments.filter(attachment => 
        attachment.contentType && attachment.contentType.startsWith('image/')
      );
      
      if (imageAttachments.size > 0) {
        analysis.hasImages = true;
        analysis.imageCount = imageAttachments.size;
      }
    }

    // Determine message type
    analysis.messageType = this.determineMessageType(analysis);

    return analysis;
  }

  extractEmojis(content) {
    const emojis = [];
    let processedContent = content;
    
    // Extract custom Discord emojis in <:name:id> format FIRST
    const discordEmojiMatches = [...content.matchAll(this.discordEmojiRegex)];
    for (const match of discordEmojiMatches) {
      emojis.push({
        type: 'custom',
        name: match[1],
        id: match[2],
        full: match[0]
      });
      // Remove this emoji from content to avoid processing its ID as unicode
      processedContent = processedContent.replace(match[0], '');
    }

    // Extract custom emojis in :name: format (shortcode) from remaining content
    const customEmojiShortcodeRegex = /:([a-zA-Z0-9_]+):/g;
    const shortcodeMatches = [...processedContent.matchAll(customEmojiShortcodeRegex)];
    for (const match of shortcodeMatches) {
      // Avoid duplicates from already processed <:name:id> format
      const alreadyProcessed = emojis.some(emoji => emoji.name === match[1]);
      if (!alreadyProcessed) {
        emojis.push({
          type: 'custom',
          name: match[1],
          id: null,
          full: match[0]
        });
      }
      // Remove processed shortcode
      processedContent = processedContent.replace(match[0], '');
    }

    // Extract Unicode emojis from remaining content only
    const unicodeEmojiMatches = [...processedContent.matchAll(this.unicodeEmojiRegex)];
    for (const match of unicodeEmojiMatches) {
      emojis.push({
        type: 'unicode',
        name: match[0],
        id: null,
        full: match[0]
      });
    }

    return emojis;
  }

  determineMessageType(analysis) {
    // Priority order for mixed content:
    // 1. If has images -> image_upload
    // 2. If has links -> link_share  
    // 3. If has significant emojis -> emoji_rich
    // 4. Default to text_only (including mixed content as specified)

    if (analysis.hasImages) {
      return config.messageTypes.IMAGE_UPLOAD;
    }

    if (analysis.hasLinks) {
      return config.messageTypes.LINK_SHARE;
    }

    // Consider emoji-rich if emojis make up significant portion
    if (analysis.hasEmojis && analysis.emojiCount >= 3) {
      return config.messageTypes.EMOJI_RICH;
    }

    // Default to text_only (includes mixed content and simple text)
    return config.messageTypes.TEXT_ONLY;
  }

  analyzeInteractionStyle(userStats) {
    if (!userStats || userStats.total_messages === 0) {
      return config.interactionStyles.BALANCED;
    }

    const totalMessages = userStats.total_text_messages + 
                         userStats.total_emoji_messages + 
                         userStats.total_link_messages + 
                         userStats.total_image_messages;

    if (totalMessages === 0) {
      return config.interactionStyles.BALANCED;
    }

    const textRatio = userStats.total_text_messages / totalMessages;
    const emojiRatio = userStats.total_emoji_messages / totalMessages;
    const linkRatio = userStats.total_link_messages / totalMessages;
    const imageRatio = userStats.total_image_messages / totalMessages;
    const avgTextLength = userStats.avg_text_length || 0;

    // Text focused: High text ratio and longer messages
    if (textRatio >= 0.7 && avgTextLength >= 20) {
      return config.interactionStyles.TEXT_FOCUSED;
    }

    // Emoji expressive: High emoji usage ratio
    if (emojiRatio >= 0.4) {
      return config.interactionStyles.EMOJI_EXPRESSIVE;
    }

    // Link sharer: High link sharing ratio
    if (linkRatio >= 0.3) {
      return config.interactionStyles.LINK_SHARER;
    }

    // Visual contributor: High image sharing ratio
    if (imageRatio >= 0.2) {
      return config.interactionStyles.VISUAL_CONTRIBUTOR;
    }

    // Default to balanced
    return config.interactionStyles.BALANCED;
  }

  generateContentSummary(analysis) {
    const parts = [];

    if (analysis.hasText) {
      parts.push(`文字: ${analysis.textLength}字`);
    }

    if (analysis.hasEmojis) {
      parts.push(`表情: ${analysis.emojiCount}個`);
    }

    if (analysis.hasLinks) {
      parts.push(`連結: ${analysis.linkCount}個`);
    }

    if (analysis.hasImages) {
      parts.push(`圖片: ${analysis.imageCount}張`);
    }

    return parts.join(' | ');
  }

  isSpamMessage(message, userLastMessageTime) {
    const now = Date.now();
    const timeSinceLastMessage = (now - userLastMessageTime) / 1000;
    
    // Check cooldown
    if (timeSinceLastMessage < config.bot.cooldownSeconds) {
      return true;
    }

    // Check for very short repeated messages
    if (message.content && message.content.length < 3) {
      return true;
    }

    // Check for excessive emoji spam
    const analysis = this.analyzeMessage(message);
    if (analysis.emojiCount > 10 && analysis.textLength < 10) {
      return true;
    }

    return false;
  }

  getMessageQualityScore(analysis) {
    let score = 0;

    // Base score for having content
    if (analysis.hasText && analysis.textLength > 0) {
      score += Math.min(analysis.textLength / 10, 10); // Max 10 points for text length
    }

    // Bonus for diverse content
    if (analysis.hasEmojis) score += 2;
    if (analysis.hasLinks) score += 3;
    if (analysis.hasImages) score += 5;

    // Penalty for excessive emoji usage
    if (analysis.emojiCount > 5 && analysis.textLength < analysis.emojiCount) {
      score -= 2;
    }

    return Math.max(0, Math.min(20, score)); // Score between 0-20
  }

  extractMentions(message) {
    const mentions = {
      users: [],
      roles: [],
      channels: [],
      everyone: false
    };

    if (message.mentions) {
      mentions.users = message.mentions.users.map(user => ({
        id: user.id,
        username: user.username,
        displayName: user.displayName
      }));

      mentions.roles = message.mentions.roles.map(role => ({
        id: role.id,
        name: role.name
      }));

      mentions.channels = message.mentions.channels.map(channel => ({
        id: channel.id,
        name: channel.name,
        type: channel.type
      }));

      mentions.everyone = message.mentions.everyone;
    }

    return mentions;
  }

  shouldAwardPoints(message, userLastMessageTime, analysis) {
    // Check spam
    if (this.isSpamMessage(message, userLastMessageTime)) {
      return false;
    }

    // Require minimum content quality
    const qualityScore = this.getMessageQualityScore(analysis);
    if (qualityScore < 1) {
      return false;
    }

    // Don't award points for bot messages
    if (message.author.bot) {
      return false;
    }

    return true;
  }
}

module.exports = MessageAnalyzer;