// ============================================================
// Enemy — AI, patrol, aggro, combat, death, loot
// ============================================================
import Phaser from 'phaser';
import { TILE_SIZE } from '../utils/Constants.js';

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, config) {
    super(scene, x, y, `${config.sprite}_idle`, 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.config = config;
    this.setDepth(4);
    this.body.setSize(20, 20);
    this.body.setOffset(6, 10);
    this.setCollideWorldBounds(true);

    // Stats
    this.hp = config.hp;
    this.maxHp = config.hp;
    this.isDead = false;
    this.spawnX = x;
    this.spawnY = y;

    // AI state
    this.state = 'idle'; // idle, patrol, chase, attack, dead
    this.target = null;
    this.patrolTarget = null;
    this.attackTimer = 0;
    this.stateTimer = 0;
    this.wanderDelay = 2000 + Math.random() * 3000;

    // HP bar (wider, more visible)
    this.hpBarBg = scene.add.rectangle(x, y - 22, 36, 5, 0x111111, 0.9).setDepth(10);
    this.hpBarFill = scene.add.rectangle(x, y - 22, 36, 5, 0xcc2222, 0.9).setDepth(10);
    this.hpBarBorder = scene.add.rectangle(x, y - 22, 38, 7, 0x000000, 0).setStrokeStyle(1, 0x888888, 0.6).setDepth(10);

    // Name tag (bigger, with stroke for readability)
    this.nameTag = scene.add.text(x, y - 30, config.name, {
      fontFamily: '"Press Start 2P"', fontSize: '7px', color: '#ff8888',
      stroke: '#000000', strokeThickness: 3
    }).setOrigin(0.5).setDepth(10);

    // Level indicator
    this.lvlTag = scene.add.text(x, y - 22, `LV${Math.ceil(config.hp/30)}`, {
      fontFamily: '"Press Start 2P"', fontSize: '5px', color: '#ffaa44',
      stroke: '#000000', strokeThickness: 2
    }).setOrigin(0.5).setDepth(10);

    // Play idle
    const animKey = `anim_${config.sprite}_idle`;
    if (scene.anims.exists(animKey)) this.play(animKey);
  }

  update(time, delta, player) {
    if (this.isDead) return;

    this.attackTimer -= delta;
    this.stateTimer -= delta;

    // Update hp bar + name positions
    this.hpBarBg.setPosition(this.x, this.y - 22);
    this.hpBarFill.setPosition(this.x - 18 + (this.hp / this.maxHp) * 18, this.y - 22);
    this.hpBarFill.width = (this.hp / this.maxHp) * 36;
    this.hpBarBorder.setPosition(this.x, this.y - 22);
    this.nameTag.setPosition(this.x, this.y - 32);
    this.lvlTag.setPosition(this.x + 24, this.y - 22);

    // Show/hide based on distance
    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    const visible = dist < 400;
    this.hpBarBg.setVisible(visible);
    this.hpBarFill.setVisible(visible);
    this.hpBarBorder.setVisible(visible);
    this.nameTag.setVisible(visible);
    this.lvlTag.setVisible(visible);

    // AI
    if (dist <= this.config.aggroRange) {
      this.state = 'chase';
      this.target = player;
    } else if (this.state === 'chase') {
      this.state = 'idle';
      this.target = null;
    }

    switch (this.state) {
      case 'idle':
        this.setVelocity(0, 0);
        if (this.stateTimer <= 0) {
          this.state = 'patrol';
          this.patrolTarget = {
            x: this.spawnX + (Math.random() - 0.5) * 100,
            y: this.spawnY + (Math.random() - 0.5) * 100
          };
          this.stateTimer = 3000 + Math.random() * 2000;
        }
        break;

      case 'patrol':
        if (this.patrolTarget) {
          const pdist = Phaser.Math.Distance.Between(this.x, this.y, this.patrolTarget.x, this.patrolTarget.y);
          if (pdist < 5 || this.stateTimer <= 0) {
            this.state = 'idle';
            this.stateTimer = this.wanderDelay;
            this.setVelocity(0, 0);
          } else {
            this.scene.physics.moveTo(this, this.patrolTarget.x, this.patrolTarget.y, this.config.speed * 0.5);
          }
        }
        this._playWalk();
        break;

      case 'chase':
        if (!this.target || this.target.isDead) {
          this.state = 'idle';
          this.stateTimer = 1000;
          break;
        }
        const aDist = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);
        if (aDist <= this.config.attackRange) {
          this.setVelocity(0, 0);
          if (this.attackTimer <= 0) {
            this._attack();
            this.attackTimer = this.config.attackCooldown;
          }
        } else {
          this.scene.physics.moveTo(this, this.target.x, this.target.y, this.config.speed);
          this._playWalk();
        }
        // Leash — return if too far from spawn
        if (Phaser.Math.Distance.Between(this.x, this.y, this.spawnX, this.spawnY) > 300) {
          this.state = 'idle';
          this.target = null;
          this.scene.physics.moveTo(this, this.spawnX, this.spawnY, this.config.speed);
        }
        break;
    }
  }

  _playWalk() {
    const animKey = `anim_${this.config.sprite}_walk`;
    if (this.scene.anims.exists(animKey) && this.anims.currentAnim?.key !== animKey) {
      this.play(animKey, true);
    }
  }

  _attack() {
    if (!this.target) return;
    const dmg = this.target.takeDamage(this.config.damage);
    if (dmg) {
      this.scene.events.emit('enemyAttacked', { enemy: this, damage: dmg });
    }
  }

  takeDamage(amount, attacker) {
    if (this.isDead) return 0;
    const isCrit = Math.random() < 0.15;
    const dmg = isCrit ? amount * 2 : amount;
    this.hp -= dmg;

    // Flash
    this.setTint(0xffffff);
    this.scene.time.delayedCall(80, () => this.clearTint());

    // Floating damage
    this.scene.events.emit('damageNumber', {
      x: this.x, y: this.y - 10,
      amount: dmg, isCrit
    });

    // Aggro on attacker
    this.state = 'chase';
    this.target = attacker;

    if (this.hp <= 0) this._die(attacker);
    return dmg;
  }

  _die(killer) {
    this.isDead = true;
    this.setVelocity(0, 0);
    this.hpBarBg.setVisible(false);
    this.hpBarFill.setVisible(false);
    this.hpBarBorder.setVisible(false);
    this.nameTag.setVisible(false);
    this.lvlTag.setVisible(false);

    const animKey = `anim_${this.config.sprite}_death`;
    if (this.scene.anims.exists(animKey)) {
      this.play(animKey);
    }

    // Loot & XP
    const gold = Phaser.Math.Between(this.config.goldMin, this.config.goldMax);
    killer.gold += gold;
    killer.gainXP(this.config.xp);

    this.scene.events.emit('enemyKilled', { enemy: this, killer, gold, xp: this.config.xp });

    // Fade and respawn
    this.scene.tweens.add({
      targets: [this], alpha: 0, duration: 1000,
      onComplete: () => {
        this.setVisible(false);
        this.body.enable = false;
        // Respawn timer
        this.scene.time.delayedCall(this.config.respawnTime, () => {
          this._respawn();
        });
      }
    });
  }

  _respawn() {
    this.hp = this.maxHp;
    this.isDead = false;
    this.state = 'idle';
    this.stateTimer = 2000;
    this.setPosition(this.spawnX, this.spawnY);
    this.setVisible(true);
    this.setAlpha(1);
    this.body.enable = true;
    this.hpBarBg.setVisible(false);
    this.hpBarFill.setVisible(false);
    this.nameTag.setVisible(true);

    const animKey = `anim_${this.config.sprite}_idle`;
    if (this.scene.anims.exists(animKey)) this.play(animKey);
  }

  destroy() {
    this.hpBarBg?.destroy();
    this.hpBarFill?.destroy();
    this.hpBarBorder?.destroy();
    this.nameTag?.destroy();
    this.lvlTag?.destroy();
    super.destroy();
  }
}
