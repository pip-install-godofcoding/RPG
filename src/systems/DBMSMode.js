import Phaser from 'phaser';

// ============================================================
// DBMSMode — Educational SQL overlay with CLEAR query display
// Teaches: Triggers, Stored Procedures, JOINs, Normalization,
//          Indexes, RLS, ACID, Views, FKs, Aggregates, Subqueries
// ============================================================

const CONCEPTS = {
  trigger:     { title: '⚡ TRIGGER',              color: '#ff6644', desc: 'Automatically executes a function BEFORE/AFTER INSERT, UPDATE, or DELETE.\nUsed here: trg_level_up fires when XP changes, auto-leveling the player.' },
  storedProc:  { title: '📦 STORED PROCEDURE',     color: '#44aaff', desc: 'A reusable server-side function called via SELECT rpc_name().\nKeeps business logic in the DB — clients send intent, server validates.' },
  join:        { title: '🔗 JOIN',                  color: '#44ff88', desc: 'Combines rows from 2+ tables using a shared key (FK→PK).\nINNER JOIN = only matching rows. LEFT JOIN = all from left + matches.' },
  normalization:{ title: '📐 NORMALIZATION (3NF)',  color: '#ffaa44', desc: '1NF: No repeating groups. 2NF: No partial dependencies.\n3NF: No transitive dependencies. Each non-key depends ONLY on the PK.' },
  index:       { title: '🔍 INDEX',                color: '#aa88ff', desc: 'B-tree structure that speeds up WHERE/JOIN lookups.\nTrade-off: faster SELECT, slower INSERT/UPDATE (must update index too).' },
  rls:         { title: '🔒 ROW LEVEL SECURITY',   color: '#ff4488', desc: 'PostgreSQL policy that restricts rows per user.\nPolicy: USING (auth.uid() = player_id) — you can only see YOUR data.' },
  transaction: { title: '💎 ACID TRANSACTION',      color: '#ffdd44', desc: 'Atomic: all-or-nothing. Consistent: valid state before & after.\nIsolated: concurrent transactions don\'t interfere. Durable: committed = permanent.' },
  view:        { title: '👁 VIEW',                  color: '#88ddff', desc: 'A virtual table from a stored SELECT query.\nv_leaderboard = SELECT username, level, xp FROM players ORDER BY level DESC.' },
  fk:          { title: '🔑 FOREIGN KEY',           color: '#ff8844', desc: 'References a PK in another table → enforces referential integrity.\nON DELETE CASCADE: deleting a player auto-deletes their inventory rows.' },
  aggregate:   { title: '📊 AGGREGATE FUNCTIONS',   color: '#88ff88', desc: 'COUNT(*), SUM(gold), AVG(level), MAX(xp), MIN(hp).\nUsed with GROUP BY to compute stats per group (per guild, per zone).' },
  subquery:    { title: '🔄 SUBQUERY',              color: '#dd88ff', desc: 'A SELECT nested inside another SELECT, WHERE, or FROM.\nExample: WHERE attack > (SELECT AVG(attack) FROM items) — find above-average items.' },
  upsert:      { title: '⬆ UPSERT',                color: '#ffcc44', desc: 'INSERT ... ON CONFLICT (pk) DO UPDATE SET ...\nAtomically creates a new row OR updates existing. Prevents duplicate key errors.' }
};

import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../utils/Constants.js';

export class DBMSMode {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    this.active = window.ASHENVEIL?.dbmsMode || false;
    this.elements = [];
    this.queryLog = [];
    this.conceptsSeen = new Set();
    this.currentPanel = null;
    this.supabase = null;

    if (!this.active) return;

    this._createQueryPanel();
    this._createBadge();
    this._hookGameEvents();

    scene.input.keyboard.addKey('TAB').on('down', () => this._cyclePanel());
    scene.input.keyboard.addKey('C').on('down', () => this._toggleConcepts());

