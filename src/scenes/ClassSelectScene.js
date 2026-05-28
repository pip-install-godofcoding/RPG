// ============================================================
// ClassSelectScene — Pick your class. Fully mobile-responsive
// via a DOM overlay that replaces the Phaser canvas layout.
// ============================================================
import Phaser from 'phaser';
import { CLASS_CONFIG } from '../config/ClassConfig.js';

export class ClassSelectScene extends Phaser.Scene {
  constructor() { super('ClassSelect'); }

  create() {
    this.cameras.main.setBackgroundColor('#0a0a0f');
    this.cameras.main.fadeIn(500, 10, 10, 15);

    this.selectedClass = null;

    // Remove any stale overlay
    document.getElementById('class-select-overlay')?.remove();

    this._buildDOM();
  }

  _buildDOM() {
    const classes = Object.entries(CLASS_CONFIG);

    const cardsHTML = classes.map(([key, cfg]) => {
      const colorHex = '#' + cfg.color.toString(16).padStart(6, '0');
      const stats = [
        { label: 'HP',  value: cfg.stats.hp,      max: 200, color: '#cc2222' },
        { label: cfg.resource === 'mana' ? 'MP' : 'STA', value: cfg.stats.mana, max: 150, color: cfg.resource === 'mana' ? '#2255cc' : '#cccc22' },
        { label: 'ATK', value: cfg.stats.attack,   max: 20,  color: '#cc8822' },
        { label: 'DEF', value: cfg.stats.defense,  max: 20,  color: '#44aa66' },
        { label: 'SPD', value: cfg.stats.speed,    max: 200, color: '#8866cc' },
      ];
      const statBarsHTML = stats.map(s => {
        const pct = Math.min(100, Math.round((s.value / s.max) * 100));
        return `
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
            <span style="font-size:10px;color:#888;width:30px;flex-shrink:0;">${s.label}</span>
            <div style="flex:1;background:#1a1a2e;border-radius:4px;height:7px;overflow:hidden;">
              <div style="width:${pct}%;height:100%;background:${s.color};border-radius:4px;"></div>
            </div>
            <span style="font-size:10px;color:#aaa;width:28px;text-align:right;">${s.value}</span>
          </div>`;
      }).join('');

      const abilitiesHTML = cfg.abilities.map(ab =>
        `<div style="font-size:10px;color:#aabbcc;padding:2px 0;">[${ab.key}] ${ab.name}</div>`
      ).join('');

      return `
        <div class="cs-card" data-key="${key}" style="
          background:rgba(10,10,25,0.92);
          border:2px solid rgba(68,68,170,0.6);
          border-radius:14px;
          padding:16px;
          cursor:pointer;
          transition:border-color 0.2s, transform 0.15s, box-shadow 0.2s;
          position:relative;
          overflow:hidden;
          display:flex; flex-direction:column; gap:8px;
        ">
          <!-- Accent bar -->
          <div style="position:absolute;top:0;left:0;right:0;height:4px;background:${colorHex};border-radius:14px 14px 0 0;"></div>

          <!-- Name -->
          <div style="text-align:center;font-size:15px;font-weight:700;color:#e0d0b0;letter-spacing:1px;margin-top:4px;">
            ${cfg.name.toUpperCase()}
          </div>

          <!-- Description -->
          <div style="font-size:11px;color:#7788aa;line-height:1.5;text-align:center;">
            ${cfg.description}
          </div>

          <!-- Stat bars -->
          <div>${statBarsHTML}</div>

          <!-- Abilities -->
          <div>
            <div style="font-size:10px;color:#a855f7;font-weight:700;margin-bottom:4px;letter-spacing:0.5px;">ABILITIES</div>
            ${abilitiesHTML}
          </div>
        </div>`;
    }).join('');

    const html = `
      <style>
        #class-select-overlay {
          position: fixed; inset: 0; z-index: 9500;
          background: #0a0a0f;
          display: flex; flex-direction: column;
          align-items: center;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          font-family: 'Inter', 'Segoe UI', sans-serif;
          padding: 20px 16px max(20px, env(safe-area-inset-bottom));
          box-sizing: border-box;
        }
        #cs-header { text-align:center; margin-bottom:18px; flex-shrink:0; }
        #cs-header h2 {
          font-size: clamp(14px, 4vw, 22px);
          color: #e0d0b0; letter-spacing: 2px; margin:0 0 6px;
        }
        #cs-header p { font-size:13px; color:#a855f7; margin:0; }

        #cs-grid {
          display: grid;
          gap: 14px;
          width: 100%;
          max-width: 900px;
          flex:1;
        }
        /* Desktop: 4 columns */
        @media (min-width: 700px) {
          #cs-grid { grid-template-columns: repeat(4, 1fr); }
        }
        /* Tablet: 2 columns */
        @media (min-width: 420px) and (max-width: 699px) {
          #cs-grid { grid-template-columns: repeat(2, 1fr); }
        }
        /* Phone portrait: 2 columns */
        @media (max-width: 419px) {
          #cs-grid { grid-template-columns: repeat(2, 1fr); }
        }

        .cs-card:hover, .cs-card.cs-selected {
          transform: translateY(-3px);
          box-shadow: 0 6px 28px rgba(168,85,247,0.25);
        }
        .cs-card.cs-selected { border-color: #a855f7 !important; }

        #cs-confirm {
          margin-top: 16px; flex-shrink:0;
          width: 100%; max-width: 320px;
          display: none; flex-direction:column; align-items:center; gap:10px;
        }
        #cs-confirm-text {
          font-size:13px;color:#a855f7;text-align:center;
        }
        #cs-confirm-btn {
          width:100%; padding:14px;
          background:#2a1a3e;
          border:2px solid #a855f7;
          border-radius:10px;
          color:#a855f7;
          font-size:15px; font-weight:700;
          cursor:pointer;
          font-family:inherit;
          transition:background 0.2s, color 0.2s;
          touch-action:manipulation;
        }
        #cs-confirm-btn:active { background:#a855f7; color:#0a0a0f; }
      </style>

      <div id="class-select-overlay">
        <div id="cs-header">
          <h2>⚔ CHOOSE THY CLASS</h2>
          <p>Hero: ${window.ASHENVEIL.username || 'Adventurer'}</p>
        </div>

        <div id="cs-grid">${cardsHTML}</div>

        <div id="cs-confirm">
          <div id="cs-confirm-text">Tap again to confirm</div>
          <button id="cs-confirm-btn">BEGIN ADVENTURE</button>
        </div>
      </div>`;

    document.body.insertAdjacentHTML('beforeend', html);
    this._wireCards();
  }

