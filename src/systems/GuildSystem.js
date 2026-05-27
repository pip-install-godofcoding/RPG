// ============================================================
// GuildSystem — Create/join guilds with live SQL display
// Press [G] to open, or interact [E] with Captain Solen
// ============================================================
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../utils/Constants.js';

const DEFAULT_GUILDS = [
  { guild_name: 'Dragon Slayers', guild_tag: 'DSL', level: 5, gold_bank: 10000, member_count: 8 },
  { guild_name: 'Shadow Rogues',  guild_tag: 'SR',  level: 3, gold_bank: 4200,  member_count: 5 },
  { guild_name: 'Arcane Circle',  guild_tag: 'ARC', level: 4, gold_bank: 7800,  member_count: 6 },
];

export class GuildSystem {
  constructor(scene, player) {
    this.scene  = scene;
    this.player = player;
    this.supabase = null;
    this.isOpen = false;
    this.overlay = null;
    this.guilds = [];
    this._initSupabase();
    scene.input.keyboard.addKey('G').on('down', () => this.toggle());
  }

  async _initSupabase() {
    if (!SUPABASE_URL || SUPABASE_URL.includes('YOUR_')) return;
    try {
      const { createClient } = await import('@supabase/supabase-js');
      this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } catch (e) { /* offline */ }
  }

  toggle() { this.isOpen ? this.close() : this.show(); }

  async show() {
    if (this.isOpen) return;
    this.isOpen = true;
    await this._loadGuilds();
    this._render();
  }

  close() {
    this.isOpen = false;
    this.overlay?.remove();
    this.overlay = null;
  }

  async _loadGuilds() {
    const sql = `SELECT g.guild_name, g.guild_tag, g.level, g.gold_bank,\n  COUNT(p.player_id) AS member_count\nFROM guilds g\nLEFT JOIN players p ON g.guild_id = p.guild_id\nGROUP BY g.guild_id, g.guild_name, g.guild_tag, g.level, g.gold_bank\nORDER BY g.level DESC, g.gold_bank DESC;`;
    this._emit('GUILD LIST', sql);

    if (this.supabase) {
      try {
        const { data } = await this.supabase
          .from('guilds')
          .select('guild_name, guild_tag, level, gold_bank')
          .order('level', { ascending: false });
        this.guilds = data?.length ? data : DEFAULT_GUILDS;
      } catch { this.guilds = DEFAULT_GUILDS; }
    } else {
      this.guilds = DEFAULT_GUILDS;
    }
  }

