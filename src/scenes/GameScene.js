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
import { MultiplayerManager } from '../multiplayer/MultiplayerManager.js';
import { ENEMY_CONFIG, SPAWN_CONFIG } from '../config/EnemyConfig.js';

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
    this._spawnEnemies();

    // Collision: player projectiles vs enemies
    this.projectiles = this.physics.add.group();
    this.events.on('projectileCreated', (proj) => {
      this.projectiles.add(proj);
    });

    // Melee/AoE events
    this.events.on('meleeAttack', ({ hitArea, ability, player }) => {
      this.enemies.forEach(enemy => {
        if (enemy.isDead) return;
        const dist = Phaser.Math.Distance.Between(hitArea.x, hitArea.y, enemy.x, enemy.y);
        if (dist <= hitArea.radius) {
          const dmg = ability.damage + player.stats.attack;
          enemy.takeDamage(dmg, player);
          this.audio.swordSwing();
        }
      });
    });

    this.events.on('aoeAttack', ({ x, y, ability, player }) => {
      this.enemies.forEach(enemy => {
        if (enemy.isDead) return;
        const dist = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
        if (dist <= ability.range) {
          enemy.takeDamage(ability.damage + player.stats.attack, player);
        }
      });
      this.audio.fireball();
    });

    this.events.on('playerAbility', ({ ability }) => {
      if (ability.type === 'projectile' && ability.name.includes('Arrow')) this.audio.arrowShot();
      else if (ability.type === 'projectile') this.audio.fireball();
      else if (ability.type === 'melee') this.audio.swordSwing();
      else if (ability.effect === 'heal') this.audio.heal();
    });

    this.events.on('playerDamaged', () => {
      this.audio.hit();
      this.cameras.main.shake(150, 0.005);
    });

    this.events.on('playerDied', () => this.audio.death());
    this.events.on('levelUp', () => this.audio.levelUp());
    this.events.on('enemyKilled', () => this.audio.pickup());

    // Projectile vs enemy collision
    this.physics.add.overlap(this.projectiles, this._getEnemySprites(), (proj, enemySprite) => {
      const enemy = this.enemies.find(e => e === enemySprite);
      if (enemy && !enemy.isDead && proj.ability) {
        const dmg = proj.ability.damage + (proj.owner?.stats?.attack || 0);
        enemy.takeDamage(dmg, proj.owner);
        proj.destroy();
      }
    });

    // Systems
    this.hud = new HUD(this, this.player);
    this.dayNight = new DayNightCycle(this);
    this.fogOfWar = new FogOfWar(this);
    this.minimap = new Minimap(this, this.player);
    this.vfx = new VisualEffects(this);

    // Player name tag (follows player)
    this.playerNameTag = this.add.text(this.player.x, this.player.y - 24, window.ASHENVEIL.username || 'Hero', {
      fontFamily: '"Press Start 2P"', fontSize: '6px', color: '#ffffff',
      stroke: '#000000', strokeThickness: 3
    }).setOrigin(0.5).setDepth(15);

    // Quest system
    this.questSystem = new QuestSystem(this, this.player);

    // DBMS Mode
    this.dbms = new DBMSMode(this, this.player);

    // Multiplayer
    this.multiplayer = new MultiplayerManager(this, this.player);
    this.multiplayer.startSync();

    // NPC interactions (simple)
    this._createNPCs();

    // Load save if continuing
    this._loadGame();

    // Auto-save timer
    this.time.addEvent({
      delay: 30000,
      callback: () => this._saveGame(),
      loop: true
    });

    // Controls help
    const helpStr = window.ASHENVEIL.dbmsMode
      ? 'WASD: Move | 1-4: Abilities | E: Interact | J: Quests | TAB: Schema | C: Concepts'
      : 'WASD/Arrows: Move | 1-4: Abilities | Shift: Run | E: Interact | J: Quests';
    this.helpText = this.add.text(640, 710, helpStr, {
      fontFamily: 'Inter', fontSize: '10px', color: '#555566'
    }).setOrigin(0.5).setDepth(102).setScrollFactor(0);
  }

  _spawnEnemies() {
    Object.entries(SPAWN_CONFIG).forEach(([zoneKey, spawns]) => {
      const zone = ZONES[zoneKey];
      if (!zone) return;
      spawns.forEach(spawnDef => {
        const cfg = ENEMY_CONFIG[spawnDef.type];
        if (!cfg) return;
        for (let i = 0; i < spawnDef.count; i++) {
          const ex = (zone.x + 3 + Math.random() * (zone.w - 6)) * TILE_SIZE;
          const ey = (zone.y + 3 + Math.random() * (zone.h - 6)) * TILE_SIZE;
          const enemy = new Enemy(this, ex, ey, cfg);
          this.enemies.push(enemy);
          this.physics.add.collider(enemy, this.collisionBodies);
        }
      });
    });
  }

  _getEnemySprites() {
    return this.enemies.filter(e => e.active);
  }

  _createNPCs() {
    const npcs = [
      { type: 'elder', zone: 'ashenveil_village', ox: 5, oy: 5, name: 'Elder Mirela', dialogue: 'Welcome, hero. The darkness grows...\nSeek the wolves in the forest.' },
      { type: 'blacksmith', zone: 'ashenveil_village', ox: 10, oy: 8, name: 'Blacksmith Doran', dialogue: 'Need a blade sharpened?\nDefeat enemies to find better gear.' },
      { type: 'merchant', zone: 'marketplace', ox: 5, oy: 5, name: 'Merchant Veth', dialogue: 'Fine wares, fresh from the caves!\nGold for goods, goods for gold.' },
      { type: 'guard', zone: 'guild_citadel', ox: 5, oy: 5, name: 'Captain Solen', dialogue: 'The citadel stands strong.\nJoin a guild to grow in power.' },
      { type: 'quest_giver', zone: 'ashenveil_village', ox: 15, oy: 12, name: 'Wanderer Aelith', dialogue: 'I sense great potential in you...\nVenture into the Dark Forest.\n[Quest: Into Darkness]' }
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

      // Name tag
      const tag = this.add.text(nx, ny - 24, npc.name, {
        fontFamily: '"Press Start 2P"', fontSize: '5px', color: '#88cc88'
      }).setOrigin(0.5).setDepth(10);

      // Interaction zone
      this.physics.add.overlap(this.player, sprite, () => {
        if (Phaser.Input.Keyboard.JustDown(this.player.interactKey)) {
          this._showDialogue(npc);
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
      fontFamily: '"Press Start 2P"', fontSize: '9px', color: '#a855f7'
    }).setDepth(151).setScrollFactor(0);
    this.dialogueText = this.add.text(cx - 280, cy - 20, npc.dialogue, {
      fontFamily: 'Inter', fontSize: '13px', color: '#e0d0b0',
      wordWrap: { width: 560 }, lineSpacing: 4
    }).setDepth(151).setScrollFactor(0);

    const hint = this.add.text(cx + 270, cy + 40, '[E] Close', {
      fontFamily: '"Press Start 2P"', fontSize: '6px', color: '#666677'
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
