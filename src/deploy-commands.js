const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config/bot');

const commands = [];

// Load all command files
const loadCommands = (dir) => {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    const itemPath = path.join(dir, item.name);
    
    if (item.isDirectory()) {
      loadCommands(itemPath);
    } else if (item.name.endsWith('.js')) {
      try {
        const command = require(itemPath);
        
        if ('data' in command && 'execute' in command) {
          commands.push(command.data.toJSON());
          console.log(`✅ Loaded command: ${command.data.name}`);
        } else {
          console.warn(`⚠️ Command at ${itemPath} is missing required properties`);
        }
      } catch (error) {
        console.error(`❌ Error loading command ${itemPath}:`, error);
      }
    }
  }
};

const deployCommands = async () => {
  try {
    console.log('🚀 Starting deployment of application (/) commands...');
    
    // Load commands
    const commandsPath = path.join(__dirname, 'commands');
    loadCommands(commandsPath);
    
    console.log(`📦 Found ${commands.length} commands to deploy`);
    
    if (commands.length === 0) {
      console.warn('⚠️ No commands found to deploy');
      return;
    }
    
    // Validate required configuration
    if (!config.discord.token || !config.discord.clientId) {
      throw new Error('Missing required Discord configuration (token or clientId)');
    }
    
    const rest = new REST({ version: '10' }).setToken(config.discord.token);
    
    // Deploy commands
    if (config.discord.guildId) {
      // Guild-specific deployment (faster for development)
      console.log(`🎯 Deploying to guild: ${config.discord.guildId}`);
      
      const data = await rest.put(
        Routes.applicationGuildCommands(config.discord.clientId, config.discord.guildId),
        { body: commands }
      );
      
      console.log(`✅ Successfully deployed ${data.length} guild commands`);
    } else {
      // Global deployment (takes up to 1 hour to update)
      console.log('🌍 Deploying globally...');
      
      const data = await rest.put(
        Routes.applicationCommands(config.discord.clientId),
        { body: commands }
      );
      
      console.log(`✅ Successfully deployed ${data.length} global commands`);
      console.log('⏰ Global commands may take up to 1 hour to appear in all servers');
    }
    
  } catch (error) {
    console.error('❌ Error deploying commands:', error);
    
    if (error.code === 50001) {
      console.error('❌ Missing Access: Bot lacks permissions to deploy commands');
    } else if (error.code === 401) {
      console.error('❌ Unauthorized: Invalid bot token');
    } else if (error.code === 404) {
      console.error('❌ Not Found: Invalid client ID or guild ID');
    }
    
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  deployCommands();
}

module.exports = deployCommands;