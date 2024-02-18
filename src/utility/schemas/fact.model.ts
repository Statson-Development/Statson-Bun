import { getModelForClass, modelOptions, prop } from "@typegoose/typegoose";
import { discordId } from "./types/discordId";

@modelOptions({
  schemaOptions: {
    timestamps: true,
  },
})
export class Fact {
  @prop({
    ...discordId,
    index: false,
    unique: false,
  })
  createdBy!: string;

  @prop({
    required: true,
    type: String,
    maxlength: 2048,
  })
  text!: string;

  @prop({
    required: false,
    type: String,
  })
  emoji?: string;
}

export default getModelForClass(Fact);
