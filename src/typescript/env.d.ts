import type { ColorResolvable } from "discord.js";

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // Environment.
      NODE_ENV: "development" | "production";
      // Discord.
      DISCORD_TOKEN: string;
      DEFAULT_EMBED_COLOR: ColorResolvable;
      // Database.
      MONGO_URI: string;
      // Discord Ids.
      STATVILLE_GUILD_ID: string;
      OLD_STATVILLE_GUILD_ID: string;
      STATVILLE_GENERAL_CHANNEL_ID: string;
      STATVILLE_WELCOME_STICKER_ID: string;
      STATVILLE_OG_MEMBER_ROLE_ID: string;
      // Other.
      CURRENCY_EMOJI: string;
      CURRENCY_TEXT: string;
      DEFAULT_STARTING_BALANCE: number;
    }
  }
}

// Allows importing this file without an error
export {};
