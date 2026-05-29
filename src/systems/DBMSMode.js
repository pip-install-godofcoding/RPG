import Phaser from 'phaser';

// ============================================================
// DBMSMode — Educational SQL overlay with CLEAR query display
// Teaches: Triggers, Stored Procedures, JOINs, Normalization,
//          Indexes, RLS, ACID, Views, FKs, Aggregates, Subqueries
// ============================================================

const CONCEPTS = {
  trigger:     { title: '⚡ TRIGGER',              color: '#ff6644', desc: 'Automatically executes a function BEFORE/AFTER INSERT, UPDATE, or DELETE.\nUsed here: trg_level_up fires when XP changes, auto-leveling the player.', hint: 'Gain enough XP to Level Up.' },
  storedProc:  { title: '📦 STORED PROCEDURE',     color: '#44aaff', desc: 'A reusable server-side function called via SELECT rpc_name().\nKeeps business logic in the DB — clients send intent, server validates.', hint: 'Use an Ability in combat.' },
  join:        { title: '🔗 JOIN',                  color: '#44ff88', desc: 'Combines rows from 2+ tables using a shared key (FK→PK).\nINNER JOIN = only matching rows. LEFT JOIN = all from left + matches.', hint: 'Open the Guild or Marketplace menus.' },
  normalization:{ title: '📐 NORMALIZATION (3NF)',  color: '#ffaa44', desc: '1NF: No repeating groups. 2NF: No partial dependencies.\n3NF: No transitive dependencies. Each non-key depends ONLY on the PK.', hint: 'Open the Marketplace.' },
  index:       { title: '🔍 INDEX',                color: '#aa88ff', desc: 'B-tree structure that speeds up WHERE/JOIN lookups.\nTrade-off: faster SELECT, slower INSERT/UPDATE (must update index too).', hint: 'Travel between different map zones.' },
  rls:         { title: '🔒 ROW LEVEL SECURITY',   color: '#ff4488', desc: 'PostgreSQL policy that restricts rows per user.\nPolicy: USING (auth.uid() = player_id) — you can only see YOUR data.', hint: 'Automatically unlocked when starting the game.' },
  transaction: { title: '💎 ACID TRANSACTION',      color: '#ffdd44', desc: 'Atomic: all-or-nothing. Consistent: valid state before & after.\nIsolated: concurrent transactions don\'t interfere. Durable: committed = permanent.', hint: 'Buy an item in the Shop or Marketplace.' },
  view:        { title: '👁 VIEW',                  color: '#88ddff', desc: 'A virtual table from a stored SELECT query.\nv_leaderboard = SELECT username, level, xp FROM players ORDER BY level DESC.', hint: 'Check the PvP leaderboard.' },
  fk:          { title: '🔑 FOREIGN KEY',           color: '#ff8844', desc: 'References a PK in another table → enforces referential integrity.\nON DELETE CASCADE: deleting a player auto-deletes their inventory rows.', hint: 'Acquire or progress a quest.' },
  aggregate:   { title: '📊 AGGREGATE FUNCTIONS',   color: '#88ff88', desc: 'COUNT(*), SUM(gold), AVG(level), MAX(xp), MIN(hp).\nUsed with GROUP BY to compute stats per group (per guild, per zone).', hint: 'Take damage or heal during gameplay.' },
  subquery:    { title: '🔄 SUBQUERY',              color: '#dd88ff', desc: 'A SELECT nested inside another SELECT, WHERE, or FROM.\nExample: WHERE attack > (SELECT AVG(attack) FROM items) — find above-average items.', hint: 'Accept a quest or start a PvP challenge.' },
  upsert:      { title: '⬆ UPSERT',                color: '#ffcc44', desc: 'INSERT ... ON CONFLICT (pk) DO UPDATE SET ...\nAtomically creates a new row OR updates existing. Prevents duplicate key errors.', hint: 'Automatically unlocked by walking around.' }
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
    this.expandedModal = null;
    this.supabase = null;

    if (!this.active) return;

    this._createQueryPanel();
    this._createBadge();
    this._hookGameEvents();

    scene.input.keyboard.addKey('TAB').on('down', () => this._cyclePanel());
    scene.input.keyboard.addKey('C').on('down', () => this.toggleConcepts());

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

  async _executeReal(sql, _params) {
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
      fontFamily: 'Inter, sans-serif', fontSize: '10px', color: '#ff8800'
    }).setDepth(296).setScrollFactor(0);

    this.panelHint = s.add.text(310, 268, 'LIVE', {
      fontFamily: 'Inter, sans-serif', fontSize: '9px', color: '#44ff44'
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
    s.add.text(640, 12, '🗄 DBMS MODE  |  [TAB] Schema  |  [C] Concepts  |  [B] Sandbox  |  [J] Quests', {
      fontFamily: 'Inter, sans-serif', fontSize: '7px', color: '#ff8800'
    }).setOrigin(0.5).setDepth(301).setScrollFactor(0);
  }

  // ─── LOG A QUERY (with concept tag, syntax coloring) ─────
  _addLog(type, sql, _color, concept) {
    const s = this.scene;
    const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // Clear old entries if too many
    if (this.queryEntries.length >= 3) {
      const old = this.queryEntries.shift();
      old.forEach(e => e.destroy());
    }

    // Reposition existing entries up
    const entryH = 95;
    this.queryEntries.forEach(entry => {
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
      .setDepth(296).setScrollFactor(0).setInteractive({ useHandCursor: true });
    entryBg.on('pointerover', () => {
      entryBg.setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(badgeColor).color, 1);
    });
    entryBg.on('pointerout', () => {
      entryBg.setStrokeStyle(1, Phaser.Display.Color.HexStringToColor(badgeColor).color, 0.4);
    });
    entryBg.on('pointerdown', () => this._showExpanded(type, sql, badgeColor, concept, time));
    els.push(entryBg);

    // Type + timestamp header
    const header = s.add.text(22, baseY - 38, `[${type}]  ${time}`, {
      fontFamily: 'Inter, sans-serif', fontSize: '10px', color: badgeColor
    }).setDepth(297).setScrollFactor(0);
    els.push(header);

    // Concept tag if applicable
    if (concept && CONCEPTS[concept]) {
      const tag = s.add.text(320, baseY - 38, CONCEPTS[concept].title, {
        fontFamily: 'Inter, sans-serif', fontSize: '7px', color: CONCEPTS[concept].color
      }).setOrigin(1, 0).setDepth(297).setScrollFactor(0);
      els.push(tag);
    }

    // SQL text (the main content — large and readable)
    const sqlText = s.add.text(26, baseY - 24, sql, {
      fontFamily: '"Courier New", monospace', fontSize: '13px', color: '#44ee66',
      wordWrap: { width: 295 }, lineSpacing: 2, maxLines: 4
    }).setDepth(297).setScrollFactor(0);
    els.push(sqlText);

    // Result indicator
    const isReal = this.supabase !== null;
    const indicator = s.add.text(24, baseY + 32, isReal ? '✅ EXECUTED' : '📝 SIMULATED', {
      fontFamily: 'Inter, sans-serif', fontSize: '7px', color: isReal ? '#44ff44' : '#666677'
    }).setDepth(297).setScrollFactor(0);
    const expandHint = s.add.text(320, baseY + 32, '▸ expand', {
      fontFamily: '"Courier New", monospace', fontSize: '13px', color: '#445566'
    }).setOrigin(1, 0).setDepth(297).setScrollFactor(0);
    els.push(indicator, expandHint);

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
    const bg = s.add.rectangle(640, 675, 750, 75, 0x0a0a1a, 0.96)
      .setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(c.color).color, 0.9)
      .setDepth(350).setScrollFactor(0);
    const icon = s.add.text(280, 650, '🆕 CONCEPT UNLOCKED:', {
      fontFamily: 'Inter, sans-serif', fontSize: '15px', color: '#ffdd44'
    }).setDepth(351).setScrollFactor(0);
    const title = s.add.text(500, 650, c.title, {
      fontFamily: 'Inter, sans-serif', fontSize: '18px', color: c.color
    }).setDepth(351).setScrollFactor(0);
    const desc = s.add.text(280, 675, c.desc.replace('\n', ' | '), {
      fontFamily: 'Inter', fontSize: '14px', color: '#cccccc',
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

  // ─── SCHEMA PANEL (TAB) — HTML overlay, hides game map ───
  _cyclePanel() {
    if (this.currentPanel) {
      if (this.schemaOverlay) { this.schemaOverlay.remove(); this.schemaOverlay = null; }
      this.elements.forEach(e => e.destroy());
      this.elements = [];
      this.currentPanel = null;
      return;
    }
    this._showSchema();
  }

  _showSchema() {
    this.currentPanel = 'schema';

    const tables = [
      { n:'players',       pk:'player_id UUID (PK)',      fk:'guild_id → guilds.guild_id',              cols:'username, class, level, xp, hp, max_hp, mana, gold, position_x, position_y, current_zone, is_online', nf:'3NF', nfColor:'#44ff44', note:'No partial or transitive dependencies. guild_id references guilds table via FK — guild data is never duplicated in player rows.' },
      { n:'item_types',    pk:'type_id SERIAL (PK)',      fk:'None',                                     cols:'type_name (weapon | armor | potion | quest)',                                                          nf:'1NF', nfColor:'#88ddff', note:'Lookup table with atomic values only. Each type stored ONCE, items reference by FK → eliminates repeating groups.' },
      { n:'items',         pk:'item_id UUID (PK)',         fk:'type_id → item_types, rarity_id → rarity', cols:'name, attack_bonus, defense_bonus, sell_price, lore_text',                                             nf:'3NF', nfColor:'#44ff44', note:'Type and rarity extracted into separate tables. Removes transitive dependency: item → type_name was dependent on type_id, not item_id.' },
      { n:'inventory',     pk:'inv_id UUID (PK)',          fk:'player_id → players, item_id → items',     cols:'quantity, equipped BOOL, slot',                                                                        nf:'3NF', nfColor:'#44ff44', note:'Junction table resolving M:N relationship between players and items. Each row links one player to one item.' },
      { n:'guilds',        pk:'guild_id UUID (PK)',        fk:'None',                                     cols:'guild_name, guild_tag, level, gold_bank, max_members',                                                nf:'3NF', nfColor:'#44ff44', note:'Independent entity. Players reference guilds via FK — guild info stored once, not repeated per player.' },
      { n:'battle_log',    pk:'log_id UUID (PK)',          fk:'attacker_id → players',                    cols:'defender_id, damage, skill_used, is_critical, timestamp, zone',                                        nf:'Audit', nfColor:'#ffaa44', note:'Append-only audit log. Supports aggregate queries: COUNT battles, AVG damage, combat analytics.' },
      { n:'player_quests', pk:'(player_id, quest_id) Composite', fk:'player_id → players, quest_id → quests', cols:'status, progress JSONB, started_at, completed_at',                                                nf:'3NF', nfColor:'#44ff44', note:'Composite PK junction table. Resolves M:N between players and quests. No partial dependencies — status depends on the full composite key.' }
    ];

    const tableRows = tables.map((t, i) => `
      <tr style="background:${i%2===0?'#0e0e1c':'#0a0a12'}; border-bottom:1px solid #1a1a2a;">
        <td style="padding:12px 16px; vertical-align:top;">
          <div style="color:#ffcc44; font-weight:bold; font-size:16px; margin-bottom:4px;">${t.n}</div>
          <div style="color:#44dd66; font-size:12px; margin-top:6px;">${t.cols}</div>
        </td>
        <td style="padding:12px; color:#77bbff; font-size:13px; vertical-align:top; font-family:'Courier New',monospace;">${t.pk}</td>
        <td style="padding:12px; color:#ffaa66; font-size:13px; vertical-align:top; font-family:'Courier New',monospace;">${t.fk}</td>
        <td style="padding:12px; text-align:center; vertical-align:top;">
          <span style="background:${t.nfColor}22; color:${t.nfColor}; border:1px solid ${t.nfColor}44;
            padding:3px 10px; border-radius:4px; font-weight:bold; font-size:13px;">${t.nf}</span>
        </td>
        <td style="padding:12px; color:#aaaacc; font-size:13px; vertical-align:top; max-width:280px;">${t.note}</td>
      </tr>
    `).join('');

    const div = document.createElement('div');
    div.id = 'schema-overlay';
    div.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:9999;background:#0a0a14;font-family:Arial,Helvetica,sans-serif;overflow-y:auto;';
    div.innerHTML = `
      <div style="max-width:1200px; margin:0 auto; padding:24px 32px;">

        <!-- Header -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;
          padding-bottom:12px; border-bottom:3px solid #ff8800;">
          <h1 style="color:#ff9900; margin:0; font-size:24px;">📐 DATABASE SCHEMA — 3rd Normal Form</h1>
          <button id="schema-close" style="background:none; border:2px solid #ff880066; color:#ff8800;
            padding:8px 20px; border-radius:6px; cursor:pointer; font-size:14px; font-weight:bold;
            transition:all 0.2s;"
            onmouseover="this.style.background='#ff880022'" onmouseout="this.style.background='none'">[TAB] Close</button>
        </div>

        <!-- WHY 3NF Section -->
        <div style="background:#0e1a0e; border:2px solid #44ff4444; border-radius:10px; padding:20px 24px;
          margin-bottom:24px;">
          <h3 style="color:#44ff44; margin:0 0 12px; font-size:17px;">📐 Why is 3NF (Third Normal Form) used here?</h3>
          <div style="color:#ccddcc; font-size:14px; line-height:1.8;">
            <p style="margin:0 0 10px;">In this RPG database, <strong style="color:#ffcc44;">3NF eliminates data redundancy and prevents anomalies</strong>. Here's the progression:</p>
            <table style="width:100%; border-collapse:collapse; margin:8px 0;">
              <tr style="border-bottom:1px solid #2a3a2a;">
                <td style="padding:8px 12px; color:#88ddff; font-weight:bold; width:80px;">1NF</td>
                <td style="padding:8px; color:#ccc;">All columns have <strong>atomic values</strong> — no arrays or repeating groups. Each cell holds one value.</td>
                <td style="padding:8px; color:#44ee66; font-size:13px;">✓ item_types stores one type per row, not "weapon,armor"</td>
              </tr>
              <tr style="border-bottom:1px solid #2a3a2a;">
                <td style="padding:8px 12px; color:#88ddff; font-weight:bold;">2NF</td>
                <td style="padding:8px; color:#ccc;">No <strong>partial dependencies</strong> — every non-key column depends on the <em>entire</em> primary key.</td>
                <td style="padding:8px; color:#44ee66; font-size:13px;">✓ player_quests: status depends on (player_id + quest_id), not just one</td>
              </tr>
              <tr>
                <td style="padding:8px 12px; color:#88ddff; font-weight:bold;">3NF</td>
                <td style="padding:8px; color:#ccc;">No <strong>transitive dependencies</strong> — non-key columns don't depend on other non-key columns.</td>
                <td style="padding:8px; color:#44ee66; font-size:13px;">✓ items: type_name moved to item_types (was dependent on type_id, not item_id)</td>
              </tr>
            </table>
            <p style="margin:10px 0 0; color:#aabb99; font-size:13px;">
              <strong>Without 3NF:</strong> If "weapon" was stored as text in every item row, renaming it to "melee_weapon" would require updating thousands of rows (UPDATE anomaly). 
              With 3NF, you update ONE row in item_types. Similarly, deleting all swords wouldn't lose the "weapon" category (DELETE anomaly prevention).
            </p>
          </div>
        </div>

        <!-- Schema Table -->
        <table style="width:100%; border-collapse:collapse; font-size:14px; margin-bottom:20px;">
          <thead>
            <tr style="background:#12121f; border-bottom:2px solid #333355;">
              <th style="text-align:left; padding:12px 16px; color:#888; font-size:13px;">TABLE & COLUMNS</th>
              <th style="text-align:left; padding:12px; color:#888; font-size:13px;">PRIMARY KEY</th>
              <th style="text-align:left; padding:12px; color:#888; font-size:13px;">FOREIGN KEYS</th>
              <th style="text-align:center; padding:12px; color:#888; font-size:13px;">NF</th>
              <th style="text-align:left; padding:12px; color:#888; font-size:13px;">WHY THIS DESIGN</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>

        <!-- Footer: Triggers, RLS, Indexes, Views -->
        <div style="background:#0c0c18; border:1px solid #2a2a3a; border-radius:8px; padding:16px 20px;
          display:grid; grid-template-columns:1fr 1fr; gap:12px; font-size:13px; color:#8888aa;">
          <div><strong style="color:#ff6644;">⚡ Triggers:</strong> trg_level_up (BEFORE UPDATE xp) — auto levels up player</div>
          <div><strong style="color:#ff4488;">🔒 RLS:</strong> auth.uid() = player_id — players can only modify own row</div>
          <div><strong style="color:#aa88ff;">🔍 Indexes:</strong> idx_players_zone, idx_inventory_player, idx_battle_timestamp</div>
          <div><strong style="color:#88ddff;">👁 Views:</strong> v_leaderboard (top 50 players), v_guild_stats (aggregated)</div>
        </div>

      </div>
    `;
    document.body.appendChild(div);
    this.schemaOverlay = div;

    div.querySelector('#schema-close').onclick = () => this._cyclePanel();
  }

  // ─── EXPANDED SQL VIEW (click on entry) ─────────────────
  _showExpanded(type, sql, color, concept, time) {
    if (this.expandedModal) {
      this.expandedModal.forEach(e => e.destroy());
      this.expandedModal = null;
      return;
    }
    const s = this.scene;
    const cx = 640, cy = 360;
    const els = [];

    const dim = s.add.rectangle(cx, cy, 1280, 720, 0x000000, 0.75)
      .setDepth(500).setScrollFactor(0).setInteractive();
    dim.on('pointerdown', () => {
      els.forEach(e => e.destroy());
      this.expandedModal = null;
    });
    els.push(dim);

    const colorInt = Phaser.Display.Color.HexStringToColor(color).color;
    const modal = s.add.rectangle(cx, cy, 740, 480, 0x07070e, 0.98)
      .setStrokeStyle(2, colorInt, 1).setDepth(501).setScrollFactor(0);
    els.push(modal);

    const headerTxt = s.add.text(cx, cy - 215, `[${type}]  ${time}`, {
      fontFamily: 'Inter, sans-serif', fontSize: '13px', color
    }).setOrigin(0.5, 0).setDepth(502).setScrollFactor(0);
    els.push(headerTxt);

    const sqlTxt = s.add.text(cx - 340, cy - 185, sql, {
      fontFamily: '"Courier New", monospace', fontSize: '14px', color: '#55ff77',
      wordWrap: { width: 680 }, lineSpacing: 5
    }).setDepth(502).setScrollFactor(0);
    els.push(sqlTxt);

    if (concept && CONCEPTS[concept]) {
      const c = CONCEPTS[concept];
      const divider = s.add.rectangle(cx, cy + 130, 680, 1, 0x333355, 1).setDepth(502).setScrollFactor(0);
      const cTitle = s.add.text(cx, cy + 142, c.title, {
        fontFamily: 'Inter, sans-serif', fontSize: '10px', color: c.color
      }).setOrigin(0.5, 0).setDepth(502).setScrollFactor(0);
      const cDesc = s.add.text(cx, cy + 162, c.desc.replace('\n', ' | '), {
        fontFamily: '"Courier New", monospace', fontSize: '16px', color: '#aaaacc',
        wordWrap: { width: 680 }, align: 'center'
      }).setOrigin(0.5, 0).setDepth(502).setScrollFactor(0);
      els.push(divider, cTitle, cDesc);
    }

    const closeTxt = s.add.text(cx, cy + 215, '[ CLICK ANYWHERE TO CLOSE ]', {
      fontFamily: 'Inter, sans-serif', fontSize: '9px', color: '#333355'
    }).setOrigin(0.5, 1).setDepth(502).setScrollFactor(0);
    els.push(closeTxt);

    this.expandedModal = els;
  }

  // ─── CONCEPTS PANEL (C key) ──────────────────────────────
  toggleConcepts() {
    if (this.currentPanel === 'concepts') {
      if (this._conceptsEl) { this._conceptsEl.remove(); this._conceptsEl = null; }
      this.currentPanel = null;
      return;
    }
    // Clean up any other active phaser panels (Schema etc)
    if (this.currentPanel && this.elements) { 
      this.elements.forEach(e => e.destroy()); 
      this.elements = []; 
    }
    this.currentPanel = 'concepts';

    const itemsHTML = Object.entries(CONCEPTS).map(([key, c]) => {
      const seen = this.conceptsSeen.has(key);
      const icon = seen ? '✅' : '🔒';
      const color = seen ? c.color : '#555566';
      const descColor = seen ? '#cccccc' : '#555566';
      const desc = seen ? c.desc.replace(/\n/g, '<br>') : `[ Locked ] <br><span style="color:#4466aa; font-style:italic;">Hint: ${c.hint}</span>`;
      return `
        <div style="margin-bottom:20px; padding-bottom:16px; border-bottom:1px solid rgba(255,255,255,0.05);">
          <div style="font-size:13px; font-weight:800; color:${color}; margin-bottom:6px; letter-spacing:1px; display:flex; align-items:center; gap:8px;">
            <span style="font-size:16px;">${icon}</span> ${c.title}
          </div>
          <div style="font-size:13px; color:${descColor}; line-height:1.5; padding-left:24px;">
            ${desc}
          </div>
        </div>
      `;
    }).join('');

    const html = `
      <div id="dbms-concepts-overlay" style="
        position:fixed; inset:0; display:flex; align-items:center; justify-content:center;
        z-index:9995; background:rgba(0,0,0,0.7); backdrop-filter:blur(3px);
        font-family:'Inter',sans-serif; pointer-events:auto;">
        
        <div style="background:linear-gradient(145deg,#0a0a0f,#1a1a2e); 
          border:2px solid #44aaff; border-radius:12px; padding:24px;
          width:min(700px, 90vw); height:70vh; display:flex; flex-direction:column;
          box-shadow:0 0 40px rgba(68,170,255,0.2);">
          
          <!-- Header -->
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:24px; flex-shrink:0;">
            <div>
              <div style="font-size:20px; font-weight:900; color:#44aaff; letter-spacing:2px; display:flex; align-items:center; gap:10px;">
                <span style="font-size:24px;">📚</span> DBMS CONCEPTS ENCYCLOPEDIA
              </div>
              <div style="font-size:12px; color:#888; margin-top:4px; margin-left:34px;">
                Learn SQL concepts as you encounter them in the world
              </div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:14px; font-weight:700; color:#44aaff; margin-bottom:6px;">
                ${this.conceptsSeen.size} / ${Object.keys(CONCEPTS).length} Discovered
              </div>
              <button id="concepts-close-btn" style="
                background:rgba(68,170,255,0.1); border:1px solid #44aaff; border-radius:6px;
                padding:6px 16px; color:#44aaff; font-size:12px; font-weight:bold; cursor:pointer;
                transition:all 0.15s;"
                onmouseover="this.style.background='rgba(68,170,255,0.3)'"
                onmouseout="this.style.background='rgba(68,170,255,0.1)'">
                ✕ Close [C]
              </button>
            </div>
          </div>

          <!-- Scrollable Content -->
          <div style="flex:1; overflow-y:auto; padding-right:16px; scrollbar-width:thin; scrollbar-color:#44aaff #1a1a2e;">
            ${itemsHTML}
          </div>
        </div>
      </div>
    `;

    this._conceptsEl = document.createElement('div');
    this._conceptsEl.innerHTML = html;
    document.body.appendChild(this._conceptsEl);

    document.getElementById('concepts-close-btn').onclick = () => this.toggleConcepts();
  }
}
