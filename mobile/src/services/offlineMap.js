// services/offlineMapService.js

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { fetchRoute } from './routing.js';
import { fetchNearestEvacuationAreas } from './evacuation.js';

const CACHE_KEYS = {
  LAST_LOCATION: '@offline_last_location',
  EVACUATION_CENTERS: '@offline_evacuation_centers',
  ROUTES_CACHE: '@offline_routes_cache',
  OFFLINE_DATA_TIMESTAMP: '@offline_data_timestamp',
};

const MAP_TILES_DIR = `${FileSystem.documentDirectory}map_tiles/`;
const ROUTES_DIR = `${FileSystem.documentDirectory}cached_routes/`;
const MAX_CACHE_AGE_DAYS = 7;
const MAX_TILES_STORAGE = 50 * 1024 * 1024;

class OfflineMapService {
  constructor() {
    this.isOnline = true;
    this.syncInProgress = false;
    this.listeners = [];
    this.initialized = false;
    this.taskQueue = [];
    this.processingQueue = false;
  }

  updateNetworkStatus(isOnline) {
    const wasOffline = !this.isOnline;
    this.isOnline = isOnline;
    
    if (wasOffline && isOnline) {
      console.log('Network restored - syncing offline data');
      this.notifyListeners('online');
      // Delay sync to avoid bottleneck
      setTimeout(() => this.syncOfflineData(), 2000);
    } else if (!isOnline && !wasOffline) {
      console.log('Network lost - switching to offline mode');
      this.notifyListeners('offline');
    }
  }

