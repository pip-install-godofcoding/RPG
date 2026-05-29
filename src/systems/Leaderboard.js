// ============================================================
// Leaderboard — Live player rankings via Supabase + local fallback
// Press [L] to open · Columns: Rank / Player / Class / Level / Kills / Damage
// ============================================================
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../utils/Constants.js';

const CLASS_ICONS = {
  warrior: '⚔️', mage: '🔮', rogue: '🗡️', archer: '🏹'
};

const CLASS_COLORS = {
  warrior: '#ff6655', mage: '#6688ff', rogue: '#44cc88', archer: '#ffaa44'
};

const RANK_STYLES = [
  { bg: 'linear-gradient(135deg,#7a5c00,#3d2d00)', border: '#ffcc00', text: '#ffe066', badge: '🥇' },
  { bg: 'linear-gradient(135deg,#4a5a6a,#1a2a3a)', border: '#aaccee', text: '#cce4ff', badge: '🥈' },
  { bg: 'linear-gradient(135deg,#5a3a1a,#2a1a00)', border: '#cc8844', text: '#ffbb77', badge: '🥉' },
];

export class Leaderboard {
  constructor(scene, player) {
    this.scene   = scene;
    this.player  = player;
    this.supabase = null;
    this._el     = null;
    this._realtimeChannel = null;
    this._refreshTimer = null;
    this._isOpen = false;

    this._initSupabase();

    scene.input.keyboard.addKey('L').on('down', () => this.toggle());
  }

  async _initSupabase() {
    if (!SUPABASE_URL || SUPABASE_URL.includes('YOUR_')) return;
    try {
      const { createClient } = await import('@supabase/supabase-js');
      this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      // Upsert this player's stats when first online
      this._pushLocalStats();
    } catch (e) { /* offline */ }
  }

  // Push current player's stats to Supabase
  async _pushLocalStats() {
    if (!this.supabase) return;
    const p = this.player;
    try {
      await this.supabase.from('leaderboard').upsert({
        username:    window.ASHENVEIL?.username || 'Unknown',
        player_class: p.classKey || 'warrior',
        level:       p.level || 1,
        kills:       p.kills || 0,
        total_damage: p.totalDamage || 0,
        updated_at:  new Date().toISOString()
      }, { onConflict: 'username' });
    } catch (e) { /* offline */ }
  }

  async _fetchData() {
    // Online: fetch from Supabase leaderboard table
    if (this.supabase) {
      try {
        await this._pushLocalStats(); // push before fetch so our data is fresh
        const { data, error } = await this.supabase
          .from('leaderboard')
          .select('username, player_class, level, kills, total_damage')
          .order('kills', { ascending: false })
          .order('total_damage', { ascending: false })
          .limit(20);
        if (!error && data && data.length > 0) return data;
      } catch (e) { /* fallthrough to local */ }
    }

    // Offline fallback: just show the local player
    return [{
      username:     window.ASHENVEIL?.username || 'You',
      player_class: this.player.classKey || 'warrior',
      level:        this.player.level || 1,
      kills:        this.player.kills || 0,
      total_damage: this.player.totalDamage || 0,
    }];
  }

  async _render() {
    const rows = await this._fetchData();
    const myName = window.ASHENVEIL?.username || '';
    const isOnline = !!this.supabase;

    const rowsHTML = rows.map((r, i) => {
      const rank  = i + 1;
      const rs    = RANK_STYLES[i] || { bg: 'rgba(255,255,255,0.03)', border: '#333344', text: '#aaaacc', badge: `#${rank}` };
      const icon  = CLASS_ICONS[r.player_class] || '⚔️';
      const cc    = CLASS_COLORS[r.player_class] || '#aaaacc';
      const isMe  = r.username === myName;
      const dmg   = Number(r.total_damage || 0).toLocaleString();

      return `
        <div style="
          display:grid; grid-template-columns:42px 1fr 110px 70px 70px 100px;
          align-items:center; gap:8px; padding:11px 14px; margin-bottom:6px;
          background:${rs.bg}; border:1px solid ${isMe ? '#aa55ff' : rs.border};
          border-radius:10px; transition:all 0.2s;
          box-shadow:${isMe ? '0 0 12px rgba(170,85,255,0.3)' : 'none'};"
          onmouseover="this.style.transform='translateX(3px)'"
          onmouseout="this.style.transform='none'">
          <!-- Rank -->
          <div style="text-align:center; font-size:${rank <= 3 ? '20px' : '14px'}; font-weight:900; color:${rs.text};">
            ${typeof rs.badge === 'string' && rs.badge.includes('#') ? rs.badge : rs.badge}
          </div>
          <!-- Username -->
          <div>
            <div style="font-weight:800; font-size:14px; color:${isMe ? '#cc88ff' : '#e0d0ff'};
              display:flex; align-items:center; gap:6px;">
              ${r.username}
              ${isMe ? '<span style="font-size:9px;background:#4a1f7a;padding:2px 6px;border-radius:4px;color:#cc88ff;">YOU</span>' : ''}
            </div>
          </div>
          <!-- Class -->
          <div style="display:flex; align-items:center; gap:6px;">
            <span style="font-size:16px;">${icon}</span>
            <span style="font-size:12px; font-weight:700; color:${cc}; text-transform:uppercase; letter-spacing:1px;">
              ${r.player_class || 'warrior'}
            </span>
          </div>
          <!-- Level -->
          <div style="text-align:center;">
            <div style="font-size:18px; font-weight:900; color:#ffdd44;">Lv ${r.level || 1}</div>
          </div>
          <!-- Kills -->
          <div style="text-align:center;">
            <div style="font-size:16px; font-weight:800; color:#ff6655;">⚔ ${r.kills || 0}</div>
          </div>
          <!-- Damage -->
          <div style="text-align:right;">
            <div style="font-size:13px; font-weight:700; color:#ff9944;">💥 ${dmg}</div>
          </div>
        </div>`;
    }).join('');

    // Column headers
    const headers = `
      <div style="display:grid; grid-template-columns:42px 1fr 110px 70px 70px 100px;
        gap:8px; padding:6px 14px 10px; margin-bottom:4px;">
        <div style="font-size:10px;color:#556;text-align:center;letter-spacing:1px;">RANK</div>
        <div style="font-size:10px;color:#556;letter-spacing:1px;">PLAYER</div>
        <div style="font-size:10px;color:#556;letter-spacing:1px;">CLASS</div>
        <div style="font-size:10px;color:#556;text-align:center;letter-spacing:1px;">LEVEL</div>
        <div style="font-size:10px;color:#556;text-align:center;letter-spacing:1px;">KILLS</div>
        <div style="font-size:10px;color:#556;text-align:right;letter-spacing:1px;">DAMAGE</div>
      </div>`;

    return { rowsHTML, headers, isOnline, count: rows.length };
  }