  _wireCards() {
    const cards = document.querySelectorAll('.cs-card');
    const confirmBox = document.getElementById('cs-confirm');
    const confirmBtn = document.getElementById('cs-confirm-btn');
    const confirmText = document.getElementById('cs-confirm-text');

    const launchGame = (key) => {
      window.ASHENVEIL.playerClass = key;
      document.getElementById('class-select-overlay')?.remove();
      this.cameras.main.fadeOut(500, 10, 10, 15);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('Game', { playerClass: key, isNew: true });
      });
    };

    cards.forEach(card => {
      const key = card.dataset.key;
      const cfg = CLASS_CONFIG[key];
      const colorHex = '#' + cfg.color.toString(16).padStart(6, '0');

      card.addEventListener('click', () => {
        if (this.selectedClass === key) {
          launchGame(key);
          return;
        }
        // Deselect all
        cards.forEach(c => {
          c.classList.remove('cs-selected');
          c.style.borderColor = 'rgba(68,68,170,0.6)';
        });
        // Select this one
        this.selectedClass = key;
        card.classList.add('cs-selected');
        card.style.borderColor = colorHex;
        // Show confirm bar
        confirmBox.style.display = 'flex';
        confirmText.textContent = `${cfg.name.toUpperCase()} selected — tap again or press Begin`;
        confirmBtn.textContent = `BEGIN AS ${cfg.name.toUpperCase()}`;
        confirmBtn.onclick = () => launchGame(key);
      });
    });
  }

  shutdown() {
    document.getElementById('class-select-overlay')?.remove();
  }
}
