// ============================================================
// ClassSelectScene — Pick your class with animated sprite previews
// Reverted to Phaser canvas rendering (keeps real character sprites)
// Fixed: vertical centering, confirm button positioning
// ============================================================
import Phaser from 'phaser';
import { CLASS_CONFIG } from '../config/ClassConfig.js';

export class ClassSelectScene extends Phaser.Scene {
  constructor() { super('ClassSelect'); }

  create() {
    const { width, height } = this.cameras.main;
    this.cameras.main.setBackgroundColor('#0a0a0f');
    this.cameras.main.fadeIn(500, 10, 10, 15);

    // Starfield background
    for (let i = 0; i < 80; i++) {
      const sx = Phaser.Math.Between(0, width);
      const sy = Phaser.Math.Between(0, height);
      const alpha = Phaser.Math.FloatBetween(0.1, 0.5);
      this.add.circle(sx, sy, Phaser.Math.Between(1, 2), 0xffffff, alpha);
    }

    // Header
    this.add.text(width / 2, 28, '⚔  CHOOSE THY CLASS', {
      fontFamily: 'Inter, sans-serif', fontSize: '20px', color: '#e0d0b0',
      stroke: '#0a0a0f', strokeThickness: 4,
      shadow: { color: '#a855f7', blur: 16, fill: true }
    }).setOrigin(0.5);

    this.add.text(width / 2, 56, `Hero: ${window.ASHENVEIL.username || 'Adventurer'}`, {
      fontFamily: 'Inter, sans-serif', fontSize: '13px', color: '#a855f7'
    }).setOrigin(0.5);

    const classes = Object.entries(CLASS_CONFIG);
    const cardW = 230;
    const cardH = 440;
    const gap   = 24;
    const totalW = classes.length * cardW + (classes.length - 1) * gap;
    const startX = (width - totalW) / 2 + cardW / 2;

    // Center cards vertically between header (70px) and bottom button area (60px)
    const usableH = height - 70 - 60;
    const cy = 70 + usableH / 2;

    this.selectedClass = null;
    this.cards = [];

    classes.forEach(([key, cfg], i) => {
      const cx = startX + i * (cardW + gap);

      // ── Card background ──────────────────────────────────
      const card = this.add.rectangle(cx, cy, cardW, cardH, 0x080818, 0.95)
        .setStrokeStyle(2, 0x3a3a88, 0.7).setInteractive({ useHandCursor: true });

      // Top accent bar
      const colorHex = cfg.color;
      this.add.rectangle(cx, cy - cardH / 2 + 3, cardW - 4, 5, colorHex, 0.9);

      // ── Sprite preview ───────────────────────────────────
      const spriteY = cy - cardH / 2 + 72;
      const spriteKey = `${key}_idle_down`;
      let preview;
      if (this.textures.exists(spriteKey)) {
        preview = this.add.sprite(cx, spriteY, spriteKey, 0).setScale(3);
        const animKey = `anim_${spriteKey}`;
        if (this.anims.exists(animKey)) preview.play(animKey);
        // Gentle bob
        this.tweens.add({ targets: preview, y: spriteY - 4, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      } else {
        preview = this.add.circle(cx, spriteY, 18, colorHex, 0.85);
      }

      // ── Class name ───────────────────────────────────────
      this.add.text(cx, cy - cardH / 2 + 118, cfg.name.toUpperCase(), {
        fontFamily: 'Inter, sans-serif', fontSize: '15px', fontStyle: 'bold',
        color: '#' + colorHex.toString(16).padStart(6, '0'),
      }).setOrigin(0.5);

      // ── Stat bars ────────────────────────────────────────
      const statY = cy - cardH / 2 + 142;
      const bars = [
        { label: 'HP',  value: cfg.stats.hp,      max: 200, color: 0xcc2222 },
        { label: cfg.resource === 'mana' ? 'MP' : 'STA', value: cfg.stats.mana, max: 150, color: cfg.resource === 'mana' ? 0x2255cc : 0xcccc22 },
        { label: 'ATK', value: cfg.stats.attack,   max: 20,  color: 0xcc7722 },
        { label: 'DEF', value: cfg.stats.defense,  max: 20,  color: 0x33aa55 },
        { label: 'SPD', value: cfg.stats.speed,    max: 200, color: 0x8855cc },
      ];

      bars.forEach((s, j) => {
        const sy = statY + j * 22;
        // Label
        this.add.text(cx - cardW / 2 + 12, sy, s.label, {
          fontFamily: 'Inter', fontSize: '9px', color: '#778899'
        });
        // Bar track
        const bx = cx - cardW / 2 + 46;
        const bw = cardW - 80;
        this.add.rectangle(bx + bw / 2, sy + 5, bw, 7, 0x111122).setOrigin(0.5, 0.5);
        // Bar fill
        const fill = Math.max(3, (s.value / s.max) * bw);
        this.add.rectangle(bx, sy + 5, fill, 7, s.color, 0.85).setOrigin(0, 0.5);
        // Value
        this.add.text(bx + bw + 6, sy, `${s.value}`, {
          fontFamily: 'Inter', fontSize: '9px', color: '#888899'
        });
      });

      // ── Description ──────────────────────────────────────
      this.add.text(cx, statY + 115, cfg.description, {
        fontFamily: 'Inter', fontSize: '10px', color: '#6677aa',
        wordWrap: { width: cardW - 24 }, align: 'center', lineSpacing: 3
      }).setOrigin(0.5, 0);

      // ── Abilities ────────────────────────────────────────
      const abY = statY + 185;
      this.add.text(cx, abY, 'ABILITIES', {
        fontFamily: 'Inter', fontSize: '9px', color: '#a855f7', fontStyle: 'bold'
      }).setOrigin(0.5);
      cfg.abilities.forEach((ab, j) => {
        this.add.text(cx - cardW / 2 + 12, abY + 14 + j * 16, `[${ab.key}] ${ab.name}`, {
          fontFamily: 'Inter', fontSize: '8.5px', color: '#8899bb'
        });
      });

      // ── Hover / Click ────────────────────────────────────
      card.on('pointerover', () => {
        card.setStrokeStyle(2, colorHex, 1);
        this.tweens.add({ targets: card, scaleX: 1.03, scaleY: 1.03, duration: 140 });
      });
      card.on('pointerout', () => {
        if (this.selectedClass !== key) {
          card.setStrokeStyle(2, 0x3a3a88, 0.7);
          this.tweens.add({ targets: card, scaleX: 1, scaleY: 1, duration: 140 });
        }
      });
      card.on('pointerdown', () => {
        if (this.selectedClass === key) {
          this._launch(key);
          return;
        }
        this.selectedClass = key;
        this.cards.forEach(c => {
          c.card.setStrokeStyle(2, 0x3a3a88, 0.7);
          this.tweens.add({ targets: c.card, scaleX: 1, scaleY: 1, duration: 140 });
        });
        card.setStrokeStyle(3, colorHex, 1);
        this.tweens.add({ targets: card, scaleX: 1.03, scaleY: 1.03, duration: 140 });
        this._showConfirm(key, cfg);
      });

      this.cards.push({ card, key });
    });
  }

  _showConfirm(key, cfg) {
    this.confirmBtn?.destroy();
    this.confirmTxt?.destroy();
    this.confirmSub?.destroy();

    const { width, height } = this.cameras.main;
    const btnY = height - 30;
    const colorHex = '#' + cfg.color.toString(16).padStart(6, '0');

    this.confirmBtn = this.add.rectangle(width / 2, btnY, 360, 42, 0x1a0a2e, 1)
      .setStrokeStyle(2, cfg.color, 1).setInteractive({ useHandCursor: true });
    this.confirmTxt = this.add.text(width / 2, btnY, `▶  BEGIN AS ${cfg.name.toUpperCase()}`, {
      fontFamily: 'Inter, sans-serif', fontSize: '15px', fontStyle: 'bold', color: colorHex
    }).setOrigin(0.5);
    this.confirmSub = this.add.text(width / 2, btnY - 24, 'Tap card again or click below to confirm', {
      fontFamily: 'Inter', fontSize: '9px', color: '#555566'
    }).setOrigin(0.5);

    this.confirmBtn.on('pointerover', () => {
      this.confirmBtn.setFillStyle(cfg.color, 1);
      this.confirmTxt.setColor('#0a0a0f');
    });
    this.confirmBtn.on('pointerout', () => {
      this.confirmBtn.setFillStyle(0x1a0a2e, 1);
      this.confirmTxt.setColor(colorHex);
    });
    this.confirmBtn.on('pointerdown', () => this._launch(key));
  }

  _launch(key) {
    window.ASHENVEIL.playerClass = key;
    this.cameras.main.fadeOut(500, 10, 10, 15);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('Game', { playerClass: key, isNew: true });
    });
  }

  shutdown() {
    document.getElementById('class-select-overlay')?.remove();
  }
}
