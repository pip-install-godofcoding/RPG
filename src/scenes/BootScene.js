// ============================================================
// BootScene — Generate textures + create animations
// ============================================================
import Phaser from 'phaser';
import { SpriteGenerator } from '../utils/SpriteGenerator.js';

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  create() {
    const { width, height } = this.cameras.main;
    this.cameras.main.setBackgroundColor('#0a0a0f');

    this.add.text(width / 2, height / 2 - 60, 'REALM OF ASHENVEIL', {
      fontFamily: 'Inter, sans-serif', fontSize: '20px', color: '#a855f7'
    }).setOrigin(0.5);

    const loadTxt = this.add.text(width / 2, height / 2, 'Forging the world...', {
      fontFamily: 'Inter, sans-serif', fontSize: '18px', color: '#e0d0b0'
    }).setOrigin(0.5);

    this.add.rectangle(width / 2, height / 2 + 40, 400, 16, 0x1a1a2e);
    const barFill = this.add.rectangle(width / 2 - 198, height / 2 + 40, 4, 12, 0xa855f7).setOrigin(0, 0.5);

    // Generate textures
    this.time.delayedCall(50, () => {
      try {
        const gen = new SpriteGenerator(this);
        gen.generateAll();
        this._createAnimations();
        loadTxt.setText('World forged!');
      } catch (e) {
        console.error('Generation error:', e);
        loadTxt.setText('Loading...');
      }

      this.tweens.add({
        targets: barFill, width: 396, duration: 600, ease: 'Power2',
        onComplete: () => {
          this.time.delayedCall(300, () => this.scene.start('Title'));
        }
      });
    });
  }

  _createAnimations() {
    const classes = ['warrior', 'mage', 'rogue', 'archer'];
    const dirs = ['down', 'left', 'right', 'up'];
    const stateFrames = { idle: 2, walk: 4, attack: 3, cast: 3, death: 4 };

    classes.forEach(cls => {
      dirs.forEach(dir => {
        Object.entries(stateFrames).forEach(([state, count]) => {
          const key = `${cls}_${state}_${dir}`;
          if (!this.textures.exists(key)) return;
          const tex = this.textures.get(key);
          for (let i = 0; i < count; i++) {
            tex.add(i, 0, i * 32, 0, 32, 32);
          }
          const animKey = `anim_${key}`;
          if (!this.anims.exists(animKey)) {
            this.anims.create({
              key: animKey,
              frames: Array.from({length: count}, (_, i) => ({ key, frame: i })),
              frameRate: state === 'idle' ? 3 : state === 'walk' ? 8 : state === 'death' ? 4 : 10,
              repeat: (state === 'idle' || state === 'walk') ? -1 : 0
            });
          }
        });
      });
    });

    // Enemy anims
    const enemies = ['slime', 'skeleton', 'wolf', 'fire_imp', 'crystal_golem', 'dragon'];
    const enemyStates = { idle: 2, walk: 4, death: 3 };
    enemies.forEach(name => {
      Object.entries(enemyStates).forEach(([state, count]) => {
        const key = `${name}_${state}`;
        if (!this.textures.exists(key)) return;
        const tex = this.textures.get(key);
        for (let i = 0; i < count; i++) {
          tex.add(i, 0, i * 32, 0, 32, 32);
        }
        const animKey = `anim_${key}`;
        if (!this.anims.exists(animKey)) {
          this.anims.create({
            key: animKey,
            frames: Array.from({length: count}, (_, i) => ({ key, frame: i })),
            frameRate: state === 'idle' ? 3 : 6,
            repeat: state === 'death' ? 0 : -1
          });
        }
      });
    });

    // NPC anims
    ['elder','merchant','blacksmith','guard','quest_giver'].forEach(name => {
      const key = `npc_${name}`;
      if (!this.textures.exists(key)) return;
      const tex = this.textures.get(key);
      tex.add(0, 0, 0, 0, 32, 32);
      tex.add(1, 0, 32, 0, 32, 32);
      if (!this.anims.exists(`anim_${key}`)) {
        this.anims.create({
          key: `anim_${key}`,
          frames: [{ key, frame: 0 }, { key, frame: 1 }],
          frameRate: 2, repeat: -1
        });
      }
    });
  }
}
