// ============================================================
// FogOfWar — RenderTexture-based fog, reveals around player
// ============================================================
import Phaser from 'phaser';
import { TILE_SIZE, WORLD_PX_W, WORLD_PX_H } from '../utils/Constants.js';

export class FogOfWar {
  constructor(scene) {
    this.scene = scene;
    this.revealRadius = 6 * TILE_SIZE; // 6 tile radius
    this.exploredTiles = new Set();
    this.lastTileX = -1;
    this.lastTileY = -1;

    // Create a large dark overlay as the fog
    this.fogRT = scene.add.renderTexture(0, 0, WORLD_PX_W, WORLD_PX_H)
      .setDepth(80)
      .setAlpha(0.7);
    this.fogRT.fill(0x000000, 1);

    // Create a circular "eraser" brush texture
    const brushSize = this.revealRadius * 2;
    const brushG = scene.add.graphics();
    // Gradient circle - center fully transparent, edges semi-transparent
    for (let r = this.revealRadius; r > 0; r -= 2) {
      const alpha = (r / this.revealRadius);
      brushG.fillStyle(0xffffff, alpha);
      brushG.fillCircle(this.revealRadius, this.revealRadius, r);
    }
    brushG.generateTexture('fog_brush', brushSize, brushSize);
    brushG.destroy();

    this.brushSprite = scene.add.image(0, 0, 'fog_brush').setVisible(false);
  }

  update(playerX, playerY) {
    const tileX = Math.floor(playerX / TILE_SIZE);
    const tileY = Math.floor(playerY / TILE_SIZE);

    // Only update when player moves to a new tile
    if (tileX === this.lastTileX && tileY === this.lastTileY) return;
    this.lastTileX = tileX;
    this.lastTileY = tileY;

    // Erase fog around player position
    this.fogRT.erase(this.brushSprite, 
      playerX - this.revealRadius, 
      playerY - this.revealRadius
    );

    // Track explored tiles
    const radius = 6;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy <= radius * radius) {
          this.exploredTiles.add(`${tileX + dx},${tileY + dy}`);
        }
      }
    }
  }

  getExploredData() {
    return Array.from(this.exploredTiles);
  }

  loadExploredData(data) {
    if (!data || !Array.isArray(data)) return;
    
    // Process in chunks to prevent "Page Unresponsive" browser freezes
    // due to thousands of WebGL erase operations occurring in a single frame.
    const chunkSize = 150;
    let index = 0;

    const processChunk = () => {
      if (!this.scene || !this.fogRT || index >= data.length) return;

      const end = Math.min(index + chunkSize, data.length);
      for (let i = index; i < end; i++) {
        const key = data[i];
        this.exploredTiles.add(key);
        const [tx, ty] = key.split(',').map(Number);
        this.fogRT.erase(this.brushSprite,
          tx * TILE_SIZE - this.revealRadius + TILE_SIZE / 2,
          ty * TILE_SIZE - this.revealRadius + TILE_SIZE / 2
        );
      }
      index = end;

      if (index < data.length) {
        this.scene.time.delayedCall(1, processChunk);
      } else {
        console.log(`[FOG] Finished loading ${data.length} explored tiles.`);
      }
    };

    processChunk();
  }
}
