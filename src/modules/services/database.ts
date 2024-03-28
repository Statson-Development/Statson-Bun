import MongoClient from "#utility/classes/MongoClient";
import { serviceModule } from "neos-handler";

export default serviceModule({
  name: "database",
  service: MongoClient,
  options: {
    priority: 1, // Should be the first service to be loaded.
  }
});
