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
      fontFamily: 'Inter, sans-serif', fontSize: '36px', color: '#e0d0b0',
      align: 'center', lineSpacing: 12,
      stroke: '#2a1a3e', strokeThickness: 4
    }).setOrigin(0.5);
    this.tweens.add({ targets: title, y: title.y - 5, duration: 3000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // Subtitle
    this.add.text(width / 2, height / 2 - 20, '— The Shattered Codex —', {
      fontFamily: 'Inter, sans-serif', fontSize: '15px', color: '#a855f7'
    }).setOrigin(0.5);

    // Decorative line
    const line = this.add.rectangle(width / 2, height / 2 + 10, 300, 1, 0xa855f7, 0.4);

    // Version
    this.add.text(width / 2, height - 40, 'v1.0 — A DBMS RPG Experience', {
      fontFamily: 'Inter', fontSize: '16px', color: '#555566'
    }).setOrigin(0.5);

    // Start prompt
    const prompt = this.add.text(width / 2, height / 2 + 80, '[ PRESS ENTER TO BEGIN ]', {
      fontFamily: 'Inter, sans-serif', fontSize: '18px', color: '#e0d0b0'
    }).setOrigin(0.5);
    this.tweens.add({ targets: prompt, alpha: 0.3, duration: 1200, yoyo: true, repeat: -1 });

    const hasSave = !!localStorage.getItem('ashenveil_save');
    const opts = ['NEW GAME', 'CONTINUE', window.ASHENVEIL.dbmsMode ? '✅ DBMS MODE: ON' : 'DBMS MODE'];
    this.selectedIdx = 0;
    
    this.menuItems = opts.map((text, i) => {
      let color = i === 0 ? '#a855f7' : '#666677';
      if (i === 1 && !hasSave) color = '#333333';
      if (i === 2 && window.ASHENVEIL.dbmsMode) color = '#ff8800';

      const t = this.add.text(width / 2, height / 2 + 140 + i * 35, text, {
        fontFamily: 'Inter, sans-serif', fontSize: '16px', color
      }).setOrigin(0.5).setInteractive();
      t.on('pointerover', () => { this.selectedIdx = i; this._updateMenu(); });
      t.on('pointerdown', () => this._selectOption(i));
      return t;
    });

    // Keyboard navigation
    this.input.keyboard.on('keydown-UP', () => {
      this.selectedIdx = (this.selectedIdx - 1 + opts.length) % opts.length;
      this._updateMenu();
    });
    this.input.keyboard.on('keydown-DOWN', () => {
      this.selectedIdx = (this.selectedIdx + 1) % opts.length;
      this._updateMenu();
    });
    this.input.keyboard.on('keydown-ENTER', () => {
      this._selectOption(this.selectedIdx);
    });

    // Fade in
    this.cameras.main.fadeIn(1000, 10, 10, 15);
  }

  _updateMenu() {
    const hasSave = !!localStorage.getItem('ashenveil_save');
    this.menuItems.forEach((t, i) => {
      let color = i === this.selectedIdx ? '#a855f7' : '#666677';
      if (i === 1 && !hasSave) color = '#333333';
      if (i === 1 && !hasSave && this.selectedIdx === 1) color = '#ff4444'; // feedback
      if (i === 2 && window.ASHENVEIL.dbmsMode && this.selectedIdx !== i) color = '#ff8800';
      
      t.setColor(color);
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
      } else {
        // Flash red if no save
        this.menuItems[1].setColor('#ff4444');
        setTimeout(() => this.menuItems[1].setColor('#333333'), 500);
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
