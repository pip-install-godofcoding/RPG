// ============================================================
// Realm of Ashenveil — Main Entry
// ============================================================
import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { TitleScene } from './scenes/TitleScene.js';
import { ClassSelectScene } from './scenes/ClassSelectScene.js';
import { GameScene } from './scenes/GameScene.js';
import { BattleScene } from './scenes/BattleScene.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 1280,
  height: 720,
  pixelArt: true,
  roundPixels: true,
  backgroundColor: '#0a0a0f',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [BootScene, TitleScene, ClassSelectScene, GameScene, BattleScene]
};

const game = new Phaser.Game(config);

// Global game state
window.ASHENVEIL = {
  username: null,
  playerClass: null,
  playerId: null,
  supabase: null,
  dbmsMode: true
};
