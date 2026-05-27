// ============================================================
// Minimap — Secondary camera showing explored world
// ============================================================
import Phaser from 'phaser';
import { WORLD_PX_W, WORLD_PX_H, ZONES, TILE_SIZE } from '../utils/Constants.js';

export class Minimap {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    this.width = 220;
    this.height = 160;
    this.x = 1280 - this.width - 10;
    this.y = 40;

    // Minimap border background
    this.border = scene.add.image(this.x + this.width / 2, this.y + this.height / 2, 'minimap_border')
      .setDepth(99).setScrollFactor(0);

    // Create minimap camera
    this.cam = scene.cameras.add(this.x + 2, this.y + 2, this.width - 4, this.height - 4);
    this.cam.setZoom(0.04);
    this.cam.startFollow(player, true, 0.1, 0.1);
    this.cam.setBackgroundColor(0x0a0a1a);

    // Player dot on minimap
    this.playerDot = scene.add.circle(player.x, player.y, 12, 0xffffff).setDepth(95);
    scene.cameras.main.ignore(this.playerDot);
    this.scene.tweens.add({
      targets: this.playerDot, scale: 0.6, duration: 600, yoyo: true, repeat: -1
    });

    // Zone labels on minimap
    this.zoneMarkers = [];
    Object.entries(ZONES).forEach(([key, zone]) => {
      const zx = (zone.x + zone.w / 2) * TILE_SIZE;
      const zy = (zone.y + zone.h / 2) * TILE_SIZE;
      const rect = scene.add.rectangle(zx, zy, zone.w * TILE_SIZE, zone.h * TILE_SIZE, 0x4444aa, 0.15)
        .setStrokeStyle(3, 0x6666aa, 0.4).setDepth(94);
      this.zoneMarkers.push(rect);
    });
    scene.cameras.main.ignore(this.zoneMarkers);

    // Ignore HUD elements from minimap camera
    this.cam.ignore([this.border]);

    // Player count text
    this.countText = scene.add.text(this.x + this.width / 2, this.y + this.height - 8, 'Players: 1', {
      fontFamily: 'Inter, sans-serif', fontSize: '7px', color: '#888899'
    }).setOrigin(0.5).setDepth(102).setScrollFactor(0);
  }

  update() {
    this.playerDot.setPosition(this.player.x, this.player.y);
  }

  setIgnoreList(objects) {
    try {
      this.cam.ignore(objects);
    } catch (e) { /* some objects may not be ignorable */ }
  }
}
