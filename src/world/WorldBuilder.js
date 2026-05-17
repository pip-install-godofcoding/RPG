// ============================================================
// WorldBuilder — Procedural tilemap for all zones
// ============================================================
import Phaser from 'phaser';
import { TILE_SIZE, WORLD_WIDTH, WORLD_HEIGHT, ZONES, COLORS } from '../utils/Constants.js';

export class WorldBuilder {
  constructor(scene) {
    this.scene = scene;
  }

  build() {
    const map = this.scene.make.tilemap({
      tileWidth: TILE_SIZE, tileHeight: TILE_SIZE,
      width: WORLD_WIDTH, height: WORLD_HEIGHT
    });

    // Create tileset from procedural textures
    const tileKeys = ['grass','dark_grass','stone','wood','water','lava','crystal','obsidian','sand','road','wall','tree','building'];
    const tilesetImages = {};
    tileKeys.forEach((key, i) => { tilesetImages[key] = i; });

    // We'll use a simpler approach: create sprites for tiles in groups
    this.groundGroup = this.scene.add.group();
    this.collisionBodies = this.scene.physics.add.staticGroup();
    this.zoneOverlays = {};
    this.zoneTriggers = {};

    // Draw each zone
    Object.entries(ZONES).forEach(([zoneKey, zone]) => {
      this._buildZone(zoneKey, zone);
    });

    // Fill empty space with water
    this._fillEmpty();

    return {
      groundGroup: this.groundGroup,
      collisionBodies: this.collisionBodies,
      zoneTriggers: this.zoneTriggers
    };
  }

  _buildZone(key, zone) {
    const groundTile = `tile_${zone.ground}`;
    const accentTile = `tile_${zone.accent}`;

    // Ground fill
    for (let y = zone.y; y < zone.y + zone.h; y++) {
      for (let x = zone.x; x < zone.x + zone.w; x++) {
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;
        const tile = this.scene.add.image(px + 16, py + 16, groundTile).setDepth(0);
        this.groundGroup.add(tile);
      }
    }

    // Border walls
    for (let x = zone.x; x < zone.x + zone.w; x++) {
      this._placeWall(x, zone.y);
      this._placeWall(x, zone.y + zone.h - 1);
    }
    for (let y = zone.y; y < zone.y + zone.h; y++) {
      this._placeWall(zone.x, y);
      this._placeWall(zone.x + zone.w - 1, y);
    }

    // Zone-specific features
    this._addZoneFeatures(key, zone, accentTile);

    // Entrance gaps (remove some wall segments)
    this._addEntrances(key, zone);

    // Zone transition trigger
    const triggerRect = this.scene.add.rectangle(
      (zone.x + zone.w / 2) * TILE_SIZE,
      (zone.y + zone.h / 2) * TILE_SIZE,
      zone.w * TILE_SIZE, zone.h * TILE_SIZE,
      0x000000, 0
    );
    this.scene.physics.add.existing(triggerRect, true);
    this.zoneTriggers[key] = triggerRect;
  }

  _placeWall(tx, ty) {
    const px = tx * TILE_SIZE + 16;
    const py = ty * TILE_SIZE + 16;
    const wall = this.scene.add.image(px, py, 'tile_wall').setDepth(1);
    const body = this.scene.add.rectangle(px, py, TILE_SIZE, TILE_SIZE, 0x000000, 0);
    this.scene.physics.add.existing(body, true);
    this.collisionBodies.add(body);
  }