    // Try connect to real Supabase
    this._connectSupabase();
  }

  // ─── SUPABASE CONNECTION ───────────────────────────
  async _connectSupabase() {
    const url = SUPABASE_URL;
    const key = SUPABASE_ANON_KEY;
    if (!url || url.includes('YOUR_')) {
      this._addLog('CONFIG', '-- No Supabase credentials found\n-- Queries are SIMULATED\n-- Add real URL+Key in Constants.js\n-- to execute against PostgreSQL', '#888888', 'info');
      return;
    }
    try {
      const { createClient } = await import('@supabase/supabase-js');
      this.supabase = createClient(url, key);
      this._addLog('CONNECT', '-- ✅ Connected to Supabase!\n-- Queries now execute on\n-- real PostgreSQL database', '#44ff44', 'info');
    } catch (e) {
      this._addLog('ERROR', `-- ❌ Connection failed\n-- ${e.message}`, '#ff4444', 'info');
    }
  }

  async _executeReal(sql, params) {
    if (!this.supabase) return null;
    try {
      const { data, error } = await this.supabase.rpc('exec_sql', { query: sql });
      if (error) return { error: error.message };
      return { data };
    } catch (e) { return null; }
  }

  // ─── UI: QUERY LOG PANEL (right side, large & clear) ─────
  _createQueryPanel() {
    const s = this.scene;
    // Large panel on the LEFT side
    this.panelBg = s.add.rectangle(175, 430, 330, 340, 0x0a0a12, 0.92)
      .setStrokeStyle(2, 0xff8800, 0.5).setDepth(295).setScrollFactor(0);

    this.panelTitle = s.add.text(22, 268, '📊 LIVE SQL QUERY LOG', {
      fontFamily: '"Press Start 2P"', fontSize: '7px', color: '#ff8800'
    }).setDepth(296).setScrollFactor(0);

    this.panelHint = s.add.text(310, 268, 'LIVE', {
      fontFamily: '"Press Start 2P"', fontSize: '6px', color: '#44ff44'
    }).setOrigin(1, 0).setDepth(296).setScrollFactor(0);

    // Blinking dot
    s.tweens.add({ targets: this.panelHint, alpha: 0.3, duration: 800, yoyo: true, repeat: -1 });

    // Query entries container
    this.queryEntries = [];
    this.conceptPopup = null;
  }

  _createBadge() {
    const s = this.scene;
    s.add.rectangle(640, 12, 560, 20, 0x1a0f00, 0.9)
      .setStrokeStyle(1, 0xff8800, 0.5).setDepth(300).setScrollFactor(0);
    s.add.text(640, 12, '🗄 DBMS LEARNING MODE  |  [TAB] Schema  |  [C] Concepts  |  [J] Quests', {
      fontFamily: '"Press Start 2P"', fontSize: '5px', color: '#ff8800'
    }).setOrigin(0.5).setDepth(301).setScrollFactor(0);
  }

  // ─── LOG A QUERY (with concept tag, syntax coloring) ─────
  _addLog(type, sql, color, concept) {
    const s = this.scene;
    const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // Clear old entries if too many
    if (this.queryEntries.length >= 3) {
      const old = this.queryEntries.shift();
      old.forEach(e => e.destroy());
    }

    // Reposition existing entries up
    const entryH = 95;
    this.queryEntries.forEach((entry, i) => {
      entry.forEach(e => { e.y -= entryH; });
    });

    const baseY = 510;
    const els = [];

    // Type badge
    const typeColors = {
      'SELECT': '#44aaff', 'UPDATE': '#ffaa44', 'INSERT': '#44ff88',
      'DELETE': '#ff4444', 'TRIGGER': '#ff6644', 'RPC': '#aa88ff',
      'JOIN': '#44ff88', 'UPSERT': '#ffcc44', 'CONFIG': '#888888',
      'CONNECT': '#44ff44', 'ERROR': '#ff4444', 'RLS': '#ff4488'
    };
    const badgeColor = typeColors[type] || '#ff8800';

    // Background for this entry
    const entryBg = s.add.rectangle(175, baseY, 320, entryH - 6, 0x12121f, 0.8)
      .setStrokeStyle(1, Phaser.Display.Color.HexStringToColor(badgeColor).color, 0.4)
      .setDepth(296).setScrollFactor(0);
    els.push(entryBg);

    // Type + timestamp header
    const header = s.add.text(22, baseY - 38, `[${type}]  ${time}`, {
      fontFamily: '"Press Start 2P"', fontSize: '6px', color: badgeColor
    }).setDepth(297).setScrollFactor(0);
    els.push(header);

    // Concept tag if applicable
    if (concept && CONCEPTS[concept]) {
      const tag = s.add.text(320, baseY - 38, CONCEPTS[concept].title, {
        fontFamily: '"Press Start 2P"', fontSize: '5px', color: CONCEPTS[concept].color
      }).setOrigin(1, 0).setDepth(297).setScrollFactor(0);
      els.push(tag);
    }

    // SQL text (the main content — large and readable)
    const sqlText = s.add.text(26, baseY - 24, sql, {
      fontFamily: 'monospace', fontSize: '9px', color: '#33ee55',
      wordWrap: { width: 305 }, lineSpacing: 2
    }).setDepth(297).setScrollFactor(0);
    els.push(sqlText);

    // Result indicator
    const isReal = this.supabase !== null;
    const indicator = s.add.text(320, baseY + 32, isReal ? '✅ EXECUTED' : '📝 SIMULATED', {
      fontFamily: '"Press Start 2P"', fontSize: '4px', color: isReal ? '#44ff44' : '#666677'
    }).setOrigin(1, 0).setDepth(297).setScrollFactor(0);
    els.push(indicator);

    this.queryEntries.push(els);

    // Show concept popup if new
    if (concept && !this.conceptsSeen.has(concept)) {
      this.conceptsSeen.add(concept);
      this._showConceptPopup(concept);
    }

    // Console log
    console.log(`%c[DBMS ${type}] ${sql}`, `color: ${badgeColor}; font-family: monospace`);
  }

  // ─── CONCEPT POPUP (bottom bar, auto-dismiss) ────────────
  _showConceptPopup(key) {
    const c = CONCEPTS[key];
    if (!c) return;
    const s = this.scene;

    if (this.conceptPopup) { this.conceptPopup.forEach(e => e.destroy()); }

    const els = [];
    const bg = s.add.rectangle(640, 685, 750, 55, 0x0a0a1a, 0.96)
      .setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(c.color).color, 0.9)
      .setDepth(350).setScrollFactor(0);
    const icon = s.add.text(280, 670, '🆕 CONCEPT UNLOCKED:', {
      fontFamily: '"Press Start 2P"', fontSize: '6px', color: '#ffdd44'
    }).setDepth(351).setScrollFactor(0);
    const title = s.add.text(480, 670, c.title, {
      fontFamily: '"Press Start 2P"', fontSize: '8px', color: c.color
    }).setDepth(351).setScrollFactor(0);
    const desc = s.add.text(280, 688, c.desc.replace('\n', ' | '), {
      fontFamily: 'Inter', fontSize: '10px', color: '#cccccc',
      wordWrap: { width: 700 }
    }).setDepth(351).setScrollFactor(0);

    els.push(bg, icon, title, desc);
    this.conceptPopup = els;

    // Animate in
    els.forEach(e => { e.setAlpha(0); s.tweens.add({ targets: e, alpha: 1, y: e.y - 5, duration: 300 }); });

    // Auto dismiss after 8 seconds
    s.time.delayedCall(8000, () => {
      if (this.conceptPopup === els) {
        els.forEach(e => s.tweens.add({ targets: e, alpha: 0, duration: 500, onComplete: () => e.destroy() }));
        this.conceptPopup = null;
      }
    });
  }

  // ─── HOOK GAME EVENTS ────────────────────────────────────
  _hookGameEvents() {
    const s = this.scene, p = this.player;
    const u = window.ASHENVEIL.username || 'player';

    // Position update every 6s
    s.time.addEvent({ delay: 6000, loop: true, callback: () => {
      const zone = s.zoneManager?.currentZone || 'unknown';
      this._addLog('UPDATE',
        `UPDATE players\n  SET position_x = ${p.x.toFixed(0)},\n      position_y = ${p.y.toFixed(0)},\n      current_zone = '${zone}',\n      last_seen = NOW()\nWHERE username = '${u}';`, null, 'upsert');
      // Execute real if connected
      if (this.supabase) {
        this.supabase.from('players').update({
          position_x: p.x, position_y: p.y,
          current_zone: zone, last_seen: new Date().toISOString()
        }).eq('username', u).then(({ error }) => {
          if (error) console.warn('[DBMS] Real update failed:', error);
        });
      }
    }});

    // Enemy killed → INSERT battle_log + UPDATE xp
    s.events.on('enemyKilled', ({ enemy, gold, xp }) => {
      this._addLog('INSERT',
        `INSERT INTO battle_log\n  (attacker_id, defender_id,\n   damage, skill_used,\n   is_critical, zone)\nVALUES\n  (auth.uid(), '${enemy.config.name}',\n   ${enemy.config.damage}, 'attack',\n   false, '${s.zoneManager?.currentZone}');`, null, 'fk');

      this._addLog('UPDATE',
        `UPDATE players SET\n  xp = xp + ${xp},\n  gold = gold + ${gold}\nWHERE username = '${u}';\n\n⚡ TRIGGER trg_level_up checks:\n  IF xp >= level² × 100 THEN\n    level++, max_hp += 20`, null, 'trigger');
    });

    // Level up → show trigger firing
    s.events.on('levelUp', () => {
      this._addLog('TRIGGER',
        `⚡ TRIGGER trg_level_up FIRED!\n\nBEFORE UPDATE OF xp ON players\nFOR EACH ROW EXECUTE:\n\n  WHILE NEW.xp >= (NEW.level²×100)\n    NEW.level := level + 1\n    NEW.max_hp := max_hp + 20\n    NEW.hp := NEW.max_hp\n  RETURN NEW;`, null, 'trigger');
    });

    // Player damaged → UPDATE with RLS
    s.events.on('playerDamaged', () => {
      this._addLog('RLS',
        `UPDATE players\n  SET hp = hp - damage\nWHERE player_id = auth.uid();\n\n🔒 RLS POLICY enforced:\n  USING (player_id = auth.uid())\n  -- You can ONLY modify\n  -- your own player row`, null, 'rls');
    });

    // Ability used → RPC call
    s.events.on('playerAbility', ({ ability }) => {
      this._addLog('RPC',
        `SELECT rpc_use_ability(\n  p_player := auth.uid(),\n  p_ability := '${ability.name}',\n  p_cost := ${ability.cost || 0}\n);\n\n📦 Server validates:\n  ✓ Enough mana/stamina?\n  ✓ Cooldown expired?\n  ✓ Target in range?`, null, 'storedProc');
    });

    // Zone change → JOIN query
    const origZC = s.zoneManager?.onZoneChange;
    if (s.zoneManager) {
      s.zoneManager.onZoneChange = (key, zone) => {
        origZC?.(key, zone);
        this._addLog('JOIN',
          `SELECT p.username, p.level,\n  p.hp, p.gold,\n  z.zone_name, z.enemy_types,\n  z.min_level\nFROM players p\nINNER JOIN zones z\n  ON p.current_zone = z.zone_id\nWHERE p.username = '${u}';`, null, 'join');
      };
    }

    // Save game → UPSERT
    s.events.on('gameSaved', () => {
      this._addLog('UPSERT',
        `INSERT INTO players\n  (username, class, level,\n   xp, gold, hp, position_x,\n   position_y)\nVALUES ('${u}', '${p.playerClass}',\n  ${p.level}, ${p.xp}, ${p.gold},\n  ${p.stats?.hp}, ${p.x.toFixed(0)},\n  ${p.y.toFixed(0)})\nON CONFLICT (username)\nDO UPDATE SET\n  level = EXCLUDED.level,\n  xp = EXCLUDED.xp,\n  gold = EXCLUDED.gold;`, null, 'upsert');
    });

    // Initial concept: show normalization
    s.time.delayedCall(3000, () => {
      this._addLog('SELECT',
        `-- Schema uses 3NF:\n-- items.type_id FK → item_types\n-- items.rarity_id FK → rarity\n--\n-- Why? Eliminates redundancy.\n-- "Sword" type stored ONCE in\n-- item_types, not repeated in\n-- every item row.`, null, 'normalization');
    });
  }

  // ─── SCHEMA PANEL (TAB) ──────────────────────────────────
  _cyclePanel() {
    if (this.currentPanel) {
      this.elements.forEach(e => e.destroy());
      this.elements = [];
      this.currentPanel = null;
      return;
    }
    this._showSchema();
  }

  _showSchema() {
    this.currentPanel = 'schema';
    const s = this.scene, cx = 640, cy = 360;

    const bg = s.add.rectangle(cx, cy, 800, 550, 0x08080f, 0.97)
      .setStrokeStyle(2, 0xff8800, 0.8).setDepth(400).setScrollFactor(0);
    const t = s.add.text(cx, 100, '🗄  DATABASE SCHEMA — 3rd Normal Form', {
      fontFamily: '"Press Start 2P"', fontSize: '10px', color: '#ff8800'
    }).setOrigin(0.5).setDepth(401).setScrollFactor(0);
    const cl = s.add.text(1010, 100, '[TAB] Close', {
      fontFamily: '"Press Start 2P"', fontSize: '6px', color: '#666'
    }).setOrigin(1, 0.5).setDepth(401).setScrollFactor(0);
    this.elements.push(bg, t, cl);

    const tables = [
      { n: 'players', pk: 'player_id UUID', fk: 'guild_id → guilds', cols: 'username UNIQUE, class, level, xp, hp, max_hp, mana, gold, position_x, position_y, current_zone, is_online', nf: '3NF', note: 'No partial or transitive dependencies. guild_id is a FK, not a repeated group.' },
      { n: 'item_types', pk: 'type_id SERIAL', fk: '—', cols: 'type_name (weapon | armor | potion | quest)', nf: '1NF', note: 'Lookup table — stores each type string ONCE. Items reference by FK.' },
      { n: 'items', pk: 'item_id UUID', fk: 'type_id → item_types, rarity_id → rarity', cols: 'name, attack_bonus, defense_bonus, sell_price, lore_text', nf: '3NF', note: 'type & rarity extracted into separate tables to eliminate transitive deps.' },
      { n: 'inventory', pk: 'inv_id UUID', fk: 'player_id → players, item_id → items', cols: 'quantity, equipped BOOL, slot', nf: '3NF', note: 'Junction table: resolves M:N between players ↔ items.' },
      { n: 'guilds', pk: 'guild_id UUID', fk: '—', cols: 'guild_name UNIQUE, guild_tag, level, gold_bank, max_members', nf: '3NF', note: 'Independent entity. Players reference via FK.' },
      { n: 'battle_log', pk: 'log_id UUID', fk: 'attacker_id → players, defender_id → players', cols: 'damage, skill_used, is_critical, timestamp, zone', nf: 'Audit', note: 'Append-only log. Supports aggregate queries (COUNT, AVG damage).' },
      { n: 'player_quests', pk: 'player_id + quest_id', fk: 'player_id → players, quest_id → quests', cols: 'status, progress JSONB, started_at, completed_at', nf: '3NF', note: 'Composite PK junction table for M:N players ↔ quests.' }
    ];

    tables.forEach((tb, i) => {
      const y = 128 + i * 56;
      const nm = s.add.text(260, y, `📋 ${tb.n}`, { fontFamily: '"Press Start 2P"', fontSize: '7px', color: '#ffaa44' }).setDepth(401).setScrollFactor(0);
      const pk = s.add.text(260, y + 12, `PK: ${tb.pk}  |  FK: ${tb.fk}`, { fontFamily: 'monospace', fontSize: '7px', color: '#88aacc' }).setDepth(401).setScrollFactor(0);
      const co = s.add.text(260, y + 24, tb.cols, { fontFamily: 'monospace', fontSize: '7px', color: '#55cc66', wordWrap: { width: 530 } }).setDepth(401).setScrollFactor(0);
      const nf = s.add.text(1010, y, tb.nf + ' ✓', { fontFamily: '"Press Start 2P"', fontSize: '6px', color: '#ffdd44' }).setOrigin(1, 0).setDepth(401).setScrollFactor(0);
      const nt = s.add.text(1010, y + 14, tb.note, { fontFamily: 'Inter', fontSize: '8px', color: '#777788', wordWrap: { width: 200 } }).setOrigin(1, 0).setDepth(401).setScrollFactor(0);
      this.elements.push(nm, pk, co, nf, nt);
    });

    const ft = s.add.text(cx, 530, '⚡ Triggers: trg_level_up (BEFORE UPDATE OF xp), trg_auto_equip (AFTER INSERT ON inventory)\n📦 RPCs: rpc_loot_drop(), rpc_start_battle(), rpc_join_guild() — server-side atomic functions\n🔒 RLS: USING (auth.uid() = player_id) on players, inventory, player_quests\n🔍 Indexes: idx_players_zone (current_zone), idx_inv_player (player_id), idx_battle_ts (timestamp)\n👁 Views: v_leaderboard (ORDER BY level DESC), v_guild_stats (JOIN + GROUP BY guild_id)', {
      fontFamily: 'Inter', fontSize: '8px', color: '#666677', align: 'center', lineSpacing: 3
    }).setOrigin(0.5).setDepth(401).setScrollFactor(0);
    this.elements.push(ft);
  }

  // ─── CONCEPTS PANEL (C key) ──────────────────────────────
  _toggleConcepts() {
    if (this.currentPanel === 'concepts') {
      this.elements.forEach(e => e.destroy());
      this.elements = [];
      this.currentPanel = null;
      return;
    }
    if (this.currentPanel) { this.elements.forEach(e => e.destroy()); this.elements = []; }
    this.currentPanel = 'concepts';
    const s = this.scene, cx = 640;

    const bg = s.add.rectangle(cx, 360, 800, 550, 0x08080f, 0.97)
      .setStrokeStyle(2, 0x44aaff, 0.8).setDepth(400).setScrollFactor(0);
    const t = s.add.text(cx, 100, '📚  DBMS CONCEPTS ENCYCLOPEDIA', {
      fontFamily: '"Press Start 2P"', fontSize: '10px', color: '#44aaff'
    }).setOrigin(0.5).setDepth(401).setScrollFactor(0);
    const counter = s.add.text(1010, 100, `${this.conceptsSeen.size}/${Object.keys(CONCEPTS).length} Discovered`, {
      fontFamily: '"Press Start 2P"', fontSize: '6px', color: '#44aaff'
    }).setOrigin(1, 0.5).setDepth(401).setScrollFactor(0);
    const cl = s.add.text(1010, 115, '[C] Close', {
      fontFamily: '"Press Start 2P"', fontSize: '5px', color: '#666'
    }).setOrigin(1, 0).setDepth(401).setScrollFactor(0);
    this.elements.push(bg, t, counter, cl);

    Object.entries(CONCEPTS).forEach(([key, c], i) => {
      const y = 130 + i * 40;
      const seen = this.conceptsSeen.has(key);
      const icon = seen ? '✅' : '🔒';

      const nm = s.add.text(260, y, `${icon}  ${c.title}`, {
        fontFamily: '"Press Start 2P"', fontSize: '7px', color: seen ? c.color : '#333344'
      }).setDepth(401).setScrollFactor(0);

      const d = s.add.text(262, y + 16, seen ? c.desc.replace('\n', ' ') : '[ Play the game to unlock this concept ]', {
        fontFamily: 'Inter', fontSize: '9px', color: seen ? '#bbbbbb' : '#333344',
        wordWrap: { width: 720 }
      }).setDepth(401).setScrollFactor(0);

      this.elements.push(nm, d);
    });
  }
}
