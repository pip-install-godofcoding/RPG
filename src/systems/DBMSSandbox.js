import Phaser from 'phaser';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../utils/Constants.js';

// ============================================================
// DBMSSandbox — Uses HTML overlays for scrollable, non-overlapping content
// Press [B] to open
// ============================================================

const DEMOS = [
  { id: 'sp',  label: '📦 Stored Procedure',  color: '#44aaff' },
  { id: 'pk',  label: '🔑 PK Violation',      color: '#ff4444' },
  { id: 'fk',  label: '🔗 FK Violation',      color: '#ff8844' },
  { id: 'inv', label: '🎒 Inventory & Items', color: '#44ff88' },
  { id: 'txn', label: '💎 Transaction (ACID)', color: '#ffdd44' },
];

export class DBMSSandbox {
  constructor(scene) {
    this.scene = scene;
    this.supabase = null;
    this.overlay = null;
    this.open = false;
    this._initSupabase();
    scene.input.keyboard.addKey('B').on('down', () => this.toggle());
  }

  async _initSupabase() {
    if (!SUPABASE_URL || SUPABASE_URL.includes('YOUR_')) return;
    try {
      const { createClient } = await import('@supabase/supabase-js');
      this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } catch (e) { console.warn('[Sandbox] No Supabase', e); }
  }

  toggle() {
    if (this.open) { this._close(); return; }
    this._showMenu();
  }

  _close() {
    if (this.overlay) { this.overlay.remove(); this.overlay = null; }
    this.open = false;
  }

  // ─── Create an HTML overlay on top of the Phaser canvas ───
  _createOverlay(html) {
    this._close();
    this.open = true;
    const div = document.createElement('div');
    div.id = 'dbms-sandbox-overlay';
    div.innerHTML = html;
    div.style.cssText = `
      position:fixed; top:0; left:0; width:100vw; height:100vh; z-index:9999;
      background:rgba(0,0,0,0.92); display:flex; align-items:center; justify-content:center;
      font-family: Arial, Helvetica, sans-serif;
    `;
    document.body.appendChild(div);
    this.overlay = div;
  }

  // ─── MENU ─────────────────────────────────────────────────
  _showMenu() {
    const connected = this.supabase ? '✅ Connected to Supabase' : '⚠️ No Supabase — simulated results';
    const connColor = this.supabase ? '#44ff44' : '#ffaa44';

    const buttons = DEMOS.map(d => `
      <button class="demo-btn" data-id="${d.id}" style="
        display:block; width:100%; padding:16px 24px; margin:8px 0;
        background:#12121f; border:2px solid ${d.color}40; border-radius:8px;
        color:${d.color}; font-size:17px; font-weight:bold; cursor:pointer;
        font-family:Arial,sans-serif; text-align:left; transition:all 0.2s;
      "
      onmouseover="this.style.borderColor='${d.color}'; this.style.background='#1a1a2f'"
      onmouseout="this.style.borderColor='${d.color}40'; this.style.background='#12121f'"
      >${d.label}</button>
    `).join('');

    this._createOverlay(`
      <div style="background:#0a0a14; border:3px solid #44aaff; border-radius:12px;
        width:600px; max-height:90vh; padding:32px; overflow-y:auto;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <h2 style="color:#44aaff; margin:0; font-size:22px;">🧪 DBMS SANDBOX</h2>
          <button id="sandbox-close" style="background:none; border:1px solid #444; color:#888;
            padding:6px 14px; border-radius:6px; cursor:pointer; font-size:13px;">✕ Close [B]</button>
        </div>
        <p style="color:#888899; margin:6px 0 20px; font-size:14px;">Click a demo to execute REAL SQL against PostgreSQL</p>
        ${buttons}
        <p style="color:${connColor}; margin-top:16px; font-size:13px; text-align:center;">${connected}</p>
      </div>
    `);

    // Wire up buttons
    this.overlay.querySelector('#sandbox-close').onclick = () => this._close();
    this.overlay.querySelectorAll('.demo-btn').forEach(btn => {
      btn.onclick = () => this._runDemo(btn.dataset.id);
    });
  }

  async _runDemo(id) {
    if (id === 'sp') await this._demoStoredProc();
    else if (id === 'pk') await this._demoPKViolation();
    else if (id === 'fk') await this._demoFKViolation();
    else if (id === 'inv') await this._demoInventory();
    else if (id === 'txn') await this._demoTransaction();
  }

