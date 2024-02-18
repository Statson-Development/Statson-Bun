import CacheManager from "#utility/classes/CacheManager";
import { serviceModule } from "neos-handler";

export default serviceModule({
    name: "CacheManager",
    service: CacheManager,
    options: {
        lazyLoad: true,
    }
})