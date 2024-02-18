import type { BasePropOptions } from "@typegoose/typegoose/lib/types";

export const discordLink: BasePropOptions = {
  required: false,
  type: String,
  validate: {
    validator: (v: string) => v.startsWith("https://discord."),
    message: "Invalid message link.",
  },
};