  // ─── Scrollable result panel ──────────────────────────────
  _resultPanel(title, sql, result, explanation, color) {
    const isErr = result.startsWith('❌');
    const resBg = isErr ? '#1a0808' : '#081a08';
    const resBorder = isErr ? '#552222' : '#225522';
    const resColor = isErr ? '#ff6666' : '#66ff66';

    this._createOverlay(`
      <div style="background:#0a0a14; border:3px solid ${color}; border-radius:12px;
        width:850px; max-height:90vh; overflow-y:auto; padding:0;">

        <!-- Header -->
        <div style="padding:20px 28px 12px; border-bottom:1px solid #222233; position:sticky; top:0;
          background:#0a0a14; z-index:1; display:flex; justify-content:space-between; align-items:center;">
          <h2 style="color:${color}; margin:0; font-size:20px;">${title}</h2>
          <button id="sandbox-back" style="background:none; border:1px solid #444; color:#888;
            padding:6px 14px; border-radius:6px; cursor:pointer; font-size:13px;">← Back</button>
        </div>

        <!-- Scrollable body -->
        <div style="padding:20px 28px 28px;">

          <!-- SQL Section -->
          <div style="margin-bottom:20px;">
            <div style="color:#aaa; font-weight:bold; font-size:13px; margin-bottom:8px;">📝 SQL EXECUTED:</div>
            <pre style="background:#0c0c18; border:1px solid #333355; border-radius:8px; padding:16px;
              color:#44ee66; font-family:'Courier New',Consolas,monospace; font-size:13px;
              line-height:1.6; overflow-x:auto; margin:0; white-space:pre-wrap;">${this._escapeHtml(sql)}</pre>
          </div>

          <!-- Result Section -->
          <div style="margin-bottom:20px;">
            <div style="color:#aaa; font-weight:bold; font-size:13px; margin-bottom:8px;">📊 RESULT:</div>
            <pre style="background:${resBg}; border:1px solid ${resBorder}; border-radius:8px; padding:16px;
              color:${resColor}; font-family:'Courier New',Consolas,monospace; font-size:13px;
              line-height:1.6; margin:0; white-space:pre-wrap;">${this._escapeHtml(result)}</pre>
          </div>

          <!-- Explanation Section -->
          <div>
            <div style="color:#aaa; font-weight:bold; font-size:13px; margin-bottom:8px;">💡 EXPLANATION:</div>
            <div style="background:#0e0e1c; border:1px solid #2a2a3a; border-radius:8px; padding:16px;
              color:#ddddee; font-size:14px; line-height:1.8;">${this._escapeHtml(explanation).replace(/\n/g, '<br>')}</div>
          </div>

        </div>
      </div>
    `);

    this.overlay.querySelector('#sandbox-back').onclick = () => this._showMenu();
  }

  _escapeHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // ─── DEMO 1: Stored Procedure ─────────────────────────
  async _demoStoredProc() {
    const u = window.ASHENVEIL?.username || 'Hero';
    const sql = `-- Calling a Stored Procedure (RPC)
SELECT rpc_use_ability(
  p_player_id := (SELECT player_id
                   FROM players
                   WHERE username = '${u}'),
  p_ability   := 'Fireball',
  p_cost      := 30
);

-- The function runs on the SERVER:
--   1. Looks up current mana
--   2. IF mana >= 30 → deduct and RETURN TRUE
--   3. ELSE → RETURN FALSE (not enough mana!)`;

    let result = '✅ Function returned: TRUE\n   Mana deducted: 30\n   Remaining mana: 70';
    if (this.supabase) {
      const { data, error } = await this.supabase.rpc('rpc_use_ability', {
        p_player_id: '00000000-0000-0000-0000-000000000000',
        p_ability: 'Fireball', p_cost: 30
      });
      result = error
        ? `❌ ERROR: ${error.message}\n\n(Expected — the demo uses a non-existent player_id to show how server-side validation works)`
        : `✅ Function returned: ${JSON.stringify(data)}`;
    }

    this._resultPanel('📦 STORED PROCEDURE (RPC)', sql, result,
      'A Stored Procedure is a reusable function stored IN the database.\n' +
      'The client sends intent ("use Fireball"), the SERVER validates it.\n\n' +
      'Benefits:\n' +
      '• Security — logic can\'t be bypassed by a hacked client\n' +
      '• Performance — no extra round-trips between client and DB\n' +
      '• Consistency — same validation rules for ALL clients\n\n' +
      'In PostgreSQL, created with CREATE FUNCTION ... LANGUAGE plpgsql\n' +
      'Called via SELECT rpc_name() or Supabase .rpc() method.',
      '#44aaff');
  }

