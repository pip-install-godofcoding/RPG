// ============================================================
// ZoneManager — Track current zone, trigger transitions
// ============================================================
import { ZONES, TILE_SIZE } from '../utils/Constants.js';

export class ZoneManager {
  constructor(scene) {
    this.scene = scene;
    this.currentZone = 'ashenveil_village';
    this.previousZone = null;
    this.onZoneChange = null; // callback
  }

  getSpawnPoint(zoneKey = 'ashenveil_village') {
    const zone = ZONES[zoneKey];
    return {
      x: (zone.x + Math.floor(zone.w / 2)) * TILE_SIZE + 16,
      y: (zone.y + Math.floor(zone.h / 2)) * TILE_SIZE + 16
    };
  }

  update(playerX, playerY) {
    const tileX = Math.floor(playerX / TILE_SIZE);
    const tileY = Math.floor(playerY / TILE_SIZE);

    for (const [key, zone] of Object.entries(ZONES)) {
      if (tileX >= zone.x && tileX < zone.x + zone.w &&
          tileY >= zone.y && tileY < zone.y + zone.h) {
        if (this.currentZone !== key) {
          this.previousZone = this.currentZone;
          this.currentZone = key;
          if (this.onZoneChange) {
            this.onZoneChange(key, zone);
          }
        }
        return;
      }
    }
    // Outside all zones — wilderness (invalid location due to map changes)
    if (this.currentZone !== 'wilderness') {
      this.previousZone = this.currentZone;
      this.currentZone = 'wilderness';
      if (this.onZoneChange) {
        this.onZoneChange('wilderness', { name: 'The Wilds' });
      }
      
      // Auto-rescue: teleport player back to village if they are stuck in the void
      const spawn = this.getSpawnPoint('ashenveil_village');
      if (this.scene && this.scene.player) {
        this.scene.player.setPosition(spawn.x, spawn.y);
      }
    }
  }

  getCurrentZoneName() {
    if (this.currentZone === 'wilderness') return 'The Wilds';
    return ZONES[this.currentZone]?.name || 'Unknown';
  }
}
