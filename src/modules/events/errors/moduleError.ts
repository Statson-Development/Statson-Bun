import ErrorEmbed from "#utility/templates/embeds/error";
import { eventModule } from "neos-handler";

export default eventModule({
  emitter: "@internal/emitter",
  name: "interactionModuleError",
  execute: async (payload) => {
    // Creating the error embed.
    const embed = new ErrorEmbed().setDescription(
      `\`\`\`${payload.moduleError.message}\`\`\``
    );

    // Logging the error.
    console.error(payload.moduleError);

    // Attempting to reply.
    try {
      if (
        payload.interaction.isRepliable() &&
        !payload.interaction.replied &&
        !payload.interaction.deferred
      ) {
        // Attempting to reply first.
        await payload.interaction.reply({
          embeds: [embed],
          ephemeral: true,
        });
      } else if (
        payload.interaction.isRepliable() &&
        payload.interaction.deferred
      ) {
        // Secondly attempting to follow up/editReply.
        await payload.interaction.followUp({
          embeds: [embed],
        });
      } else {
        // Lastly we send a message to the channel.
        await payload.interaction.channel?.send({
          embeds: [embed],
        });
      }
    } catch (e) {
      // We are also catching any errors but not doing anything with them.
    }
  },
});
