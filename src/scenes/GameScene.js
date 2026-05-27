// ============================================================
// GameScene — Main gameplay orchestrator
// ============================================================
import Phaser from 'phaser';
import { WORLD_PX_W, WORLD_PX_H, TILE_SIZE, ZONES } from '../utils/Constants.js';
import { WorldBuilder } from '../world/WorldBuilder.js';
import { ZoneManager } from '../world/ZoneManager.js';
import { Player } from '../entities/Player.js';
import { Enemy } from '../entities/Enemy.js';
import { HUD } from '../systems/HUD.js';
import { DayNightCycle } from '../systems/DayNightCycle.js';
import { FogOfWar } from '../systems/FogOfWar.js';
import { Minimap } from '../systems/Minimap.js';
import { AudioSystem } from '../systems/AudioSystem.js';
import { VisualEffects } from '../systems/VisualEffects.js';
import { QuestSystem } from '../systems/QuestSystem.js';
import { DBMSMode } from '../systems/DBMSMode.js';
import { DBMSSandbox } from '../systems/DBMSSandbox.js';
import { MultiplayerManager } from '../multiplayer/MultiplayerManager.js';
import { ENEMY_CONFIG } from '../config/EnemyConfig.js';
import { Marketplace } from '../systems/Marketplace.js';
import { GuildSystem } from '../systems/GuildSystem.js';
import { PvPSystem } from '../systems/PvPSystem.js';

