const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js');
const fs = require('fs');
const path = require('path');
const database = require('./config/database');
const config = require('./config/bot');

// Create Discord client with required intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction,
  ],
});

// Initialize collections
client.commands = new Collection();

// Load commands
const loadCommands = () => {
  const commandsPath = path.join(__dirname, 'commands');
  
  const loadCommandsFromDir = (dir) => {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const item of items) {
      const itemPath = path.join(dir, item.name);
      
      if (item.isDirectory()) {
        loadCommandsFromDir(itemPath);
      } else if (item.name.endsWith('.js')) {
        try {
          const command = require(itemPath);
          
          if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
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

  try {
    loadCommandsFromDir(commandsPath);
    console.log(`📦 Loaded ${client.commands.size} commands`);
  } catch (error) {
    console.error('❌ Error loading commands:', error);
  }
};

// Load events
const loadEvents = () => {
  const eventsPath = path.join(__dirname, 'events');
  
  try {
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
    
    for (const file of eventFiles) {
      const filePath = path.join(eventsPath, file);
      const event = require(filePath);
      
      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
      } else {
        client.on(event.name, (...args) => event.execute(...args));
      }
      
      console.log(`✅ Loaded event: ${event.name}`);
    }
    
    console.log(`📦 Loaded ${eventFiles.length} events`);
  } catch (error) {
    console.error('❌ Error loading events:', error);
  }
};

// Initialize bot
const initializeBot = async () => {
  try {
    console.log('🚀 Starting Discord Stats Bot...');
    
    // Connect to database
    console.log('📊 Connecting to database...');
    await database.connect();
    
    // Load commands and events
    console.log('📁 Loading commands and events...');
    loadCommands();
    loadEvents();
    
    // Login to Discord
    console.log('🔐 Logging in to Discord...');
    await client.login(config.discord.token);
    
  } catch (error) {
    console.error('❌ Failed to initialize bot:', error);
    process.exit(1);
  }
};

// Error handling
client.on('error', error => {
  console.error('❌ Discord client error:', error);
});

client.on('warn', warning => {
  console.warn('⚠️ Discord client warning:', warning);
});

process.on('unhandledRejection', error => {
  console.error('❌ Unhandled promise rejection:', error);
});

process.on('uncaughtException', error => {
  console.error('❌ Uncaught exception:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT. Graceful shutdown...');
  
  try {
    if (client.readyAt) {
      console.log('📴 Logging out from Discord...');
      await client.destroy();
    }
    
    console.log('📊 Closing database connection...');
    await database.close();
    
    console.log('✅ Shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM. Graceful shutdown...');
  
  try {
    if (client.readyAt) {
      await client.destroy();
    }
    await database.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

// Start the bot
initializeBot();

module.exports = client;