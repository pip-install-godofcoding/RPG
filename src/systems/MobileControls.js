// ============================================================
// MobileControls — Virtual joystick + action buttons for touch
// Only activates on devices with touch input.
// Respects iOS/Android safe-area insets (home bar, notch).
// ============================================================

export class MobileControls {
  constructor(scene) {
    this.scene = scene;
    this.joystick = { x: 0, y: 0 };
    this.active = false;
    this._el = null;

    if (!this._isTouchDevice()) return;
    this._create();
  }

  _isTouchDevice() {
    return navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
  }

  _create() {
    this.active = true;

    const html = `
      <style id="mc-style">
        #mc-root {
          position: fixed; inset: 0;
          z-index: 8000; pointer-events: none;
          /* Safe area padding for notch / home bar */
          padding-bottom: env(safe-area-inset-bottom, 0px);
          padding-left:   env(safe-area-inset-left,   0px);
          padding-right:  env(safe-area-inset-right,  0px);
          box-sizing: border-box;
        }

        /* ── Joystick zone ── */
        #mc-joystick-zone {
          position: absolute;
          bottom: max(20px, env(safe-area-inset-bottom, 16px) + 16px);
          left:   max(20px, env(safe-area-inset-left,   16px) + 16px);
          width: 120px; height: 120px;
          background: rgba(255,255,255,0.07);
          border: 2.5px solid rgba(255,255,255,0.20);
          border-radius: 50%;
          pointer-events: all; touch-action: none;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 24px rgba(100,150,255,0.14);
        }
        #mc-knob {
          width: 44px; height: 44px;
          background: radial-gradient(circle at 35% 35%, rgba(200,220,255,0.92), rgba(100,130,255,0.65));
          border: 2px solid rgba(255,255,255,0.75);
          border-radius: 50%;
          position: absolute;
          pointer-events: none;
          box-shadow: 0 0 14px rgba(120,160,255,0.45);
        }

        /* ── Main action grid (bottom-right 2x2) ── */
        #mc-actions {
          position: absolute;
          bottom: max(20px, env(safe-area-inset-bottom, 16px) + 16px);
          right:  max(14px, env(safe-area-inset-right,  10px) + 10px);
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 8px; pointer-events: all;
        }
        .mc-btn {
          width: 58px; height: 58px;
          background: rgba(8,8,24,0.85);
          border: 2px solid rgba(100,120,255,0.5);
          border-radius: 12px; color: #ddeeff;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 2px;
          cursor: pointer; touch-action: manipulation;
          user-select: none; -webkit-user-select: none;
          font-family: 'Inter', sans-serif;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          transition: background 0.1s, transform 0.1s, border-color 0.15s;
        }
        .mc-btn:active, .mc-btn.mc-pressed {
          background: rgba(80,110,255,0.32);
          border-color: #88aaff;
          transform: scale(0.90);
        }
        .mc-btn .mc-icon  { font-size: 19px; line-height: 1; }
        .mc-btn .mc-label { font-size: 8px; font-weight: 700; letter-spacing: 0.4px; opacity: 0.6; text-transform: uppercase; }

        /* ── Top-right utility buttons ── */
        #mc-top {
          position: absolute;
          top:   max(14px, env(safe-area-inset-top,   12px) + 12px);
          right: max(14px, env(safe-area-inset-right, 10px) + 10px);
          display: flex; gap: 7px; pointer-events: all;
        }
        .mc-top-btn {
          padding: 7px 12px;
          background: rgba(8,8,24,0.82);
          border: 1px solid rgba(100,100,200,0.45);
          border-radius: 10px; color: #aabbff;
          font-size: 11px; font-weight: 700;
          font-family: 'Inter', sans-serif;
          cursor: pointer; touch-action: manipulation;
          user-select: none; -webkit-user-select: none;
          backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
          white-space: nowrap;
        }
        .mc-top-btn:active { background: rgba(80,100,255,0.32); }

        /* ── Small screen: shrink slightly ── */
        @media (max-width: 360px) {
          #mc-joystick-zone { width: 100px; height: 100px; }
          .mc-btn { width: 50px; height: 50px; }
          .mc-btn .mc-icon { font-size: 16px; }
        }
      </style>

      <div id="mc-root">
        <!-- Joystick -->
        <div id="mc-joystick-zone"><div id="mc-knob"></div></div>

        <!-- 2x2 Action buttons -->
        <div id="mc-actions">
          <button class="mc-btn" id="mc-btn-e">
            <span class="mc-icon">⚡</span><span class="mc-label">Act</span>
          </button>
          <button class="mc-btn" id="mc-btn-p">
            <span class="mc-icon">⚔️</span><span class="mc-label">PvP</span>
          </button>
          <button class="mc-btn" id="mc-btn-m">
            <span class="mc-icon">🛒</span><span class="mc-label">Shop</span>
          </button>
          <button class="mc-btn" id="mc-btn-g">
            <span class="mc-icon">🏰</span><span class="mc-label">Guild</span>
          </button>
        </div>

        <!-- Top-right utility -->
        <div id="mc-top">
          <button class="mc-top-btn" id="mc-btn-j">📜 Quests</button>
          <button class="mc-top-btn" id="mc-btn-tab">🗄 DB</button>
        </div>
      </div>`;

    document.body.insertAdjacentHTML('beforeend', html);
    this._el = document.getElementById('mc-root');
    this._wireJoystick();
    this._wireButtons();
  }

