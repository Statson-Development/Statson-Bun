import type { ColorResolvable } from "discord.js";

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // Environment.
      NODE_ENV: "development" | "production";
      // Discord.
      DISCORD_TOKEN: string;
      // MongoDB.
      MONGO_URI: string;
    }
  }
}

// Allows importing this file without an error
export {};
