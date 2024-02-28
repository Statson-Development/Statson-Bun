import { getModelForClass, modelOptions, prop } from "@typegoose/typegoose";
import { discordId } from "./types/discordId";
import { TimeStamps } from "@typegoose/typegoose/lib/defaultClasses";

@modelOptions({
  schemaOptions: {
    versionKey: false,
    _id: false // Disabled as we index with "userId".
  },
})
export class Timezone extends TimeStamps {
  @prop(discordId)
  userId!: string;

  @prop({
    type: String,
    required: true,
  })
  timezone!: string;
}

export default getModelForClass(Timezone);
