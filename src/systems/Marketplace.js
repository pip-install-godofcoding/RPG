// ============================================================
// Marketplace — NPC shop with live SQL display
// Open: Interact [E] with Merchant Veth, or press [M]
// ============================================================
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../utils/Constants.js';

const RARITY_COLOR = { common: '#9d9d9d', rare: '#0070dd', epic: '#a335ee', legendary: '#ff8000' };

const CATALOG = [
  { id: 'iron_sword',    name: '⚔ Iron Sword',       type: 'weapon', rarity: 'common',    atk: 5,  def: 0,  heal: 0,   mana: 0,   price: 50,  lore: 'A reliable iron blade.' },
  { id: 'wood_shield',   name: '🛡 Wooden Shield',    type: 'armor',  rarity: 'common',    atk: 0,  def: 4,  heal: 0,   mana: 0,   price: 35,  lore: 'Basic but sturdy.' },
  { id: 'hp_potion',     name: '🧪 Health Potion',    type: 'potion', rarity: 'common',    atk: 0,  def: 0,  heal: 50,  mana: 0,   price: 20,  lore: 'Restores 50 HP instantly.' },
  { id: 'mage_staff',    name: '🔮 Mage Staff',       type: 'weapon', rarity: 'rare',      atk: 12, def: 0,  heal: 0,   mana: 0,   price: 120, lore: 'Channels arcane energy.' },
  { id: 'chain_mail',    name: '🥋 Chain Mail',       type: 'armor',  rarity: 'rare',      atk: 0,  def: 10, heal: 0,   mana: 0,   price: 100, lore: 'Woven rings of steel.' },
  { id: 'elixir',        name: '✨ Elixir',            type: 'potion', rarity: 'rare',      atk: 0,  def: 0,  heal: 150, mana: 0,   price: 60,  lore: 'Restores 150 HP.' },
  { id: 'mana_crystal',  name: '💎 Mana Crystal',     type: 'potion', rarity: 'rare',      atk: 0,  def: 0,  heal: 0,   mana: 100, price: 80,  lore: 'Restores 100 mana.' },
  { id: 'void_blade',    name: '🗡 Void Blade',        type: 'weapon', rarity: 'epic',      atk: 25, def: 0,  heal: 0,   mana: 0,   price: 300, lore: 'Forged from void crystals.' },
  { id: 'dragon_scale',  name: '🐉 Dragon Scale',     type: 'armor',  rarity: 'epic',      atk: 0,  def: 20, heal: 0,   mana: 0,   price: 280, lore: 'Scales from Vorathix.' },
  { id: 'legend_helm',   name: '👑 Legendary Helm',   type: 'armor',  rarity: 'legendary', atk: 5,  def: 30, heal: 0,   mana: 0,   price: 800, lore: 'Crown of Ashenveil.' },
];

