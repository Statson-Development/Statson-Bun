import {
  ChannelType,
  MessageCollector,
  type GuildMember,
  type GuildTextBasedChannel,
} from "discord.js";
import config from "#config";
import { eventModule } from "neos-handler";
import Queuer from "#utility/classes/Queuer";
import guildModel from "#utility/schemas/guild.model";
import WelcomeEmbed from "#utility/templates/embeds/welcome";
import userModel, { User } from "#utility/schemas/user.model";
import { SyncableCache } from "#utility/classes/SyncableCache";
import formatNumberAsShortString from "#utility/functions/formatting/formatNumberAsShortString";

/**
 * The cache for storing starred messages.
 */
const starCache = new SyncableCache<User>(userModel, (id) => ({ id }), "stars");
starCache.setSyncThreshold(40); // Syncing to the database every 40 stars.

/**
 * The queuer for the welcome message.
 */
const queuer = new Queuer(1, 60000);

export default eventModule({
  emitter: "@internal/client",
  name: "guildMemberAdd",
  execute: async (member) => {
    // Returning if development mode.
    if (Bun.env.NODE_ENV === "development") return;
    // Returning if not Statville.
    if (member.guild.id !== config.ids.guilds.statville) return;
    // Returning if bot.
    if (member.user.bot) return;

    // Sending the welcome message.
    await welcomeMember(member);

    // Add roles.
    await addRoles(member);

    // Adding og member perks.
    await addOgMemberPerks(member);

    // Update the member count.
    await updateMemberCount(member);
  },
});

async function updateMemberCount(member: GuildMember) {
  // Finding the guild doc.
  const guildDoc = await guildModel.findOne({
    id: member.guild.id,
  });

  // Creating the new channel name.
  const newChannelName = `Statizens: ${formatNumberAsShortString(
    member.guild.memberCount
  )}`;

  // Checking if a channel already exists.
  if (!guildDoc?.options.memberCountChannelId) {
    // Creating the channel.
    await member.guild.channels.create({
      name: newChannelName,
      type: ChannelType.GuildVoice,
      permissionOverwrites: [
        {
          id: member.guild.id,
          deny: ["Connect"],
        },
      ],
    });
  } else {
    // Updating the name.
    await member.guild.channels.edit(guildDoc?.options.memberCountChannelId, {
      name: newChannelName,
    });
  }

  // Updating the guild doc.
  await guildModel.findOneAndUpdate(
    {
      _id: member.guild.id,
    },
    // Using dot notation to update the nested field.
    {
      "options.memberCountChannelId": newChannelName,
    },
    // Using upsert to create the doc if it doesn't exist.
    {
      upsert: true,
    }
  );
}

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

// Variables to keep track of the message collector and the last member join time.
let welcomeCollector: MessageCollector | null = null;
let lastMemberJoinTime = 0;
const listenerDuration = 300_000; // 5 minutes in milliseconds
let resetTimer: NodeJS.Timeout | null = null; // Timer reference

export async function welcomeMember(member: GuildMember) {
  const generalChannel = await member.guild.channels.fetch(
    config.ids.channels.statville_general
  ) as GuildTextBasedChannel;

  // Ensure the general channel exists.
  if (!generalChannel) return;

  // Queue the welcome message to be sent in the general channel.
  queuer.addToQueue(async () => {
    await generalChannel.send({
      content: member.toString(),
      embeds: [new WelcomeEmbed(member)],
    });

    // Update the time when the latest member joined.
    lastMemberJoinTime = Date.now();

    // Create a message collector if it doesn't exist.
    if (!welcomeCollector) {
      welcomeCollector = generalChannel.createMessageCollector({
        filter: (message) =>
          message.content.toLowerCase().includes("welcome") ||
          message.stickers.has(config.ids.stickers.statville_welcome),
      });

      welcomeCollector.on("collect", async (message) => {
        // React to welcome messages with a star emoji.
        await message.react("🌟");

        // Fetching the current stars.
        const userDoc = await starCache.get(message.author.id);

        const stars = userDoc?.stars ?? 0;

        // Note the star in the star cache.
        starCache.set(message.author.id, {stars: stars + 1});
      });
    }

    // Clear any existing reset timer.
    if (resetTimer) {
      clearTimeout(resetTimer);
    }

    // Set a new reset timer.
    resetTimer = setTimeout(() => {
      if (Date.now() - lastMemberJoinTime >= listenerDuration) {
        if (welcomeCollector) {
          welcomeCollector.stop();
          welcomeCollector = null;
        }
      }
    }, listenerDuration);
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
    config.ids.guilds.old_statville
  );

  // Returning if the old server does not exist.
  if (!oldStatville) return;

  // Checking member exists in old server.
  try {
    await oldStatville.members.fetch(member.id);
  } catch (e) {
    // If an error occurs that means the member just doesn't exist so we return.
    return;
  }

  // Now fetching doc to see if perks have already been given.
  const userDoc = await userModel.findOne({
    id: member.id,
  });

  if (userDoc?.receivedOgPerks) return;

  // Adding the perks.
  await member.roles.add(config.ids.roles.statville_og_member);
  if (userDoc) {
    userDoc.receivedOgPerks = true;
    userDoc.money += ogMemberMoney;
    await userDoc.save();
  } else {
    await new userModel({
      id: member.id,
      money: config.other.default_starting_balance + ogMemberMoney,
      receivedOgPerks: true,
    }).save();
  }
}
