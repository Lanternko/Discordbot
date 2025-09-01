const { Events } = require('discord.js');
const Formatters = require('../utils/formatters');
const { ERROR_MESSAGES } = require('../utils/constants');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    // Handle slash commands
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);

      if (!command) {
        console.error(`❌ No command matching ${interaction.commandName} was found.`);
        return;
      }

      try {
        console.log(`🎯 ${interaction.user.tag} executed /${interaction.commandName} in ${interaction.guild?.name || 'DM'}`);
        
        await command.execute(interaction);
        
      } catch (error) {
        console.error(`❌ Error executing command ${interaction.commandName}:`, error);
        
        const errorEmbed = Formatters.createErrorEmbed(
          error.message || ERROR_MESSAGES.DATABASE_ERROR
        );
        
        try {
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
          } else {
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
          }
        } catch (replyError) {
          console.error('❌ Error sending error message:', replyError);
        }
      }
    }
    
    // Handle button interactions
    else if (interaction.isButton()) {
      try {
        console.log(`🔘 ${interaction.user.tag} clicked button: ${interaction.customId}`);
        
        // Handle pagination buttons
        if (interaction.customId.startsWith('page_')) {
          const [, direction, commandName] = interaction.customId.split('_');
          const command = interaction.client.commands.get(commandName);
          
          if (command && command.handlePagination) {
            await command.handlePagination(interaction, direction);
          } else {
            await interaction.reply({
              embeds: [Formatters.createErrorEmbed('分頁功能暫時無法使用')],
              ephemeral: true
            });
          }
        }
        
        // Handle other button interactions
        else {
          const parts = interaction.customId.split('_');
          const commandName = parts[0];
          const command = interaction.client.commands.get(commandName);
          
          if (command && command.handleButton) {
            await command.handleButton(interaction);
          } else {
            await interaction.reply({
              embeds: [Formatters.createErrorEmbed('此按鈕功能暫時無法使用')],
              ephemeral: true
            });
          }
        }
        
      } catch (error) {
        console.error(`❌ Error handling button interaction:`, error);
        
        try {
          const errorEmbed = Formatters.createErrorEmbed(
            error.message || '處理按鈕互動時發生錯誤'
          );
          
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
          } else {
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
          }
        } catch (replyError) {
          console.error('❌ Error sending button error message:', replyError);
        }
      }
    }
    
    // Handle select menu interactions
    else if (interaction.isStringSelectMenu()) {
      try {
        console.log(`📋 ${interaction.user.tag} used select menu: ${interaction.customId}`);
        
        const parts = interaction.customId.split('_');
        const commandName = parts[0];
        const command = interaction.client.commands.get(commandName);
        
        if (command && command.handleSelectMenu) {
          await command.handleSelectMenu(interaction);
        } else {
          await interaction.reply({
            embeds: [Formatters.createErrorEmbed('此選單功能暫時無法使用')],
            ephemeral: true
          });
        }
        
      } catch (error) {
        console.error(`❌ Error handling select menu interaction:`, error);
        
        try {
          const errorEmbed = Formatters.createErrorEmbed(
            error.message || '處理選單互動時發生錯誤'
          );
          
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
          } else {
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
          }
        } catch (replyError) {
          console.error('❌ Error sending select menu error message:', replyError);
        }
      }
    }
    
    // Handle modal submissions
    else if (interaction.isModalSubmit()) {
      try {
        console.log(`📝 ${interaction.user.tag} submitted modal: ${interaction.customId}`);
        
        const parts = interaction.customId.split('_');
        const commandName = parts[0];
        const command = interaction.client.commands.get(commandName);
        
        if (command && command.handleModal) {
          await command.handleModal(interaction);
        } else {
          await interaction.reply({
            embeds: [Formatters.createErrorEmbed('此表單功能暫時無法使用')],
            ephemeral: true
          });
        }
        
      } catch (error) {
        console.error(`❌ Error handling modal submission:`, error);
        
        try {
          const errorEmbed = Formatters.createErrorEmbed(
            error.message || '處理表單提交時發生錯誤'
          );
          
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
          } else {
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
          }
        } catch (replyError) {
          console.error('❌ Error sending modal error message:', replyError);
        }
      }
    }
  },
};