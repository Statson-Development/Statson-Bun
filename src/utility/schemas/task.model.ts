import { getModelForClass, prop } from "@typegoose/typegoose";
import { TimeStamps } from "@typegoose/typegoose/lib/defaultClasses";
import { Schema } from "mongoose";

export class Task extends TimeStamps {
  @prop({
    required: true,
    type: String,
    index: true,
    immutable: true,
  })
  name!: string;

  @prop({
    required: true,
    type: [Schema.Types.Mixed],
    default: [],
  })
  arguments!: Array<any>;

  @prop({
    required: true,
    type: Number,
  })
  runAt!: number;
}

export default getModelForClass(Task);