  _addZoneFeatures(key, zone, accentTile) {
    const rng = new Phaser.Math.RandomDataGenerator([key]);

    switch (key) {
      case 'ashenveil_village':
        // Roads in cross pattern
        for (let i = 5; i < zone.w - 5; i++) {
          const px = (zone.x + i) * TILE_SIZE + 16;
          const py = (zone.y + Math.floor(zone.h / 2)) * TILE_SIZE + 16;
          this.scene.add.image(px, py, accentTile).setDepth(0);
          this.scene.add.image((zone.x + Math.floor(zone.w / 2)) * TILE_SIZE + 16, (zone.y + i) * TILE_SIZE + 16, accentTile).setDepth(0);
        }
        // Buildings
        this._placeBuildings(zone, rng, 6);
        break;
      case 'dark_forest':
        // Dense trees
        for (let i = 0; i < 60; i++) {
          const tx = zone.x + 2 + rng.between(0, zone.w - 4);
          const ty = zone.y + 2 + rng.between(0, zone.h - 4);
          this._placeTree(tx, ty);
        }
        break;
      case 'crystal_caves':
        // Crystal formations
        for (let i = 0; i < 25; i++) {
          const tx = zone.x + 2 + rng.between(0, zone.w - 4);
          const ty = zone.y + 2 + rng.between(0, zone.h - 4);
          const px = tx * TILE_SIZE + 16;
          const py = ty * TILE_SIZE + 16;
          this.scene.add.image(px, py, 'tile_crystal').setDepth(1).setAlpha(0.8);
          if (rng.frac() > 0.5) {
            const body = this.scene.add.rectangle(px, py, TILE_SIZE, TILE_SIZE, 0, 0);
            this.scene.physics.add.existing(body, true);
            this.collisionBodies.add(body);
          }
        }
        break;
      case 'dragons_lair':
        // Lava pools
        for (let i = 0; i < 15; i++) {
          const tx = zone.x + 3 + rng.between(0, zone.w - 6);
          const ty = zone.y + 3 + rng.between(0, zone.h - 6);
          const px = tx * TILE_SIZE + 16;
          const py = ty * TILE_SIZE + 16;
          this.scene.add.image(px, py, 'tile_lava').setDepth(0);
        }
        break;
      case 'guild_citadel':
        this._placeBuildings(zone, rng, 4);
        break;
      case 'marketplace':
        // Market stalls
        for (let i = 0; i < 8; i++) {
          const tx = zone.x + 3 + (i % 4) * 5;
          const ty = zone.y + 4 + Math.floor(i / 4) * 8;
          const px = tx * TILE_SIZE + 16;
          const py = ty * TILE_SIZE + 16;
          this.scene.add.image(px, py, 'tile_building').setDepth(1).setScale(0.8);
        }
        break;
      case 'boss_arena':
        // Pillars
        for (let i = 0; i < 4; i++) {
          const angle = (i / 4) * Math.PI * 2;
          const tx = zone.x + Math.floor(zone.w / 2) + Math.floor(Math.cos(angle) * 8);
          const ty = zone.y + Math.floor(zone.h / 2) + Math.floor(Math.sin(angle) * 6);
          this._placeWall(tx, ty);
        }
        break;
    }
  }

  _placeTree(tx, ty) {
    const px = tx * TILE_SIZE + 16;
    const py = ty * TILE_SIZE + 16;
    this.scene.add.image(px, py, 'tile_tree').setDepth(1);
    const body = this.scene.add.rectangle(px, py + 4, 20, 12, 0, 0);
    this.scene.physics.add.existing(body, true);
    this.collisionBodies.add(body);
  }

  _placeBuildings(zone, rng, count) {
    for (let i = 0; i < count; i++) {
      const tx = zone.x + 4 + rng.between(0, zone.w - 8);
      const ty = zone.y + 4 + rng.between(0, zone.h - 8);
      const px = tx * TILE_SIZE + 16;
      const py = ty * TILE_SIZE + 16;
      this.scene.add.image(px, py, 'tile_building').setDepth(1);
      const body = this.scene.add.rectangle(px, py, TILE_SIZE, TILE_SIZE, 0, 0);
      this.scene.physics.add.existing(body, true);
      this.collisionBodies.add(body);
    }
  }

  _addEntrances(key, zone) {
    // Remove some border walls to create entrances
    const midX = zone.x + Math.floor(zone.w / 2);
    const midY = zone.y + Math.floor(zone.h / 2);

    // Each zone gets openings on 2-4 sides
    const entrancePositions = [
      { x: midX, y: zone.y },          // top
      { x: midX, y: zone.y + zone.h - 1 }, // bottom
      { x: zone.x, y: midY },          // left
      { x: zone.x + zone.w - 1, y: midY }  // right
    ];

    entrancePositions.forEach(pos => {
      // Remove collision bodies near entrance
      const px = pos.x * TILE_SIZE + 16;
      const py = pos.y * TILE_SIZE + 16;
      this.collisionBodies.getChildren().forEach(body => {
        if (Math.abs(body.x - px) < TILE_SIZE * 2 && Math.abs(body.y - py) < TILE_SIZE * 2) {
          body.destroy();
        }
      });
    });
  }

  _fillEmpty() {
    // Place water tiles for areas outside zones - just set world bounds instead
    // This is handled by the dark fog of war background
  }
}
