import { getModelForClass, modelOptions, prop } from "@typegoose/typegoose";
import config from "#config"
import { discordId } from "#utility/schemas/types/discordId";

@modelOptions({
  schemaOptions: {
    timestamps: true,
    versionKey: false,
  },
})
export class User {
  @prop(discordId)
  id!: string;

  @prop({
    type: Number,
    required: true,
    default: config.other.default_starting_balance,
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