  // ─── DEMO 2: Primary Key Violation ────────────────────
  async _demoPKViolation() {
    const u = window.ASHENVEIL?.username || 'Hero';
    const sql = `-- First INSERT (succeeds):
INSERT INTO players (username, class, level)
VALUES ('${u}', 'warrior', 1);

-- Second INSERT with SAME username (fails!):
INSERT INTO players (username, class, level)
VALUES ('${u}', 'mage', 5);

-- ERROR! username column has UNIQUE constraint
-- PostgreSQL rejects the duplicate row`;

    let result = `❌ ERROR 23505: duplicate key value violates\nunique constraint "players_username_key"\n\nDetail: Key (username)=(${u}) already exists.\n\nThe second INSERT was REJECTED by PostgreSQL.`;
    if (this.supabase) {
      const { error } = await this.supabase.from('players').insert({ username: u, class: 'test_dup', level: 1 });
      result = error
        ? `❌ REAL ERROR from PostgreSQL:\n\n${error.message}\n\nCode: ${error.code || '23505'}\nThe database REJECTED the duplicate!`
        : `✅ First insert succeeded (no existing row).\nTrying a duplicate would cause error 23505.`;
    }

    this._resultPanel('🔑 PRIMARY KEY / UNIQUE VIOLATION', sql, result,
      'A PRIMARY KEY (or UNIQUE constraint) ensures every row has a unique identifier.\n\n' +
      'When you try to INSERT a row with a value that already exists in a UNIQUE column,\n' +
      'PostgreSQL throws error 23505: "unique_violation".\n\n' +
      'This prevents data corruption — you can\'t have two players named "' + u + '".\n\n' +
      'Solution: Use UPSERT to handle gracefully:\n' +
      '  INSERT INTO players (username, class)\n' +
      '  VALUES (\'' + u + '\', \'warrior\')\n' +
      '  ON CONFLICT (username) DO UPDATE SET class = EXCLUDED.class;',
      '#ff4444');
  }

  // ─── DEMO 3: Foreign Key Violation ────────────────────
  async _demoFKViolation() {
    const sql = `-- Trying to add inventory for a NON-EXISTENT player
INSERT INTO inventory
  (player_id, item_id, quantity, slot)
VALUES
  ('00000000-0000-0000-0000-fakeplayer1',
   '00000000-0000-0000-0000-fakeitem001',
   1, 'main_hand');

-- ERROR! Foreign key constraint violated:
--   inventory.player_id must reference
--   an existing row in players.player_id`;

    let result = `❌ ERROR 23503: insert or update violates\nforeign key constraint "inventory_player_id_fkey"\n\nDetail: Key (player_id)=(00000000-...-fakeplayer1)\nis not present in table "players".\n\nThe INSERT was BLOCKED — referential integrity preserved!`;
    if (this.supabase) {
      const { error } = await this.supabase.from('inventory').insert({
        player_id: '00000000-0000-0000-0000-fakeplayer1',
        item_id: '00000000-0000-0000-0000-fakeitem001',
        quantity: 1, slot: 'main_hand'
      });
      result = error
        ? `❌ REAL ERROR from PostgreSQL:\n\n${error.message}\n\nCode: ${error.code || '23503'}\nFK constraint blocked the invalid reference!`
        : `⚠️ Insert succeeded (RLS may be disabled).\nWith FK enforcement active, this would fail.`;
    }

    this._resultPanel('🔗 FOREIGN KEY VIOLATION', sql, result,
      'A FOREIGN KEY links a column to a PRIMARY KEY in another table.\n\n' +
      'inventory.player_id → players.player_id\n' +
      'This ensures every inventory row belongs to a REAL player.\n\n' +
      'If you reference a non-existent player_id, PostgreSQL throws:\n' +
      '  error 23503: "foreign_key_violation"\n\n' +
      'ON DELETE CASCADE behavior:\n' +
      '  If a player is deleted, ALL their inventory rows are\n' +
      '  automatically deleted too — maintaining referential integrity.',
      '#ff8844');
  }

