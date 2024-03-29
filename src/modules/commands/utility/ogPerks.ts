import type { GuildMember } from "discord.js";
import userModel from "#utility/schemas/user.model";
import { commandModule } from "neos-handler";
import config from "#config";

export default commandModule({
  name: "ogperks",
  description: "Rechecks the old server to determine if you were og 😮.",
  cooldown: {
    seconds: 500,
    usage: 1,
  },
  execute: async (interaction) => {
    // First deffering as it may take a bit to check.
    await interaction.deferReply({
      ephemeral: true,
    });

    // Fetching old server.
    const oldStatville = await interaction.client.guilds.fetch(
      config.ids.guilds.old_statville
    );

    // Checking if member is og.
    try {
      await oldStatville.members.fetch(interaction.user.id);
    } catch (e) {
      // Error because member did not exist.
      return interaction.editReply({
        content: "I have just double checked, and you are not an OG member 😔.",
      });
    }

    // Getting userdoc from db.
    const userDoc = await userModel.findOne({ id: interaction.user.id });

    // Returning if already og.
    if (userDoc?.receivedOgPerks) {
      return interaction.editReply({
        content: "You are already an OG member 🎉!",
      });
    }

    // Adding og roles.
    await interaction.member.roles.add(config.ids.roles.statville_og_member);

    // Adding money.
    await userModel.findOneAndUpdate(
      {
        id: interaction.user.id,
      },
      {
        $inc: {
          money: 25000,
        },
        receivedOgPerks: true,
      },
      {
        upsert: true,
      }
    );

    await interaction.editReply({
      content: "You are an OG member 🎉! Perks administered.",
    });
  },
});
