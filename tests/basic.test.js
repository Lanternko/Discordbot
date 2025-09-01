// Basic tests to verify core functionality
const MessageAnalyzer = require('../src/services/MessageAnalyzer');
const PointsService = require('../src/services/PointsService');
const Validators = require('../src/utils/validators');
const Formatters = require('../src/utils/formatters');

describe('MessageAnalyzer', () => {
  const analyzer = new MessageAnalyzer();

  test('should analyze text-only message', () => {
    const mockMessage = {
      content: 'Hello world!',
      attachments: { size: 0 }
    };

    const result = analyzer.analyzeMessage(mockMessage);
    
    expect(result.hasText).toBe(true);
    expect(result.textLength).toBe(12);
    expect(result.messageType).toBe('text_only');
    expect(result.hasEmojis).toBe(false);
  });

  test('should detect emojis in message', () => {
    const mockMessage = {
      content: 'Hello! 😀 <:custom:123456789>',
      attachments: { size: 0 }
    };

    const result = analyzer.analyzeMessage(mockMessage);
    
    expect(result.hasEmojis).toBe(true);
    expect(result.emojiCount).toBeGreaterThan(0);
    expect(result.emojis.length).toBeGreaterThan(0);
  });

  test('should detect links in message', () => {
    const mockMessage = {
      content: 'Check this out: https://example.com',
      attachments: { size: 0 }
    };

    const result = analyzer.analyzeMessage(mockMessage);
    
    expect(result.hasLinks).toBe(true);
    expect(result.linkCount).toBe(1);
    expect(result.messageType).toBe('link_share');
  });
});

describe('PointsService', () => {
  const pointsService = new PointsService();

  test('should calculate quality multiplier correctly', () => {
    const analysis = {
      textLength: 50,
      hasEmojis: true,
      hasLinks: false,
      hasImages: false,
      messageType: 'text_only',
      emojiCount: 2
    };

    const multiplier = pointsService.calculateQualityMultiplier(analysis);
    
    expect(multiplier).toBeGreaterThan(1.0);
    expect(multiplier).toBeLessThanOrEqual(2.0);
  });

  test('should calculate level correctly', () => {
    expect(pointsService.calculateLevel(0)).toBe(1);
    expect(pointsService.calculateLevel(99)).toBe(1);
    expect(pointsService.calculateLevel(100)).toBe(2);
    expect(pointsService.calculateLevel(250)).toBe(3);
  });

  test('should calculate points progress correctly', () => {
    const progress = pointsService.getPointsProgress(150);
    
    expect(progress.currentLevel).toBe(2);
    expect(progress.progress).toBe(50);
    expect(progress.required).toBe(100);
    expect(progress.percentage).toBe(50);
  });
});

describe('Validators', () => {
  test('should validate Discord IDs correctly', () => {
    expect(Validators.isValidDiscordId('123456789012345678')).toBe(true);
    expect(Validators.isValidDiscordId('12345')).toBe(false);
    expect(Validators.isValidDiscordId('abc123')).toBe(false);
    expect(Validators.isValidDiscordId('')).toBe(false);
  });

  test('should validate points correctly', () => {
    expect(Validators.isValidPoints(0)).toBe(true);
    expect(Validators.isValidPoints(100)).toBe(true);
    expect(Validators.isValidPoints(-1)).toBe(false);
    expect(Validators.isValidPoints(3.14)).toBe(false);
    expect(Validators.isValidPoints('100')).toBe(false);
  });

  test('should validate username correctly', () => {
    expect(Validators.isValidUsername('user123')).toBe(true);
    expect(Validators.isValidUsername('u')).toBe(false); // too short
    expect(Validators.isValidUsername('a'.repeat(33))).toBe(false); // too long
    expect(Validators.isValidUsername('')).toBe(false);
  });

  test('should check rate limiting correctly', () => {
    const now = Date.now();
    const recent = now - 15000; // 15 seconds ago
    const old = now - 60000;    // 1 minute ago

    expect(Validators.isRateLimited(recent, 30)).toBe(true);  // still in cooldown
    expect(Validators.isRateLimited(old, 30)).toBe(false);    // cooldown expired
  });
});

describe('Formatters', () => {
  test('should format points correctly', () => {
    expect(Formatters.formatPoints(500)).toBe('500');
    expect(Formatters.formatPoints(1500)).toBe('1.5K');
    expect(Formatters.formatPoints(1500000)).toBe('1.5M');
  });

  test('should format level correctly', () => {
    expect(Formatters.formatLevel(1)).toBe('Lv.1');
    expect(Formatters.formatLevel(25)).toBe('Lv.25');
  });

  test('should format coins correctly', () => {
    expect(Formatters.formatCoins(100)).toBe('100 💰');
    expect(Formatters.formatCoins(1500)).toBe('1,500 💰');
  });

  test('should format percentage correctly', () => {
    expect(Formatters.formatPercentage(25, 100)).toBe('25.0%');
    expect(Formatters.formatPercentage(1, 3)).toBe('33.3%');
    expect(Formatters.formatPercentage(0, 0)).toBe('0%');
  });

  test('should create progress bar correctly', () => {
    const bar = Formatters.createProgressBar(5, 10, 10);
    expect(bar).toHaveLength(10);
    expect(bar).toContain('█');
    expect(bar).toContain('░');
  });

  test('should format interaction style correctly', () => {
    expect(Formatters.formatInteractionStyle('text_focused')).toContain('文字派');
    expect(Formatters.formatInteractionStyle('emoji_expressive')).toContain('表情派');
    expect(Formatters.formatInteractionStyle('invalid')).toContain('分析中');
  });
});

// Integration test
describe('Integration Tests', () => {
  test('should process message analysis to points calculation', () => {
    const analyzer = new MessageAnalyzer();
    const pointsService = new PointsService();

    const mockMessage = {
      content: 'This is a great discussion about the topic! 😊 Thanks for sharing: https://example.com',
      attachments: { size: 0 }
    };

    const analysis = analyzer.analyzeMessage(mockMessage);
    const multiplier = pointsService.calculateQualityMultiplier(analysis);

    expect(analysis.hasText).toBe(true);
    expect(analysis.hasEmojis).toBe(true);
    expect(analysis.hasLinks).toBe(true);
    expect(multiplier).toBeGreaterThan(1.0); // Quality content should get bonus
  });
});