  _render() {
    const myGuild = window.ASHENVEIL?.guildName;

    const rows = this.guilds.map(g => {
      const lvlColor = g.level >= 5 ? '#ff8000' : g.level >= 4 ? '#a335ee' : g.level >= 3 ? '#0070dd' : '#9d9d9d';
      const ismine   = myGuild === g.guild_name;
      return `
        <div style="display:flex;align-items:center;gap:10px;padding:9px 12px;margin-bottom:5px;
             background:${ismine ? 'rgba(168,85,247,0.12)' : 'rgba(255,255,255,0.03)'};
             border:1px solid ${ismine ? '#a855f7' : 'rgba(255,255,255,0.07)'};border-radius:8px;">
          <div style="padding:3px 8px;border:1px solid ${lvlColor};border-radius:4px;
               font-size:11px;font-weight:700;color:${lvlColor};min-width:44px;text-align:center;">
            [${g.guild_tag}]
          </div>
          <div style="flex:1;">
            <div style="font-weight:600;font-size:13px;color:#e0d0b0;">${g.guild_name}
              ${ismine ? '<span style="font-size:10px;color:#a855f7;margin-left:6px;">◀ YOUR GUILD</span>' : ''}
            </div>
            <div style="font-size:11px;color:#777;margin-top:2px;">
              Lv ${g.level} · ${g.member_count ?? '?'} members · ${(g.gold_bank || 0).toLocaleString()}g bank
            </div>
          </div>
          ${ismine
            ? `<button onclick="window._guildSystem.leave()"
                 style="padding:4px 12px;background:rgba(200,50,50,0.18);border:1px solid #cc4444;
                        border-radius:5px;color:#ff7777;font-size:11px;cursor:pointer;font-family:Inter;">Leave</button>`
            : myGuild
              ? `<span style="font-size:10px;color:#555;">Leave your guild first</span>`
              : `<button onclick="window._guildSystem.join('${g.guild_name}','${g.guild_tag}')"
                   style="padding:4px 12px;background:rgba(50,200,100,0.15);border:1px solid #44cc66;
                          border-radius:5px;color:#44ff88;font-size:11px;cursor:pointer;font-family:Inter;">Join</button>`
          }
        </div>`;
    }).join('');

    const html = `
      <div id="guild-overlay" style="position:fixed;inset:0;background:rgba(0,0,0,0.82);z-index:8500;
           display:flex;align-items:center;justify-content:center;font-family:'Inter',sans-serif;">
        <div style="background:linear-gradient(135deg,#0d0d22,#1a1a40);border:2px solid #a855f7;
             border-radius:16px;padding:26px;width:640px;max-height:85vh;overflow-y:auto;
             box-shadow:0 0 50px rgba(168,85,247,0.25);">

          <!-- Header -->
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
            <div>
              <div style="font-size:20px;font-weight:700;color:#e0d0b0;">⚔ Guild Hall</div>
              <div style="font-size:12px;color:#a855f7;margin-top:2px;">Form alliances. Conquer together.</div>
            </div>
            <button id="guild-close-btn" style="background:none;border:1px solid #444;border-radius:6px;
              color:#888;padding:4px 12px;cursor:pointer;font-size:13px;">✕ [G]</button>
          </div>

          <!-- Status banner -->
          <div style="background:rgba(168,85,247,0.08);border:1px solid rgba(168,85,247,0.25);
               border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:13px;">
            ${myGuild
              ? `You are a member of <strong style="color:#a855f7;">${myGuild}</strong>
                 [${window.ASHENVEIL?.guildTag || '?'}]`
              : `<span style="color:#777;">You are not in a guild. Join one below or create your own!</span>`}
          </div>

          <!-- Live SQL panel -->
          <div style="background:rgba(0,15,0,0.9);border:1px solid #00cc44;border-radius:6px;
               padding:8px 12px;margin-bottom:14px;font-family:'Courier New',monospace;font-size:10px;color:#00ff44;">
            <div style="color:#ffaa00;font-weight:bold;margin-bottom:4px;">⚡ LAST SQL EXECUTED</div>
            <div id="guild-sql" style="white-space:pre-wrap;max-height:70px;overflow-y:auto;line-height:1.4;">SELECT g.guild_name, g.guild_tag, g.level, g.gold_bank,
  COUNT(p.player_id) AS member_count
FROM guilds g
LEFT JOIN players p ON g.guild_id = p.guild_id
GROUP BY g.guild_id
ORDER BY g.level DESC;</div>
          </div>

          <!-- Guild list -->
          <div style="margin-bottom:16px;">
            <div style="font-size:11px;font-weight:600;color:#555;text-transform:uppercase;
                 letter-spacing:1px;margin-bottom:8px;">Active Guilds</div>
            <div>${rows || '<div style="color:#555;font-size:13px;padding:12px;">No guilds found.</div>'}</div>
          </div>

          <!-- Create guild -->
          <div style="border-top:1px solid rgba(255,255,255,0.08);padding-top:14px;">
            <div style="font-size:11px;font-weight:600;color:#555;text-transform:uppercase;
                 letter-spacing:1px;margin-bottom:8px;">Found a New Guild (costs 200g)</div>
            <div style="display:flex;gap:8px;">
              <input id="guild-name-in" placeholder="Guild name…" maxlength="24"
                style="flex:1;background:rgba(255,255,255,0.05);border:1px solid #333;border-radius:6px;
                       padding:8px 12px;color:#e0d0b0;font-size:13px;font-family:Inter;outline:none;"/>
              <input id="guild-tag-in" placeholder="Tag" maxlength="4"
                style="width:72px;background:rgba(255,255,255,0.05);border:1px solid #333;border-radius:6px;
                       padding:8px 12px;color:#e0d0b0;font-size:13px;font-family:Inter;outline:none;"/>
              <button onclick="window._guildSystem.create()"
                style="padding:8px 18px;background:linear-gradient(135deg,#4a1a8a,#2a0a5a);
                       border:1px solid #a855f7;border-radius:6px;color:#c084fc;
                       font-size:13px;font-weight:600;cursor:pointer;font-family:Inter;">⚔ Found</button>
            </div>
          </div>
        </div>
      </div>`;

    this.overlay = document.createElement('div');
    this.overlay.innerHTML = html;
    document.body.appendChild(this.overlay);
    document.getElementById('guild-close-btn').onclick = () => this.close();
    window._guildSystem = this;
  }

  async create() {
    const name = document.getElementById('guild-name-in')?.value?.trim();
    const tag  = document.getElementById('guild-tag-in')?.value?.trim().toUpperCase();
    if (!name || name.length < 2) return this._toast('Enter a guild name (min 2 chars)', '#ff4444');
    if (!tag  || tag.length  < 2) return this._toast('Enter a tag (2–4 chars)', '#ff4444');
    if (this.player.gold < 200)   return this._toast('Need 200g to found a guild!', '#ff4444');
    if (window.ASHENVEIL?.guildName) return this._toast('Leave your current guild first!', '#ff4444');

    const username = window.ASHENVEIL.username;
    const sql = `BEGIN;\nINSERT INTO guilds (guild_name, guild_tag, level, gold_bank)\n  VALUES ('${name}', '${tag}', 1, 0)\n  RETURNING guild_id;\n\nUPDATE players\n  SET guild_id = (SELECT guild_id FROM guilds WHERE guild_name = '${name}')\n  WHERE username = '${username}';\nCOMMIT;\n-- Trigger: trg_level_up will fire if XP changes`;
    this._emit('CREATE GUILD', sql);
    this._updateSQL(sql);

    this.player.gold -= 200;
    window.ASHENVEIL.guildName = name;
    window.ASHENVEIL.guildTag  = tag;

    if (this.supabase) {
      const { data } = await this.supabase.from('guilds')
        .insert({ guild_name: name, guild_tag: tag, level: 1, gold_bank: 0 })
        .select().single();
      if (data) {
        await this.supabase.from('players').update({ guild_id: data.guild_id }).eq('username', username);
      }
    }
    this._toast(`⚔ Guild "${name}" founded! −200g`, '#44ff88');
    this.close();
    setTimeout(() => this.show(), 400);
  }

  async join(guildName, guildTag) {
    if (window.ASHENVEIL?.guildName) return this._toast('Leave your current guild first!', '#ff4444');
    const username = window.ASHENVEIL.username;
    const sql = `UPDATE players\n  SET guild_id = (\n    SELECT guild_id FROM guilds\n    WHERE guild_name = '${guildName}'\n  )\n  WHERE username = '${username}';\n-- Subquery avoids hardcoding UUID (3NF principle)`;
    this._emit('JOIN GUILD', sql);
    this._updateSQL(sql);

    window.ASHENVEIL.guildName = guildName;
    window.ASHENVEIL.guildTag  = guildTag;

    if (this.supabase) {
      const { data: guild } = await this.supabase.from('guilds')
        .select('guild_id').eq('guild_name', guildName).single();
      if (guild) {
        await this.supabase.from('players').update({ guild_id: guild.guild_id }).eq('username', username);
      }
    }
    this._toast(`Joined ${guildName}!`, '#44ff88');
    this.close();
    setTimeout(() => this.show(), 400);
  }

  async leave() {
    const prev = window.ASHENVEIL?.guildName;
    if (!prev) return;
    const username = window.ASHENVEIL.username;
    const sql = `UPDATE players\n  SET guild_id = NULL  -- ON DELETE SET NULL enforced\n  WHERE username = '${username}';\n-- FK: guild_id REFERENCES guilds(guild_id) ON DELETE SET NULL`;
    this._emit('LEAVE GUILD', sql);
    this._updateSQL(sql);

    window.ASHENVEIL.guildName = null;
    window.ASHENVEIL.guildTag  = null;

    if (this.supabase) {
      await this.supabase.from('players').update({ guild_id: null }).eq('username', username);
    }
    this._toast(`Left "${prev}"`, '#ffaa44');
    this.close();
    setTimeout(() => this.show(), 400);
  }

  _updateSQL(sql) {
    const el = document.getElementById('guild-sql');
    if (el) el.textContent = sql;
  }

  _emit(label, sql) {
    if (window.ASHENVEIL?.dbmsMode) console.log(`%c[SQL:${label}]\n${sql}`, 'color:#a855f7');
  }

  _toast(msg, color = '#44ff88') {
    const t = this.scene.add.text(640, 200, msg, {
      fontFamily: 'Inter, sans-serif', fontSize: '14px', color,
      stroke: '#000', strokeThickness: 2
    }).setOrigin(0.5).setDepth(9999).setScrollFactor(0);
    this.scene.tweens.add({ targets: t, alpha: 0, y: 175, duration: 2500, onComplete: () => t.destroy() });
  }
}
