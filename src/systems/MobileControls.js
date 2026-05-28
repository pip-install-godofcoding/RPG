// ============================================================
// MobileControls — Virtual joystick + action buttons for touch
// Only activates on devices with touch input.
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
        #mc-root { position:fixed; inset:0; z-index:8000; pointer-events:none; }

        /* ── Joystick ── */
        #mc-joystick-zone {
          position:absolute; bottom:28px; left:24px;
          width:130px; height:130px;
          background:rgba(255,255,255,0.07);
          border:2.5px solid rgba(255,255,255,0.18);
          border-radius:50%; pointer-events:all; touch-action:none;
          display:flex; align-items:center; justify-content:center;
          box-shadow:0 0 20px rgba(100,150,255,0.12);
        }
        #mc-knob {
          width:48px; height:48px;
          background:radial-gradient(circle at 35% 35%, rgba(200,220,255,0.9), rgba(100,130,255,0.6));
          border:2px solid rgba(255,255,255,0.7);
          border-radius:50%; position:absolute;
          pointer-events:none;
          box-shadow:0 0 14px rgba(120,160,255,0.4);
          transition:box-shadow 0.1s;
        }

        /* ── Main action grid (bottom-right) ── */
        #mc-actions {
          position:absolute; bottom:28px; right:18px;
          display:grid; grid-template-columns:1fr 1fr;
          gap:10px; pointer-events:all;
        }
        .mc-btn {
          width:62px; height:62px;
          background:rgba(8,8,24,0.82);
          border:2px solid rgba(100,120,255,0.45);
          border-radius:14px; color:#ddeeff;
          display:flex; flex-direction:column;
          align-items:center; justify-content:center; gap:3px;
          cursor:pointer; touch-action:manipulation;
          user-select:none; -webkit-user-select:none;
          font-family:'Inter',sans-serif;
          backdrop-filter:blur(6px);
          transition:background 0.1s, transform 0.1s, border-color 0.1s;
        }
        .mc-btn:active, .mc-btn.mc-pressed {
          background:rgba(80,110,255,0.3);
          border-color:#88aaff;
          transform:scale(0.91);
        }
        .mc-btn .mc-icon { font-size:20px; line-height:1; }
        .mc-btn .mc-label {
          font-size:9px; font-weight:700;
          letter-spacing:0.5px; opacity:0.65;
          text-transform:uppercase;
        }

        /* ── Top-right compact buttons ── */
        #mc-top {
          position:absolute; top:18px; right:14px;
          display:flex; gap:8px; pointer-events:all;
        }
        .mc-top-btn {
          padding:7px 14px;
          background:rgba(8,8,24,0.8);
          border:1px solid rgba(100,100,200,0.4);
          border-radius:10px; color:#aabbff;
          font-size:11px; font-weight:700;
          font-family:'Inter',sans-serif;
          cursor:pointer; touch-action:manipulation;
          user-select:none; -webkit-user-select:none;
          backdrop-filter:blur(4px);
        }
        .mc-top-btn:active { background:rgba(80,100,255,0.3); }
      </style>

      <div id="mc-root">
        <div id="mc-joystick-zone"><div id="mc-knob"></div></div>

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

    const MAX_TRAVEL = 40;
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

  show() { if (this._el) this._el.style.display = ''; }
  hide() { if (this._el) this._el.style.display = 'none'; }
  destroy() { this._el?.remove(); }
}
