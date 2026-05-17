// ============================================================
// VisualEffects — Attack graphics, particles, impact effects
// ============================================================
import Phaser from 'phaser';

export class VisualEffects {
  constructor(scene) {
    this.scene = scene;
    this._generateEffectTextures();
    this._bindEvents();
  }

  _generateEffectTextures() {
    const s = this.scene;
    // Slash arc
    let g = s.add.graphics();
    g.lineStyle(3, 0xffffff, 0.9);
    g.beginPath(); g.arc(24, 24, 20, -0.8, 0.8, false); g.strokePath();
    g.lineStyle(2, 0xffdd44, 0.6);
    g.beginPath(); g.arc(24, 24, 16, -0.6, 0.6, false); g.strokePath();
    g.generateTexture('fx_slash', 48, 48); g.destroy();

    // Fire burst
    g = s.add.graphics();
    g.fillStyle(0xff6600, 0.8); g.fillCircle(16, 16, 14);
    g.fillStyle(0xffaa00, 0.6); g.fillCircle(16, 16, 10);
    g.fillStyle(0xffee44, 0.9); g.fillCircle(16, 16, 5);
    g.generateTexture('fx_fire', 32, 32); g.destroy();

    // Ice ring
    g = s.add.graphics();
    g.lineStyle(3, 0x88ccff, 0.7); g.strokeCircle(24, 24, 20);
    g.lineStyle(2, 0xaaeeff, 0.4); g.strokeCircle(24, 24, 14);
    g.fillStyle(0x88ccff, 0.15); g.fillCircle(24, 24, 20);
    g.generateTexture('fx_ice', 48, 48); g.destroy();

    // Arrow trail
    g = s.add.graphics();
    g.fillStyle(0xccaa66, 0.8); g.fillRect(0, 2, 16, 2);
    g.fillStyle(0xeeeeee, 1); g.fillTriangle(16, 0, 20, 3, 16, 6);
    g.fillStyle(0x886633, 0.5); g.fillRect(0, 2, 4, 2);
    g.generateTexture('fx_arrow_big', 20, 6); g.destroy();

    // Impact burst
    g = s.add.graphics();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      g.fillStyle(0xffffff, 0.8);
      g.fillCircle(16 + Math.cos(a) * 10, 16 + Math.sin(a) * 10, 2);
    }
    g.fillStyle(0xffffaa, 0.6); g.fillCircle(16, 16, 5);
    g.generateTexture('fx_impact', 32, 32); g.destroy();

    // Shield effect
    g = s.add.graphics();
    g.lineStyle(3, 0x4488ff, 0.7); g.strokeCircle(20, 20, 18);
    g.lineStyle(2, 0x66aaff, 0.4); g.strokeCircle(20, 20, 14);
    g.generateTexture('fx_shield', 40, 40); g.destroy();

    // Heal cross particles
    g = s.add.graphics();
    g.fillStyle(0x44ff66, 0.9);
    g.fillRect(3, 0, 4, 10); g.fillRect(0, 3, 10, 4);
    g.generateTexture('fx_heal', 10, 10); g.destroy();

    // Stealth smoke
    g = s.add.graphics();
    g.fillStyle(0x555555, 0.4); g.fillCircle(8, 8, 7);
    g.fillStyle(0x777777, 0.2); g.fillCircle(8, 8, 4);
    g.generateTexture('fx_smoke', 16, 16); g.destroy();

    // Poison bubble
    g = s.add.graphics();
    g.fillStyle(0x44cc22, 0.7); g.fillCircle(4, 4, 3);
    g.lineStyle(1, 0x66ee44, 0.5); g.strokeCircle(4, 4, 3);
    g.generateTexture('fx_poison', 8, 8); g.destroy();

