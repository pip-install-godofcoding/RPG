// ============================================================
// ClassSelectScene — Pick your class with animated previews
// ============================================================
import Phaser from 'phaser';
import { CLASS_CONFIG } from '../config/ClassConfig.js';

export class ClassSelectScene extends Phaser.Scene {
  constructor() { super('ClassSelect'); }

  create() {
    const { width, height } = this.cameras.main;
    this.cameras.main.setBackgroundColor('#0a0a0f');
    this.cameras.main.fadeIn(500, 10, 10, 15);

    // Header
    this.add.text(width / 2, 40, 'CHOOSE THY CLASS', {
      fontFamily: 'Inter, sans-serif', fontSize: '18px', color: '#e0d0b0',
      stroke: '#2a1a3e', strokeThickness: 3
    }).setOrigin(0.5);

    this.add.text(width / 2, 70, `Hero: ${window.ASHENVEIL.username}`, {
      fontFamily: 'Inter, sans-serif', fontSize: '15px', color: '#a855f7'
    }).setOrigin(0.5);

    const classes = Object.entries(CLASS_CONFIG);
    const cardW = 240;
    const cardH = 460;
    const gap = 30;
    const totalW = classes.length * cardW + (classes.length - 1) * gap;
    const startX = (width - totalW) / 2 + cardW / 2;

    this.selectedClass = null;
    this.cards = [];

    classes.forEach(([key, cfg], i) => {
      const cx = startX + i * (cardW + gap);
      const cy = height / 2 + 30;

      // Card background
      const card = this.add.rectangle(cx, cy, cardW, cardH, 0x111122, 0.9)
        .setStrokeStyle(2, 0x4444aa, 0.6).setInteractive();

      // Class color accent bar
      this.add.rectangle(cx, cy - cardH / 2 + 4, cardW - 4, 6, cfg.color, 0.8);

      // Class name
      this.add.text(cx, cy - cardH / 2 + 30, cfg.name.toUpperCase(), {
        fontFamily: 'Inter, sans-serif', fontSize: '16px', color: '#e0d0b0'
      }).setOrigin(0.5);

      // Sprite preview
      const spriteKey = `${key}_idle_down`;
      let preview;
      if (this.textures.exists(spriteKey)) {
        preview = this.add.sprite(cx, cy - cardH / 2 + 80, spriteKey, 0).setScale(2.5);
        const animKey = `anim_${spriteKey}`;
        if (this.anims.exists(animKey)) preview.play(animKey);
      } else {
        preview = this.add.circle(cx, cy - cardH / 2 + 80, 16, cfg.color);
      }

      // Stats
      const statY = cy - cardH / 2 + 130;
      const stats = [
        { label: 'HP', value: cfg.stats.hp, max: 200, color: 0xcc2222 },
        { label: cfg.resource === 'mana' ? 'MP' : 'STA', value: cfg.stats[cfg.resource === 'mana' ? 'mana' : 'mana'], max: 150, color: cfg.resource === 'mana' ? 0x2255cc : 0xcccc22 },
        { label: 'ATK', value: cfg.stats.attack, max: 20, color: 0xcc8822 },
        { label: 'DEF', value: cfg.stats.defense, max: 20, color: 0x44aa66 },
        { label: 'SPD', value: cfg.stats.speed, max: 200, color: 0x8866cc }
      ];
      stats.forEach((s, j) => {
        const sy = statY + j * 24;
        this.add.text(cx - cardW / 2 + 15, sy, s.label, {
          fontFamily: 'Inter, sans-serif', fontSize: '10px', color: '#888899'
        });
        const barStartX = cx - cardW / 2 + 50;
        const barW = 120;
        this.add.rectangle(barStartX, sy + 5, barW, 8, 0x1a1a2e).setOrigin(0, 0.5);
        const fill = (s.value / s.max) * barW;
        this.add.rectangle(barStartX, sy + 5, fill, 8, s.color, 0.8).setOrigin(0, 0.5);
        this.add.text(barStartX + barW + 6, sy, `${s.value}`, {
          fontFamily: 'Inter, sans-serif', fontSize: '10px', color: '#aaaaaa'
        });
      });

      // Description
      this.add.text(cx, statY + 130, cfg.description, {
        fontFamily: 'Inter', fontSize: '16px', color: '#888899',
        wordWrap: { width: cardW - 30 }, align: 'center', lineSpacing: 3
      }).setOrigin(0.5, 0);

      // Abilities list
      const abY = statY + 190;
      this.add.text(cx, abY, 'ABILITIES', {
        fontFamily: 'Inter, sans-serif', fontSize: '10px', color: '#a855f7'
      }).setOrigin(0.5);
      cfg.abilities.forEach((ab, j) => {
        this.add.text(cx - cardW / 2 + 15, abY + 18 + j * 18, `[${ab.key}] ${ab.name}`, {
          fontFamily: 'Inter, sans-serif', fontSize: '9px', color: '#aabbcc'
        });
      });

      // Hover & click
      card.on('pointerover', () => {
        card.setStrokeStyle(2, cfg.color, 1);
        this.tweens.add({ targets: card, scaleX: 1.03, scaleY: 1.03, duration: 150 });
      });
      card.on('pointerout', () => {
        if (this.selectedClass !== key) {
          card.setStrokeStyle(2, 0x4444aa, 0.6);
          this.tweens.add({ targets: card, scaleX: 1, scaleY: 1, duration: 150 });
        }
      });
      card.on('pointerdown', () => {
        if (this.selectedClass === key) {
          // Double-click = go!
          window.ASHENVEIL.playerClass = key;
          this.cameras.main.fadeOut(500, 10, 10, 15);
          this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('Game', { playerClass: key, isNew: true });
          });
          return;
        }
        this.selectedClass = key;
        this.cards.forEach(c => {
          c.card.setStrokeStyle(2, 0x4444aa, 0.6);
          c.card.setScale(1);
        });
        card.setStrokeStyle(3, cfg.color, 1);
        card.setScale(1.03);
        this._showConfirm(key, cfg);
      });

      this.cards.push({ card, key });
    });
  }

  _showConfirm(key, cfg) {
    if (this.confirmBtn) this.confirmBtn.destroy();
    if (this.confirmTxt) this.confirmTxt.destroy();

    const { width, height } = this.cameras.main;
    const btnY = height - 50;
    this.confirmBtn = this.add.rectangle(width / 2, btnY, 320, 44, 0x2a1a3e, 1)
      .setStrokeStyle(3, 0xa855f7, 1).setInteractive({ useHandCursor: true });
    this.confirmTxt = this.add.text(width / 2, btnY, `[ BEGIN AS ${cfg.name.toUpperCase()} ]`, {
      fontFamily: 'Inter, sans-serif', fontSize: '16px', color: '#a855f7'
    }).setOrigin(0.5);

    this.confirmBtn.on('pointerover', () => {
      this.confirmBtn.setFillStyle(0xa855f7, 1);
      this.confirmTxt.setColor('#0a0a0f');
    });
    this.confirmBtn.on('pointerout', () => {
      this.confirmBtn.setFillStyle(0x2a1a3e, 1);
      this.confirmTxt.setColor('#a855f7');
    });
    this.confirmBtn.on('pointerdown', () => {
      window.ASHENVEIL.playerClass = key;
      this.cameras.main.fadeOut(500, 10, 10, 15);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('Game', { playerClass: key, isNew: true });
      });
    });
  }
}
