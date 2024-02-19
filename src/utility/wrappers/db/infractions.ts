import infractionModel, {
  Punishment,
  PunishmentDistributor,
  type OmitLogLinkInfraction
} from "#utility/schemas/infraction.model";
import {
  type GuildMember
} from "discord.js";
import LogUtils, { LogLocation } from "#utility/wrappers/discord/loggers";
import InfractionEmbeds from "#utility/templates/embeds/infractions";

// ---------------------------------------------------------
// | The purpose of these wrappers are to administer       |
// | infractions to members.                               |
// |                                                       |
// | These wrappers handle the storing of the infraction   |
// | inside the database but also registering the          |
// | punishment with Discord.                              |
// ---------------------------------------------------------

async function changeInfractionPunishment(
  member: GuildMember,
  moderatorId: string,
  infractionId: string,
  newPunishment: Punishment | null
) {
  // Finding the infraction doc.
  const infractionDoc = await infractionModel.findOne({
    _id: infractionId,
  });

  // Ensuring infraction existence.
  if (!infractionDoc) {
    throw new Error("Infraction not found.");
  }

  // Creating punishment distro.
  const punishmentDistributor = new PunishmentDistributor({
    reason: infractionDoc.reason!,
    userId: infractionDoc.userId,
    punishment: newPunishment,
  });

  // Logging.
  const log = await LogUtils.log(LogLocation.INFRACTIONS, {
    reply: {
      messageReference: infractionDoc.logLink,
      failIfNotExists: false,
    },
    embeds: [InfractionEmbeds.newInfractionChangePunishmentEmbed(member, infractionDoc)],
  });

  if (infractionDoc.punishment) {
    // Setting old punishment as historical.
    if (infractionDoc.historicalPunishments) {
      infractionDoc.historicalPunishments.push({
        changedById: moderatorId,
        historicalAt: new Date(),
        penalty: infractionDoc.punishment.penalty,
        duration: infractionDoc.punishment.duration,
        logLink: log.url,
      });
    }

    // Removing old punishment from discord.
    await punishmentDistributor.removePunishment(member);
  }

  if (newPunishment) {
    // Setting punishment on doc.
    infractionDoc.punishment = newPunishment;

    // Administering with discord.
    punishmentDistributor.setInfraction({
      reason: infractionDoc.reason!,
      punishment: newPunishment,
      userId: infractionDoc.userId,
    }); // todo: we may not need to do this as i beileve js will reference the doc and changed will then sync.
    await punishmentDistributor.administerPunishment(member);
  }

  // Saving.
  await infractionDoc.save();
}

async function administerInfraction(
  member: GuildMember,
  infraction: OmitLogLinkInfraction
) {
  // Creating the infraction doc.
  const infractionDoc = new infractionModel(infraction);

  // Checking if any punishments are needed.
  if (infraction.punishment) {
    // Creating the punishment distributor.
    const punishmentDistributor = new PunishmentDistributor({
      reason: infraction.reason!,
      punishment: infraction.punishment,
      userId: infraction.userId,
    });

    await punishmentDistributor.administerPunishment(member);
  }

  // Logging the infraction.
  const loggedInfraction = await LogUtils.log(
    LogUtils.LogLocation.INFRACTIONS,
    {
      embeds: [await InfractionEmbeds.newInfractionLogEmbed(member, infraction)],
    }
  );

  // Updating the logged message link for the doc.
  infractionDoc.logLink = loggedInfraction.url;

  // Saving the document and returning it.
  await infractionDoc.save();

  return infractionDoc;
}

/**
 * This function completely deletes/removes an infraction from the db and discord.
 */
async function removeInfraction(member: GuildMember, infractionId: string) {
  // Getting document from database.
  const infractionDoc = await infractionModel.findOne({
    _id: infractionId,
  });

  // Ensuring doc existence.
  if (!infractionDoc) return;

  // Checking if a punishment needs to be removed.
  if (infractionDoc.punishment) {
    // Creating the punishment distributor.
    const punishmentDistributor = new PunishmentDistributor({
      reason: infractionDoc.reason!,
      punishment: infractionDoc.punishment,
      userId: infractionDoc.userId,
    });

    // Removing.
    await punishmentDistributor.removePunishment(member);
  }

  // Deleting in database.
  await infractionDoc.deleteOne();
}

export default {
  administerInfraction,
  removeInfraction,
  changeInfractionPunishment,
};
