import { getModelForClass, modelOptions, prop } from "@typegoose/typegoose";
import { discordId } from "./types/discordId";

@modelOptions({
  schemaOptions: {
    _id: false
  }
})
export class GuildOptions {
  @prop({
    required: true,
    type: [String],
    default: new Array(),
    validate: [
      {
        validator: (v: Array<string>) =>
          v.every((role) => role.length >= 18 && role.length <= 19),
        message: "Each role ID must be 18 or 19 characters long.",
      },
    ],
  })
  newMemberRoles!: Array<string>;

  @prop({
    required: false,
    type: String,
  })
  memberCountChannelId?: string;
}

@modelOptions({
  schemaOptions: {
    versionKey: false
  }
})
export class Guild {
  @prop({
    ...discordId,
    immutable: false,
    maxlength: 19 // Guild ids can be longer.
  })
  id!: string;

  @prop({
    required: true,
    type: () => GuildOptions,
    default: () => new Object(),
  })
  options!: GuildOptions;
}

export default getModelForClass(Guild);
