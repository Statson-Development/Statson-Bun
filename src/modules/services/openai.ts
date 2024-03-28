import { serviceModule } from "neos-handler";
import OpenAI from "openai";

export default serviceModule({
  name: "openai",
  service: OpenAI,
});