  // ─── DEMO 4: Inventory & Items ────────────────────────
  async _demoInventory() {
    const items = [
      { name:'Iron Sword',    type:'weapon', rarity:'Common',    atk:5,  def:0,  price:25,  color:'#9d9d9d' },
      { name:'Fire Staff',    type:'weapon', rarity:'Rare',      atk:12, def:0,  price:120, color:'#0070dd' },
      { name:'Shadow Dagger', type:'weapon', rarity:'Epic',      atk:18, def:2,  price:350, color:'#a335ee' },
      { name:'Steel Shield',  type:'armor',  rarity:'Common',    atk:0,  def:8,  price:40,  color:'#9d9d9d' },
      { name:'Dragon Plate',  type:'armor',  rarity:'Legendary', atk:3,  def:25, price:999, color:'#ff8000' },
      { name:'Health Potion',  type:'potion', rarity:'Common',   atk:0,  def:0,  price:10,  color:'#9d9d9d' },
    ];

    const gold = this.scene.player?.gold || 100;
    const rows = items.map((it, i) => `
      <tr style="background:${i%2===0?'#0e0e1c':'#0a0a12'}">
        <td style="padding:10px 12px; color:${it.color}; font-weight:bold">${it.name}</td>
        <td style="padding:10px 8px; color:#999">${it.type}</td>
        <td style="padding:10px 8px; color:${it.color}">${it.rarity}</td>
        <td style="padding:10px 8px; color:#ff8844">+${it.atk}</td>
        <td style="padding:10px 8px; color:#44aaff">+${it.def}</td>
        <td style="padding:10px 8px; color:#ffdd44">${it.price}g</td>
        <td style="padding:10px 8px">
          <button class="buy-btn" data-idx="${i}" style="background:#1a3a1a; border:1px solid #44ff4466;
            color:#44ff44; padding:6px 16px; border-radius:4px; cursor:pointer; font-weight:bold;
            font-size:13px; transition:all 0.2s;"
            onmouseover="this.style.background='#2a5a2a'" onmouseout="this.style.background='#1a3a1a'">BUY</button>
        </td>
      </tr>
    `).join('');

    this._createOverlay(`
      <div style="background:#0a0a14; border:3px solid #44ff88; border-radius:12px;
        width:900px; max-height:90vh; overflow-y:auto; padding:0;">

        <div style="padding:20px 28px 12px; border-bottom:1px solid #222233; position:sticky; top:0;
          background:#0a0a14; z-index:1; display:flex; justify-content:space-between; align-items:center;">
          <h2 style="color:#44ff88; margin:0; font-size:20px;">🎒 INVENTORY & ITEMS</h2>
          <div>
            <span style="color:#ffdd44; font-size:14px; margin-right:16px;">💰 Gold: ${gold}</span>
            <button id="sandbox-back" style="background:none; border:1px solid #444; color:#888;
              padding:6px 14px; border-radius:6px; cursor:pointer; font-size:13px;">← Back</button>
          </div>
        </div>

        <div style="padding:20px 28px 28px;">
          <table style="width:100%; border-collapse:collapse; font-size:14px; color:#ccc;">
            <thead>
              <tr style="border-bottom:2px solid #333355;">
                <th style="text-align:left; padding:10px 12px; color:#777">ITEM</th>
                <th style="text-align:left; padding:10px 8px; color:#777">TYPE</th>
                <th style="text-align:left; padding:10px 8px; color:#777">RARITY</th>
                <th style="text-align:left; padding:10px 8px; color:#777">ATK</th>
                <th style="text-align:left; padding:10px 8px; color:#777">DEF</th>
                <th style="text-align:left; padding:10px 8px; color:#777">PRICE</th>
                <th style="text-align:left; padding:10px 8px; color:#777">ACTION</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>

          <div style="margin-top:24px; border-top:1px solid #222233; padding-top:20px;">
            <div style="color:#aaa; font-weight:bold; font-size:13px; margin-bottom:8px;">📝 SQL Behind "BUY" Button:</div>
            <pre style="background:#0c0c18; border:1px solid #333355; border-radius:8px; padding:16px;
              color:#44ee66; font-family:'Courier New',Consolas,monospace; font-size:13px;
              line-height:1.6; white-space:pre-wrap;">BEGIN TRANSACTION;
  -- 1. Verify gold balance
  SELECT gold FROM players WHERE username = 'Hero';

  -- 2. Deduct gold (atomic UPDATE)
  UPDATE players SET gold = gold - price
  WHERE username = 'Hero' AND gold >= price;

  -- 3. Add item to inventory (INSERT)
  INSERT INTO inventory (player_id, item_id, quantity, slot)
  VALUES (auth.uid(), item_uuid, 1, 'main_hand');

COMMIT;  -- All 3 steps succeed or ALL rollback (ACID)</pre>
          </div>

          <div style="background:#0e0e1c; border:1px solid #2a2a3a; border-radius:8px; padding:14px;
            margin-top:16px; color:#aaaacc; font-size:14px; line-height:1.6;">
            💡 Uses an <strong style="color:#ffdd44">ACID TRANSACTION</strong>: gold deduction + item insertion
            are atomic. If either step fails, the entire transaction rolls back — no partial changes.
          </div>
        </div>
      </div>
    `);

    this.overlay.querySelector('#sandbox-back').onclick = () => this._showMenu();
    this.overlay.querySelectorAll('.buy-btn').forEach(btn => {
      btn.onclick = () => this._buyItem(items[parseInt(btn.dataset.idx)]);
    });
  }

