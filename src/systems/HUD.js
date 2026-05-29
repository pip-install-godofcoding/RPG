// ============================================================
// HUD — HP/MP/XP bars, hotbar, zone name, gold, level
// ============================================================
import Phaser from 'phaser';
import { COLORS } from '../utils/Constants.js';

export class HUD {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    this.elements = [];

    this._createBars();
    this._createHotbar();
    this._createZoneName();
    this._createPlayerInfo();
    this._createDamageNumbers();
  }

  _createBars() {
    const x = 20, w = 200, h = 14, gap = 20;
    // HP
    this.hpBg = this.scene.add.rectangle(x, 20, w, h, 0x1a1a2e).setOrigin(0, 0).setDepth(100).setScrollFactor(0);
    this.hpFill = this.scene.add.rectangle(x + 1, 21, w - 2, h - 2, COLORS.hpBar).setOrigin(0, 0).setDepth(101).setScrollFactor(0);
    this.hpText = this.scene.add.text(x + w / 2, 20 + h / 2, '', {
      fontFamily: 'Inter, sans-serif', fontSize: '10px', color: '#ffffff'
    }).setOrigin(0.5).setDepth(102).setScrollFactor(0);

    // MP/Stamina
    const mpColor = this.player.classConfig.resource === 'mana' ? COLORS.mpBar : COLORS.staminaBar;
    this.mpBg = this.scene.add.rectangle(x, 40, w, h, 0x1a1a2e).setOrigin(0, 0).setDepth(100).setScrollFactor(0);
    this.mpFill = this.scene.add.rectangle(x + 1, 41, w - 2, h - 2, mpColor).setOrigin(0, 0).setDepth(101).setScrollFactor(0);
    this.mpText = this.scene.add.text(x + w / 2, 40 + h / 2, '', {
      fontFamily: 'Inter, sans-serif', fontSize: '10px', color: '#ffffff'
    }).setOrigin(0.5).setDepth(102).setScrollFactor(0);

    // XP
    this.xpBg = this.scene.add.rectangle(x, 60, w, 8, 0x1a1a2e).setOrigin(0, 0).setDepth(100).setScrollFactor(0);
    this.xpFill = this.scene.add.rectangle(x + 1, 61, 0, 6, COLORS.xpBar).setOrigin(0, 0).setDepth(101).setScrollFactor(0);

    // Level badge
    this.levelBadge = this.scene.add.text(x + w + 10, 20, 'LV 1', {
      fontFamily: 'Inter, sans-serif', fontSize: '15px', color: '#e0d0b0'
    }).setDepth(102).setScrollFactor(0);

    // Gold
    this.goldText = this.scene.add.text(x + w + 10, 50, '💰 100', {
      fontFamily: 'Inter', fontSize: '18px', color: '#ccaa22', fontStyle: 'bold'
    }).setDepth(102).setScrollFactor(0);
  }

  _createHotbar() {
    const startX = 640 - (4 * 50) / 2;
    const y = 680;
    this.hotbarSlots = [];

    this.player.classConfig.abilities.forEach((ab, i) => {
      const sx = startX + i * 55;
      const bg = this.scene.add.rectangle(sx, y, 44, 44, 0x111122, 0.9)
        .setStrokeStyle(1, 0x4444aa, 0.6).setDepth(100).setScrollFactor(0);
      const label = this.scene.add.text(sx, y - 16, `${ab.key}`, {
        fontFamily: 'Inter, sans-serif', fontSize: '9px', color: '#888899'
      }).setOrigin(0.5).setDepth(102).setScrollFactor(0);
      const name = this.scene.add.text(sx, y + 4, ab.name.split(' ')[0], {
        fontFamily: 'Inter, sans-serif', fontSize: '7px', color: '#aabbcc'
      }).setOrigin(0.5).setDepth(102).setScrollFactor(0);
      const cdOverlay = this.scene.add.rectangle(sx, y, 44, 44, 0x000000, 0)
        .setDepth(101).setScrollFactor(0);

      this.hotbarSlots.push({ bg, label, name, cdOverlay, ability: ab });
    });
  }

  _createZoneName() {
    this.zoneText = this.scene.add.text(640, 15, 'Ashenveil Village', {
      fontFamily: 'Inter, sans-serif', fontSize: '15px', color: '#e0d0b0',
      stroke: '#000000', strokeThickness: 3
    }).setOrigin(0.5, 0).setDepth(102).setScrollFactor(0);
  }

  _createPlayerInfo() {
    this.nameText = this.scene.add.text(20, 76, `${window.ASHENVEIL.username} — ${this.player.classConfig.name}`, {
      fontFamily: 'Inter, sans-serif', fontSize: '9px', color: '#888899'
    }).setDepth(102).setScrollFactor(0);

    // Pause/Menu Button
    const saveBtnBg = this.scene.add.rectangle(1260, 20, 80, 26, 0x1a1a2e, 0.9)
      .setOrigin(1, 0).setStrokeStyle(1, 0xa855f7, 0.8).setDepth(100).setScrollFactor(0).setInteractive();
    const saveBtnTxt = this.scene.add.text(1220, 33, '⚙ MENU', {
      fontFamily: 'Inter, sans-serif', fontSize: '11px', color: '#c084fc', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(101).setScrollFactor(0);

    saveBtnBg.on('pointerover', () => { saveBtnBg.setFillStyle(0x2a1a3e, 0.9); this.scene.input.setDefaultCursor('pointer'); });
    saveBtnBg.on('pointerout', () => { saveBtnBg.setFillStyle(0x1a1a2e, 0.9); this.scene.input.setDefaultCursor('default'); });
    saveBtnBg.on('pointerdown', () => {
      saveBtnBg.setFillStyle(0xa855f7, 1);
      saveBtnTxt.setColor('#ffffff');
      
      if (this.scene.pauseMenu) this.scene.pauseMenu.show();

      setTimeout(() => {
        saveBtnBg.setFillStyle(0x2a1a3e, 0.9);
        saveBtnTxt.setColor('#c084fc');
      }, 150);
    });
  }

  _createDamageNumbers() {
    this.scene.events.on('damageNumber', ({ x, y, amount, isCrit }) => {
      const color = isCrit ? '#ff4444' : '#ffffff';
      const size = isCrit ? '14px' : '10px';
      const prefix = isCrit ? 'CRIT ' : '';
      const txt = this.scene.add.text(x, y, `${prefix}${amount}`, {
        fontFamily: 'Inter, sans-serif', fontSize: size, color,
        stroke: '#000000', strokeThickness: 2
      }).setOrigin(0.5).setDepth(50);
      this.scene.tweens.add({
        targets: txt, y: y - 40, alpha: 0, duration: 1000,
        onComplete: () => txt.destroy()
      });
    });

    this.scene.events.on('levelUp', (player) => {
      const txt = this.scene.add.text(640, 300, '✦ LEVEL UP! ✦', {
        fontFamily: 'Inter, sans-serif', fontSize: '20px', color: '#ffdd00',
        stroke: '#000000', strokeThickness: 4
      }).setOrigin(0.5).setDepth(200).setScrollFactor(0);
      this.scene.tweens.add({
        targets: txt, y: 250, alpha: 0, scale: 1.5, duration: 2000,
        onComplete: () => txt.destroy()
      });
      // Particles
      for (let i = 0; i < 20; i++) {
        const p = this.scene.add.image(player.x, player.y, 'particle_spark').setDepth(50);
        this.scene.tweens.add({
          targets: p,
          x: player.x + (Math.random() - 0.5) * 100,
          y: player.y + (Math.random() - 0.5) * 100,
          alpha: 0, scale: 0, duration: 800, delay: i * 30,
          onComplete: () => p.destroy()
        });
      }
    });

    this.scene.events.on('enemyKilled', ({ gold, xp }) => {
      const txt = this.scene.add.text(this.player.x, this.player.y - 30, `+${xp}XP +${gold}G`, {
        fontFamily: 'Inter, sans-serif', fontSize: '12px', color: '#44ff44',
        stroke: '#000000', strokeThickness: 2
      }).setOrigin(0.5).setDepth(50);
      this.scene.tweens.add({
        targets: txt, y: txt.y - 30, alpha: 0, duration: 1500,
        onComplete: () => txt.destroy()
      });
    });

    this.scene.events.on('playerDied', () => {
      const txt = this.scene.add.text(640, 360, 'YOU DIED', {
        fontFamily: 'Inter, sans-serif', fontSize: '28px', color: '#cc2222',
        stroke: '#000000', strokeThickness: 4
      }).setOrigin(0.5).setDepth(200).setScrollFactor(0);
      this.scene.tweens.add({
        targets: txt, alpha: 0, duration: 2000, delay: 1000,
        onComplete: () => txt.destroy()
      });
    });
  }

  updateZone(zoneName) {
    this.zoneText.setText(zoneName);
    this.zoneText.setAlpha(0);
    this.scene.tweens.add({ targets: this.zoneText, alpha: 1, duration: 500 });
  }

  update() {
    const p = this.player;
    const s = p.stats;

    // HP
    const hpPct = s.hp / s.maxHp;
    this.hpFill.width = Math.max(0, (198) * hpPct);
    this.hpText.setText(`${Math.ceil(s.hp)}/${s.maxHp}`);

    // MP/Stamina
    const mpPct = s.mana / s.maxMana;
    this.mpFill.width = Math.max(0, (198) * mpPct);
    const resLabel = p.classConfig.resource === 'mana' ? 'MP' : 'STA';
    this.mpText.setText(`${Math.ceil(s.mana)}/${s.maxMana}`);

    // XP
    const xpPct = p.xp / p.xpToNext;
    this.xpFill.width = Math.max(0, (198) * xpPct);

    // Level & Gold
    this.levelBadge.setText(`LV ${p.level}`);
    this.goldText.setText(`💰 ${p.gold}`);

    // Hotbar cooldowns
    this.hotbarSlots.forEach(slot => {
      const cd = p.cooldowns[slot.ability.name];
      if (cd > 0) {
        const pct = cd / slot.ability.cooldown;
        slot.cdOverlay.setAlpha(0.5 * pct);
        slot.bg.setStrokeStyle(1, 0x666666, 0.6);
      } else {
        slot.cdOverlay.setAlpha(0);
        slot.bg.setStrokeStyle(1, 0x4444aa, 0.6);
      }
    });
  }
}
