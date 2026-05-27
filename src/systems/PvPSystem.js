// ============================================================
// PvPSystem — Challenge nearby players to turn-based combat
// Press [P] near another player to challenge them
// ============================================================
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../utils/Constants.js';

export class PvPSystem {
  constructor(scene, player, multiplayer) {
    this.scene       = scene;
    this.player      = player;
    this.multiplayer = multiplayer;
    this.supabase    = null;
    this.inPvP       = false;
    this.overlay     = null;
    this.pvpState    = null; // { opponent, myTurn, opponentHP, myHP }
    this.pendingChallenge = null;

    this._initSupabase();
    this._bindKey();
  }

  async _initSupabase() {
    if (!SUPABASE_URL || SUPABASE_URL.includes('YOUR_')) return;
    try {
      const { createClient } = await import('@supabase/supabase-js');
      this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } catch (e) { /* offline */ }
  }

  _bindKey() {
    this.scene.input.keyboard.addKey('P').on('down', () => {
      if (this.inPvP) return;
      const closest = this._findClosestPlayer();
      if (closest) this.sendChallenge(closest);
      else this._toast('No player nearby! Walk close to another player and press P.', '#ffaa44');
    });
  }

  // Called by MultiplayerManager when remotePlayers is available
  _findClosestPlayer() {
    if (!this.multiplayer?.remotePlayers) return null;
    let best = null, bestDist = 120;
    Object.entries(this.multiplayer.remotePlayers).forEach(([username, rp]) => {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, rp.sprite?.x || 0, rp.sprite?.y || 0);
      if (d < bestDist) { bestDist = d; best = username; }
    });
    return best;
  }

  // ── Challenger side ─────────────────────────────────────
  sendChallenge(targetUsername) {
    const sql = `-- PvP Challenge broadcast via Supabase Realtime\nSELECT p.username, p.level, p.hp, p.max_hp,\n  p.class, p.gold\nFROM players p\nWHERE p.username = '${window.ASHENVEIL.username}';\n-- Payload sent over WebSocket channel to: ${targetUsername}`;
    this._emit('PVP CHALLENGE', sql);

    const payload = {
      from:     window.ASHENVEIL.username,
      fromClass: window.ASHENVEIL.playerClass,
      target:   targetUsername,
      fromHP:   this.player.stats.hp,
      fromMaxHP: this.player.stats.maxHp,
      fromLevel: this.player.level,
      fromAtk:  this.player.stats.attack || 10,
      fromGold: this.player.gold,
    };

    this.multiplayer?.channel?.send({ type: 'broadcast', event: 'pvp_challenge', payload });
    this._toast(`⚔ Challenge sent to ${targetUsername}!`, '#ffcc44');
    this._pendingTimeout = setTimeout(() => {
      this._toast('Challenge expired.', '#777');
    }, 15000);
  }

  // ── Called by MultiplayerManager when a challenge arrives ──
  onChallengeReceived(payload) {
    if (payload.target !== window.ASHENVEIL.username) return;
    this.pendingChallenge = payload;
    this._showChallengeDialog(payload);
  }

  _showChallengeDialog(payload) {
    const existing = document.getElementById('pvp-challenge-dialog');
    if (existing) existing.remove();

    const html = `
      <div id="pvp-challenge-dialog" style="position:fixed;top:80px;left:50%;transform:translateX(-50%);
           z-index:9500;background:linear-gradient(135deg,#1a0a0a,#2a0a0a);
           border:2px solid #cc4444;border-radius:14px;padding:20px 28px;
           font-family:'Inter',sans-serif;box-shadow:0 0 40px rgba(204,68,68,0.4);min-width:360px;text-align:center;">
        <div style="font-size:16px;font-weight:700;color:#ff6666;margin-bottom:6px;">⚔ PvP Challenge!</div>
        <div style="font-size:13px;color:#e0d0b0;margin-bottom:4px;">
          <strong style="color:#ffcc44;">${payload.from}</strong> challenges you to combat!
        </div>
        <div style="font-size:11px;color:#888;margin-bottom:14px;">
          Lv ${payload.fromLevel} ${payload.fromClass} · ${payload.fromHP}/${payload.fromMaxHP} HP
        </div>
        <div style="display:flex;gap:10px;justify-content:center;">
          <button onclick="window._pvpSystem.acceptChallenge()"
            style="padding:8px 24px;background:rgba(200,50,50,0.25);border:2px solid #cc4444;
                   border-radius:8px;color:#ff6666;font-weight:700;font-size:13px;cursor:pointer;font-family:Inter;">
            ⚔ Accept
          </button>
          <button onclick="window._pvpSystem.declineChallenge()"
            style="padding:8px 24px;background:rgba(50,50,50,0.25);border:1px solid #444;
                   border-radius:8px;color:#888;font-size:13px;cursor:pointer;font-family:Inter;">
            Decline
          </button>
        </div>
      </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
    window._pvpSystem = this;

    // Auto-decline after 15s
    setTimeout(() => {
      document.getElementById('pvp-challenge-dialog')?.remove();
      this.pendingChallenge = null;
    }, 15000);
  }

  acceptChallenge() {
    document.getElementById('pvp-challenge-dialog')?.remove();
    if (!this.pendingChallenge) return;
    const opp = this.pendingChallenge;
    this.pendingChallenge = null;

    // Notify challenger
    this.multiplayer?.channel?.send({
      type: 'broadcast', event: 'pvp_accepted',
      payload: {
        from: window.ASHENVEIL.username, target: opp.from,
        myHP: this.player.stats.hp, myMaxHP: this.player.stats.maxHp,
        myLevel: this.player.level, myAtk: this.player.stats.attack || 10,
        myGold: this.player.gold,
      }
    });

    // Close PvE battle instantly if active — PvP takes priority
    if (this.scene.scene.isActive('Battle')) {
      this.scene.scene.get('Battle')._interruptForPvP();
    }

    // Start combat — challenger goes first
    this._startPvPCombat(opp.from, opp.fromClass, opp.fromHP, opp.fromMaxHP, opp.fromAtk, opp.fromGold, false);
  }

  declineChallenge() {
    document.getElementById('pvp-challenge-dialog')?.remove();
    const opp = this.pendingChallenge;
    this.pendingChallenge = null;
    if (opp) {
      this.multiplayer?.channel?.send({
        type: 'broadcast', event: 'pvp_declined',
        payload: { from: window.ASHENVEIL.username, target: opp.from }
      });
    }
  }

  // ── Called on challenger when target accepts ──
  onChallengeAccepted(payload) {
    if (payload.target !== window.ASHENVEIL.username) return;
    clearTimeout(this._pendingTimeout);
    
    // Close PvE battle instantly if active — PvP takes priority
    if (this.scene.scene.isActive('Battle')) {
      this.scene.scene.get('Battle')._interruptForPvP();
    }

    this._startPvPCombat(payload.from, null, payload.myHP, payload.myMaxHP, payload.myAtk, payload.myGold, true);
  }

  onChallengeDeclined(payload) {
    if (payload.target !== window.ASHENVEIL.username) return;
    this._toast(`${payload.from} declined the challenge.`, '#888');
  }

  // ── The PvP Battle UI ────────────────────────────────────
  _startPvPCombat(oppName, oppClass, oppHP, oppMaxHP, oppAtk, oppGold, myTurnFirst) {
    this.inPvP = true;
    this.pvpState = {
      oppName, oppClass: oppClass || 'warrior',
      myHP:    this.player.stats.hp,    myMaxHP:  this.player.stats.maxHp,
      oppHP,   oppMaxHP,
      myAtk:   this.player.stats.attack || 10,
      oppAtk,
      myGold:  this.player.gold,        oppGold,
      myTurn:  myTurnFirst,
      round:   1,
    };

    const sql = `INSERT INTO pvp_log\n  (attacker_id, defender_id, zone, result, gold_transferred)\nSELECT\n  p1.player_id, p2.player_id,\n  '${this.scene.zoneManager?.currentZone || 'unknown'}',\n  'in_progress', 0\nFROM players p1, players p2\nWHERE p1.username = '${window.ASHENVEIL.username}'\n  AND p2.username = '${oppName}';\n-- ACID transaction: BEGIN...COMMIT wraps gold transfer`;
    this._emit('PVP STARTED', sql);
    this._renderPvP();
  }

  _renderPvP() {
    this.overlay?.remove();
    const s = this.pvpState;
    if (!s) return;

    const myPct  = Math.max(0, (s.myHP  / s.myMaxHP)  * 100).toFixed(1);
    const oppPct = Math.max(0, (s.oppHP / s.oppMaxHP) * 100).toFixed(1);
    const myBarColor  = myPct  > 50 ? '#44cc44' : myPct  > 25 ? '#ffcc44' : '#cc4444';
    const oppBarColor = oppPct > 50 ? '#44cc44' : oppPct > 25 ? '#ffcc44' : '#cc4444';

    const html = `
      <style>
        .pvp-ab { transition:all 0.15s; font-family:'Segoe UI',Arial,sans-serif; cursor:pointer; }
        .pvp-ab:hover { transform:translateY(-2px); box-shadow:0 4px 16px rgba(255,204,68,0.2); border-color:#ffcc44 !important; }
        .pvp-ab:disabled { opacity:0.35; cursor:not-allowed !important; transform:none !important; }
      </style>
      <div id="pvp-overlay" style="position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:9000;
           display:flex;align-items:center;justify-content:center;font-family:'Segoe UI',Arial,sans-serif;">
        <div style="background:linear-gradient(135deg,#0a0a14,#11111a);border:2px solid #3344aa;
             border-radius:16px;padding:26px;width:640px;
             box-shadow:0 0 60px rgba(50,68,170,0.35);">

          <div style="text-align:center;margin-bottom:18px;">
            <div style="font-size:20px;font-weight:700;color:#ddeeff;">⚔ PvP Combat — Round ${s.round}</div>
            <div style="font-size:12px;color:#8899bb;margin-top:4px;">${s.myTurn ? 'YOUR TURN' : `${s.oppName}'s TURN…`}</div>
          </div>

          <!-- HP Bars -->
          <div style="display:flex;gap:16px;margin-bottom:16px;">
            <div style="flex:1;background:rgba(10,10,25,0.88);border:2px solid #3344aa;border-radius:12px;padding:12px;">
              <div style="font-size:14px;font-weight:700;color:#ddeeff;margin-bottom:8px;">
                ${window.ASHENVEIL.username} <span style="font-size:10px;color:#8899bb;font-weight:600;">(You)</span>
              </div>
              <div style="display:flex;align-items:center;gap:8px;">
                <span style="font-size:11px;font-weight:700;color:#44ff88;width:22px;">HP</span>
                <div style="flex:1;background:#111;border-radius:6px;height:12px;overflow:hidden;border:1px solid #222;">
                  <div style="width:${myPct}%;height:100%;background:${myBarColor};transition:width 0.4s;border-radius:6px;"></div>
                </div>
                <span style="font-size:11px;color:#88ffaa;min-width:60px;text-align:right;">${s.myHP}/${s.myMaxHP}</span>
              </div>
            </div>
            <div style="display:flex;align-items:center;font-size:24px;color:#cc4444;font-weight:700;font-style:italic;">VS</div>
            <div style="flex:1;background:rgba(25,10,10,0.88);border:2px solid #aa3333;border-radius:12px;padding:12px;">
              <div style="font-size:14px;font-weight:700;color:#ffdddd;margin-bottom:8px;">
                ${s.oppName}
              </div>
              <div style="display:flex;align-items:center;gap:8px;">
                <span style="font-size:11px;font-weight:700;color:#ff5555;width:22px;">HP</span>
                <div style="flex:1;background:#111;border-radius:6px;height:12px;overflow:hidden;border:1px solid #222;">
                  <div style="width:${oppPct}%;height:100%;background:${oppBarColor};transition:width 0.4s;border-radius:6px;"></div>
                </div>
                <span style="font-size:11px;color:#ff8888;min-width:60px;text-align:right;">${s.oppHP}/${s.oppMaxHP}</span>
              </div>
            </div>
          </div>

          <!-- Live SQL Panel -->
          <div style="background:rgba(5,15,5,0.92);border:1px solid #00cc44;border-radius:6px;
               padding:8px 12px;margin-bottom:14px;font-family:'Courier New',monospace;font-size:10px;color:#00ff44;">
            <div style="color:#ffaa00;font-weight:bold;margin-bottom:4px;border-bottom:1px solid #224422;padding-bottom:3px;">⚡ LIVE SQL — PvP Transaction</div>
            <div id="pvp-sql" style="white-space:pre-wrap;word-break:break-all;max-height:65px;overflow-y:auto;line-height:1.4;">-- Combat in progress…</div>
          </div>

          <!-- Combat log -->
          <div id="pvp-log" style="background:rgba(10,10,15,0.8);border:1px solid #2a2a4a;border-radius:8px;
               padding:10px 14px;margin-bottom:16px;font-size:13px;color:#ccc;
               max-height:90px;overflow-y:auto;min-height:50px;">
            <div style="color:#88aaff;">⚔ Battle started! ${s.myTurn ? 'You go first.' : `${s.oppName} goes first.`}</div>
          </div>

          <!-- Action Buttons -->
          <div style="display:flex;gap:12px;justify-content:center;">
            ${s.myTurn ? `
              <button class="pvp-ab" onclick="window._pvpSystem.pvpAttack('strike')"
                style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);border:2px solid #2a2a4a;border-radius:8px;padding:10px 24px;color:#fff;font-weight:700;font-size:14px;">
                <span style="color:#ffcc44;">[1]</span> Strike
              </button>
              <button class="pvp-ab" onclick="window._pvpSystem.pvpAttack('heavy')"
                style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);border:2px solid #2a2a4a;border-radius:8px;padding:10px 24px;color:#fff;font-weight:700;font-size:14px;">
                <span style="color:#ffcc44;">[2]</span> Heavy Hit
              </button>
              <button class="pvp-ab" onclick="window._pvpSystem.pvpAttack('defend')"
                style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);border:2px solid #2a2a4a;border-radius:8px;padding:10px 24px;color:#fff;font-weight:700;font-size:14px;">
                <span style="color:#ffcc44;">[3]</span> Defend
              </button>
            ` : `
              <div style="padding:10px 22px;color:#8899bb;font-size:14px;font-weight:600;">Waiting for ${s.oppName}…</div>
            `}
          </div>
        </div>
      </div>`;

    this.overlay = document.createElement('div');
    this.overlay.innerHTML = html;
    document.body.appendChild(this.overlay);
    window._pvpSystem = this;
  }

  pvpAttack(moveType) {
    const s = this.pvpState;
    if (!s || !s.myTurn) return;

    let dmg = 0, label = '';
    if (moveType === 'strike') { dmg = Math.floor(s.myAtk * (0.8 + Math.random() * 0.6)); label = 'Strike'; }
    if (moveType === 'heavy')  { dmg = Math.floor(s.myAtk * (1.2 + Math.random() * 0.8)); label = 'Heavy Hit'; }
    if (moveType === 'defend') { dmg = 0; s.myHP = Math.min(s.myMaxHP, s.myHP + 15); label = 'Defend (+15 HP)'; }

    const isCrit = moveType !== 'defend' && Math.random() < 0.2;
    if (isCrit) { dmg = Math.floor(dmg * 1.5); label += ' (CRIT!)'; }

    const sql = `-- Turn ${s.round}: ${window.ASHENVEIL.username} uses ${label}\nINSERT INTO pvp_log (attacker_id, defender_id, damage, skill_used, is_critical)\n  SELECT p1.player_id, p2.player_id, ${dmg}, '${label}', ${isCrit}\n  FROM players p1, players p2\n  WHERE p1.username = '${window.ASHENVEIL.username}'\n    AND p2.username = '${s.oppName}';`;
    this._updatePvPSQL(sql);
    this._emit('PVP ATTACK', sql);

    // Send to opponent
    this.multiplayer?.channel?.send({
      type: 'broadcast', event: 'pvp_attack',
      payload: { from: window.ASHENVEIL.username, target: s.oppName, damage: dmg, move: label, isCrit }
    });

    s.oppHP  -= dmg;
    s.myTurn  = false;
    s.round++;

    this._logLine(`You used ${label} → ${dmg > 0 ? `-${dmg} to ${s.oppName}` : `healed yourself`}`);

    if (s.oppHP <= 0) { this._endPvP(true); return; }
    this._renderPvP();
  }

  // Called by MultiplayerManager when opponent attacks
  onPvPAttack(payload) {
    const s = this.pvpState;
    if (!s || payload.target !== window.ASHENVEIL.username) return;

    s.myHP  -= payload.damage;
    s.myTurn = true;
    s.round++;

    const sql = `-- Turn ${s.round}: ${payload.from} uses ${payload.move}\nINSERT INTO pvp_log (attacker_id, defender_id, damage, skill_used, is_critical)\n  SELECT p1.player_id, p2.player_id, ${payload.damage}, '${payload.move}', ${payload.isCrit}\n  FROM players p1, players p2\n  WHERE p1.username = '${payload.from}'\n    AND p2.username = '${window.ASHENVEIL.username}';`;
    this._updatePvPSQL(sql);

    this._logLine(`${payload.from} used ${payload.move} → ${payload.damage > 0 ? `-${payload.damage} to you` : 'healed themselves'}`);

    if (s.myHP <= 0) { this._endPvP(false); return; }
    this._renderPvP();
  }

  async _endPvP(didIWin) {
    const s = this.pvpState;
    const goldTransfer = Math.floor((didIWin ? s.oppGold : s.myGold) * 0.2);
    const sql = `BEGIN;\n-- PvP reward: winner takes 20% of loser's gold\nUPDATE players SET gold = gold + ${goldTransfer}\n  WHERE username = '${didIWin ? window.ASHENVEIL.username : s.oppName}';\nUPDATE players SET gold = gold - ${goldTransfer}\n  WHERE username = '${didIWin ? s.oppName : window.ASHENVEIL.username}';\n\nUPDATE pvp_log SET result = '${didIWin ? 'win' : 'loss'}',\n  gold_transferred = ${goldTransfer}\n  WHERE attacker_id = (SELECT player_id FROM players\n    WHERE username = '${window.ASHENVEIL.username}');\nCOMMIT;`;
    this._emit('PVP RESULT', sql);

    if (this.supabase) {
      await this.supabase.from('pvp_log').insert({
        zone: this.scene.zoneManager?.currentZone || 'unknown',
        damage: 0, skill_used: 'pvp_end', is_critical: false
      });
    }

    if (didIWin) {
      this.player.gold += goldTransfer;
      this.player.xp   += 50;
    } else {
      this.player.gold  = Math.max(0, this.player.gold - goldTransfer);
    }

    this.overlay?.remove();
    this.overlay = null;
    this.inPvP   = false;
    this.pvpState = null;

    const msg = didIWin
      ? `🏆 You defeated ${s.oppName}! +${goldTransfer}g, +50 XP`
      : `💀 You lost to ${s.oppName}. −${goldTransfer}g`;
    this._toast(msg, didIWin ? '#44ff88' : '#ff4444', 4000);
  }

  _logLine(msg) {
    const el = document.getElementById('pvp-log');
    if (!el) return;
    const line = document.createElement('div');
    line.style.borderTop = '1px solid rgba(255,255,255,0.06)';
    line.style.paddingTop = '3px';
    line.style.marginTop  = '3px';
    line.textContent = msg;
    el.appendChild(line);
    el.scrollTop = el.scrollHeight;
  }

  _updatePvPSQL(sql) {
    const el = document.getElementById('pvp-sql');
    if (el) el.textContent = sql;
  }

  _emit(label, sql) {
    if (window.ASHENVEIL?.dbmsMode) console.log(`%c[SQL:${label}]\n${sql}`, 'color:#ff4444');
  }

  _toast(msg, color = '#44ff88', dur = 2500) {
    const t = this.scene.add.text(640, 200, msg, {
      fontFamily: 'Inter, sans-serif', fontSize: '15px', color,
      stroke: '#000', strokeThickness: 2, backgroundColor: '#0a0a14',
      padding: { x: 12, y: 6 }
    }).setOrigin(0.5).setDepth(9999).setScrollFactor(0);
    this.scene.tweens.add({ targets: t, alpha: 0, y: 165, duration: dur, onComplete: () => t.destroy() });
  }
}
