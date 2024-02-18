import type { GuildMember as DjsMember, User as DjsUser } from "discord.js";
import { Infraction } from "./infraction.model";
import { getModelForClass, modelOptions, prop } from "@typegoose/typegoose";
import { Container } from "neos-container";

@modelOptions({
  schemaOptions: {
    timestamps: true,
    versionKey: false,
  },
})
export class User {
  @prop()
  id!: string;

  @prop({
    type: Number,
    required: true,
    default: Bun.env.DEFAULT_STARTING_BALANCE,
    min: 0,
  })
  money!: number;

  /**
   * A simple check to determine if the member was og and if they received og perks yet.
   * This is to stop people from leaving and rejoining to get the perks again.
   */
  @prop({
    type: Boolean,
    required: false,
  })
  receivedOgPerks?: boolean;
}

export default getModelForClass(User);