export class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  init(data) {
    this.playerClass = data?.playerClass || window.ASHENVEIL.playerClass || 'warrior';
    this.isNewGame = data?.isNew || false;
  }

  create() {
    // Audio
    this.audio = new AudioSystem();
    // Init on first click
    this.input.once('pointerdown', () => this.audio.init());

    // World bounds
    this.physics.world.setBounds(0, 0, WORLD_PX_W, WORLD_PX_H);

    // Build world
    const builder = new WorldBuilder(this);
    const world = builder.build();
    this.collisionBodies = world.collisionBodies;

    // Zone manager
    this.zoneManager = new ZoneManager(this);

    // Spawn player
    const spawn = this.zoneManager.getSpawnPoint('ashenveil_village');
    this.player = new Player(this, spawn.x, spawn.y, this.playerClass);

    // Camera
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setBounds(0, 0, WORLD_PX_W, WORLD_PX_H);
    this.cameras.main.fadeIn(1000, 10, 10, 15);

    // Collision: player vs walls
    this.physics.add.collider(this.player, this.collisionBodies);

    // Enemies
    this.enemies = [];
    // Trigger turn-based battle on collision (wired per-enemy inside _spawnEnemies)
    // Level-up: spawn new tier monsters + announce
    this.events.on('levelUp', (player) => {
      const tier = this._tierName(player.level);
      this._spawnEnemies(true);
      if (tier) this._showTierAnnouncement(tier.name, tier.color);
    });

    // Visual Effects
    this.vfx = new VisualEffects(this);
    this.hud = new HUD(this, this.player);
    this.dayNight = new DayNightCycle(this);
    this.fogOfWar = new FogOfWar(this);
    this.minimap = new Minimap(this, this.player);
    this.vfx = new VisualEffects(this);

    // Player name tag (follows player)
    this.playerNameTag = this.add.text(this.player.x, this.player.y - 24, window.ASHENVEIL.username || 'Hero', {
      fontFamily: 'Inter, sans-serif', fontSize: '9px', color: '#ffffff',
      stroke: '#000000', strokeThickness: 3
    }).setOrigin(0.5).setDepth(15);

    // Quest system
    this.questSystem = new QuestSystem(this, this.player);

    // DBMS Mode
    this.dbms = new DBMSMode(this, this.player);
    this.sandbox = new DBMSSandbox(this);

    // Multiplayer
    this.multiplayer = new MultiplayerManager(this, this.player);
    this.multiplayer.startSync();

    // ── New Multiplayer Systems ──────────────────────────
    this.marketplace = new Marketplace(this, this.player);
    this.guildSystem = new GuildSystem(this, this.player);
    // PvP wired AFTER multiplayer so it can reference the channel
    this.pvp = new PvPSystem(this, this.player, this.multiplayer);

    // NPC interactions (simple)
    this._createNPCs();

    // Load save if continuing
    this._loadGame();

    // Spawn enemies based on loaded player level
    this._spawnEnemies();
    // Auto-save timer
    this.time.addEvent({
      delay: 30000,
      callback: () => this._saveGame(),
      loop: true
    });

    // Controls help
    const helpStr = window.ASHENVEIL.dbmsMode
      ? 'WASD: Move | E: Interact | J: Quests | TAB: Schema | C: Concepts | B: Sandbox | M: Shop | G: Guild | P: PvP'
      : 'WASD/Arrows: Move | Shift: Run | E: Interact | J: Quests | M: Shop | G: Guild | P: PvP Challenge';
    this.helpText = this.add.text(640, 710, helpStr, {
      fontFamily: 'Inter', fontSize: '13px', color: '#555566'
    }).setOrigin(0.5).setDepth(102).setScrollFactor(0);
  }

  _startBattle(enemy) {
    if (enemy.inBattle || this.scene.isPaused('GameScene') || (this.pvp && this.pvp.inPvP)) return;
    enemy.inBattle = true;
    this.player.setVelocity(0, 0);
    this.scene.pause();
    this.scene.launch('Battle', {
      player: this.player,
      enemy: enemy,
      gameScene: this
    });
  }

  _showTierAnnouncement(message, color = '#ffcc44') {
    // Create a full-width banner that slides in from top then fades out
    const banner = this.add.text(640, -40, message, {
      fontFamily: 'Arial, sans-serif', fontStyle: 'bold',
      fontSize: '18px', color: color,
      backgroundColor: '#0a0a18',
      padding: { x: 24, y: 12 },
      stroke: '#000000', strokeThickness: 3
    }).setOrigin(0.5).setDepth(200).setScrollFactor(0);

    this.tweens.add({
      targets: banner, y: 60, duration: 500, ease: 'Back.easeOut',
      onComplete: () => {
        this.time.delayedCall(3000, () => {
          this.tweens.add({
            targets: banner, y: -60, alpha: 0, duration: 600,
            onComplete: () => banner.destroy()
          });
        });
      }
    });
  }

  // ─── Level-gated spawn table ────────────────────────────
  // Returns which enemies spawn in which zones at a given level.
  _getSpawnTable(level) {
    const t = [];

    // ── Tier 1 (Lv 1+): Starting village slimes ──────────
    t.push({ zone: 'ashenveil_village', type: 'slime',         count: 4 + Math.min(level, 3) });

    // ── Tier 2 (Lv 2+): Dark forest wolves ───────────────
    if (level >= 2)
      t.push({ zone: 'dark_forest', type: 'wolf', count: 3 + Math.min(level - 2, 4) });

    // ── Tier 3 (Lv 3+): Skeletons join the forest ────────
    if (level >= 3)
      t.push({ zone: 'dark_forest', type: 'skeleton', count: 2 + Math.min(level - 3, 3) });

    // ── Tier 4 (Lv 4+): Crystal Caves open ───────────────
    if (level >= 4)
      t.push({ zone: 'crystal_caves', type: 'crystal_golem', count: 3 });

    // ── Tier 5 (Lv 5+): Dragon's Lair fire imps ──────────
    if (level >= 5)
      t.push({ zone: 'dragons_lair', type: 'fire_imp', count: 4 });

    // ── Boss 1 (Lv 6): Slime King unlocks ───────────────
    if (level >= 6)
      t.push({ zone: 'oakhaven_boss', type: 'slime_king', count: 1 });

    // ── Boss 2 (Lv 7): Frost Colossus unlocks ────────────
    if (level >= 7)
      t.push({ zone: 'frostpeak_boss', type: 'frost_colossus', count: 1 });

    // ── Final Boss (Lv 8): Vorathix the Dragon ───────────
    if (level >= 8)
      t.push({ zone: 'boss_arena', type: 'dragon', count: 1 });

    return t;
  }

  // Tier unlock announcement thresholds
  _tierName(level) {
    if (level === 2) return { name: '🐺 Shadow Wolves have appeared in the Dark Forest!', color: '#aa4444' };
    if (level === 3) return { name: '💀 Skeleton Guards now patrol the Dark Forest!',    color: '#aaaaaa' };
    if (level === 4) return { name: '💎 Crystal Caves have awakened — Golems stir!',     color: '#33cccc' };
    if (level === 5) return { name: '🔥 Fire Imps now guard the Dragon\'s Lair!',         color: '#ff6633' };
    if (level === 6) return { name: '👑 The Slime King has appeared in Oakhaven!',       color: '#22cc22' };
    if (level === 7) return { name: '❄ The Frost Colossus awakens in Frostpeak!',        color: '#88ccff' };
    if (level === 8) return { name: '🐉 VORATHIX THE DRAGON has descended! Face it in the Boss Arena!', color: '#ff2222' };
    return null;
  }

  _spawnEnemies(showAnnouncement = false) {
    const level = this.player?.level || 1;
    const table = this._getSpawnTable(level);

    table.forEach(({ zone: zoneKey, type, count }) => {
      // Don't re-spawn if already alive in this zone
      const alreadyExists = this.enemies.some(
        e => !e.isDead && e.config?.sprite === ENEMY_CONFIG[type]?.sprite
      );
      if (alreadyExists) return;

      const zone = ZONES[zoneKey];
      const cfg  = ENEMY_CONFIG[type];
      if (!zone || !cfg) return;

      for (let i = 0; i < count; i++) {
        const ex = (zone.x + 3 + Math.random() * (zone.w - 6)) * TILE_SIZE;
        const ey = (zone.y + 3 + Math.random() * (zone.h - 6)) * TILE_SIZE;
        const enemy = new Enemy(this, ex, ey, cfg);
        this.enemies.push(enemy);
        this.physics.add.collider(enemy, this.collisionBodies);

        // Wire battle trigger for newly spawned enemies
        this.physics.add.overlap(this.player, enemy, () => {
          if (!enemy.isDead && !enemy.inBattle && !this.scene.isPaused('Game')) {
            console.log('[DEBUG] Overlap triggered battle with', enemy.config.name);
            this._startBattle(enemy);
          } else {
            // Uncomment to debug why overlap isn't triggering a battle
            // console.log('[DEBUG] Overlap ignored. isDead:', enemy.isDead, 'inBattle:', enemy.inBattle, 'paused:', this.scene.isPaused('Game'));
          }
        });
      }
    });
  }

  _checkManualBattleTrigger() {
    // Fallback: If player presses E near an enemy, force a battle
    if (this.player && Phaser.Input.Keyboard.JustDown(this.player.interactKey)) {
      const closeEnemy = this.enemies.find(e => 
        !e.isDead && !e.inBattle && 
        Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y) < 40
      );
      if (closeEnemy && !this.scene.isPaused('Game')) {
        console.log('[DEBUG] Manual interact triggered battle with', closeEnemy.config.name);
        this._startBattle(closeEnemy);
      }
    }
  }

  _getEnemySprites() {
    return this.enemies.filter(e => e.active);
  }

  _createNPCs() {
    const npcs = [
      { type: 'elder',       zone: 'ashenveil_village', ox: 5,  oy: 5,  name: 'Elder Mirela',     action: 'dialogue',    dialogue: 'Welcome, hero. A terrible dragon named Vorathix\nhas made its lair far to the south.\nIt guards immense treasures...' },
      { type: 'blacksmith',  zone: 'ashenveil_village', ox: 10, oy: 8,  name: 'Blacksmith Doran', action: 'dialogue',    dialogue: 'Need a blade sharpened?\nDefeat enemies to find better gear.\nVisit the Marketplace for supplies!' },
      { type: 'merchant',    zone: 'marketplace',       ox: 5,  oy: 5,  name: 'Merchant Veth',    action: 'marketplace', dialogue: 'Fine wares! Press [E] to browse my shop.' },
      { type: 'guard',       zone: 'guild_citadel',     ox: 5,  oy: 5,  name: 'Captain Solen',    action: 'guild',       dialogue: 'The citadel stands strong. Press [E] to enter the Guild Hall.' },
      { type: 'quest_giver', zone: 'ashenveil_village', ox: 15, oy: 12, name: 'Wanderer Aelith',  action: 'dialogue',    dialogue: 'I sense great potential in you...\nVenture into the Dark Forest.\n[Quest: Into Darkness]' },
      { type: 'elder',       zone: 'oakhaven_village',  ox: 15, oy: 15, name: 'Elder Sylas',      action: 'dialogue',    dialogue: 'Beware the Slime Throne to the south.\nAn ancient Slime King has grown massive.\nOnly a true hero can stop it.' },
      { type: 'elder',       zone: 'frostpeak_village', ox: 15, oy: 15, name: 'Elder Kael',       action: 'dialogue',    dialogue: 'The Frozen Depths hold a chilling terror.\nA Frost Colossus has awakened.\nIt seeks to freeze the world.' },
      { type: 'merchant',    zone: 'guild_citadel',     ox: 12, oy: 8,  name: 'Guild Quartermaster', action: 'marketplace', dialogue: 'Guild members get access to special wares! [E] to shop.' },
    ];

    this.npcSprites = [];
    npcs.forEach(npc => {
      const zone = ZONES[npc.zone];
      if (!zone) return;
      const nx = (zone.x + npc.ox) * TILE_SIZE + 16;
      const ny = (zone.y + npc.oy) * TILE_SIZE + 16;
      const key = `npc_${npc.type}`;

      let sprite;
      if (this.textures.exists(key)) {
        sprite = this.physics.add.sprite(nx, ny, key, 0).setDepth(4).setImmovable(true);
        const animKey = `anim_${key}`;
        if (this.anims.exists(animKey)) sprite.play(animKey);
      } else {
        sprite = this.physics.add.sprite(nx, ny, 'tile_building').setDepth(4).setImmovable(true);
      }
      sprite.body.setSize(28, 28);
      sprite.npcData = npc;

      // Action hint tag
      const actionHint = npc.action === 'marketplace' ? '🏪 Shop' : npc.action === 'guild' ? '⚔ Guild' : '';
      const nameColor  = npc.action === 'marketplace' ? '#ffd700' : npc.action === 'guild' ? '#a855f7' : '#88cc88';
      const tag = this.add.text(nx, ny - 24, npc.name, {
        fontFamily: 'Inter, sans-serif', fontSize: '7px', color: nameColor
      }).setOrigin(0.5).setDepth(10);
      if (actionHint) {
        this.add.text(nx, ny - 32, actionHint, {
          fontFamily: 'Inter, sans-serif', fontSize: '7px', color: nameColor
        }).setOrigin(0.5).setDepth(10);
      }

      // Interaction zone
      this.physics.add.overlap(this.player, sprite, () => {
        if (Phaser.Input.Keyboard.JustDown(this.player.interactKey)) {
          if (npc.action === 'marketplace') {
            this.marketplace?.show(npc.name);
          } else if (npc.action === 'guild') {
            this.guildSystem?.show();
          } else {
            this._showDialogue(npc);
          }
        }
      });

      this.npcSprites.push(sprite);
    });
  }

  _showDialogue(npc) {
    if (this.dialogueBox) {
      this.dialogueBox.destroy();
      this.dialogueText.destroy();
      this.dialogueName.destroy();
      this.dialogueBox = null;
      return;
    }

    const cx = 640, cy = 550;
    this.dialogueBox = this.add.rectangle(cx, cy, 600, 120, 0x111122, 0.95)
      .setStrokeStyle(2, 0x6666aa, 0.8).setDepth(150).setScrollFactor(0);
    this.dialogueName = this.add.text(cx - 280, cy - 45, npc.name, {
      fontFamily: 'Inter, sans-serif', fontSize: '13px', color: '#a855f7'
    }).setDepth(151).setScrollFactor(0);
    this.dialogueText = this.add.text(cx - 280, cy - 20, npc.dialogue, {
      fontFamily: 'Inter', fontSize: '13px', color: '#e0d0b0',
      wordWrap: { width: 560 }, lineSpacing: 4
    }).setDepth(151).setScrollFactor(0);

    const hint = this.add.text(cx + 270, cy + 40, '[E] Close', {
      fontFamily: 'Inter, sans-serif', fontSize: '9px', color: '#666677'
    }).setOrigin(1, 0.5).setDepth(151).setScrollFactor(0);

    // Auto-close after 5s or on E press
    this.time.delayedCall(5000, () => {
      if (this.dialogueBox) {
        this.dialogueBox.destroy();
        this.dialogueText.destroy();
        this.dialogueName.destroy();
        hint.destroy();
        this.dialogueBox = null;
      }
    });
  }

  update(time, delta) {
    // Player
    this.player.update(time, delta);

    // Player name follows
    if (this.playerNameTag) {
      this.playerNameTag.setPosition(this.player.x, this.player.y - 24);
    }

    // Zone tracking
    this.zoneManager.update(this.player.x, this.player.y);

    // Enemies
    this.enemies.forEach(enemy => {
      if (enemy.active) enemy.update(time, delta, this.player);
    });

    // Fallback: If player presses E near an enemy, force a battle
    if (Phaser.Input.Keyboard.JustDown(this.player.interactKey)) {
      const closeEnemy = this.enemies.find(e => 
        !e.isDead && !e.inBattle && 
        Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y) < 45
      );
      if (closeEnemy) {
        console.log('[DEBUG] Manual interact triggered battle with', closeEnemy.config.name);
        this._startBattle(closeEnemy);
      }
    }

    // Systems
    this.hud.update();
    this.dayNight.update(delta);
    this.fogOfWar.update(this.player.x, this.player.y);
    this.minimap.update();
  }

  _saveGame() {
    const save = {
      username: window.ASHENVEIL.username,
      playerClass: this.playerClass,
      x: this.player.x,
      y: this.player.y,
      level: this.player.level,
      xp: this.player.xp,
      gold: this.player.gold,
      hp: this.player.stats.hp,
      mana: this.player.stats.mana,
      maxHp: this.player.stats.maxHp,
      fog: this.fogOfWar.getExploredData(),
      zone: this.zoneManager.currentZone,
      timestamp: Date.now()
    };
    localStorage.setItem('ashenveil_save', JSON.stringify(save));

    if (window.ASHENVEIL.dbmsMode) {
      console.log('%c[SQL] UPDATE players SET position_x=' + save.x.toFixed(1) +
        ', position_y=' + save.y.toFixed(1) +
        ', level=' + save.level +
        ', xp=' + save.xp +
        ', gold=' + save.gold +
        ' WHERE username=\'' + save.username + '\';',
        'color: #ff8800');
    }
  }

  _loadGame() {
    const raw = localStorage.getItem('ashenveil_save');
    if (!raw || this.isNewGame) return;
    try {
      const save = JSON.parse(raw);
      if (save.playerClass === this.playerClass) {
        this.player.setPosition(save.x, save.y);
        this.player.level = save.level || 1;
        this.player.xp = save.xp || 0;
        this.player.gold = save.gold || 100;
        if (save.hp) this.player.stats.hp = save.hp;
        if (save.mana) this.player.stats.mana = save.mana;
        if (save.maxHp) this.player.stats.maxHp = save.maxHp;
        this.player.xpToNext = this.player.level * this.player.level * 100;
        this.fogOfWar.loadExploredData(save.fog);
      }
    } catch (e) { console.warn('Failed to load save', e); }
  }
}
