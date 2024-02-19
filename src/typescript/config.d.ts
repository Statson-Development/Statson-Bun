import type { ColorResolvable } from "discord.js";

interface Config {
  ids: {
    guilds: {
      statville: string;
      old_statville: string;
    };
    channels: {
      statville_general: string;
    };
    "emojis/stickers": {
      statville_welcome: string;
    };
    roles: {
      statville_og_member: string;
    };
  };
  urls: {
    images: {
      welcome: string[];
    };
  };
  emojis: {
    info: string;
    currency: string;
  };
  other: {
    currency_name: string;
    default_embed_color: ColorResolvable;
    default_starting_balance: number;
  };
}

declare module "#config" {
  const value: Config;
  export default value;
}
