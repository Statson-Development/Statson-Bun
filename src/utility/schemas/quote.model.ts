import { prop, getModelForClass, modelOptions } from "@typegoose/typegoose";
import { TimeStamps } from "@typegoose/typegoose/lib/defaultClasses";
import { discordId } from "./types/discordId";

@modelOptions({
  schemaOptions: {
    versionKey: false
  }
})
export class Quote extends TimeStamps {
  @prop({
    required: true,
    type: String,
    unique: true,
    maxlength: 4096, // To align with discords 4096 max description length.
  })
  content!: string;

  @prop({
    ...discordId,
    unique: false,
    required: false,
    index: false, // Might need index soon... but mongodb should auto index if we need.
  })
  authorId?: string;
}

export default getModelForClass(Quote)
