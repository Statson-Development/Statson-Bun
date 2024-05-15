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
      // Neo4j.
      NEO4J_URI: string;
      NEO4J_USERS_PASSWORD: string;
    }
  }
}

// Allows importing this file without an error
export {};
