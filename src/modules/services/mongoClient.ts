import MongoClient from "#utility/classes/MongoClient.js";
import { serviceModule } from "neos-handler";

export default serviceModule({
  name: "mongoClient",
  service: MongoClient,
  options: {
    priority: 1, // Should be the first service to be loaded.
  }
});
