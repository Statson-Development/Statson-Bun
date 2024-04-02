import type { BasePropOptions } from "@typegoose/typegoose/lib/types";

export const discordId: BasePropOptions = {
  required: true,
  unique: true,
  maxlength: 20,
  minlength: 18,
  immutable: true,
  index: true,
};
