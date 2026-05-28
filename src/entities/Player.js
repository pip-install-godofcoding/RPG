// ============================================================
// Player — Movement, abilities, combat, animations
// ============================================================
import Phaser from 'phaser';
import { PLAYER_SPEED, RUN_MULTIPLIER, TILE_SIZE, DIR } from '../utils/Constants.js';
import { CLASS_CONFIG } from '../config/ClassConfig.js';

export class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, playerClass) {
    const texKey = `${playerClass}_idle_down`;
    super(scene, x, y, texKey, 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.classKey = playerClass;
    this.classConfig = CLASS_CONFIG[playerClass];
    this.setDepth(5);
    this.setCollideWorldBounds(true);
    this.body.setSize(20, 20);
    this.body.setOffset(6, 10);

    // Stats
    this.stats = { ...this.classConfig.stats };
    this.level = 1;
    this.xp = 0;
    this.xpToNext = 40;
    this.gold = 100;
    this.direction = DIR.DOWN;
    this.isAttacking = false;
    this.isDead = false;
    this.isStealthed = false;
    this.isDodging = false;

    // Abilities
    this.cooldowns = {};
    this.classConfig.abilities.forEach(ab => { this.cooldowns[ab.name] = 0; });
    this.buffs = {};

    // Input
    this.cursors = scene.input.keyboard.createCursorKeys();
    this.wasd = {
      W: scene.input.keyboard.addKey('W'),
      A: scene.input.keyboard.addKey('A'),
      S: scene.input.keyboard.addKey('S'),
      D: scene.input.keyboard.addKey('D')
    };
    this.shiftKey = scene.input.keyboard.addKey('SHIFT');
    this.keys = {
      1: scene.input.keyboard.addKey('ONE'),
      2: scene.input.keyboard.addKey('TWO'),
      3: scene.input.keyboard.addKey('THREE'),
      4: scene.input.keyboard.addKey('FOUR')
    };
    this.interactKey = scene.input.keyboard.addKey('E');

    // Setup ability key listeners - Disabled for overworld, abilities are now used in BattleScene
    // Object.entries(this.keys).forEach(([num, key]) => {
    //   key.on('down', () => this.useAbility(parseInt(num)));
    // });

    // Play idle
    this._playAnim('idle');
  }

  update(time, delta) {
    if (this.isDead || this.isDodging) return;

    // Update cooldowns
    Object.keys(this.cooldowns).forEach(k => {
      if (this.cooldowns[k] > 0) this.cooldowns[k] -= delta;
    });

    // Update buffs
    Object.keys(this.buffs).forEach(k => {
      this.buffs[k] -= delta;
      if (this.buffs[k] <= 0) delete this.buffs[k];
    });

    // Resource regen
    const regenRate = this.classConfig.resource === 'mana' ? 0.02 : 0.03;
    const resKey = this.classConfig.resource === 'mana' ? 'mana' : 'mana';
    const maxKey = this.classConfig.resource === 'mana' ? 'maxMana' : 'maxMana';
    this.stats[resKey] = Math.min(this.stats[maxKey], this.stats[resKey] + regenRate * delta);

    if (this.isAttacking) return;

    // Movement
    let vx = 0, vy = 0;
    const joy = this.scene.mobileControls?.getAxis() || { x: 0, y: 0 };
    const up    = this.cursors.up.isDown    || this.wasd.W.isDown || joy.y < -0.25;
    const down  = this.cursors.down.isDown  || this.wasd.S.isDown || joy.y >  0.25;
    const left  = this.cursors.left.isDown  || this.wasd.A.isDown || joy.x < -0.25;
    const right = this.cursors.right.isDown || this.wasd.D.isDown || joy.x >  0.25;

    if (up) vy = -1;
    else if (down) vy = 1;
    if (left) vx = -1;
    else if (right) vx = 1;

    // Normalize diagonal
    if (vx !== 0 && vy !== 0) {
      vx *= 0.707;
      vy *= 0.707;
    }

    const speed = this.shiftKey.isDown ? PLAYER_SPEED * RUN_MULTIPLIER : PLAYER_SPEED;
    const effectiveSpeed = this.buffs.speedUp ? speed * 1.3 : speed;

    this.setVelocity(vx * effectiveSpeed, vy * effectiveSpeed);

    // Direction
    if (vx !== 0 || vy !== 0) {
      if (Math.abs(vx) > Math.abs(vy)) {
        this.direction = vx > 0 ? DIR.RIGHT : DIR.LEFT;
      } else {
        this.direction = vy > 0 ? DIR.DOWN : DIR.UP;
      }
      const state = this.shiftKey.isDown ? 'walk' : 'walk';
      this._playAnim(state);
    } else {
      this.setVelocity(0, 0);
      this._playAnim('idle');
    }
  }

  _playAnim(state) {
    const dirName = ['down', 'left', 'right', 'up'][this.direction];
    const animKey = `anim_${this.classKey}_${state}_${dirName}`;
    if (this.anims.exists(animKey) && this.anims.currentAnim?.key !== animKey) {
      this.play(animKey, true);
    }
  }

  useAbility(slot) {
    if (this.isDead || this.isAttacking) return;
    const ability = this.classConfig.abilities.find(a => a.key === slot);
    if (!ability) return;

    // Check cooldown
    if (this.cooldowns[ability.name] > 0) return;

    // Check resource
    const resKey = this.classConfig.resource === 'mana' ? 'mana' : 'mana';
    if (this.stats[resKey] < ability.cost) return;

    // Consume resource
    this.stats[resKey] -= ability.cost;
    this.cooldowns[ability.name] = ability.cooldown;

    // Execute
    this.isAttacking = true;
    this._playAnim(ability.type === 'projectile' || ability.type === 'aoe' ? 'cast' : 'attack');

    this.scene.time.delayedCall(300, () => {
      this._executeAbility(ability);
      this.isAttacking = false;
    });

    // Emit event for systems
    this.scene.events.emit('playerAbility', { ability, player: this });
  }

