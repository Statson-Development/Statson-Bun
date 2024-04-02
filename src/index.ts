import { Bot } from "neos-handler";
import includedPluginDefaultResponses from "#utility/templates/other/IncludedPluginDefaultResponses";

const bot = await Bot.new({
  clientOptions: {
    intents: ["Guilds", "GuildMessages", "MessageContent", "GuildMembers"],
  },
  moduleDirs: {
    commands: "src/modules/commands",
    components: "src/modules/components",
    events: "src/modules/events",
    services: "src/modules/services",
  },
  botOptions: {
    pluginOptions: {
      rejectNonCachedInteractionGuilds: true,
      includedPluginResponses: includedPluginDefaultResponses,
    },
  },
});

// Resolving client.
const client = await bot.container.resolve("@internal/client");

// Logging in.
await client.login(Bun.env.DISCORD_TOKEN).then(() => {
  console.log(`Logged into ${client.user?.tag}`);
});

export default bot;
