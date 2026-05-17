// ============================================================
// TitleScene — Animated main menu
// ============================================================
import Phaser from 'phaser';

export class TitleScene extends Phaser.Scene {
  constructor() { super('Title'); }

  create() {
    const { width, height } = this.cameras.main;
    this.cameras.main.setBackgroundColor('#0a0a0f');

    // Starfield particles
    this._particles = [];
    for (let i = 0; i < 60; i++) {
      const star = this.add.circle(
        Math.random() * width, Math.random() * height,
        Math.random() * 1.5 + 0.5, 0xaaaacc, Math.random() * 0.6 + 0.2
      );
      this._particles.push(star);
      this.tweens.add({
        targets: star, alpha: { from: star.alpha, to: 0.05 },
        duration: 1500 + Math.random() * 3000, yoyo: true, repeat: -1
      });
    }

    // Floating rune particles
    for (let i = 0; i < 15; i++) {
      const rune = this.add.text(
        Math.random() * width, height + 20,
        ['✦', '◈', '⬥', '✧', '◇', '⊕'][Math.floor(Math.random() * 6)],
        { fontSize: `${10 + Math.random() * 14}px`, color: '#a855f7' }
      ).setAlpha(0.3);
      this.tweens.add({
        targets: rune, y: -20, alpha: 0,
        duration: 6000 + Math.random() * 6000,
        delay: Math.random() * 5000,
        repeat: -1, onRepeat: () => {
          rune.x = Math.random() * width;
          rune.y = height + 20;
          rune.alpha = 0.3;
        }
      });
    }

    // Title glow bg
    const glow = this.add.ellipse(width / 2, height / 2 - 80, 600, 100, 0xa855f7, 0.08);
    this.tweens.add({ targets: glow, scaleX: 1.1, scaleY: 1.3, alpha: 0.04, duration: 3000, yoyo: true, repeat: -1 });

    // Title text
    const title = this.add.text(width / 2, height / 2 - 100, 'REALM OF\nASHENVEIL', {
      fontFamily: '"Press Start 2P"', fontSize: '36px', color: '#e0d0b0',
      align: 'center', lineSpacing: 12,
      stroke: '#2a1a3e', strokeThickness: 4
    }).setOrigin(0.5);
    this.tweens.add({ targets: title, y: title.y - 5, duration: 3000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // Subtitle
    this.add.text(width / 2, height / 2 - 20, '— The Shattered Codex —', {
      fontFamily: '"Press Start 2P"', fontSize: '10px', color: '#a855f7'
    }).setOrigin(0.5);

    // Decorative line
    const line = this.add.rectangle(width / 2, height / 2 + 10, 300, 1, 0xa855f7, 0.4);

    // Version
    this.add.text(width / 2, height - 40, 'v1.0 — A DBMS RPG Experience', {
      fontFamily: 'Inter', fontSize: '11px', color: '#555566'
    }).setOrigin(0.5);

    // Start prompt
    const prompt = this.add.text(width / 2, height / 2 + 80, '[ PRESS ENTER TO BEGIN ]', {
      fontFamily: '"Press Start 2P"', fontSize: '12px', color: '#e0d0b0'
    }).setOrigin(0.5);
    this.tweens.add({ targets: prompt, alpha: 0.3, duration: 1200, yoyo: true, repeat: -1 });

    // Menu options
    const opts = ['NEW GAME', 'CONTINUE', 'DBMS MODE'];
    this.selectedIdx = 0;
    this.menuItems = opts.map((text, i) => {
      const t = this.add.text(width / 2, height / 2 + 140 + i * 35, text, {
        fontFamily: '"Press Start 2P"', fontSize: '11px',
        color: i === 0 ? '#a855f7' : '#666677'
      }).setOrigin(0.5).setInteractive();
      t.on('pointerover', () => { this.selectedIdx = i; this._updateMenu(); });
      t.on('pointerdown', () => this._selectOption(i));
      return t;
    });

    // Input
    this.input.keyboard.on('keydown-ENTER', () => this._selectOption(this.selectedIdx));
    this.input.keyboard.on('keydown-UP', () => { this.selectedIdx = (this.selectedIdx - 1 + opts.length) % opts.length; this._updateMenu(); });
    this.input.keyboard.on('keydown-DOWN', () => { this.selectedIdx = (this.selectedIdx + 1) % opts.length; this._updateMenu(); });

    // Fade in
    this.cameras.main.fadeIn(1000, 10, 10, 15);
  }

  _updateMenu() {
    this.menuItems.forEach((t, i) => {
      t.setColor(i === this.selectedIdx ? '#a855f7' : '#666677');
      t.setScale(i === this.selectedIdx ? 1.05 : 1);
    });
  }

  _selectOption(idx) {
    if (idx === 0) {
      // New game → show login overlay
      this.cameras.main.fadeOut(500, 10, 10, 15);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this._showLogin();
      });
    } else if (idx === 1) {
      // Continue → try load from localStorage
      const saved = localStorage.getItem('ashenveil_save');
      if (saved) {
        const data = JSON.parse(saved);
        window.ASHENVEIL.username = data.username;
        window.ASHENVEIL.playerClass = data.playerClass;
        this.cameras.main.fadeOut(500, 10, 10, 15);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.scene.start('Game', data);
        });
      }
    } else if (idx === 2) {
      window.ASHENVEIL.dbmsMode = !window.ASHENVEIL.dbmsMode;
      const on = window.ASHENVEIL.dbmsMode;
      this.menuItems[2].setText(on ? '✅ DBMS MODE: ON' : 'DBMS MODE');
      this.menuItems[2].setColor(on ? '#ff8800' : '#666677');
    }
  }

  _showLogin() {
    const overlay = document.getElementById('login-overlay');
    const input = document.getElementById('username-input');
    const btn = document.getElementById('login-btn');
    overlay.classList.add('active');
    input.focus();

    const proceed = () => {
      const name = input.value.trim();
      if (name.length < 2) return;
      window.ASHENVEIL.username = name;
      overlay.classList.remove('active');
      this.scene.start('ClassSelect');
    };

    btn.onclick = proceed;
    input.onkeydown = (e) => { if (e.key === 'Enter') proceed(); };
  }
}
