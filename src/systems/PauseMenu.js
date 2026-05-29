// ============================================================
// PauseMenu — In-game menu for saving and exiting
// ============================================================

export class PauseMenu {
  constructor(scene) {
    this.scene = scene;
    this.isOpen = false;
    this.overlay = null;

    // Listen for Escape key to toggle pause
    this.scene.input.keyboard.on('keydown-ESC', () => this.toggle());
  }

  toggle() {
    this.isOpen ? this.close() : this.show();
  }

  show() {
    if (this.isOpen) return;
    this.isOpen = true;

    // Pause the physics/gameplay?
    // We can pause the entire scene if we want, but it's an online game.
    // For now, just show the menu over the game.

    const html = `
      <div id="pause-overlay" style="
        position:fixed; inset:0; background:rgba(0,0,0,0.85); z-index:9999;
        display:flex; flex-direction:column; align-items:center; justify-content:center;
        font-family:'Inter',sans-serif; backdrop-filter:blur(4px);">
        
        <div style="font-size:32px; font-weight:800; color:#e0d0b0; letter-spacing:4px; margin-bottom:40px; text-shadow:0 0 20px rgba(168,85,247,0.5);">
          PAUSED
        </div>

        <div style="display:flex; flex-direction:column; gap:16px; width:240px;">
          <button id="pause-resume-btn" style="
            background:linear-gradient(135deg,#1a1a2e,#16213e); border:2px solid #a855f7; border-radius:8px;
            padding:14px; color:#c084fc; font-size:16px; font-weight:700; cursor:pointer;
            transition:all 0.2s; text-transform:uppercase; letter-spacing:1px;"
            onmouseover="this.style.background='#a855f7'; this.style.color='#fff'"
            onmouseout="this.style.background='linear-gradient(135deg,#1a1a2e,#16213e)'; this.style.color='#c084fc'">
            Resume Game
          </button>

          <button id="pause-save-btn" style="
            background:linear-gradient(135deg,#1a2e1a,#163e16); border:2px solid #44ff44; border-radius:8px;
            padding:14px; color:#88ff88; font-size:16px; font-weight:700; cursor:pointer;
            transition:all 0.2s; text-transform:uppercase; letter-spacing:1px;"
            onmouseover="this.style.background='#44ff44'; this.style.color='#000'"
            onmouseout="this.style.background='linear-gradient(135deg,#1a2e1a,#163e16)'; this.style.color='#88ff88'">
            Save Game
          </button>

          <button id="pause-exit-btn" style="
            background:linear-gradient(135deg,#2e1a1a,#3e1616); border:2px solid #ff4444; border-radius:8px;
            padding:14px; color:#ff8888; font-size:16px; font-weight:700; cursor:pointer;
            transition:all 0.2s; text-transform:uppercase; letter-spacing:1px;"
            onmouseover="this.style.background='#ff4444'; this.style.color='#000'"
            onmouseout="this.style.background='linear-gradient(135deg,#2e1a1a,#3e1616)'; this.style.color='#ff8888'">
            Exit to Title
          </button>
        </div>
      </div>
    `;

    this.overlay = document.createElement('div');
    this.overlay.innerHTML = html;
    document.body.appendChild(this.overlay);

    document.getElementById('pause-resume-btn').onclick = () => this.close();
    document.getElementById('pause-save-btn').onclick = () => {
      if (this.scene._saveGame) this.scene._saveGame();
      const btn = document.getElementById('pause-save-btn');
      btn.innerText = 'SAVED!';
      btn.style.borderColor = '#ffffff';
      setTimeout(() => {
        if (btn) {
          btn.innerText = 'Save Game';
          btn.style.borderColor = '#44ff44';
        }
      }, 1500);
    };
    document.getElementById('pause-exit-btn').onclick = () => {
      // Save before exiting just in case
      if (this.scene._saveGame) this.scene._saveGame();
      this.close();
      this.scene.cameras.main.fadeOut(500, 0, 0, 0);
      this.scene.cameras.main.once('camerafadeoutcomplete', () => {
        // Disconnect multiplayer?
        if (this.scene.multiplayer && this.scene.multiplayer.channel) {
          this.scene.multiplayer.channel.unsubscribe();
        }
        // Clean up UI
        document.querySelectorAll('div[id$="-overlay"], div[id^="battle-"], div[id="quest-ui"]').forEach(el => el.remove());
        this.scene.scene.start('Title');
      });
    };
  }

  close() {
    this.isOpen = false;
    this.overlay?.remove();
    this.overlay = null;
  }
}