  _executeAbility(ability) {
    const dirVec = this._getDirVector();

    switch (ability.type) {
      case 'projectile':
        this._fireProjectile(ability, dirVec);
        break;
      case 'melee':
        this._meleeHit(ability, dirVec);
        break;
      case 'aoe':
        this._aoeHit(ability);
        break;
      case 'self':
        if (ability.effect === 'heal') {
          this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + Math.abs(ability.damage));
          this.scene.events.emit('playerHeal', this);
        }
        break;
      case 'buff':
        this.buffs[ability.effect] = ability.duration || 5000;
        if (ability.effect === 'stealth') {
          this.isStealthed = true;
          this.setAlpha(0.3);
          this.scene.time.delayedCall(ability.duration, () => {
            this.isStealthed = false;
            this.setAlpha(1);
          });
        }
        break;
      case 'movement':
        if (ability.effect === 'dodge') this._dodgeRoll(dirVec);
        break;
      case 'placed':
        this._placeTrap(ability);
        break;
      case 'utility':
        if (ability.effect === 'zoom') {
          this.scene.cameras.main.zoomTo(0.6, 500);
          this.scene.time.delayedCall(ability.duration, () => {
            this.scene.cameras.main.zoomTo(1, 500);
          });
        }
        break;
    }
  }

  _getDirVector() {
    const vecs = [[0, 1], [-1, 0], [1, 0], [0, -1]];
    return { x: vecs[this.direction][0], y: vecs[this.direction][1] };
  }

  _fireProjectile(ability, dir) {
    const texKey = ability.name.includes('Fireball') ? 'proj_fireball' :
                   ability.name.includes('Arrow') ? 'proj_arrow' : 'proj_fireball';
    const proj = this.scene.physics.add.image(this.x, this.y, texKey).setDepth(6);
    proj.setVelocity(dir.x * 300, dir.y * 300);
    proj.ability = ability;
    proj.owner = this;

    // Register for collision
    this.scene.events.emit('projectileCreated', proj);

    this.scene.time.delayedCall(2000, () => { if (proj.active) proj.destroy(); });
  }

  _meleeHit(ability, dir) {
    const hitArea = {
      x: this.x + dir.x * 30,
      y: this.y + dir.y * 30,
      radius: ability.range
    };
    this.scene.events.emit('meleeAttack', { hitArea, ability, player: this });
  }

  _aoeHit(ability) {
    this.scene.events.emit('aoeAttack', { x: this.x, y: this.y, ability, player: this });
    // Visual
    if (ability.name.includes('Ice')) {
      const nova = this.scene.add.image(this.x, this.y, 'proj_icenova').setDepth(6).setScale(0.5);
      this.scene.tweens.add({
        targets: nova, scale: ability.range / 32, alpha: 0,
        duration: 500, onComplete: () => nova.destroy()
      });
    }
  }

  _dodgeRoll(dir) {
    this.isDodging = true;
    this.setAlpha(0.5);
    const dist = 120;
    this.scene.tweens.add({
      targets: this, x: this.x + dir.x * dist, y: this.y + dir.y * dist,
      duration: 250, ease: 'Power2',
      onComplete: () => {
        this.isDodging = false;
        this.setAlpha(1);
      }
    });
  }

  _placeTrap(ability) {
    const trap = this.scene.physics.add.image(this.x, this.y, 'trap').setDepth(2);
    trap.ability = ability;
    trap.owner = this;
    this.scene.events.emit('trapPlaced', trap);
    this.scene.time.delayedCall(15000, () => { if (trap.active) trap.destroy(); });
  }

  takeDamage(amount) {
    if (this.isDodging || this.isDead) return;
    if (this.buffs.manaShield && this.stats.mana > 0) {
      this.stats.mana -= amount;
      if (this.stats.mana < 0) this.stats.mana = 0;
      return;
    }
    const def = this.buffs.defenseUp ? this.stats.defense * 2 : this.stats.defense;
    const dmg = Math.max(1, amount - Math.floor(def / 3));
    this.stats.hp -= dmg;
    this.scene.events.emit('playerDamaged', { damage: dmg, player: this });

    // Flash red
    this.setTint(0xff0000);
    this.scene.time.delayedCall(100, () => this.clearTint());

    if (this.stats.hp <= 0) this.die();
    return dmg;
  }

  die() {
    this.isDead = true;
    this._playAnim('death');
    this.setVelocity(0, 0);
    this.gold = Math.floor(this.gold * 0.9);
    this.scene.events.emit('playerDied', this);

    this.scene.time.delayedCall(2000, () => {
      this.isDead = false;
      this.stats.hp = this.stats.maxHp;
      const spawn = this.scene.zoneManager.getSpawnPoint('ashenveil_village');
      this.setPosition(spawn.x, spawn.y);
      this._playAnim('idle');
      this.scene.events.emit('playerRespawned', this);
    });
  }

  gainXP(amount) {
    this.xp += amount;
    while (this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext;
      this.level++;
      // HP scaling
      this.stats.maxHp  += 20;
      this.stats.hp      = this.stats.maxHp;
      // Mana scaling (same cadence as HP)
      this.stats.maxMana += 15;
      this.stats.mana    = this.stats.maxMana;
      // Attack / Defense
      this.stats.attack  += 2;
      this.stats.defense += 1;
      this.xpToNext = this.level * 40;
      this.scene.events.emit('levelUp', this);
    }
  }
}