  addListener(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  notifyListeners(status) {
    this.listeners.forEach(cb => cb(status));
  }

  // Process background tasks with delay to avoid bottlenecks
  async processQueue() {
    if (this.processingQueue || this.taskQueue.length === 0) return;
    
    this.processingQueue = true;
    
    while (this.taskQueue.length > 0) {
      const task = this.taskQueue.shift();
      try {
        await task();
        // Small delay between tasks to prevent blocking
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        console.log('Background task failed:', error.message);
      }
    }
    
    this.processingQueue = false;
  }

  // Add task to background queue
  enqueueTask(task) {
    this.taskQueue.push(task);
    this.processQueue();
  }

  async initialize() {
    if (this.initialized) return true;
    
    try {
      const mapDirInfo = await FileSystem.getInfoAsync(MAP_TILES_DIR);
      if (!mapDirInfo.exists) {
        await FileSystem.makeDirectoryAsync(MAP_TILES_DIR, { intermediates: true });
      }
      
      const routesDirInfo = await FileSystem.getInfoAsync(ROUTES_DIR);
      if (!routesDirInfo.exists) {
        await FileSystem.makeDirectoryAsync(ROUTES_DIR, { intermediates: true });
      }
      
      this.initialized = true;
      console.log('Offline storage initialized');
      return true;
    } catch (error) {
      console.log('Storage initialization error:', error.message);
      this.initialized = true;
      return false;
    }
  }

  async saveCurrentLocation(location) {
    try {
      const locationData = {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy || 10,
        timestamp: new Date().toISOString(),
      };
      // Don't await - do it in background
      AsyncStorage.setItem(CACHE_KEYS.LAST_LOCATION, JSON.stringify(locationData)).catch(() => {});
      return true;
    } catch (error) {
      return false;
    }
  }

  async getLastKnownLocation() {
    try {
      const locationStr = await AsyncStorage.getItem(CACHE_KEYS.LAST_LOCATION);
      if (locationStr) {
        const location = JSON.parse(locationStr);
        const age = Date.now() - new Date(location.timestamp).getTime();
        if (age < 24 * 60 * 60 * 1000) {
          return location;
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  // Cache operations are now non-blocking
  cacheEvacuationCenters(centers) {
    if (!centers || centers.length === 0) return;
    
    this.enqueueTask(async () => {
      try {
        const cacheData = {
          centers,
          timestamp: new Date().toISOString(),
        };
        await AsyncStorage.setItem(CACHE_KEYS.EVACUATION_CENTERS, JSON.stringify(cacheData));
        console.log(`${centers.length} evacuation centers cached`);
      } catch (error) {
        console.log('Cache centers failed:', error.message);
      }
    });
  }

  async getCachedEvacuationCenters() {
    try {
      const data = await AsyncStorage.getItem(CACHE_KEYS.EVACUATION_CENTERS);
      if (data) {
        const cached = JSON.parse(data);
        const age = Date.now() - new Date(cached.timestamp).getTime();
        const maxAge = MAX_CACHE_AGE_DAYS * 24 * 60 * 60 * 1000;
        
        if (age < maxAge) {
          return cached.centers || [];
        }
      }
      return [];
    } catch (error) {
      return [];
    }
  }

  cacheRoute(fromLat, fromLng, toLat, toLng, routeData) {
    if (!routeData) return;
    
    this.enqueueTask(async () => {
      try {
        await this.initialize();
        
        const routeKey = `${fromLat.toFixed(4)}_${fromLng.toFixed(4)}_to_${toLat.toFixed(4)}_${toLng.toFixed(4)}`.replace(/\./g, '_');
        const routeCache = {
          from: { lat: fromLat, lng: fromLng },
          to: { lat: toLat, lng: toLng },
          route: routeData,
          timestamp: new Date().toISOString(),
        };
        
        const filePath = `${ROUTES_DIR}${routeKey}.json`;
        await FileSystem.writeAsStringAsync(filePath, JSON.stringify(routeCache));
        
        const routesList = await this.getCachedRoutesList();
        if (!routesList.includes(routeKey)) {
          routesList.push(routeKey);
          if (routesList.length > 50) {
            const removed = routesList.shift();
            FileSystem.deleteAsync(`${ROUTES_DIR}${removed}.json`, { idempotent: true }).catch(() => {});
          }
          await AsyncStorage.setItem(CACHE_KEYS.ROUTES_CACHE, JSON.stringify(routesList));
        }
        
        console.log('Route cached');
      } catch (error) {
        console.log('Cache route failed:', error.message);
      }
    });
  }

  async getCachedRoute(fromLat, fromLng, toLat, toLng) {
    try {
      await this.initialize();
      
      const routeKey = `${fromLat.toFixed(4)}_${fromLng.toFixed(4)}_to_${toLat.toFixed(4)}_${toLng.toFixed(4)}`.replace(/\./g, '_');
      const filePath = `${ROUTES_DIR}${routeKey}.json`;
      
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      if (!fileInfo.exists) {
        return await this.findSimilarCachedRoute(fromLat, fromLng, toLat, toLng);
      }
      
      const data = await FileSystem.readAsStringAsync(filePath);
      const cached = JSON.parse(data);
      
      const cacheAge = Date.now() - new Date(cached.timestamp).getTime();
      const maxAge = MAX_CACHE_AGE_DAYS * 24 * 60 * 60 * 1000;
      
      if (cacheAge > maxAge) {
        await FileSystem.deleteAsync(filePath, { idempotent: true });
        return null;
      }
      
      return cached.route;
    } catch (error) {
      return null;
    }
  }

  async findSimilarCachedRoute(fromLat, fromLng, toLat, toLng) {
    try {
      const routesList = await this.getCachedRoutesList();
      const tolerance = 0.001;
      
      for (const routeKey of routesList) {
        const filePath = `${ROUTES_DIR}${routeKey}.json`;
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        
        if (!fileInfo.exists) continue;
        
        const data = await FileSystem.readAsStringAsync(filePath);
        const cached = JSON.parse(data);
        
        const fromMatch = Math.abs(cached.from.lat - fromLat) < tolerance && 
                         Math.abs(cached.from.lng - fromLng) < tolerance;
        const toMatch = Math.abs(cached.to.lat - toLat) < tolerance && 
                       Math.abs(cached.to.lng - toLng) < tolerance;
        
        if (fromMatch && toMatch) {
          return cached.route;
        }
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  async getCachedRoutesList() {
    try {
      const data = await AsyncStorage.getItem(CACHE_KEYS.ROUTES_CACHE);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      return [];
    }
  }

  // Tile caching is lowest priority - scheduled with delay
  preCacheAreaTiles(centerLat, centerLng, radiusKm = 5, zoomLevels = [13, 14]) {
    if (!this.isOnline) return;
    
    // Delay tile caching to avoid competing with important requests
    setTimeout(() => {
      this.enqueueTask(async () => {
        try {
          await this.initialize();
          
          const tilesToCache = [];
          
          zoomLevels.forEach(zoom => {
            const centerTile = this.latLngToTile(centerLat, centerLng, zoom);
            const radius = Math.ceil(radiusKm / (156.543 / Math.pow(2, zoom)));
            
            for (let dx = -radius; dx <= radius; dx++) {
              for (let dy = -radius; dy <= radius; dy++) {
                const x = centerTile.x + dx;
                const y = centerTile.y + dy;
                
                if (x >= 0 && y >= 0 && x < Math.pow(2, zoom) && y < Math.pow(2, zoom)) {
                  tilesToCache.push({ zoom, x, y });
                }
              }
            }
          });

          const maxTiles = 100;
          const tilesToDownload = tilesToCache.slice(0, maxTiles);
          
          console.log(`Pre-caching ${tilesToDownload.length} map tiles...`);
          
          // Download one at a time with delays
          let cachedCount = 0;
          for (const tile of tilesToDownload) {
            try {
              const existing = await this.getCachedMapTile(tile.zoom, tile.x, tile.y);
              if (existing) continue;
              
              const tileUrl = `https://tile.openstreetmap.org/${tile.zoom}/${tile.x}/${tile.y}.png`;
              const response = await fetch(tileUrl);
              
              if (response.ok) {
                const blob = await response.blob();
                const base64 = await this.blobToBase64(blob);
                await this.cacheMapTile(tile.zoom, tile.x, tile.y, base64);
                cachedCount++;
              }
              
              // Small delay between tiles
              await new Promise(resolve => setTimeout(resolve, 200));
            } catch (error) {
              // Skip failed tiles
            }
          }
          
          console.log(`Cached ${cachedCount} new tiles`);
        } catch (error) {
          console.log('Tile pre-caching failed:', error.message);
        }
      });
    }, 5000); // Start after 5 seconds delay
  }

  async cacheMapTile(zoom, x, y, tileData) {
    try {
      await this.initialize();
      
      const tilePath = `${MAP_TILES_DIR}${zoom}/${x}/`;
      const tileDirInfo = await FileSystem.getInfoAsync(tilePath);
      
      if (!tileDirInfo.exists) {
        await FileSystem.makeDirectoryAsync(tilePath, { intermediates: true });
      }
      
      const filePath = `${tilePath}${y}.png`;
      await FileSystem.writeAsStringAsync(filePath, tileData, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      return true;
    } catch (error) {
      return false;
    }
  }

  async getCachedMapTile(zoom, x, y) {
    try {
      const filePath = `${MAP_TILES_DIR}${zoom}/${x}/${y}.png`;
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      
      if (!fileInfo.exists) return null;
      
      return await FileSystem.readAsStringAsync(filePath, {
        encoding: FileSystem.EncodingType.Base64,
      });
    } catch (error) {
      return null;
    }
  }

  // HIGH PRIORITY: Route fetching - always immediate
  async fetchRouteWithOffline(fromLat, fromLng, toLat, toLng) {
    // IF ONLINE: Always fetch fresh data
    if (this.isOnline) {
      try {
        console.log('🌐 Fetching route...');
        const route = await fetchRoute(fromLat, fromLng, toLat, toLng);
        
        if (route && route.coordinates) {
          // Schedule caching for later (non-blocking)
          this.cacheRoute(fromLat, fromLng, toLat, toLng, route);
          return { ...route, fromCache: false };
        }
        
        return null;
      } catch (error) {
        console.error('Route fetch failed:', error.message);
        throw error;
      }
    }
    
    // IF OFFLINE: Use cached data
    console.log('📦 Checking cached routes...');
    const cachedRoute = await this.getCachedRoute(fromLat, fromLng, toLat, toLng);
    
    if (cachedRoute) {
      console.log('✅ Using cached route');
      return { ...cachedRoute, fromCache: true };
    }
    
    return null;
  }

  // HIGH PRIORITY: Centers fetching - always immediate
  async getEvacuationCentersWithOffline(lat, lng, limit = 5) {
    // IF ONLINE: Always fetch fresh data
    if (this.isOnline) {
      try {
        console.log('🌐 Fetching evacuation centers...');
        const centers = await fetchNearestEvacuationAreas(lat, lng, limit);
        
        if (centers && centers.length > 0) {
          // Schedule caching for later (non-blocking)
          this.cacheEvacuationCenters(centers);
          return { centers, fromCache: false };
        }
        
        return { centers: [], fromCache: false };
      } catch (error) {
        console.error('Centers fetch failed:', error.message);
        throw error;
      }
    }
    
    // IF OFFLINE: Use cached data
    console.log('📦 Checking cached centers...');
    const cachedCenters = await this.getCachedEvacuationCenters();
    
    if (cachedCenters.length > 0) {
      console.log(`✅ Using ${cachedCenters.length} cached centers`);
      return { centers: cachedCenters, fromCache: true };
    }
    
    return { centers: [], fromCache: true };
  }

  async syncOfflineData() {
    if (this.syncInProgress || !this.isOnline) return;
    
    this.syncInProgress = true;
    try {
      console.log('Syncing offline data...');
      
      await AsyncStorage.setItem(
        CACHE_KEYS.OFFLINE_DATA_TIMESTAMP,
        new Date().toISOString()
      );
      
      const lastLocation = await this.getLastKnownLocation();
      if (lastLocation) {
        await this.getEvacuationCentersWithOffline(
          lastLocation.latitude,
          lastLocation.longitude
        );
      }
      
      await this.cleanOldCache();
      
      console.log('Offline sync complete');
      this.notifyListeners('sync_complete');
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  async cleanOldCache() {
    this.enqueueTask(async () => {
      try {
        await this.initialize();
        
        const maxAge = MAX_CACHE_AGE_DAYS * 24 * 60 * 60 * 1000;
        const now = Date.now();
        
        try {
          const routesDirContents = await FileSystem.readDirectoryAsync(ROUTES_DIR);
          for (const file of routesDirContents) {
            if (!file.endsWith('.json')) continue;
            
            const filePath = `${ROUTES_DIR}${file}`;
            const fileInfo = await FileSystem.getInfoAsync(filePath);
            
            if (fileInfo.exists && fileInfo.modificationTime) {
              const age = now - fileInfo.modificationTime * 1000;
              if (age > maxAge) {
                await FileSystem.deleteAsync(filePath, { idempotent: true });
              }
            }
          }
        } catch (e) {}
        
        console.log('Cache cleanup complete');
      } catch (error) {
        console.log('Cleanup error:', error.message);
      }
    });
  }

  latLngToTile(lat, lng, zoom) {
    const n = Math.pow(2, zoom);
    const x = Math.floor((lng + 180) / 360 * n);
    const y = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * n);
    return { x, y };
  }

  blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async getCacheStats() {
    try {
      const routesList = await this.getCachedRoutesList();
      const evacuationData = await AsyncStorage.getItem(CACHE_KEYS.EVACUATION_CENTERS);
      const lastLocation = await this.getLastKnownLocation();
      
      let tilesSize = 0;
      try {
        const tilesInfo = await FileSystem.getInfoAsync(MAP_TILES_DIR, { size: true });
        tilesSize = tilesInfo.exists ? tilesInfo.size : 0;
      } catch (e) {}
      
      return {
        routesCached: routesList.length,
        evacuationCentersCached: evacuationData ? JSON.parse(evacuationData).centers.length : 0,
        lastLocationCached: !!lastLocation,
        tilesStorageSize: tilesSize,
        lastSyncTimestamp: await AsyncStorage.getItem(CACHE_KEYS.OFFLINE_DATA_TIMESTAMP),
      };
    } catch (error) {
      return null;
    }
  }

  async clearAllCache() {
    try {
      await AsyncStorage.multiRemove([
        CACHE_KEYS.EVACUATION_CENTERS,
        CACHE_KEYS.ROUTES_CACHE,
        CACHE_KEYS.OFFLINE_DATA_TIMESTAMP,
      ]);
      
      await FileSystem.deleteAsync(MAP_TILES_DIR, { idempotent: true });
      await FileSystem.deleteAsync(ROUTES_DIR, { idempotent: true });
      
      this.initialized = false;
      await this.initialize();
      
      console.log('All cache cleared');
      return true;
    } catch (error) {
      console.error('Failed to clear cache:', error);
      return false;
    }
  }

  destroy() {}
}

const offlineMapService = new OfflineMapService();

export default offlineMapService;