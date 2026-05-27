// ============================================================
// MultiplayerManager — Supabase Realtime stubs (works offline)
// ============================================================

import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../utils/Constants.js';

export class MultiplayerManager {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    this.connected = false;
    this.remotePlayers = {};
    this.channel = null;

    // Try connecting if credentials exist
    const url = SUPABASE_URL;
    const key = SUPABASE_ANON_KEY;
    if (url && key && !url.includes('YOUR_')) {
      this._connect(url, key);
    } else {
      console.log('[MP] Offline mode — set Supabase credentials in Constants.js for multiplayer');
    }
  }

  async _connect(url, key) {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      this.supabase = createClient(url, key);
      this.connected = true;
      console.log('[MP] Connected to Supabase');
      this._joinChannel();
    } catch (e) {
      console.warn('[MP] Connection failed, running in offline mode', e);
    }
  }

  _joinChannel() {
    if (!this.supabase) return;
    const zone = this.scene.zoneManager?.currentZone || 'ashenveil_village';

    this.channel = this.supabase.channel(`zone:${zone}`, {
      config: { presence: { key: window.ASHENVEIL.username } }
    });

    this.channel
      .on('presence', { event: 'sync' }, () => {
        const state = this.channel.presenceState();
        this._syncPresence(state);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        this._onPlayerJoin(key, newPresences[0]);
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        this._onPlayerLeave(key);
      })
      .on('broadcast', { event: 'player_move' }, ({ payload }) => {
        this._onRemoteMove(payload);
      })
      .on('broadcast', { event: 'chat' }, ({ payload }) => {
        this._onChat(payload);
      })
      .on('broadcast', { event: 'ability' }, ({ payload }) => {
        this._onRemoteAbility(payload);
      })
      // ── PvP events ──────────────────────────────────────
      .on('broadcast', { event: 'pvp_challenge' }, ({ payload }) => {
        this.scene.pvp?.onChallengeReceived(payload);
      })
      .on('broadcast', { event: 'pvp_accepted' }, ({ payload }) => {
        this.scene.pvp?.onChallengeAccepted(payload);
      })
      .on('broadcast', { event: 'pvp_declined' }, ({ payload }) => {
        this.scene.pvp?.onChallengeDeclined(payload);
      })
      .on('broadcast', { event: 'pvp_attack' }, ({ payload }) => {
        this.scene.pvp?.onPvPAttack(payload);
      })
      // ── Guild broadcast ──────────────────────────────────
      .on('broadcast', { event: 'guild_update' }, ({ payload }) => {
        this._onGuildUpdate(payload);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await this.channel.track({
            username: window.ASHENVEIL.username,
            class: window.ASHENVEIL.playerClass,
            x: this.player.x, y: this.player.y,
            level: this.player.level,
            guild: window.ASHENVEIL.guildName || null,
          });
        }
      });
  }

  // Broadcast position every 100ms
  startSync() {
    if (!this.connected) return;
    this.scene.time.addEvent({
      delay: 100, loop: true,
      callback: () => {
        this.channel?.send({
          type: 'broadcast', event: 'player_move',
          payload: {
            username: window.ASHENVEIL.username,
            x: this.player.x, y: this.player.y,
            dir: this.player.direction,
            anim: this.player.anims?.currentAnim?.key,
            hp: this.player.stats.hp / this.player.stats.maxHp,
            guild: window.ASHENVEIL.guildName || null,
          }
        });
      }
    });
  }

  _syncPresence(state) {
    Object.entries(state).forEach(([key, presences]) => {
      if (key !== window.ASHENVEIL.username && presences[0]) {
        this._renderRemotePlayer(key, presences[0]);
      }
    });
  }

  _onPlayerJoin(key, presence) {
    if (key === window.ASHENVEIL.username) return;
    this._renderRemotePlayer(key, presence);
    // Notification
    const txt = this.scene.add.text(640, 160, `${key} joined the zone`, {
      fontFamily: 'Inter, sans-serif', fontSize: '12px', color: '#44ff44',
      stroke: '#000000', strokeThickness: 2
    }).setOrigin(0.5).setDepth(200).setScrollFactor(0);
    this.scene.tweens.add({ targets: txt, alpha: 0, y: 140, duration: 2000,
      onComplete: () => txt.destroy() });
  }

  _onPlayerLeave(key) {
    const rp = this.remotePlayers[key];
    if (rp) {
      rp.sprite?.destroy();
      rp.nameTag?.destroy();
      rp.hpBar?.destroy();
      rp.guildTag?.destroy();
      rp.pvpHint?.destroy();
      delete this.remotePlayers[key];
    }
  }

  _renderRemotePlayer(key, data) {
    if (!this.remotePlayers[key]) {
      const cls    = data.class || 'warrior';
      const texKey = `${cls}_idle_down`;
      const sprite = this.scene.add.sprite(data.x || 0, data.y || 0, texKey, 0)
        .setDepth(4).setAlpha(0.85);

      const nameTag = this.scene.add.text(sprite.x, sprite.y - 26, key, {
        fontFamily: 'Inter, sans-serif', fontSize: '9px', color: '#88aaff',
        stroke: '#000000', strokeThickness: 3
      }).setOrigin(0.5).setDepth(15);

      const guildLabel = data.guild
        ? this.scene.add.text(sprite.x, sprite.y - 36, `[${data.guild}]`, {
            fontFamily: 'Inter, sans-serif', fontSize: '8px', color: '#a855f7',
            stroke: '#000000', strokeThickness: 2
          }).setOrigin(0.5).setDepth(15)
        : null;

      const hpBar = this.scene.add.rectangle(sprite.x, sprite.y - 18, 28, 3, 0x44ff44)
        .setDepth(15);

      const pvpHint = this.scene.add.text(sprite.x, sprite.y + 18, '[P] PvP', {
        fontFamily: 'Inter, sans-serif', fontSize: '7px', color: '#ff6666',
        stroke: '#000000', strokeThickness: 2
      }).setOrigin(0.5).setDepth(15).setAlpha(0);

      this.remotePlayers[key] = { sprite, nameTag, hpBar, guildTag: guildLabel, pvpHint, class: cls };
    }
  }

  _onRemoteMove(data) {
    const rp = this.remotePlayers[data.username];
    if (!rp) return;

    this.scene.tweens.add({ targets: rp.sprite, x: data.x, y: data.y, duration: 100 });
    rp.nameTag.setPosition(data.x, data.y - 26);
    rp.hpBar.setPosition(data.x, data.y - 18);
    rp.hpBar.width = 28 * (data.hp || 1);
    if (rp.guildTag) rp.guildTag.setPosition(data.x, data.y - 36);
    if (rp.pvpHint)  rp.pvpHint.setPosition(data.x, data.y + 18);

    if (this.scene.player && rp.pvpHint) {
      const dist = Phaser.Math.Distance.Between(
        this.scene.player.x, this.scene.player.y, data.x, data.y
      );
      rp.pvpHint.setAlpha(dist < 100 ? 0.8 : 0);
    }

    if (data.guild && rp.guildTag) rp.guildTag.setText(`[${data.guild}]`);

    if (data.anim && this.scene.anims.exists(data.anim)) {
      rp.sprite.play(data.anim, true);
    }
  }

  _onChat(data) {
    const txt = this.scene.add.text(640, 180, `[${data.username}]: ${data.message}`, {
      fontFamily: 'Inter', fontSize: '18px', color: '#ffffff',
      stroke: '#000000', strokeThickness: 2
    }).setOrigin(0.5).setDepth(200).setScrollFactor(0);
    this.scene.tweens.add({ targets: txt, alpha: 0, y: 160, duration: 5000,
      onComplete: () => txt.destroy() });
  }

  _onRemoteAbility(data) {
    const rp = this.remotePlayers[data.username];
    if (rp && this.scene.vfx) {
      this.scene.vfx.impactEffect(rp.sprite.x, rp.sprite.y);
    }
  }

  _onGuildUpdate(payload) {
    const rp = this.remotePlayers[payload.username];
    if (rp && rp.guildTag) {
      rp.guildTag.setText(payload.guildName ? `[${payload.guildName}]` : '');
    }
  }

  sendChat(message) {
    this.channel?.send({
      type: 'broadcast', event: 'chat',
      payload: { username: window.ASHENVEIL.username, message }
    });
  }

  sendGuildUpdate(guildName) {
    this.channel?.send({
      type: 'broadcast', event: 'guild_update',
      payload: { username: window.ASHENVEIL.username, guildName }
    });
  }

  // Save to Supabase
  async saveToCloud() {
    if (!this.supabase) return;
    try {
      const p = this.player;
      await this.supabase.from('players').upsert({
        username: window.ASHENVEIL.username,
        class: window.ASHENVEIL.playerClass,
        level: p.level, xp: p.xp, hp: p.stats.hp,
        max_hp: p.stats.maxHp, mana: p.stats.mana,
        gold: p.gold, position_x: p.x, position_y: p.y,
        current_zone: this.scene.zoneManager?.currentZone,
        is_online: true, last_seen: new Date().toISOString()
      }, { onConflict: 'username' });
    } catch (e) { console.warn('[MP] Cloud save failed', e); }
  }

  changeZone(newZone) {
    if (this.channel) {
      this.channel.unsubscribe();
      Object.values(this.remotePlayers).forEach(rp => {
        rp.sprite?.destroy(); rp.nameTag?.destroy();
        rp.hpBar?.destroy();  rp.guildTag?.destroy();
        rp.pvpHint?.destroy();
      });
      this.remotePlayers = {};
      this._joinChannel();
    }
  }

  destroy() {
    this.channel?.unsubscribe();
  }
}