  _wireJoystick() {
    const zone = document.getElementById('mc-joystick-zone');
    const knob = document.getElementById('mc-knob');
    if (!zone || !knob) return;

    const MAX_TRAVEL = 38;
    let touching = false;

    const getCenter = () => {
      const r = zone.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    };

    const move = (cx, cy) => {
      const c = getCenter();
      let dx = cx - c.x, dy = cy - c.y;
      const dist = Math.hypot(dx, dy);
      if (dist > MAX_TRAVEL) { dx = dx / dist * MAX_TRAVEL; dy = dy / dist * MAX_TRAVEL; }
      knob.style.transform = `translate(${dx}px,${dy}px)`;
      this.joystick.x = dx / MAX_TRAVEL;
      this.joystick.y = dy / MAX_TRAVEL;
    };

    const reset = () => {
      knob.style.transform = 'translate(0,0)';
      this.joystick.x = 0;
      this.joystick.y = 0;
    };

    zone.addEventListener('touchstart', e => { e.preventDefault(); touching = true; move(e.touches[0].clientX, e.touches[0].clientY); }, { passive: false });
    zone.addEventListener('touchmove',  e => { e.preventDefault(); if (touching) move(e.touches[0].clientX, e.touches[0].clientY); }, { passive: false });
    zone.addEventListener('touchend',   e => { e.preventDefault(); touching = false; reset(); }, { passive: false });
  }

  _wireButtons() {
    const KEYS = {
      'mc-btn-e':   { code: 'KeyE',  key: 'e',   keyCode: 69 },
      'mc-btn-p':   { code: 'KeyP',  key: 'p',   keyCode: 80 },
      'mc-btn-m':   { code: 'KeyM',  key: 'm',   keyCode: 77 },
      'mc-btn-g':   { code: 'KeyG',  key: 'g',   keyCode: 71 },
      'mc-btn-j':   { code: 'KeyJ',  key: 'j',   keyCode: 74 },
      'mc-btn-tab': { code: 'Tab',   key: 'Tab', keyCode: 9  },
    };

    Object.entries(KEYS).forEach(([id, k]) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      btn.addEventListener('touchstart', e => {
        e.preventDefault();
        btn.classList.add('mc-pressed');
        window.dispatchEvent(new KeyboardEvent('keydown', { code: k.code, key: k.key, keyCode: k.keyCode, which: k.keyCode, bubbles: true }));
      }, { passive: false });
      btn.addEventListener('touchend', e => {
        e.preventDefault();
        btn.classList.remove('mc-pressed');
        window.dispatchEvent(new KeyboardEvent('keyup', { code: k.code, key: k.key, keyCode: k.keyCode, which: k.keyCode, bubbles: true }));
      }, { passive: false });
    });
  }

  /** Returns normalized {x, y} from -1 to 1 */
  getAxis() { return this.joystick; }

  show()    { if (this._el) this._el.style.display = ''; }
  hide()    { if (this._el) this._el.style.display = 'none'; }
  destroy() { this._el?.remove(); }
}
