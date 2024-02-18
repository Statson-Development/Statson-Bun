import Queuer from "#utility/classes/Queuer";
import guildModel from "#utility/schemas/guild.model";
import userModel from "#utility/schemas/user.model";
import WelcomeEmbed from "#utility/templates/embeds/welcome";
import type { GuildMember, GuildTextBasedChannel } from "discord.js";
import { eventModule } from "neos-handler";

/**
 * The queuer for the welcome message.
 */
const queuer = new Queuer(1, 60000);

export default eventModule({
  emitter: "@internal/client",
  name: "guildMemberAdd",
  execute: async (member) => {
    // Returning if development mode.
    // if (Bun.env.NODE_ENV === "development") return;
    // Returning if not Statville.
    if (member.guild.id !== Bun.env.STATVILLE_GUILD_ID) return;

    // Sending the welcome message.
    await welcomeMember(member);

    // Add roles.
    await addRoles(member);

    // Adding og member perks.
    await addOgMemberPerks(member);
  },
});

async function addRoles(member: GuildMember) {
  // Finding the guild doc.
  const guildDoc = await guildModel.findOne({
    id: member.guild.id,
  });
  // todo: potentually implement a cache here

  if (!guildDoc) return;

  // Adding roles
  if (guildDoc.options.newMemberRoles.length > 0) {
    await member.roles.add(guildDoc.options.newMemberRoles);
  }
}

export async function welcomeMember(member: GuildMember) {
  // Fetching general channel.
  const generalChannel = member.guild.channels.cache.get(
    Bun.env.STATVILLE_GENERAL_CHANNEL_ID
  ) as GuildTextBasedChannel;

  // Returning if channel exists. We can skip this member welcome.
  if (!generalChannel) return;

  // Queuing the welcome message.
  queuer.addToQueue(async () => {
    // Sending the welcome message.
    await generalChannel.send({
      content: member.toString(),
      embeds: [new WelcomeEmbed(member)],
    });

    // Listening for welcomes.
    generalChannel
      .createMessageCollector({
        time: 300_000,
        filter: (message) =>
          message.content.toLowerCase().includes("welcome") ||
          message.stickers.has(Bun.env.STATVILLE_WELCOME_STICKER_ID),
      })
      .on("collect", async (message) => {
        await message.react("🌟");
      });
  });
}

// -------------------- Temporary Code -------------------- //

const ogMemberMoney = 25000;
/**
 * This function adds perks to members that were in the original server.
 */
async function addOgMemberPerks(member: GuildMember) {
  // First getting the original server.
  const oldStatville = await member.client.guilds.fetch(
    Bun.env.OLD_STATVILLE_GUILD_ID
  );

  // Returning if the old server does not exist.
  if (!oldStatville) return;

  // Getting the old member.
  const oldMember = await oldStatville.members.fetch(member.id);

  // Returning if not og.
  if (!oldMember) return;

  // Now fetching doc to see if perks have already been given.
  const userDoc = await userModel.findOne({
    id: member.id,
  });

  if (userDoc?.receivedOgPerks) return;

  // Adding the perks.
  await member.roles.add(Bun.env.STATVILLE_OG_MEMBER_ROLE_ID);
  if (userDoc) {
    userDoc.receivedOgPerks = true;
    userDoc.money += ogMemberMoney;
    await userDoc.save();
  } else {
    await new userModel({
      id: member.id,
      money: Bun.env.DEFAULT_STARTING_BALANCE + ogMemberMoney,
      receivedOgPerks: true,
    }).save();
  }
}