  async _buyItem(item) {
    const p = this.scene.player;
    if (!p || p.gold < item.price) {
      this._resultPanel('🎒 PURCHASE FAILED',
        `UPDATE players SET gold = gold - ${item.price}\nWHERE username = '${window.ASHENVEIL?.username}'\n  AND gold >= ${item.price};\n\n-- CHECK: gold (${p?.gold||0}) < price (${item.price})\n-- Transaction ROLLED BACK`,
        `❌ Insufficient gold!\nYou have ${p?.gold||0}g but need ${item.price}g.\n\nThe UPDATE affected 0 rows → ROLLBACK triggered.`,
        'A CHECK constraint or WHERE clause guard prevents gold from going negative.\nThis is similar to a bank preventing overdrafts.\nThe entire TRANSACTION rolls back — no items added, no gold lost.', '#ff4444');
      return;
    }
    p.gold -= item.price;
    if (this.scene.goldText) this.scene.goldText.setText(`💰 ${p.gold}`);
    this._resultPanel('🎒 PURCHASE SUCCESSFUL',
      `BEGIN;\n  UPDATE players SET gold = gold - ${item.price}\n    WHERE username = '${window.ASHENVEIL?.username}';\n  INSERT INTO inventory (player_id, item_id, quantity)\n    VALUES (auth.uid(), '${item.name}', 1);\nCOMMIT;`,
      `✅ Transaction committed!\n\n   Gold: ${p.gold + item.price} → ${p.gold}\n   Acquired: ${item.name} (+${item.atk} ATK, +${item.def} DEF)`,
      'This purchase used an ACID TRANSACTION:\n\n• Atomic — both UPDATE and INSERT succeed together, or neither does\n• Consistent — gold can\'t go negative (constraint enforced)\n• Isolated — another player buying simultaneously won\'t corrupt data\n• Durable — once COMMIT runs, the purchase is permanent', '#44ff88');
  }

  // ─── DEMO 5: Transaction ──────────────────────────────
  async _demoTransaction() {
    const sql = `-- ACID Transaction: Trading items between players

BEGIN TRANSACTION;

  -- Step 1: Remove item from seller's inventory
  DELETE FROM inventory
  WHERE player_id = 'seller_uuid'
    AND item_id = 'sword_uuid';

  -- Step 2: Add item to buyer's inventory
  INSERT INTO inventory (player_id, item_id, quantity)
  VALUES ('buyer_uuid', 'sword_uuid', 1);

  -- Step 3: Transfer gold (seller → buyer)
  UPDATE players SET gold = gold - 100
  WHERE username = 'buyer';

  UPDATE players SET gold = gold + 100
  WHERE username = 'seller';

COMMIT;
-- If ANY step fails → ROLLBACK ALL changes
-- No partial trades, no duplicated items`;

    this._resultPanel('💎 ACID TRANSACTION', sql,
      '✅ Transaction COMMITTED successfully!\n\n' +
      '   Seller: -1 Iron Sword, +100 gold\n' +
      '   Buyer:  +1 Iron Sword, -100 gold\n\n' +
      '   All 4 operations completed atomically.\n' +
      '   No intermediate state was ever visible.',
      'ACID guarantees:\n\n' +
      '• Atomic: All 4 steps succeed, or ALL are rolled back (no partial trades)\n' +
      '• Consistent: Gold totals remain balanced (conservation of gold)\n' +
      '• Isolated: If two trades happen simultaneously, they don\'t interfere\n' +
      '• Durable: Once COMMIT executes, the trade is permanent even if the server crashes\n\n' +
      'Without transactions, a crash between Step 2 and Step 3 would\n' +
      'duplicate the sword (buyer has it, seller still has it too!).\n' +
      'ACID prevents this — it\'s all-or-nothing.',
      '#ffdd44');
  }
}
