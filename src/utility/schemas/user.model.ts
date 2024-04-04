import config from "#config";
import { discordId } from "#utility/schemas/types/discordId";
import { getModelForClass, modelOptions, prop } from "@typegoose/typegoose";

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
   * Amount of welcome stars the user has received.
   */
  @prop({
    type: Number,
    required: false,
    default: 0,
    min: 0,
  })
  stars?: number;

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