  async open() {
    if (this._el) return;
    this._isOpen = true;

    // Build skeleton first
    this._el = document.createElement('div');
    this._el.innerHTML = `
      <div id="lb-overlay" style="
        position:fixed; inset:0; z-index:9996;
        display:flex; align-items:center; justify-content:center;
        background:rgba(0,0,0,0.75); backdrop-filter:blur(4px);
        font-family:'Inter',sans-serif;">
        <div id="lb-panel" style="
          background:linear-gradient(145deg,#0a0a14,#14142a);
          border:2px solid #4433aa; border-radius:16px; padding:28px;
          width:min(760px,94vw); max-height:80vh;
          display:flex; flex-direction:column;
          box-shadow:0 0 60px rgba(80,50,200,0.4);">

          <!-- Header -->
          <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-shrink:0; margin-bottom:20px;">
            <div>
              <div style="font-size:22px; font-weight:900; color:#b388ff; letter-spacing:3px; display:flex; align-items:center; gap:12px;">
                🏆 LIVE LEADERBOARD
              </div>
              <div id="lb-status" style="font-size:12px; color:#556; margin-top:4px;">Loading...</div>
            </div>
            <div style="display:flex; gap:10px; align-items:center;">
              <button id="lb-refresh-btn" style="
                background:rgba(180,100,255,0.1); border:1px solid #7744cc;
                border-radius:8px; padding:8px 16px; color:#aa77ff;
                font-size:12px; font-weight:700; cursor:pointer; transition:all 0.15s;"
                onmouseover="this.style.background='rgba(180,100,255,0.25)'"
                onmouseout="this.style.background='rgba(180,100,255,0.1)'">
                🔄 Refresh
              </button>
              <button id="lb-close-btn" style="
                background:rgba(255,255,255,0.05); border:1px solid #333355;
                border-radius:8px; padding:8px 16px; color:#888;
                font-size:12px; font-weight:700; cursor:pointer; transition:all 0.15s;"
                onmouseover="this.style.background='rgba(255,255,255,0.1)'"
                onmouseout="this.style.background='rgba(255,255,255,0.05)'">
                ✕ Close [L]
              </button>
            </div>
          </div>

          <!-- Loading spinner -->
          <div id="lb-loading" style="text-align:center; padding:40px; color:#556; font-size:14px;">
            ⏳ Fetching rankings...
          </div>

          <!-- Table (populated after fetch) -->
          <div id="lb-table-wrap" style="flex:1; overflow-y:auto; display:none;
            scrollbar-width:thin; scrollbar-color:#4433aa #0a0a14;">
            <div id="lb-headers"></div>
            <div id="lb-rows"></div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(this._el);

    document.getElementById('lb-close-btn').onclick   = () => this.close();
    document.getElementById('lb-refresh-btn').onclick = () => this._refresh();

    // Fetch and populate
    await this._refresh();

    // Auto-refresh every 30s
    this._refreshTimer = setInterval(() => this._refresh(), 30000);
  }

  async _refresh() {
    const loading = document.getElementById('lb-loading');
    const wrap    = document.getElementById('lb-table-wrap');
    if (!this._el) return;
    if (loading) loading.style.display = 'block';
    if (wrap)    wrap.style.display    = 'none';

    const { rowsHTML, headers, isOnline, count } = await this._render();

    if (!this._el) return; // closed during async fetch
    const status  = document.getElementById('lb-status');
    const hdrs    = document.getElementById('lb-headers');
    const rows    = document.getElementById('lb-rows');

    if (status) status.innerHTML = isOnline
      ? `<span style="color:#44ff88">● Live</span> &nbsp;·&nbsp; ${count} players ranked &nbsp;·&nbsp; <span style="color:#556">Updates every 30s</span>`
      : `<span style="color:#ff8844">● Offline</span> &nbsp;·&nbsp; Showing local stats only`;
    if (hdrs) hdrs.innerHTML = headers;
    if (rows) rows.innerHTML = rowsHTML;

    if (loading) loading.style.display = 'none';
    if (wrap)    wrap.style.display    = 'block';
  }

  close() {
    if (this._el) { this._el.remove(); this._el = null; }
    if (this._refreshTimer) { clearInterval(this._refreshTimer); this._refreshTimer = null; }
    this._isOpen = false;
  }

  toggle() {
    if (this._el) this.close();
    else          this.open();
  }
}
