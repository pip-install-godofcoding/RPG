// ============================================================
// ClassSelectScene — Pick your class. Fully mobile-responsive
// DOM overlay with class icons, stat bars and abilities list.
// ============================================================
import Phaser from 'phaser';
import { CLASS_CONFIG } from '../config/ClassConfig.js';

// Map class keys to display icons
const CLASS_ICONS = {
  warrior: '🛡️',
  mage:    '🔮',
  rogue:   '🗡️',
  archer:  '🏹',
  paladin: '✝️',
};

export class ClassSelectScene extends Phaser.Scene {
  constructor() { super('ClassSelect'); }

  create() {
    this.cameras.main.setBackgroundColor('#0a0a0f');
    this.cameras.main.fadeIn(500, 10, 10, 15);
    this.selectedClass = null;

    document.getElementById('class-select-overlay')?.remove();
    this._buildDOM();
  }

  _buildDOM() {
    const classes = Object.entries(CLASS_CONFIG);

    const cardsHTML = classes.map(([key, cfg]) => {
      const colorHex = '#' + cfg.color.toString(16).padStart(6, '0');
      const icon = CLASS_ICONS[key] || '⚔️';

      const stats = [
        { label: 'HP',  value: cfg.stats.hp,      max: 200, color: '#ee4444' },
        { label: cfg.resource === 'mana' ? 'MP' : 'STA', value: cfg.stats.mana, max: 150, color: cfg.resource === 'mana' ? '#4488ff' : '#ddcc22' },
        { label: 'ATK', value: cfg.stats.attack,   max: 20,  color: '#ff9933' },
        { label: 'DEF', value: cfg.stats.defense,  max: 20,  color: '#44cc88' },
        { label: 'SPD', value: cfg.stats.speed,    max: 200, color: '#aa88ff' },
      ];

      const statBarsHTML = stats.map(s => {
        const pct = Math.min(100, Math.round((s.value / s.max) * 100));
        return `
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px;">
            <span style="font-size:10px;color:#7788aa;width:28px;flex-shrink:0;">${s.label}</span>
            <div style="flex:1;background:#0d0d1e;border-radius:4px;height:7px;overflow:hidden;">
              <div style="width:${pct}%;height:100%;background:${s.color};border-radius:4px;transition:width 0.6s ease;"></div>
            </div>
            <span style="font-size:10px;color:#6677aa;width:26px;text-align:right;flex-shrink:0;">${s.value}</span>
          </div>`;
      }).join('');

      const abilitiesHTML = cfg.abilities.map(ab =>
        `<div style="font-size:9.5px;color:#99aacc;padding:1px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
           <span style="color:#a855f7;font-weight:700;">[${ab.key}]</span> ${ab.name}
         </div>`
      ).join('');

      return `
        <div class="cs-card" data-key="${key}" tabindex="0" style="
          background:rgba(8,8,22,0.95);
          border:2px solid rgba(60,60,120,0.55);
          border-radius:14px;
          padding:14px;
          cursor:pointer;
          transition:border-color 0.2s, transform 0.15s, box-shadow 0.2s;
          position:relative;
          overflow:hidden;
          display:flex; flex-direction:column; gap:7px;
          outline:none;
        ">
          <!-- Top accent bar -->
          <div style="position:absolute;top:0;left:0;right:0;height:3px;background:${colorHex};border-radius:14px 14px 0 0;"></div>

          <!-- Icon + Name -->
          <div style="display:flex;align-items:center;gap:10px;margin-top:4px;">
            <div style="
              width:44px;height:44px;flex-shrink:0;
              background:rgba(${parseInt(colorHex.slice(1,3),16)},${parseInt(colorHex.slice(3,5),16)},${parseInt(colorHex.slice(5,7),16)},0.18);
              border:1.5px solid ${colorHex};
              border-radius:10px;
              display:flex;align-items:center;justify-content:center;
              font-size:22px;
            ">${icon}</div>
            <div>
              <div style="font-size:13px;font-weight:700;color:#e0d0b0;letter-spacing:0.5px;">${cfg.name.toUpperCase()}</div>
              <div style="font-size:9px;color:${colorHex};opacity:0.8;margin-top:1px;">${cfg.resource.toUpperCase()} USER</div>
            </div>
          </div>

          <!-- Description -->
          <div style="font-size:10px;color:#6677aa;line-height:1.5;">
            ${cfg.description}
          </div>

          <!-- Stat bars -->
          <div>${statBarsHTML}</div>

          <!-- Abilities -->
          <div>
            <div style="font-size:9px;color:#a855f7;font-weight:700;margin-bottom:4px;letter-spacing:0.8px;">ABILITIES</div>
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
          align-items: center; justify-content: flex-start;
          overflow-y: auto; -webkit-overflow-scrolling: touch;
          font-family: 'Inter', 'Segoe UI', sans-serif;
          padding: max(20px, env(safe-area-inset-top, 16px)) 14px max(20px, env(safe-area-inset-bottom, 16px));
          box-sizing: border-box;
        }
        #cs-header {
          text-align: center; margin-bottom: 16px; flex-shrink: 0;
          padding-top: 8px;
        }
        #cs-header h2 {
          font-size: clamp(16px, 4vw, 24px);
          color: #e0d0b0; letter-spacing: 2px; margin: 0 0 6px;
          text-shadow: 0 0 20px rgba(168,85,247,0.4);
        }
        #cs-header p { font-size: 13px; color: #a855f7; margin: 0; }

        #cs-grid {
          display: grid; gap: 12px;
          width: 100%; max-width: 960px;
        }
        @media (min-width: 640px) {
          #cs-grid { grid-template-columns: repeat(4, 1fr); }
        }
        @media (max-width: 639px) {
          #cs-grid { grid-template-columns: repeat(2, 1fr); }
        }

        .cs-card:hover { transform: translateY(-3px); }
        .cs-card:active { transform: scale(0.97); }
        .cs-card.cs-selected {
          border-color: var(--card-color, #a855f7) !important;
          box-shadow: 0 0 20px rgba(168,85,247,0.25);
          transform: translateY(-3px);
        }

        #cs-confirm {
          margin-top: 14px; flex-shrink: 0;
          width: 100%; max-width: 340px;
          display: none; flex-direction: column; align-items: stretch; gap: 8px;
        }
        #cs-confirm-hint { font-size: 11px; color: #6677aa; text-align: center; }
        #cs-confirm-btn {
          padding: 14px;
          background: linear-gradient(135deg, #2a1a3e, #1a0a2a);
          border: 2px solid #a855f7; border-radius: 12px;
          color: #a855f7; font-size: 15px; font-weight: 700;
          cursor: pointer; font-family: inherit;
          transition: background 0.2s, color 0.2s, transform 0.1s;
          touch-action: manipulation;
        }
        #cs-confirm-btn:active { background: #a855f7; color: #0a0a0f; transform: scale(0.97); }
      </style>

      <div id="class-select-overlay">
        <div id="cs-header">
          <h2>⚔ CHOOSE THY CLASS</h2>
          <p>Hero: ${window.ASHENVEIL.username || 'Adventurer'}</p>
        </div>

        <div id="cs-grid">${cardsHTML}</div>

        <div id="cs-confirm">
          <div id="cs-confirm-hint">Tap again or press Begin to start</div>
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
    const confirmHint = document.getElementById('cs-confirm-hint');

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

      const select = () => {
        if (this.selectedClass === key) { launchGame(key); return; }

        // Deselect all
        cards.forEach(c => {
          c.classList.remove('cs-selected');
          c.style.borderColor = 'rgba(60,60,120,0.55)';
        });

        this.selectedClass = key;
        card.classList.add('cs-selected');
        card.style.borderColor = colorHex;
        card.style.setProperty('--card-color', colorHex);

        confirmBox.style.display = 'flex';
        confirmHint.textContent  = `${cfg.name} selected — tap card again or press Begin`;
        confirmBtn.textContent   = `▶ BEGIN AS ${cfg.name.toUpperCase()}`;
        confirmBtn.onclick       = () => launchGame(key);
      };

      card.addEventListener('click',       select);
      card.addEventListener('touchstart',  e => { e.preventDefault(); select(); }, { passive: false });
    });
  }

  shutdown() {
    document.getElementById('class-select-overlay')?.remove();
  }
}