    // Level up ring
    g = s.add.graphics();
    g.lineStyle(3, 0xffdd00, 0.8); g.strokeCircle(32, 32, 28);
    g.lineStyle(2, 0xffaa00, 0.5); g.strokeCircle(32, 32, 22);
    g.lineStyle(1, 0xffee66, 0.3); g.strokeCircle(32, 32, 16);
    g.generateTexture('fx_levelring', 64, 64); g.destroy();

    // Crit star
    g = s.add.graphics();
    g.fillStyle(0xff4444, 0.9);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const a2 = ((i + 0.5) / 5) * Math.PI * 2 - Math.PI / 2;
      g.fillTriangle(
        12 + Math.cos(a) * 10, 12 + Math.sin(a) * 10,
        12 + Math.cos(a2) * 4, 12 + Math.sin(a2) * 4,
        12, 12
      );
    }
    g.generateTexture('fx_crit', 24, 24); g.destroy();
  }

  _bindEvents() {
    const s = this.scene;

    s.events.on('playerAbility', ({ ability, player }) => {
      switch (ability.effect) {
        case 'knockback': this.slashEffect(player); break;
        case 'stun': this.slashEffect(player, 0xffaa00); break;
        case 'burn': this.fireEffect(player); break;
        case 'freeze': this.iceEffect(player, ability.range); break;
        case 'heal': this.healEffect(player); break;
        case 'stealth': this.smokeEffect(player); break;
        case 'backstab': this.slashEffect(player, 0x44ff88); break;
        case 'dodge': this.smokeEffect(player); break;
        case 'poison': this.poisonEffect(player); break;
        case 'none':
          if (ability.type === 'projectile') this.arrowTrail(player);
          if (ability.name === 'Rain of Arrows') this.arrowRain(player, ability.range);
          break;
        case 'snare': break;
        case 'manaShield': this.shieldEffect(player); break;
        case 'attackUp': this.buffEffect(player, 0xff4444); break;
        case 'defenseUp': this.shieldEffect(player); break;
        case 'zoom': break;
      }
    });

    s.events.on('damageNumber', ({ x, y, amount, isCrit }) => {
      if (isCrit) this.critEffect(x, y);
      else this.impactEffect(x, y);
    });

    s.events.on('enemyKilled', ({ enemy }) => {
      this.deathEffect(enemy.x, enemy.y);
    });

    s.events.on('levelUp', (player) => {
      this.levelUpEffect(player);
    });

    s.events.on('playerDied', (player) => {
      this.deathEffect(player.x, player.y, 0xff2222);
    });

    s.events.on('playerHeal', (player) => {
      this.healEffect(player);
    });
  }

  slashEffect(entity, tint = 0xffffff) {
    const dirs = [[0,1],[-1,0],[1,0],[0,-1]];
    const d = dirs[entity.direction];
    const slash = this.scene.add.image(entity.x + d[0]*20, entity.y + d[1]*20, 'fx_slash')
      .setDepth(50).setTint(tint).setRotation(Math.atan2(d[1], d[0]));
    this.scene.tweens.add({
      targets: slash, scale: 1.5, alpha: 0, rotation: slash.rotation + 0.5,
      duration: 300, onComplete: () => slash.destroy()
    });
    // Spark particles
    for (let i = 0; i < 6; i++) {
      const sp = this.scene.add.image(
        entity.x + d[0]*25 + (Math.random()-0.5)*20,
        entity.y + d[1]*25 + (Math.random()-0.5)*20,
        'particle_spark'
      ).setDepth(51).setScale(1 + Math.random());
      this.scene.tweens.add({
        targets: sp,
        x: sp.x + (Math.random()-0.5)*40,
        y: sp.y + (Math.random()-0.5)*40,
        alpha: 0, scale: 0, duration: 250 + Math.random()*200,
        onComplete: () => sp.destroy()
      });
    }
  }

  fireEffect(entity) {
    const dirs = [[0,1],[-1,0],[1,0],[0,-1]];
    const d = dirs[entity.direction];
    // Fireball with trail
    const fb = this.scene.add.image(entity.x, entity.y, 'fx_fire').setDepth(50).setScale(0.5);
    const tx = entity.x + d[0]*200, ty = entity.y + d[1]*200;
    this.scene.tweens.add({
      targets: fb, x: tx, y: ty, scale: 1.2, duration: 500,
      onUpdate: () => {
        const trail = this.scene.add.image(fb.x, fb.y, 'fx_fire')
          .setDepth(49).setScale(0.4).setAlpha(0.5);
        this.scene.tweens.add({
          targets: trail, alpha: 0, scale: 0, duration: 200,
          onComplete: () => trail.destroy()
        });
      },
      onComplete: () => {
        // Explosion
        const exp = this.scene.add.image(fb.x, fb.y, 'fx_fire').setDepth(50).setScale(0.5);
        this.scene.tweens.add({
          targets: exp, scale: 3, alpha: 0, duration: 400,
          onComplete: () => exp.destroy()
        });
        fb.destroy();
      }
    });
  }

  iceEffect(entity, range) {
    const ice = this.scene.add.image(entity.x, entity.y, 'fx_ice')
      .setDepth(50).setScale(0.3).setAlpha(0.8);
    this.scene.tweens.add({
      targets: ice, scale: range / 24, alpha: 0, duration: 600,
      onComplete: () => ice.destroy()
    });
    for (let i = 0; i < 10; i++) {
      const a = (i/10) * Math.PI * 2;
      const p = this.scene.add.image(
        entity.x + Math.cos(a)*range*0.7,
        entity.y + Math.sin(a)*range*0.7,
        'particle_spark'
      ).setDepth(51).setTint(0x88ccff).setScale(1.5);
      this.scene.tweens.add({
        targets: p, alpha: 0, scale: 0, y: p.y - 15,
        duration: 500, delay: i * 40, onComplete: () => p.destroy()
      });
    }
  }

  healEffect(entity) {
    for (let i = 0; i < 8; i++) {
      const p = this.scene.add.image(
        entity.x + (Math.random()-0.5)*20,
        entity.y + 10,
        'fx_heal'
      ).setDepth(51).setAlpha(0.8);
      this.scene.tweens.add({
        targets: p, y: entity.y - 30 - Math.random()*20, alpha: 0,
        duration: 600 + Math.random()*400, delay: i * 60,
        onComplete: () => p.destroy()
      });
    }
  }

  smokeEffect(entity) {
    for (let i = 0; i < 8; i++) {
      const p = this.scene.add.image(entity.x, entity.y, 'fx_smoke')
        .setDepth(51).setScale(0.5);
      this.scene.tweens.add({
        targets: p,
        x: entity.x + (Math.random()-0.5)*50,
        y: entity.y + (Math.random()-0.5)*50,
        alpha: 0, scale: 1.5, duration: 400 + Math.random()*300,
        onComplete: () => p.destroy()
      });
    }
  }

  poisonEffect(entity) {
    for (let i = 0; i < 6; i++) {
      const p = this.scene.add.image(
        entity.x + (Math.random()-0.5)*15,
        entity.y,
        'fx_poison'
      ).setDepth(51);
      this.scene.tweens.add({
        targets: p, y: entity.y - 25, alpha: 0,
        duration: 500, delay: i * 100,
        onComplete: () => p.destroy()
      });
    }
  }

  shieldEffect(entity) {
    const sh = this.scene.add.image(entity.x, entity.y, 'fx_shield')
      .setDepth(50).setScale(0.5).setAlpha(0);
    this.scene.tweens.add({
      targets: sh, scale: 1.2, alpha: 0.7, duration: 300, yoyo: true,
      hold: 500, onComplete: () => sh.destroy()
    });
  }

  buffEffect(entity, color) {
    for (let i = 0; i < 12; i++) {
      const a = (i/12) * Math.PI * 2;
      const p = this.scene.add.image(
        entity.x + Math.cos(a)*25, entity.y + Math.sin(a)*25,
        'particle_spark'
      ).setDepth(51).setTint(color);
      this.scene.tweens.add({
        targets: p, x: entity.x, y: entity.y, alpha: 0, scale: 0,
        duration: 400, delay: i * 30, onComplete: () => p.destroy()
      });
    }
  }

  impactEffect(x, y) {
    const imp = this.scene.add.image(x, y, 'fx_impact').setDepth(50).setScale(0.3);
    this.scene.tweens.add({
      targets: imp, scale: 1, alpha: 0, duration: 250,
      onComplete: () => imp.destroy()
    });
  }

  critEffect(x, y) {
    const star = this.scene.add.image(x, y, 'fx_crit').setDepth(52).setScale(0.5);
    this.scene.tweens.add({
      targets: star, scale: 2, alpha: 0, rotation: 1,
      duration: 400, onComplete: () => star.destroy()
    });
    this.scene.cameras.main.shake(200, 0.008);
    // Flash
    this.scene.cameras.main.flash(100, 255, 50, 50);
  }

  deathEffect(x, y, color = 0x444444) {
    for (let i = 0; i < 15; i++) {
      const p = this.scene.add.rectangle(
        x + (Math.random()-0.5)*10, y + (Math.random()-0.5)*10,
        3, 3, color, 0.8
      ).setDepth(50);
      this.scene.tweens.add({
        targets: p,
        x: x + (Math.random()-0.5)*60,
        y: y - 10 - Math.random()*40,
        alpha: 0, duration: 800 + Math.random()*500,
        onComplete: () => p.destroy()
      });
    }
  }

  levelUpEffect(entity) {
    const ring = this.scene.add.image(entity.x, entity.y, 'fx_levelring')
      .setDepth(50).setScale(0.3).setAlpha(0);
    this.scene.tweens.add({
      targets: ring, scale: 1.5, alpha: 0.8, duration: 400,
      yoyo: true, onComplete: () => ring.destroy()
    });
    for (let i = 0; i < 20; i++) {
      const a = (i/20) * Math.PI * 2;
      const p = this.scene.add.image(entity.x, entity.y, 'particle_spark')
        .setDepth(51).setTint(0xffdd00).setScale(1.5);
      this.scene.tweens.add({
        targets: p,
        x: entity.x + Math.cos(a) * 50,
        y: entity.y + Math.sin(a) * 50,
        alpha: 0, scale: 0,
        duration: 600, delay: i * 25,
        onComplete: () => p.destroy()
      });
    }
  }

  arrowTrail(entity) {
    const dirs = [[0,1],[-1,0],[1,0],[0,-1]];
    const d = dirs[entity.direction];
    const arrow = this.scene.add.image(entity.x, entity.y, 'fx_arrow_big')
      .setDepth(50).setRotation(Math.atan2(d[1], d[0]));
    this.scene.tweens.add({
      targets: arrow, x: entity.x + d[0]*250, y: entity.y + d[1]*250,
      duration: 400,
      onUpdate: () => {
        const t = this.scene.add.image(arrow.x, arrow.y, 'particle_spark')
          .setDepth(49).setAlpha(0.4).setTint(0xccaa66);
        this.scene.tweens.add({
          targets: t, alpha: 0, scale: 0, duration: 150,
          onComplete: () => t.destroy()
        });
      },
      onComplete: () => arrow.destroy()
    });
  }

  arrowRain(entity, range) {
    for (let i = 0; i < 12; i++) {
      this.scene.time.delayedCall(i * 80, () => {
        const ax = entity.x + (Math.random()-0.5)*range;
        const ay = entity.y + (Math.random()-0.5)*range;
        const arr = this.scene.add.image(ax, ay - 60, 'fx_arrow_big')
          .setDepth(50).setRotation(Math.PI/2).setScale(0.8);
        this.scene.tweens.add({
          targets: arr, y: ay, alpha: 0, duration: 300,
          onComplete: () => {
            arr.destroy();
            this.impactEffect(ax, ay);
          }
        });
      });
    }
  }
}
