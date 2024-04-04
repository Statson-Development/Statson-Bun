import disableButtonRow from "#utility/functions/helper/disableButtonRow";
import {
  ButtonStyle,
  ComponentType,
  ButtonBuilder,
  ActionRowBuilder,
  type Interaction,
  type EmbedBuilder,
  type ButtonInteraction,
  type AutocompleteInteraction,
} from "discord.js";

/**
 * A helper class for handling pagination of embeds in Discord interactions.
 */
export default class PaginationHelper {
  private pages: { [userId: string]: number } = {};

  /**
   * Creates an instance of PaginationHelper.
   * @param {Exclude<Interaction, AutocompleteInteraction>} interaction The Discord interaction.
   * @param {EmbedBuilder[]} embeds An array of EmbedBuilder objects to paginate.
   */
  constructor(
    private readonly interaction: Exclude<Interaction, AutocompleteInteraction>,
    private readonly embeds: EmbedBuilder[],
    public readonly listenerTime = 500_000
  ) {}

  /**
   * Initializes the pagination and sets up the message component collector.
   */
  public async paginate() {
    const userId = this.interaction.user.id;
    this.pages[userId] = 0;

    // Sending the reply with the first embed and the button row.
    const reply = await this.interaction.reply({
      embeds: [this.embeds[this.pages[userId]]],
      components: [this.getRow(userId)],
      fetchReply: true,
    });

    // Creating the collector.
    const collector = reply.createMessageComponentCollector({
      time: this.listenerTime,
      componentType: ComponentType.Button,
    });

    // Listening.
    collector.on("collect", async (button: ButtonInteraction) => {
      // Deferring the update so we dont need to reply.
      await button.deferUpdate();

      // Calculating hat the new page should be.
      if (button.customId === "prev_embed" && this.pages[userId] > 0) {
        --this.pages[userId];
      } else if (
        button.customId === "next_embed" &&
        this.pages[userId] < this.embeds.length - 1
      ) {
        ++this.pages[userId];
      }

      // Editing with the new embed.
      await button.editReply({
        embeds: [this.embeds[this.pages[userId]]],
        components: [this.getRow(userId)],
      });
    });

    // Removing buttons when the collector ends.
    collector.on("end", async () => {
      await this.interaction
        .editReply({
          components: [disableButtonRow(reply.components[0].components)],
        })
        .catch(null);
    });
  }

  /**
   * Creates a row of buttons for pagination.
   * @param userId The ID of the user interacting with the pagination.
   * @returns A MessageActionRow with pagination buttons.
   */
  private getRow(userId: string) {
    const row = new ActionRowBuilder<ButtonBuilder>({
      components: [
        new ButtonBuilder()
          .setCustomId("prev_embed")
          .setEmoji("⏮️")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(this.pages[userId] === 0),
        new ButtonBuilder()
          .setCustomId("next_embed")
          .setEmoji("⏭️")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(this.pages[userId] === this.embeds.length - 1),
      ],
    });

    return row;
  }
}