export class Marketplace {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    this.supabase = null;
    this.isOpen = false;
    this.overlay = null;
    this.inventory = JSON.parse(localStorage.getItem('ashenveil_inventory') || '[]');
    this._initSupabase();
    scene.input.keyboard.addKey('M').on('down', () => this.toggle());
  }

  async _initSupabase() {
    if (!SUPABASE_URL || SUPABASE_URL.includes('YOUR_')) return;
    try {
      const { createClient } = await import('@supabase/supabase-js');
      this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } catch (e) { /* offline */ }
  }

  toggle() { this.isOpen ? this.close() : this.show(); }

  show(npcName = 'Merchant Veth') {
    if (this.isOpen) return;
    this.isOpen = true;
    const sql = `SELECT i.name, it.type_name, r.rarity_name,\n  r.color_code, i.attack_bonus, i.defense_bonus, i.sell_price\nFROM items i\nJOIN item_types it ON i.type_id = it.type_id\nJOIN rarity r      ON i.rarity_id = r.rarity_id\nORDER BY r.rarity_id ASC, i.sell_price ASC;`;
    this._emit('SHOP CATALOG', sql);
    this._render(npcName);
  }

  close() {
    this.isOpen = false;
    this.overlay?.remove();
    this.overlay = null;
  }

  _render(npcName) {
    const itemCards = CATALOG.map(item => {
      const rc = RARITY_COLOR[item.rarity] || '#9d9d9d';
      const owned = this.inventory.find(i => i.id === item.id);
      const statLine = [
        item.atk  ? `+${item.atk} ATK`  : '',
        item.def  ? `+${item.def} DEF`  : '',
        item.heal ? `+${item.heal} HP`  : '',
        item.mana ? `+${item.mana} MP`  : '',
      ].filter(Boolean).join(' · ') || '—';
      return `
        <div style="background:rgba(255,255,255,0.04);border:1px solid ${rc}44;border-radius:8px;
                    padding:10px 12px;display:flex;align-items:center;gap:10px;">
          <div style="flex:1;min-width:0;">
            <div style="font-size:13px;font-weight:600;color:${rc};">${item.name}</div>
            <div style="font-size:11px;color:#888;margin-top:2px;">${statLine} · <em>${item.lore}</em></div>
          </div>
          <div style="text-align:right;flex-shrink:0;">
            ${owned ? `<div style="font-size:10px;color:#44ff88;margin-bottom:4px;">✓ Owned ×${owned.qty}</div>` : ''}
            <div style="font-size:12px;color:#ffd700;font-weight:700;margin-bottom:4px;">${item.price}g</div>
            <div style="display:flex;gap:4px;">
              <button onclick="window._marketplace.buy('${item.id}')"
                style="padding:3px 10px;background:rgba(68,200,100,0.15);border:1px solid #44cc66;
                       border-radius:4px;color:#44ff88;font-size:11px;cursor:pointer;">Buy</button>
              ${owned ? `<button onclick="window._marketplace.sell('${item.id}')"
                style="padding:3px 10px;background:rgba(200,100,50,0.15);border:1px solid #cc6633;
                       border-radius:4px;color:#ff8844;font-size:11px;cursor:pointer;">Sell</button>` : ''}
            </div>
          </div>
        </div>`;
    }).join('');

    const html = `
      <div id="market-overlay" style="position:fixed;inset:0;background:rgba(0,0,0,0.82);z-index:8500;
           display:flex;align-items:center;justify-content:center;font-family:'Inter',sans-serif;">
        <div style="background:linear-gradient(135deg,#0e0a04,#1e1408);border:2px solid #cc9933;
             border-radius:16px;padding:24px;width:660px;max-height:85vh;overflow-y:auto;
             box-shadow:0 0 50px rgba(204,153,51,0.25);">

          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
            <div>
              <div style="font-size:20px;font-weight:700;color:#ffd700;">🏪 ${npcName}</div>
              <div style="font-size:12px;color:#cc9933;margin-top:2px;">"Fine wares, fresh from across the realm!"</div>
            </div>
            <div style="display:flex;align-items:center;gap:12px;">
              <div style="font-size:14px;color:#ffd700;font-weight:700;">💰 ${this.player.gold}g</div>
              <button id="market-close-btn" style="background:none;border:1px solid #444;
                border-radius:6px;color:#888;padding:4px 12px;cursor:pointer;font-size:13px;">✕ [M]</button>
            </div>
          </div>

          <!-- Live SQL Panel -->
          <div style="background:rgba(0,15,0,0.9);border:1px solid #00cc44;border-radius:6px;
               padding:8px 12px;margin-bottom:14px;font-family:'Courier New',monospace;font-size:10px;color:#00ff44;">
            <div style="color:#ffaa00;font-weight:bold;margin-bottom:4px;">⚡ LIVE SQL — NPC Transaction Log</div>
            <div id="market-sql" style="white-space:pre-wrap;word-break:break-all;max-height:70px;overflow-y:auto;line-height:1.4;">SELECT i.name, it.type_name, r.rarity_name, r.color_code,
  i.attack_bonus, i.defense_bonus, i.sell_price
FROM items i
JOIN item_types it ON i.type_id = it.type_id
JOIN rarity r ON i.rarity_id = r.rarity_id
ORDER BY r.rarity_id ASC, i.sell_price ASC;</div>
          </div>

          <!-- Item Grid -->
          <div style="display:flex;flex-direction:column;gap:6px;">${itemCards}</div>

          <div style="margin-top:14px;font-size:10px;color:#555;text-align:center;">
            Tip: Weapons boost ATK · Armor boosts DEF · Potions are used immediately on purchase
          </div>
        </div>
      </div>`;

    this.overlay = document.createElement('div');
    this.overlay.innerHTML = html;
    document.body.appendChild(this.overlay);
    document.getElementById('market-close-btn').onclick = () => this.close();
    window._marketplace = this;
  }

  async buy(itemId) {
    const item = CATALOG.find(i => i.id === itemId);
    if (!item) return;
    if (this.player.gold < item.price) {
      this._toast(`Need ${item.price}g! You have ${this.player.gold}g`, '#ff4444');
      return;
    }
    const username = window.ASHENVEIL.username;
    const sql = `BEGIN;\n-- Deduct gold atomically\nUPDATE players\n  SET gold = gold - ${item.price}\n  WHERE username = '${username}';\n\n-- Upsert into inventory (M:N junction table)\nINSERT INTO inventory (player_id, item_id, quantity)\n  SELECT p.player_id, i.item_id, 1\n  FROM players p, items i\n  WHERE p.username = '${username}'\n    AND i.name ILIKE '%${item.name.replace(/[^\w\s]/g, '').trim()}%'\nON CONFLICT (player_id, item_id)\n  DO UPDATE SET quantity = inventory.quantity + 1;\nCOMMIT;`;
    this._emit('BUY ITEM', sql);
    this._updateSQL(sql);

    // Apply stats
    this.player.gold -= item.price;
    if (item.type === 'potion') {
      this.player.stats.hp   = Math.min(this.player.stats.maxHp, this.player.stats.hp + item.heal);
      this.player.stats.mana = Math.min(200, (this.player.stats.mana || 100) + item.mana);
    } else if (item.type === 'weapon') {
      this.player.stats.attack = (this.player.stats.attack || 10) + item.atk;
    } else if (item.type === 'armor') {
      this.player.stats.defense = (this.player.stats.defense || 5) + item.def;
    }

    // Local inventory
    const ex = this.inventory.find(i => i.id === itemId);
    if (ex) ex.qty++; else this.inventory.push({ id: itemId, qty: 1 });
    localStorage.setItem('ashenveil_inventory', JSON.stringify(this.inventory));

    // Supabase write
    if (this.supabase) {
      await this.supabase.from('players').update({ gold: this.player.gold }).eq('username', username);
    }

    this._toast(`Bought ${item.name} for ${item.price}g!`, '#44ff88');
    this.close();
    setTimeout(() => this.show(), 200);
  }

  async sell(itemId) {
    const item = CATALOG.find(i => i.id === itemId);
    const inv  = this.inventory.find(i => i.id === itemId);
    if (!item || !inv) return;
    const refund = Math.floor(item.price * 0.5);
    const username = window.ASHENVEIL.username;
    const sql = `BEGIN;\nUPDATE players\n  SET gold = gold + ${refund}  -- 50% resale value\n  WHERE username = '${username}';\n\nDELETE FROM inventory\n  WHERE player_id = (SELECT player_id FROM players WHERE username = '${username}')\n    AND item_id   = (SELECT item_id FROM items WHERE name ILIKE '%${item.name.replace(/[^\w\s]/g, '').trim()}%')\n    AND quantity  <= 1;\n\n-- If quantity > 1, decrement instead\nUPDATE inventory SET quantity = quantity - 1\n  WHERE quantity > 1\n    AND player_id = (SELECT player_id FROM players WHERE username = '${username}');\nCOMMIT;`;
    this._emit('SELL ITEM', sql);
    this._updateSQL(sql);

    this.player.gold += refund;
    inv.qty--;
    if (inv.qty <= 0) this.inventory = this.inventory.filter(i => i.id !== itemId);
    localStorage.setItem('ashenveil_inventory', JSON.stringify(this.inventory));

    if (this.supabase) {
      await this.supabase.from('players').update({ gold: this.player.gold }).eq('username', username);
    }
    this._toast(`Sold ${item.name} for ${refund}g`, '#ffaa44');
    this.close();
    setTimeout(() => this.show(), 200);
  }

  _updateSQL(sql) {
    const el = document.getElementById('market-sql');
    if (el) el.textContent = sql;
  }

  _emit(label, sql) {
    if (window.ASHENVEIL?.dbmsMode) {
      console.log(`%c[SQL:${label}]\n${sql}`, 'color:#ff8800');
    }
  }

  _toast(msg, color = '#44ff88') {
    const t = this.scene.add.text(640, 200, msg, {
      fontFamily: 'Inter, sans-serif', fontSize: '14px', color,
      stroke: '#000', strokeThickness: 2
    }).setOrigin(0.5).setDepth(9999).setScrollFactor(0);
    this.scene.tweens.add({ targets: t, alpha: 0, y: 170, duration: 2500, onComplete: () => t.destroy() });
  }
}
