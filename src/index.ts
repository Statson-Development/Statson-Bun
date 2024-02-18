import { Bot } from "neos-handler";

const bot = await Bot.new({
  clientOptions: {
    intents: ["Guilds", "GuildMessages", "MessageContent", "GuildMembers"],
  },
  moduleDirs: {
    commands: 'src/modules/commands',
    events: 'src/modules/events',
    services: 'src/modules/services'
  },
});

// Resolving client.
const client = await bot.container.resolve("@internal/client");

// Logging in.
await client.login(Bun.env.DISCORD_TOKEN).then(() => {
  console.log(`Logged into ${client.user?.tag}`);
});

export default bot;
