import { eventModule } from "neos-handler";
import ranNum from "#utility/functions/helper/ranNum";
import config from "#config";
import quoteModel, { Quote } from "#utility/schemas/quote.model";
import EmbedBuilder from "#utility/templates/embeds/default";

/**
 * This is the random quote event.
 * Every message that gets sent, this event will generate a number.
 * If the number is 56, the function will find a random quote from the db and send it.
 */
export default eventModule({
  emitter: "@internal/client",
  name: "messageCreate",
  execute: async (message) => {
    if (
      // Bypassing all checks if author is owner and content is "-quote force."
      !(
        config.ids.users.owners.includes(message.author.id) &&
        message.content === "-quote force"
      )
    ) {
      // Returning if development mode enabled.
      if (Bun.env.NODE_ENV === "development") return;
      // Only working in general channel.
      if (message.channel.id !== config.ids.channels.statville_general) return;
      // Only executing if random number is 59.
      if (ranNum(1, 200) !== 56) return;
    }

    // Fetching a random quote.
    const quoteDoc = (
      await quoteModel.aggregate([{ $sample: { size: 1 } }])
    )[0] as Quote;

    // Creating the embed to send.
    const embed = new EmbedBuilder()
      .setDescription('***"' + quoteDoc.content + '"***')
      .setColor("#2b2d31"); // The blend color.

    // Setting author if one exists.
    if (quoteDoc.authorId) {
      try {
        // Fetching.
        const author = await message.guild!.members.fetch(quoteDoc.authorId);

        // Setting on footer.
        embed.setFooter({
          iconURL: author.displayAvatarURL(),
          text: author.displayName,
        });
      } catch (e) {
        // The `fetch()` method throws an error if a member is not found so
        // thats why we catch and return.
        return;
      }
    }

    // Sending the embed.
    await message.channel.send({
      embeds: [embed],
    });
  },
});
