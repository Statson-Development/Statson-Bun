import infractionModel, {
  Punishment,
  Infraction,
  PunishmentDistributor,
  type OmitLogLinkInfraction,
} from "#utility/schemas/infraction.model";
import config from "#config";
import LogUtils from "../discord/loggers";
import { type GuildMember } from "discord.js";
import type { DocumentType } from "@typegoose/typegoose";
import InfractionEmbeds from "#utility/templates/embeds/infractions";
import extractIdFromDLink from "#utility/functions/helper/exractIdFromDLink";
import capitalizeFirstLetter from "#utility/functions/formatting/capitalizeFirstLetter";
import authorizeInfractionPunishment from "#utility/templates/buttons/authorizeInfractionPunishment";
import {
  InfractionPunishment,
  requiredPermissionsMap,
} from "../../../typescript/enums/InfractionPunishment";

// ---------------------------------------------------------
// | The purpose of these wrappers are to administer       |
// | infractions to members.                               |
// |                                                       |
// | These wrappers handle the storing of the infraction   |
// | inside the database but also registering the          |
// | punishment with Discord.                              |
// ---------------------------------------------------------

async function changeInfractionPunishment(
  infraction: DocumentType<Infraction>,
  newPunishment: Punishment | null,
  /**
   * This is the id of the person changing the infraction not the orginal moderator.
   */
  modId: string,
  guildId: string,
  infractionMember?: GuildMember
  // this^ is optional because the member might not be in guild as they could be banned/kicked.
) {
  // Ensuring infraction existence.
  if (!infraction) {
    throw new Error("Infraction not found.");
  }

  // Creating punishment distro.
  const punishmentDistributor = new PunishmentDistributor({
    reason: infraction.reason!,
    userId: infraction.userId,
    punishment: newPunishment,
  });

  // Extracting the original log id from the link.
  const originalLogId = extractIdFromDLink(infraction.logLink)!;

  // Handling punishments.
  if (infraction.punishment) {
    const historicalPunishment = {
      changedById: modId,
      historicalAt: new Date(),
      penalty: infraction.punishment.penalty,
      duration: infraction.punishment.duration,
    };

    // Setting old punishment as historical.
    if (infraction.historicalPunishments) {
      infraction.historicalPunishments.push(historicalPunishment);
    } else {
      infraction.historicalPunishments = [historicalPunishment];
    }

    // Removing old punishment from discord.
    await punishmentDistributor.removePunishment(guildId);
  }

  if (newPunishment) {
    // Setting punishment on doc.
    infraction.punishment = newPunishment;

    // Administering with discord.
    punishmentDistributor.setInfraction({
      reason: infraction.reason!,
      punishment: newPunishment,
      userId: infraction.userId,
    });
    // todo: we may not need to do this^ as i believe js will reference the doc and changed will then sync.

    await punishmentDistributor.administerPunishment(guildId);
  } else {
    infraction.punishment = undefined;
  }

  // Editing the original log.
  await LogUtils.editLog(
    config.ids.channels.statville_infractions_logging,
    originalLogId,
    {
      embeds: [await InfractionEmbeds.newInfractionLogEmbed(infraction)],
    }
  );

  // Sending the final changed log message.
  await LogUtils.log(config.ids.channels.statville_infractions_logging, {
    reply: {
      messageReference: originalLogId,
      failIfNotExists: false,
    },
    embeds: [
      InfractionEmbeds.newInfractionChangePunishmentEmbed(
        infraction,
        infractionMember
      ),
    ],
  });

  // Saving with the db.
  await infraction.save();
}

async function administerInfraction(data: {
  modMember: GuildMember;
  infractionMember: GuildMember;
  infraction: OmitLogLinkInfraction;
}) {
  const { modMember, infractionMember, infraction } = data;

  // Creating the infraction doc.
  const infractionDoc = new infractionModel(infraction);

  // Checking if we should administer the punishment or if it needs approving.
  const administerPunishment =
    infraction.punishment &&
    !modMember.permissions.has(
      requiredPermissionsMap.get(infraction.punishment.penalty)!
    )
      ? false
      : true;
  // Do not remove the ? : operator and replace with a reverse (!) operator!!

  // Checking if any punishments are needed.
  if (administerPunishment) {
    // Creating the punishment distributor.
    const punishmentDistributor = new PunishmentDistributor({
      reason: infraction.reason!,
      punishment: infraction.punishment!,
      userId: infraction.userId,
    });

    await punishmentDistributor.administerPunishment(modMember.guild);
  } else if (
    (infraction.punishment?.penalty === InfractionPunishment.Ban ||
      infraction.punishment?.penalty === InfractionPunishment.TempBan) &&
    !modMember.permissions.has("BanMembers")
  ) {
    // Timeouting member for 24 hours while waiting for approval.
    await infractionMember.timeout(24 * 60 * 60 * 1000, "Pending Ban Approval");
  }

  // Logging the infraction.
  const loggedInfraction = await LogUtils.log(
    config.ids.channels.statville_infractions_logging,
    {
      embeds: [
        await InfractionEmbeds.newInfractionLogEmbed(
          infraction,
          infractionMember
        ),
      ],
      // Parsing a "Authorize" button if the infraction is a ban and permissions are missing.
      components: administerPunishment
        ? undefined
        : [
            authorizeInfractionPunishment(
              capitalizeFirstLetter(infraction.punishment!.penalty)
            ),
          ],
    }
  );

  // Updating the logged message link for the doc.
  infractionDoc.logLink = loggedInfraction.url;

  // Saving the document.
  await infractionDoc.save();

  // Direct messaging the member.
  await infractionMember.send({
    embeds: [
      InfractionEmbeds.newPublicInfractionEmbed(
        infractionDoc,
        infractionMember,
        modMember
      ),
    ],
  });

  // Returning the document.
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
    await punishmentDistributor.removePunishment(member.guild.id);
  }

  // Deleting in database.
  await infractionDoc.deleteOne();
}

export default {
  administerInfraction,
  removeInfraction,
  changeInfractionPunishment,
};
