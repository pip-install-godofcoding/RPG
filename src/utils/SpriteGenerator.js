// ============================================================
// SpriteGenerator — Simplified runtime texture creation
// ============================================================
import { TILE_SIZE, COLORS } from './Constants.js';

export class SpriteGenerator {
  constructor(scene) {
    this.scene = scene;
  }

  generateAll() {
    this._generateTiles();
    this._generateCharacters();
    this._generateEnemies();
    this._generateNPCs();
    this._generateEffects();
    this._generateUI();
  }

  _tex(key, w, h, fn) {
    const g = this.scene.add.graphics();
    fn(g);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  _generateTiles() {
    const T = TILE_SIZE;
    const tiles = {
      grass: 0x3a7d44, dark_grass: 0x1a4d24, stone: 0x777788, wood: 0x8b6914,
      water: 0x2255aa, lava: 0xdd4411, crystal: 0x66ddee, obsidian: 0x222233,
      sand: 0xccbb77, road: 0x998866, wall: 0x555566
    };
    Object.entries(tiles).forEach(([name, color]) => {
      this._tex(`tile_${name}`, T, T, g => {
        g.fillStyle(color); g.fillRect(0, 0, T, T);
        g.fillStyle(color, 0.7);
        for (let i = 0; i < 4; i++) g.fillRect(Math.random()*T, Math.random()*T, 2, 2);
        g.lineStyle(1, 0x000000, 0.08); g.strokeRect(0, 0, T, T);
      });
    });
    // tree
    this._tex('tile_tree', T, T, g => {
      g.fillStyle(0x2a5a2a); g.fillRect(0, 0, T, T);
      g.fillStyle(0x1a3a1a); g.fillCircle(16, 10, 11);
      g.fillStyle(0x22661a); g.fillCircle(16, 8, 8);
      g.fillStyle(0x6b4226); g.fillRect(13, 20, 6, 12);
    });
    // building
    this._tex('tile_building', T, T, g => {
      g.fillStyle(0x665544); g.fillRect(2, 6, 28, 26);
      g.fillStyle(0x887766); g.fillRect(4, 8, 24, 22);
      g.fillStyle(0x553322); g.fillTriangle(16, 0, 0, 10, 32, 10);
    });
  }

  _generateCharacters() {
    const T = TILE_SIZE;
    const classes = {
      warrior: COLORS.warrior, mage: COLORS.mage,
      rogue: COLORS.rogue, archer: COLORS.archer
    };
    const dirs = ['down', 'left', 'right', 'up'];

    Object.entries(classes).forEach(([cls, color]) => {
      dirs.forEach((dir, di) => {
        // idle: 2 frames
        this._tex(`${cls}_idle_${dir}`, T*2, T, g => {
          for (let f = 0; f < 2; f++) this._charFrame(g, f*T, color, di, f, cls, false);
        });
        // walk: 4 frames
        this._tex(`${cls}_walk_${dir}`, T*4, T, g => {
          for (let f = 0; f < 4; f++) this._charFrame(g, f*T, color, di, f, cls, false);
        });
        // attack: 3 frames
        this._tex(`${cls}_attack_${dir}`, T*3, T, g => {
          for (let f = 0; f < 3; f++) this._charFrame(g, f*T, color, di, f, cls, true);
        });
        // cast: 3 frames
        this._tex(`${cls}_cast_${dir}`, T*3, T, g => {
          for (let f = 0; f < 3; f++) this._charFrame(g, f*T, color, di, f, cls, true);
        });
        // death: 4 frames
        this._tex(`${cls}_death_${dir}`, T*4, T, g => {
          for (let f = 0; f < 4; f++) {
            const ox = f * T;
            const cx = ox + 16, cy = 16;
            const alpha = 1 - f * 0.25;
            g.fillStyle(0x000000, 0.2 * alpha);
            g.fillEllipse(cx, 28, 14, 5);
            g.fillStyle(color, alpha);
            g.fillEllipse(cx, cy + 4 + f*2, 12 - f, 8 - f);
          }
        });
      });
    });
  }

  _charFrame(g, ox, color, dir, frame, cls, isAttack) {
    const cx = ox + 16, cy = 16;
    const bob = Math.sin(frame * 1.5) * 2;
    // shadow
    g.fillStyle(0x000000, 0.25);
    g.fillEllipse(cx, 28, 14, 5);
    // legs
    g.fillStyle(0x333344);
    const ls = Math.sin(frame * 2) * 3;
    g.fillRect(cx - 5 - ls, cy + 6 + bob, 4, 8);
    g.fillRect(cx + 1 + ls, cy + 6 + bob, 4, 8);
    // body
    g.fillStyle(color);
    g.fillRect(cx - 7, cy - 6 + bob, 14, 13);
    // head
    g.fillStyle(0xdeb887);
    g.fillCircle(cx, cy - 10 + bob, 6);
    // eyes
    const eAlpha = dir === 3 ? 0.3 : 1;
    g.fillStyle(0x111111, eAlpha);
    const exOff = dir === 1 ? -2 : dir === 2 ? 2 : 0;
    g.fillCircle(cx - 2 + exOff, cy - 11 + bob, 1.3);
    g.fillCircle(cx + 2 + exOff, cy - 11 + bob, 1.3);
    // weapon hints
    if (cls === 'warrior') {
      g.fillStyle(0xaaaacc);
      const woff = isAttack ? frame * 3 : 0;
      g.fillRect(cx + 8, cy - 4 + bob - woff, 3, 12);
    } else if (cls === 'mage') {
      g.fillStyle(0x8855aa);
      g.fillRect(cx + 8, cy - 12 + bob, 2, 18);
      g.fillStyle(0xaa66ff, isAttack ? 1 : 0.5);
      g.fillCircle(cx + 9, cy - 14 + bob, isAttack ? 4 + frame : 3);
    } else if (cls === 'rogue') {
      g.fillStyle(0x88aaaa);
      const sp = isAttack ? frame * 3 : 0;
      g.fillRect(cx - 10 - sp, cy + bob, 7, 2);
      g.fillRect(cx + 6 + sp, cy + bob, 7, 2);
    } else if (cls === 'archer') {
      g.fillStyle(0x886633);
      g.fillRect(cx + 9, cy - 10 + bob, 2, 16);
      if (isAttack) {
        g.fillStyle(0xcccccc);
        g.fillRect(cx + 11, cy - 2 + bob, 8 + frame*3, 1);
      }
    }
  }

  _generateEnemies() {
    const T = TILE_SIZE;
    const enemies = {
      slime: { c: COLORS.slime, shape: 'blob' },
      skeleton: { c: COLORS.skeleton, shape: 'hum' },
      wolf: { c: COLORS.wolf, shape: 'quad' },
      fire_imp: { c: COLORS.fire_imp, shape: 'hum' },
      crystal_golem: { c: COLORS.crystal_golem, shape: 'big' },
      dragon: { c: COLORS.dragon, shape: 'big' }
    };
    Object.entries(enemies).forEach(([name, e]) => {
      [['idle',2],['walk',4],['death',3]].forEach(([state, cnt]) => {
        this._tex(`${name}_${state}`, T*cnt, T, g => {
          for (let f = 0; f < cnt; f++) {
            const ox = f*T, cx = ox+16, cy = 16;
            const alpha = state === 'death' ? 1-f*0.3 : 1;
            g.fillStyle(0x000000, 0.2*alpha);
            g.fillEllipse(cx, 28, 12, 4);
            g.fillStyle(e.c, alpha);
            const b = Math.sin(f*1.5)*2;
            if (e.shape === 'blob') {
              g.fillEllipse(cx, cy+4+b, 12+b, 10-b);
              g.fillStyle(0x111111, alpha);
              g.fillCircle(cx-3, cy+2+b, 2); g.fillCircle(cx+3, cy+2+b, 2);
            } else if (e.shape === 'quad') {
              g.fillRect(cx-8, cy-2+b, 16, 10);
              g.fillRect(cx-9, cy+8, 5, 5); g.fillRect(cx+5, cy+8, 5, 5);
              g.fillStyle(0xffcc00, alpha);
              g.fillCircle(cx-4, cy+b, 2); g.fillCircle(cx+4, cy+b, 2);
            } else if (e.shape === 'hum') {
              g.fillRect(cx-6, cy-4+b, 12, 12);
              g.fillCircle(cx, cy-8+b, 5);
              g.fillStyle(0xff0000, alpha);
              g.fillCircle(cx-2, cy-9+b, 1.5); g.fillCircle(cx+2, cy-9+b, 1.5);
              g.fillStyle(e.c, alpha);
              g.fillRect(cx-5, cy+8, 4, 6); g.fillRect(cx+1, cy+8, 4, 6);
            } else {
              g.fillRect(cx-10, cy-8+b, 20, 18);
              g.fillCircle(cx, cy-12+b, 7);
              g.fillStyle(0xffcc00, alpha);
              g.fillCircle(cx-3, cy-13+b, 2); g.fillCircle(cx+3, cy-13+b, 2);
              if (name === 'dragon') {
                g.fillStyle(0xff4400, 0.6*alpha);
                g.fillTriangle(cx-14,cy-4, cx-8,cy-12, cx-8,cy);
                g.fillTriangle(cx+14,cy-4, cx+8,cy-12, cx+8,cy);
              }
            }
          }
        });
      });
    });
  }

  _generateNPCs() {
    const T = TILE_SIZE;
    const npcs = { elder: COLORS.npc_elder, merchant: COLORS.npc_merchant,
      blacksmith: COLORS.npc_blacksmith, guard: COLORS.npc_guard, quest_giver: 0xddaa44 };
    Object.entries(npcs).forEach(([name, color]) => {
      this._tex(`npc_${name}`, T*2, T, g => {
        for (let f = 0; f < 2; f++) {
          const ox = f*T, cx = ox+16, cy = 16, b = f*1;
          g.fillStyle(0x000000, 0.2); g.fillEllipse(cx, 28, 14, 5);
          g.fillStyle(0x333344); g.fillRect(cx-5,cy+6+b,4,8); g.fillRect(cx+1,cy+6+b,4,8);
          g.fillStyle(color); g.fillRect(cx-7, cy-6+b, 14, 13);
          g.fillStyle(0xdeb887); g.fillCircle(cx, cy-10+b, 6);
          g.fillStyle(0x111111); g.fillCircle(cx-2, cy-11, 1.3); g.fillCircle(cx+2, cy-11, 1.3);
          if (name === 'quest_giver') {
            g.fillStyle(0xffdd00);
            g.fillRect(cx-1, cy-22, 3, 6); g.fillCircle(cx, cy-14, 1.5);
          }
        }
      });
    });
  }

  _generateEffects() {
    this._tex('proj_fireball', 16, 16, g => {
      g.fillStyle(0xff6622); g.fillCircle(8, 8, 6);
      g.fillStyle(0xffcc00, 0.6); g.fillCircle(8, 8, 3);
    });
    this._tex('proj_arrow', 16, 8, g => {
      g.fillStyle(0x886633); g.fillRect(0, 3, 12, 2);
      g.fillStyle(0xaaaaaa); g.fillTriangle(12, 0, 16, 4, 12, 8);
    });
    this._tex('proj_icenova', 32, 32, g => {
      g.fillStyle(0x88ccff, 0.5); g.fillCircle(16, 16, 14);
      g.fillStyle(0xaaeeff, 0.3); g.fillCircle(16, 16, 10);
    });
    this._tex('particle_spark', 4, 4, g => { g.fillStyle(0xffee88); g.fillRect(0,0,4,4); });
    this._tex('particle_heal', 6, 6, g => {
      g.fillStyle(0x44ff66); g.fillRect(1,0,4,6); g.fillRect(0,1,6,4);
    });
    this._tex('trap', 32, 32, g => {
      g.fillStyle(0x886633, 0.8); g.fillCircle(16,16,10);
      g.lineStyle(2, 0xaaaa88); g.strokeCircle(16,16,10);
    });
    ['common','rare','epic','legendary'].forEach(r => {
      this._tex(`loot_glow_${r}`, 24, 24, g => {
        g.fillStyle(COLORS[r], 0.4); g.fillCircle(12,12,12);
        g.fillStyle(COLORS[r], 0.8); g.fillCircle(12,12,6);
      });
    });
  }

  _generateUI() {
    this._tex('minimap_border', 224, 164, g => {
      g.fillStyle(0x0a0a1a, 0.85); g.fillRect(0,0,224,164);
      g.lineStyle(2, 0x6666aa, 0.8); g.strokeRect(0,0,224,164);
    });
  }
}
