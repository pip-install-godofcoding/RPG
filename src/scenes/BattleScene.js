// ============================================================
// BattleScene — Pokémon-style turn-based combat
// All UI is HTML so it looks crisp and polished.
// Only animated sprites live on the Phaser canvas.
// ============================================================
import Phaser from 'phaser';

export class BattleScene extends Phaser.Scene {
  constructor() { super('Battle'); }

  init(data) {
    this.player    = data.player;
    this.enemy     = data.enemy;
    this.gameScene = data.gameScene;
    this.state     = 'PROMPT';
    this._uiEl     = null;   // root HTML overlay
  }

  // ─────────────────────────────────────────────────────────
  // Phaser create
  // ─────────────────────────────────────────────────────────
  create() {
    // ── Canvas background ──────────────────────────────────
    this.add.rectangle(640, 360, 1280, 720, 0x0d0d18).setDepth(0);

    // Ground platform — sits at y~370 so sprites at 260 stand on it
    const ground = this.add.graphics().setDepth(1);
    ground.fillStyle(0x1a2a1a, 1);
    ground.fillEllipse(640, 390, 900, 180);
    ground.lineStyle(3, 0x2a4a2a, 1);
    ground.strokeEllipse(640, 390, 900, 180);

    // Ambient glow under player
    const pGlow = this.add.graphics().setDepth(2);
    pGlow.fillStyle(0x3355aa, 0.22);
    pGlow.fillEllipse(310, 380, 160, 50);

    // Ambient glow under enemy
    const eGlow = this.add.graphics().setDepth(2);
    eGlow.fillStyle(0xaa3333, 0.22);
    eGlow.fillEllipse(970, 380, 160, 50);

    // ── Player sprite — positioned high enough to be above the panel
    const pKey = `${this.player.classKey}_idle_right`;
    this.playerSprite = this.add.sprite(310, 310, pKey, 0)
      .setScale(4).setDepth(10).setFlipX(false);
    const pAnim = `anim_${this.player.classKey}_walk_right`;
    if (this.anims.exists(pAnim)) this.playerSprite.play(pAnim);

    // ── Enemy sprite — mirrored on the right
    const eKey = `${this.enemy.config.sprite}_idle`;
    this.enemySprite = this.add.sprite(970, 310, eKey, 0)
      .setScale(4).setDepth(10).setFlipX(true);
    const eAnim = `anim_${this.enemy.config.sprite}_idle`;
    if (this.anims.exists(eAnim)) this.enemySprite.play(eAnim);

    // Idle bob — gentle float
    this.tweens.add({ targets: this.playerSprite, y: 295, duration: 900,  yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: this.enemySprite,  y: 295, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // ── Build HTML UI ──────────────────────────────────────
    this._buildUI();

    // ── Keyboard wiring ────────────────────────────────────
    this._bindKeys();

    // ── Show encounter prompt ──────────────────────────────
    this._showPrompt();
  }

  // ─────────────────────────────────────────────────────────
  // HTML UI builder (full overlay)
  // ─────────────────────────────────────────────────────────
  _buildUI() {
    const isStamina = this.player.classConfig.resource === 'stamina';
    const resLabel  = isStamina ? 'EP' : 'MP';
    const resColor  = isStamina ? '#e8c200' : '#4499ff';
    const resBarClr = isStamina ? '#ccaa00' : '#2266cc';
    const p         = this.player.stats;
    const e         = this.enemy;
    const eLv       = Math.ceil(e.maxHp / 30);
    const pName     = window.ASHENVEIL?.username || 'Hero';

    const abilitiesHTML = this.player.classConfig.abilities.map((ab, i) => {
      const dmgText = ab.damage > 0
        ? `<span style="color:#ff8877">⚔ ${ab.damage + this.player.stats.attack} dmg</span>`
        : `<span style="color:#aaddff">✦ ${ab.type}</span>`;
      return `
        <button id="battle-ab-${i}" class="battle-ab" data-idx="${i}"
          style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);
                 border:2px solid #2a2a4a; border-radius:8px; padding:7px 10px;
                 cursor:pointer; text-align:left; transition:all 0.15s; color:#fff;
                 font-family:'Segoe UI',Arial,sans-serif;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
            <span style="font-weight:700; font-size:14px; color:#ffcc44;">[${i+1}] ${ab.name}</span>
            ${dmgText}
          </div>
          <div style="font-size:11px; color:#888;">
            Cost: <span style="color:${resColor}; font-weight:600">${ab.cost} ${resLabel}</span>
            &nbsp;·&nbsp; <span style="color:#aaa; font-style:italic">${ab.desc}</span>
          </div>
        </button>`;
    }).join('');

    const dbmsSection = window.ASHENVEIL?.dbmsMode ? `
      <div id="battle-dbms" style="
        background:rgba(5,15,5,0.92); border:1px solid #00cc44; border-radius:6px;
        padding:5px 10px; font-family:'Courier New',monospace; font-size:10px;
        color:#00ff44; height:55px; overflow-y:hidden; margin-top:6px; transition: height 0.2s ease; word-break: break-all;">
        <div id="battle-dbms-header" style="color:#ffaa00;font-weight:bold;border-bottom:1px solid #224422;margin-bottom:5px;padding-bottom:3px;cursor:pointer;display:flex;justify-content:space-between;">
          <span>⚡ LIVE SQL</span>
          <span id="battle-dbms-icon">▼</span>
        </div>
        <div id="battle-dbms-logs"></div>
      </div>` : '';

    const html = `
    <style>
      .battle-ab { transition:all 0.15s; font-family:'Segoe UI',Arial,sans-serif; }
      .battle-ab:hover { border-color:#ffcc44 !important; transform:translateY(-2px); box-shadow:0 4px 16px rgba(255,204,68,0.2); }
      .battle-ab:active { border-color:#ffcc44 !important; transform:scale(0.95); }
      .battle-ab:disabled { opacity:0.35; cursor:not-allowed !important; transform:none !important; }
      .hp-fill { transition: width 0.5s ease, background-color 0.5s ease; }

      /* ── Mobile responsive ── */
      @media (max-width: 600px) {
        #battle-top-row { padding: 8px 10px !important; gap: 8px !important; }
        #battle-top-row > div { padding: 10px 10px !important; }
        #battle-top-row > div span[style*='font-size:15px'] { font-size: 12px !important; }
        #battle-top-row > div span[style*='font-size:11px'] { font-size: 9px !important; }
        #battle-abilities { grid-template-columns: 1fr 1fr !important; gap: 5px !important; }
        .battle-ab { padding: 7px 5px !important; }
        .battle-ab div:first-child span:first-child { font-size: 11px !important; }
        #battle-msg { font-size: 12px !important; margin-bottom:5px !important; }
        #battle-bottom { padding: 8px 10px !important; padding-bottom: max(10px, env(safe-area-inset-bottom, 8px)) !important; }
      }
    </style>
    <div id="battle-ui" style="
      position:fixed; inset:0; display:grid;
      grid-template-rows: auto minmax(120px,1fr) auto;
      pointer-events:none; font-family:'Segoe UI',Arial,sans-serif;
      z-index:9990;">

      <!-- TOP ROW: Stat Cards -->
      <div id="battle-top-row" style="display:flex; justify-content:space-between; align-items:flex-start;
                  padding:16px 24px; gap:12px; pointer-events:none;">

        <!-- Player Card -->
        <div style="background:rgba(10,10,25,0.88); border:2px solid #3344aa;
                    border-radius:14px; padding:14px 18px; flex:1; min-width:0;
                    backdrop-filter:blur(6px); box-shadow:0 4px 24px rgba(0,0,0,0.6);">
          <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px;">
            <span style="font-weight:700;font-size:15px;color:#ddeeff;">${pName}</span>
            <span style="font-size:11px;color:#8899bb;font-weight:600;">LV ${this.player.level}</span>
          </div>
          <!-- HP row -->
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
            <span style="font-size:11px;font-weight:700;color:#44ff88;width:22px;">HP</span>
            <div style="flex:1;background:#111;border-radius:6px;height:12px;overflow:hidden;border:1px solid #222;">
              <div id="p-hp-bar" class="hp-fill" style="height:100%;border-radius:6px;background:#22cc55;width:100%;"></div>
            </div>
            <span id="p-hp-val" style="font-size:11px;color:#88ffaa;min-width:72px;text-align:right;">
              ${Math.ceil(p.hp)} / ${p.maxHp}
            </span>
          </div>
          <!-- MP/EP row -->
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:11px;font-weight:700;color:${resColor};width:22px;">${resLabel}</span>
            <div style="flex:1;background:#111;border-radius:6px;height:12px;overflow:hidden;border:1px solid #222;">
              <div id="p-mp-bar" class="hp-fill" style="height:100%;border-radius:6px;background:${resBarClr};width:100%;"></div>
            </div>
            <span id="p-mp-val" style="font-size:11px;color:${resColor};min-width:72px;text-align:right;">
              ${Math.ceil(p.mana)} / ${p.maxMana}
            </span>
          </div>
        </div>

        <!-- Enemy Card -->
        <div style="background:rgba(25,10,10,0.88); border:2px solid #aa3333;
                    border-radius:14px; padding:14px 18px; flex:1; min-width:0;
                    backdrop-filter:blur(6px); box-shadow:0 4px 24px rgba(0,0,0,0.6);">
          <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px;">
            <span style="font-weight:700;font-size:15px;color:#ffdddd;">${e.config.name}</span>
            <span style="font-size:11px;color:#bb8888;font-weight:600;">LV ${eLv}</span>
          </div>
          <!-- HP row -->
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:11px;font-weight:700;color:#ff5555;width:22px;">HP</span>
            <div style="flex:1;background:#111;border-radius:6px;height:12px;overflow:hidden;border:1px solid #222;">
              <div id="e-hp-bar" class="hp-fill" style="height:100%;border-radius:6px;background:#cc2222;width:100%;"></div>
            </div>
            <span id="e-hp-val" style="font-size:11px;color:#ff8888;min-width:72px;text-align:right;">
              ${e.hp} / ${e.maxHp}
            </span>
          </div>
        </div>
      </div>

      <!-- MIDDLE: spacer (canvas shows here) -->
      <div></div>

      <!-- BOTTOM ROW: Command panel -->
      <div id="battle-bottom" style="
        background:linear-gradient(180deg,rgba(8,8,20,0.97) 0%,rgba(5,5,14,0.99) 100%);
        border-top:2px solid #2a2a4a;
        padding:10px 20px max(12px, env(safe-area-inset-bottom, 10px));
        pointer-events:all;">

        <!-- Action message -->
        <div id="battle-msg" style="
          text-align:center; font-size:14px; font-weight:600;
          color:#eee; margin-bottom:7px; min-height:20px;
          text-shadow:0 0 12px rgba(100,160,255,0.4);">
          A wild ${e.config.name} appears!
        </div>

        <!-- 2x2 Ability grid (hidden until Fight chosen) -->
        <div id="battle-abilities" style="
          display:none; grid-template-columns:1fr 1fr; gap:7px; margin-bottom:7px;">
          ${abilitiesHTML}
        </div>

        <!-- Prompt row (Fight / Flee) -->
        <div id="battle-prompt" style="display:flex; justify-content:center; gap:24px;">
          <button id="battle-fight-btn" style="
            background:linear-gradient(135deg,#1a4a1a,#0d2d0d); border:2px solid #44cc44;
            border-radius:10px; padding:12px 40px; color:#44ff44; font-size:16px;
            font-weight:700; cursor:pointer; transition:all 0.15s;
            font-family:'Segoe UI',Arial,sans-serif;"
            onmouseover="this.style.background='linear-gradient(135deg,#2a6a2a,#1a4a1a)'"
            onmouseout="this.style.background='linear-gradient(135deg,#1a4a1a,#0d2d0d)'">
            ⚔ Fight &nbsp;<span style="opacity:0.6;font-size:12px">[ENTER]</span>
          </button>
          <button id="battle-flee-btn" style="
            background:linear-gradient(135deg,#4a1a1a,#2d0d0d); border:2px solid #cc4444;
            border-radius:10px; padding:12px 40px; color:#ff5555; font-size:16px;
            font-weight:700; cursor:pointer; transition:all 0.15s;
            font-family:'Segoe UI',Arial,sans-serif;"
            onmouseover="this.style.background='linear-gradient(135deg,#6a2a2a,#4a1a1a)'"
            onmouseout="this.style.background='linear-gradient(135deg,#4a1a1a,#2d0d0d)'">
            🏃 Flee &nbsp;<span style="opacity:0.6;font-size:12px">[F]</span>
          </button>
        </div>

        <!-- In-combat flee button (hidden until combat starts) -->
        <div id="battle-combat-flee" style="display:none;text-align:right;margin-top:6px;">
          <button id="battle-flee-combat-btn" style="
            background:none;border:1px solid #662222;border-radius:6px;
            padding:4px 14px;color:#aa4444;font-size:12px;cursor:pointer;
            font-family:'Segoe UI',Arial,sans-serif;">
            [F] Flee
          </button>
        </div>

        ${dbmsSection}
      </div>
    </div>`;

    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    document.body.appendChild(wrapper);
    this._uiEl = wrapper;

    // Wire fight/flee prompt buttons
    document.getElementById('battle-fight-btn').onclick = () => this._startCombat();
    document.getElementById('battle-flee-btn').onclick  = () => this._flee();

    // Wire dbms expand
    const dbmsHeader = document.getElementById('battle-dbms-header');
    if (dbmsHeader) {
      dbmsHeader.onclick = () => {
        const dbmsContainer = document.getElementById('battle-dbms');
        const icon = document.getElementById('battle-dbms-icon');
        if (dbmsContainer.style.height === '55px') {
          dbmsContainer.style.height = '200px';
          dbmsContainer.style.overflowY = 'auto';
          icon.textContent = '▲';
        } else {
          dbmsContainer.style.height = '55px';
          dbmsContainer.style.overflowY = 'hidden';
          icon.textContent = '▼';
        }
      };
    }

    // Wire ability buttons
    this.player.classConfig.abilities.forEach((ab, i) => {
      const btn = document.getElementById(`battle-ab-${i}`);
      if (btn) btn.onclick = () => this._useAbility(ab, i);
    });

    // Wire in-combat flee button
    document.getElementById('battle-flee-combat-btn').onclick = () => this._flee();
  }

  _bindKeys() {
    this.input.keyboard.once('keydown-ENTER', () => {
      if (this.state === 'PROMPT') this._startCombat();
    });
    this.input.keyboard.on('keydown-F', () => {
      if (this.state === 'PLAYER_TURN' || this.state === 'PROMPT') this._flee();
    });
    this.player.classConfig.abilities.forEach((ab, i) => {
      this.input.keyboard.on(`keydown-${i + 1}`, () => {
        if (this.state === 'PLAYER_TURN') this._useAbility(ab, i);
      });
    });
  }

  // ─────────────────────────────────────────────────────────
  // UI helpers
  // ─────────────────────────────────────────────────────────
  _msg(text) {
    const el = document.getElementById('battle-msg');
    if (el) el.innerHTML = text;
  }

  _setAbilitiesEnabled(enabled) {
    this.player.classConfig.abilities.forEach((_, i) => {
      const btn = document.getElementById(`battle-ab-${i}`);
      if (btn) btn.disabled = !enabled;
    });
  }

  _updateBars() {
    const p = this.player.stats;
    const pHPPct = Math.max(0, p.hp / p.maxHp);
    const pMPPct = Math.max(0, p.mana / p.maxMana);
    const eHPPct = Math.max(0, this.enemy.hp / this.enemy.maxHp);

    const pHPClr = pHPPct > 0.5 ? '#22cc55' : pHPPct > 0.25 ? '#ddcc00' : '#cc2222';
    const eHPClr = eHPPct > 0.5 ? '#cc2222' : eHPPct > 0.25 ? '#cc7700' : '#661111';

    const pBar = document.getElementById('p-hp-bar');
    const mBar = document.getElementById('p-mp-bar');
    const eBar = document.getElementById('e-hp-bar');
    if (pBar) { pBar.style.width = `${pHPPct * 100}%`; pBar.style.background = pHPClr; }
    if (mBar)   mBar.style.width = `${pMPPct * 100}%`;
    if (eBar) { eBar.style.width = `${eHPPct * 100}%`; eBar.style.background = eHPClr; }

    const pHPVal = document.getElementById('p-hp-val');
    const pMPVal = document.getElementById('p-mp-val');
    const eHPVal = document.getElementById('e-hp-val');
    if (pHPVal) pHPVal.textContent = `${Math.max(0, Math.ceil(p.hp))} / ${p.maxHp}`;
    if (pMPVal) pMPVal.textContent = `${Math.max(0, Math.ceil(p.mana))} / ${p.maxMana}`;
    if (eHPVal) eHPVal.textContent = `${Math.max(0, this.enemy.hp)} / ${this.enemy.maxHp}`;
  }

  _logDBMS(sql) {
    const el = document.getElementById('battle-dbms-logs');
    if (!el) return;
    const row = document.createElement('div');
    row.style.cssText = 'margin:2px 0;opacity:0;transition:opacity 0.4s;';
    row.textContent = `> ${sql}`;
    el.appendChild(row);
    requestAnimationFrame(() => { row.style.opacity = '1'; });
    const panel = document.getElementById('battle-dbms');
    if (panel) panel.scrollTop = panel.scrollHeight;
  }

  // ─────────────────────────────────────────────────────────
  // State machine
  // ─────────────────────────────────────────────────────────
  _showPrompt() {
    this.state = 'PROMPT';
    const prompt   = document.getElementById('battle-prompt');
    const abilities = document.getElementById('battle-abilities');
    const combatFlee = document.getElementById('battle-combat-flee');
    if (prompt)    prompt.style.display    = 'flex';
    if (abilities)  abilities.style.display  = 'none';
    if (combatFlee) combatFlee.style.display = 'none';
    this._msg(`⚔ A wild <strong style="color:#ffcc44">${this.enemy.config.name}</strong> appears! What do you do?`);
  }

  _startCombat() {
    if (this.state !== 'PROMPT') return;
    const prompt   = document.getElementById('battle-prompt');
    const abilities = document.getElementById('battle-abilities');
    const combatFlee = document.getElementById('battle-combat-flee');
    if (prompt)    prompt.style.display    = 'none';
    if (abilities)  abilities.style.display  = 'grid';
    if (combatFlee) combatFlee.style.display = 'block';

    this._logDBMS(`-- Encounter Started: ${this.enemy.config.name}`);
    this._logDBMS(`SELECT * FROM enemies WHERE name = '${this.enemy.config.name}';`);
    this._setTurn('PLAYER_TURN');
  }

  _setTurn(turn) {
    this.state = turn;
    if (turn === 'PLAYER_TURN') {
      this._msg('What will you do?');
      this._setAbilitiesEnabled(true);
    } else {
      this._setAbilitiesEnabled(false);
    }
  }

  _useAbility(ab, idx) {
    if (this.state !== 'PLAYER_TURN') return;

    const p = this.player.stats;
    if (p.mana < ab.cost) {
      const res = this.player.classConfig.resource === 'mana' ? 'Mana' : 'Endurance';
      this._msg(`<span style="color:#ff6666">Not enough ${res}!</span>`);
      return;
    }

    p.mana -= ab.cost;
    this._setTurn('DBMS_WAIT');
    this._logDBMS(`-- Player uses ${ab.name}`);
    this._logDBMS(`CALL rpc_use_ability('${window.ASHENVEIL?.username}', '${ab.name}');`);
    this._msg(`<span style="color:#ffcc44">${window.ASHENVEIL?.username}</span> uses <strong style="color:#fff">${ab.name}</strong>!`);
    this._updateBars();

    // Player lunge forward
    this.tweens.add({
      targets: this.playerSprite, x: 420, duration: 150, yoyo: true, ease: 'Power2',
      onComplete: () => {
        const rawDmg = ab.damage > 0 ? ab.damage + p.attack : 0;
        const dmg    = rawDmg;
        this.enemy.hp -= dmg;
        if (dmg > 0) this._showDamage(this.enemySprite.x, this.enemySprite.y - 40, dmg, false);
        this._logDBMS(`UPDATE enemies SET hp = ${Math.max(0, this.enemy.hp)} WHERE name = '${this.enemy.config.name}';`);
        this._updateBars();

        if (this.enemy.hp <= 0) {
          this._victory();
        } else {
          this.time.delayedCall(1300, () => this._enemyTurn());
        }
      }
    });
  }

  _enemyTurn() {
    this._setTurn('ENEMY_TURN');
    this._msg(`<span style="color:#ff6666">${this.enemy.config.name}</span> attacks!`);
    this._logDBMS(`INSERT INTO battle_log (attacker, defender, damage, timestamp)`);
    this._logDBMS(`  VALUES ('${this.enemy.config.name}', '${window.ASHENVEIL?.username}', ${this.enemy.config.damage}, NOW());`);

    // Enemy lunge
    this.tweens.add({
      targets: this.enemySprite, x: 850, duration: 150, yoyo: true, ease: 'Power2',
      onComplete: () => {
        const def = this.player.stats.defense;
        const dmg = Math.max(1, this.enemy.config.damage - Math.floor(def / 3));
        this.player.stats.hp -= dmg;
        this._showDamage(this.playerSprite.x, this.playerSprite.y - 40, dmg, true);
        this._logDBMS(`UPDATE players SET hp = ${Math.max(0, Math.ceil(this.player.stats.hp))} WHERE username = '${window.ASHENVEIL?.username}';`);
        this._updateBars();
        this.cameras.main.shake(180, 0.008);

        if (this.player.stats.hp <= 0) {
          this._defeat();
        } else {
          this.time.delayedCall(1300, () => this._setTurn('PLAYER_TURN'));
        }
      }
    });
  }

  _showDamage(x, y, amount, isPlayer) {
    const color = isPlayer ? '#ff4444' : '#ffeeaa';
    const txt = this.add.text(x, y, `${isPlayer ? '' : ''}${amount}`, {
      fontFamily: 'Inter, sans-serif', fontSize: '22px',
      color, stroke: '#000', strokeThickness: 5
    }).setOrigin(0.5).setDepth(50);
    this.tweens.add({
      targets: txt, y: y - 80, alpha: 0, duration: 1100, ease: 'Power2',
      onComplete: () => txt.destroy()
    });
  }

  _victory() {
    this.state = 'END';
    const gold = Phaser.Math.Between(this.enemy.config.goldMin, this.enemy.config.goldMax);
    this._msg(`<span style="color:#ffdd44">🏆 Victory! +${this.enemy.config.xp} XP · +${gold} Gold</span>`);
    this._logDBMS(`UPDATE players SET xp = xp + ${this.enemy.config.xp}, gold = gold + ${gold} WHERE username = '${window.ASHENVEIL?.username}';`);
    document.getElementById('battle-abilities').style.visibility = 'hidden';
    document.getElementById('battle-combat-flee').style.display = 'none';

    // Enemy death tween
    this.tweens.add({ targets: this.enemySprite, alpha: 0, y: '-=30', duration: 800 });

    this.time.delayedCall(2200, () => {
      this.player.gainXP(this.enemy.config.xp);
      this.player.gold += gold;
      this.enemy.takeDamage(9999, this.player);
      this._closeBattle();
    });
  }

  _defeat() {
    this.state = 'END';
    this._msg(`<span style="color:#ff4444">💀 You were defeated by ${this.enemy.config.name}...</span>`);
    this._logDBMS(`-- Battle lost. Player HP: 0`);
    document.getElementById('battle-abilities').style.visibility = 'hidden';
    document.getElementById('battle-combat-flee').style.display = 'none';
    this.tweens.add({ targets: this.playerSprite, alpha: 0, y: '+=20', duration: 700 });

    this.time.delayedCall(2200, () => {
      this.player.die();
      this.enemy.inBattle = false;
      this._closeBattle();
    });
  }

  _flee() {
    if (this.state === 'END') return;
    this.state = 'END';
    this._msg('<span style="color:#aaaaff">Got away safely!</span>');
    this._logDBMS(`-- Player fled from battle`);
    
    // Do NOT set inBattle to false immediately. If we do, the moment GameScene
    // resumes, the physics engine will detect the player and enemy still touching
    // and instantly restart the battle. We'll give the player 3 seconds of immunity.
    this.enemy.state = 'idle';
    this.enemy.attackTimer = 4000;
    
    this.time.delayedCall(900, () => {
      this._closeBattle();
      
      // Delay releasing the enemy from battle lock until the player has had time to run away
      this.gameScene.time.delayedCall(3000, () => {
        if (this.enemy && !this.enemy.isDead) {
          this.enemy.inBattle = false;
        }
      });
    });
  }

  _closeBattle() {
    if (this._uiEl) { this._uiEl.remove(); this._uiEl = null; }
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.time.delayedCall(300, () => {
      this.gameScene.scene.resume();
      this.scene.stop();
    });
  }

  // Called when PvP takes priority over an active PvE battle
  _interruptForPvP() {
    if (this.state === 'END') return;
    this.state = 'END';
    // Instantly clean up UI
    if (this._uiEl) { this._uiEl.remove(); this._uiEl = null; }
    // Release enemy so it doesn't stay locked forever
    if (this.enemy && !this.enemy.isDead) {
      this.enemy.inBattle = false;
      this.enemy.state = 'idle';
      this.enemy.attackTimer = 4000;
    }
    // Resume world immediately so PvP overlay can render
    this.gameScene.scene.resume();
    this.scene.stop();
  }
}
