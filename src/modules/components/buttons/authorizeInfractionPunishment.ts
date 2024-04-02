import { componentModule } from "neos-handler";
import infractionModel, {
  PunishmentDistributor,
} from "#utility/schemas/infraction.model";
import { requiredPermissionsMap } from "src/typescript/enums/InfractionPunishment";

export default componentModule({
  customId: "authorize_infraction_punishment",
  type: "button",
  execute: async (interaction) => {
    // Getting the id from the embed footer.
    let infractionId = interaction.message.embeds[0].footer?.text!;

    // Fetching the infraction from the db.
    const infractionDoc = await infractionModel.findOne({ _id: infractionId });

    // Checking if the doc exists.
    if (!infractionDoc) {
      return interaction.reply({
        content: "I cannot find that infraction in my database 😥.",
        ephemeral: true,
      });
    }

    // Ensuring the member has the required permissions.
    if (
      !interaction.member.permissions.has(
        requiredPermissionsMap.get(infractionDoc.punishment!.penalty)!
      )
    ) {
      return interaction.reply({
        content: "You do not have the required permissions to do this 😔.",
        ephemeral: true,
      });
    }

    // Creating the punishment distro to hand out punishment.
    const punishmentDistributor = new PunishmentDistributor({
      punishment: infractionDoc.punishment || null,
      reason: infractionDoc.reason,
      userId: infractionDoc.userId,
    });

    // Administering the punishment.
    await punishmentDistributor.administerPunishment(interaction.guildId);

    // Replying.
    await interaction.reply({
      content: "Punishment administered 🎉!",
      ephemeral: true,
    });

    // Removing button from original message.
    await interaction.message.edit({
      components: [],
    });
  },
});
