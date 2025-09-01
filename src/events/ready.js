const { Events, ActivityType } = require('discord.js');
const User = require('../models/User');

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`🤖 ${client.user.tag} is now online!`);
    console.log(`🎯 Serving ${client.guilds.cache.size} guild(s)`);
    console.log(`👥 Watching ${client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0)} users`);
    
    // Set bot activity
    try {
      const userCount = await User.getUserCount();
      client.user.setActivity(`${userCount} users | /stats help`, {
        type: ActivityType.Watching
      });
      
      console.log(`📊 Tracking ${userCount} registered users`);
    } catch (error) {
      console.error('❌ Error setting bot activity:', error);
      client.user.setActivity('Discord Stats', {
        type: ActivityType.Playing
      });
    }
    
    // Log guild information
    client.guilds.cache.forEach(guild => {
      console.log(`📍 Guild: ${guild.name} (${guild.id}) - ${guild.memberCount} members`);
    });
    
    // Update activity every hour
    setInterval(async () => {
      try {
        const userCount = await User.getUserCount();
        client.user.setActivity(`${userCount} users | /stats help`, {
          type: ActivityType.Watching
        });
      } catch (error) {
        console.error('❌ Error updating bot activity:', error);
      }
    }, 3600000); // 1 hour
    
    console.log('✅ Bot is ready and fully operational!');
  },
};