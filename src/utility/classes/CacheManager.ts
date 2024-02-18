/**
 * The enumeration of all cache names that exist.
 */
export enum CacheName {
    GUILD_DOC = "guildDoc",
}

/**
 * This class is responsible for holding sub caches and managing them. 
 * @singleton
 */
export default class CacheManager {
    /**
     * All caches that are currently being managed.
     */
    private caches = new Map<CacheName, Map<any, any>>();

    // --------------------- Public Methods --------------------- //
    
    public newCache(name: CacheName, cache: Map<any, any>) {
        return this.caches.set(name, cache);
    }

    public getCache(name: CacheName) {
        return this.caches.get(name);
    }

    public flushCache(name: CacheName) {
        return this.caches.set(name, new Map());
    }
}