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
            const ox = f * T, cx = ox + 16;
            const alpha = 1 - f * 0.25;
            g.fillStyle(0x000000, 0.25 * alpha);
            g.fillRect(cx - 7, 26, 14, 3);
            g.fillStyle(color, alpha);
            g.fillRect(cx - (6 - f), 14 + f * 2, 12 - f * 2, 8 - f);
          }
        });
      });
    });
  }

  _charFrame(g, ox, color, dir, frame, cls, isAttack) {
    const cx = ox + 16;
    const b  = Math.round(Math.sin(frame * 1.5) * 1.5); // integer bob — no sub-pixel blur
    const lL = Math.round(Math.sin(frame * 2) * 2);     // left leg offset
    const lR = -lL;                                       // right leg offset
    const front = dir !== 3;
    const SKIN = 0xd4956a;   // warm skin, no white

    // Shadow — rect, not ellipse
    g.fillStyle(0x000000, 0.45);
    g.fillRect(cx - 8, 28, 16, 3);

    if (cls === 'warrior') {
      // ── WARRIOR: red tunic + silver plate, sword + shield ─

      // Sword (right) — draw behind body
      const sOff = isAttack ? -frame * 3 : 0;
      g.fillStyle(0xeeeeff); g.fillRect(cx + 13, 1 + b + sOff, 4, 19);
      g.fillStyle(0xffcc33); g.fillRect(cx + 10, 16 + b, 9, 3);
      g.fillStyle(0x774422); g.fillRect(cx + 14, 19 + b, 2, 5);

      // Shield (left)
      g.fillStyle(0xaa2211); g.fillRect(cx - 15, 9 + b, 6, 13);
      g.fillStyle(color);    g.fillRect(cx - 14, 10 + b, 4, 11);
      g.fillStyle(0xffcc33); g.fillRect(cx - 13, 15 + b, 3, 3);

      // Boots
      g.fillStyle(0x333344);
      g.fillRect(cx - 7, 23 + b + lL, 5, 6);
      g.fillRect(cx + 2, 23 + b + lR, 5, 6);
      // Greaves
      g.fillStyle(0x9999bb);
      g.fillRect(cx - 6, 17 + b + lL, 4, 7);
      g.fillRect(cx + 2, 17 + b + lR, 4, 7);
      // Red tunic sides
      g.fillStyle(color);
      g.fillRect(cx - 9, 9 + b, 3, 10);
      g.fillRect(cx + 6, 9 + b, 3, 10);
      g.fillRect(cx - 6, 17 + b, 12, 4); // skirt
      // Chest plate
      g.fillStyle(0xccccee); g.fillRect(cx - 6, 9 + b, 12, 10);
      g.fillStyle(0x999aaa); g.fillRect(cx - 1, 10 + b, 2, 8);  // ridge
      g.fillStyle(0x555566); g.fillRect(cx - 6, 17 + b, 12, 1); // belt line
      // Pauldrons
      g.fillStyle(0xccccee);
      g.fillRect(cx - 13, 8 + b, 8, 7);
      g.fillRect(cx + 5, 8 + b, 8, 7);
      g.fillStyle(0x555566);
      g.fillRect(cx - 13, 8 + b, 8, 1);
      g.fillRect(cx + 5, 8 + b, 8, 1);

      // Head block (skin — NO circle)
      g.fillStyle(SKIN);    g.fillRect(cx - 5, 2 + b, 10, 7);
      // Helmet — covers top 60% of head
      g.fillStyle(0xbbbbdd); g.fillRect(cx - 7, -1 + b, 14, 7);
      g.fillStyle(0xccccee); g.fillRect(cx - 6, 0 + b, 12, 5);
      // Cheek guards
      g.fillStyle(0xaaaacc);
      g.fillRect(cx - 8, 4 + b, 3, 5);
      g.fillRect(cx + 5, 4 + b, 3, 5);
      // Visor slit
      g.fillStyle(0x222233); g.fillRect(cx - 5, 4 + b, 10, 2);
      // Yellow eyes in visor
      g.fillStyle(front ? 0xffee00 : 0x332200);
      g.fillRect(cx - 4, 5 + b, 3, 1);
      g.fillRect(cx + 1, 5 + b, 3, 1);

    } else if (cls === 'mage') {
      // ── MAGE: blue robe, tall hat, glowing square orb ─────

      // Staff (behind body)
      g.fillStyle(0x885533); g.fillRect(cx + 12, -4 + b, 3, 28);
      // Orb — square, no circle!
      const oW = isAttack ? 8 + frame : 7;
      g.fillStyle(0x8800cc); g.fillRect(cx + 13 - oW / 2, -8 + b, oW, oW);
      g.fillStyle(0xee44ff); g.fillRect(cx + 13 - (oW - 2) / 2, -7 + b, oW - 2, oW - 2);
      g.fillStyle(0xffffff); g.fillRect(cx + 10, -7 + b, 2, 2); // shine

      // Robe flare
      g.fillStyle(color);
      g.fillRect(cx - 10, 22, 20, 7);
      g.fillRect(cx - 12, 26, 24, 3);
      // Robe body
      g.fillStyle(color);    g.fillRect(cx - 6, 9 + b, 12, 17);
      g.fillStyle(0x6699ff); g.fillRect(cx - 3, 11 + b, 6, 13); // inner
      // Sleeves
      g.fillStyle(color);
      g.fillRect(cx - 12, 10 + b, 6, 9);
      g.fillRect(cx + 6, 10 + b, 6, 9);
      // Rune trim
      g.fillStyle(0xffee44);
      g.fillRect(cx - 12, 18 + b, 6, 1);
      g.fillRect(cx + 6, 18 + b, 6, 1);
      // Belt
      g.fillStyle(0xffcc33); g.fillRect(cx - 6, 21 + b, 12, 3);
      // Hem glow
      g.fillStyle(0x8899ff); g.fillRect(cx - 11, 27, 22, 2);

      // Hat — pixel art cone using rects (wide to narrow)
      g.fillStyle(0x1133cc);
      g.fillRect(cx - 8, 7 + b, 16, 3);  // brim
      g.fillRect(cx - 6, 4 + b, 12, 4);  // lower cone
      g.fillRect(cx - 4, 1 + b, 8, 4);   // mid cone
      g.fillRect(cx - 2, -2 + b, 4, 4);  // upper cone
      g.fillRect(cx - 1, -5 + b, 2, 4);  // tip
      // Star
      g.fillStyle(0xffee44);
      g.fillRect(cx - 1, -4 + b, 2, 3);
      g.fillRect(cx - 2, -3 + b, 4, 1);

      // Face block (between hat brim and body)
      g.fillStyle(SKIN);    g.fillRect(cx - 4, 9 + b, 8, 5);
      // Eyes
      g.fillStyle(front ? 0xcc44ff : 0x220044);
      g.fillRect(cx - 4, 11 + b, 3, 2);
      g.fillRect(cx + 1, 11 + b, 3, 2);

    } else if (cls === 'rogue') {
      // ── ROGUE: green hood, dark leather, glowing eyes ─────

      // Cape (wide behind)
      g.fillStyle(0x112211);
      g.fillRect(cx - 9, 8 + b, 18, 5);
      g.fillRect(cx - 11, 13 + b, 22, 4);
      g.fillRect(cx - 12, 17 + b, 24, 4);
      g.fillRect(cx - 11, 21 + b, 22, 4);
      g.fillRect(cx - 9, 25 + b, 18, 4);

      // Legs
      g.fillStyle(0x223322);
      g.fillRect(cx - 5, 18 + b + lL, 5, 9);
      g.fillRect(cx + 0, 18 + b + lR, 5, 9);
      // Boots
      g.fillStyle(0x111111);
      g.fillRect(cx - 6, 24 + b + lL, 6, 5);
      g.fillRect(cx + 0, 24 + b + lR, 6, 5);

      // Body — bold green
      g.fillStyle(color);    g.fillRect(cx - 7, 9 + b, 14, 12);
      g.fillStyle(0x113322); g.fillRect(cx - 1, 10 + b, 2, 10); // strap
      g.fillStyle(0x113322); g.fillRect(cx - 7, 15 + b, 14, 2); // band
      // Belt
      g.fillStyle(0x553311); g.fillRect(cx - 7, 19 + b, 14, 2);
      g.fillStyle(0xffcc33); g.fillRect(cx - 2, 19 + b, 4, 2);  // buckle

      // Right dagger (lunges on attack)
      const dA = isAttack ? frame * 4 : 0;
      g.fillStyle(0xaaddcc); g.fillRect(cx + 7 + dA, 7 + b - dA, 3, 11);
      g.fillStyle(0xaa7744); g.fillRect(cx + 6 + dA, 7 + b - dA, 5, 2);
      // Left dagger
      g.fillStyle(0xaaddcc); g.fillRect(cx - 11, 13 + b, 3, 9);
      g.fillStyle(0xaa7744); g.fillRect(cx - 12, 13 + b, 5, 2);

      // Hood — stacked rects, wider at bottom → pixel hood shape
      g.fillStyle(color);
      g.fillRect(cx - 4, -2 + b, 8, 3);  // top
      g.fillRect(cx - 6, 1 + b, 12, 3);  // upper
      g.fillRect(cx - 7, 4 + b, 14, 5);  // main
      g.fillRect(cx - 8, 7 + b, 16, 3);  // brim
      // Deep inner shadow
      g.fillStyle(0x050f05);
      g.fillRect(cx - 5, 1 + b, 10, 9);
      // Glowing pixel eyes — large rects, very visible
      g.fillStyle(front ? 0x00ff55 : 0x001a0a);
      g.fillRect(cx - 5, 4 + b, 4, 2);
      g.fillRect(cx + 1, 4 + b, 4, 2);
      // Eye glow (slightly larger, dimmer)
      g.fillStyle(front ? 0x44ff88 : 0x000000, 0.4);
      g.fillRect(cx - 6, 3 + b, 6, 4);
      g.fillRect(cx + 0, 3 + b, 6, 4);

    } else if (cls === 'archer') {
      // ── ARCHER: gold vest, leather, bow + quiver ──────────

      // Quiver (right, behind)
      g.fillStyle(0x885522); g.fillRect(cx + 8, 4 + b, 5, 13);
      g.fillStyle(0x553311); g.fillRect(cx + 8, 4 + b, 5, 2);
      g.fillStyle(0xccaa44); g.fillRect(cx + 9, -3 + b, 2, 9);
      g.fillStyle(0xccaa44); g.fillRect(cx + 11, -2 + b, 2, 8);
      g.fillStyle(0x338844); g.fillRect(cx + 9, -3 + b, 2, 2); // fletching
      g.fillStyle(0x338844); g.fillRect(cx + 11, -2 + b, 2, 2);

      // Bow (left)
      g.fillStyle(0x996633);
      g.fillRect(cx - 14, 1 + b, 3, 6);   // upper limb
      g.fillRect(cx - 14, 15 + b, 3, 6);  // lower limb
      g.fillRect(cx - 13, 7 + b, 3, 8);   // grip
      g.fillRect(cx - 12, 2 + b, 2, 3);   // upper arc
      g.fillRect(cx - 12, 17 + b, 2, 3);  // lower arc
      g.fillStyle(0xeeeebb); g.fillRect(cx - 11, 1 + b, 2, 20); // string

      // Legs
      g.fillStyle(0x6a4011);
      g.fillRect(cx - 5, 18 + b + lL, 5, 9);
      g.fillRect(cx + 0, 18 + b + lR, 5, 9);
      // Boots
      g.fillStyle(0x442811);
      g.fillRect(cx - 6, 24 + b + lL, 6, 5);
      g.fillRect(cx + 0, 24 + b + lR, 6, 5);
      // Leather base
      g.fillStyle(0x885522); g.fillRect(cx - 7, 9 + b, 14, 12);
      // Gold vest — bold class color
      g.fillStyle(color);    g.fillRect(cx - 5, 10 + b, 10, 10);
      g.fillStyle(0x775511);
      g.fillRect(cx - 5, 10 + b, 2, 10); // left strap
      g.fillRect(cx + 3, 10 + b, 2, 10); // right strap
      // Belt
      g.fillStyle(0x553311); g.fillRect(cx - 7, 20 + b, 14, 2);
      g.fillStyle(0xffcc33); g.fillRect(cx - 2, 20 + b, 4, 2);

      // Nocked arrow
      if (isAttack) {
        const pull = frame * 2;
        g.fillStyle(0xccaa44); g.fillRect(cx - 11, 11 + b, 7 + pull, 2);
        g.fillStyle(0x338844); g.fillRect(cx - 4 + pull, 11 + b, 3, 2);
      }

      // Head — rect, NO circle
      g.fillStyle(SKIN);    g.fillRect(cx - 5, 1 + b, 10, 8);
      // Hair covers top
      g.fillStyle(0x4a2a11); g.fillRect(cx - 5, -1 + b, 10, 5);
      // Headband
      g.fillStyle(color);   g.fillRect(cx - 5, 3 + b, 10, 2);
      // Eyes
      g.fillStyle(front ? 0x331100 : 0x110500);
      g.fillRect(cx - 4, 6 + b, 3, 2);
      g.fillRect(cx + 1, 6 + b, 3, 2);
      g.fillStyle(0xffffff, front ? 0.6 : 0);
      g.fillRect(cx - 3, 6 + b, 1, 1);
      g.fillRect(cx + 2, 6 + b, 1, 1);
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
      dragon: { c: COLORS.dragon, shape: 'big' },
      slime_king: { c: COLORS.slime_king, shape: 'king_blob' },
      frost_colossus: { c: COLORS.frost_colossus, shape: 'colossus' }
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
            } else if (e.shape === 'king_blob') {
              // Slime King: Massive blob with a crown
              g.fillEllipse(cx, cy+b, 16+b, 14-b);
              g.fillStyle(0xffcc00, alpha); // Crown
              g.fillRect(cx-6, cy-12+b, 12, 4);
              g.fillTriangle(cx-6, cy-12+b, cx-4, cy-16+b, cx-2, cy-12+b);
              g.fillTriangle(cx-2, cy-12+b, cx, cy-16+b, cx+2, cy-12+b);
              g.fillTriangle(cx+2, cy-12+b, cx+4, cy-16+b, cx+6, cy-12+b);
              g.fillStyle(0x111111, alpha); // Eyes
              g.fillCircle(cx-4, cy-2+b, 2.5); g.fillCircle(cx+4, cy-2+b, 2.5);
              g.fillStyle(0xff2222, alpha); // Glowing red pupils
              g.fillCircle(cx-4, cy-2+b, 1); g.fillCircle(cx+4, cy-2+b, 1);
            } else if (e.shape === 'colossus') {
              // Frost Colossus: Massive icy shoulders
              g.fillRect(cx-12, cy-6+b, 24, 18); // body
              g.fillStyle(0xffffff, 0.5*alpha); // icy sheen
              g.fillRect(cx-10, cy-4+b, 8, 14);
              g.fillStyle(e.c, alpha);
              g.fillRect(cx-16, cy-10+b, 10, 10); // L Pauldron
              g.fillRect(cx+6, cy-10+b, 10, 10);  // R Pauldron
              g.fillCircle(cx, cy-14+b, 6);       // Head
              g.fillStyle(0x0044ff, alpha);       // Glowing blue eyes
              g.fillCircle(cx-2, cy-15+b, 2); g.fillCircle(cx+2, cy-15+b, 2);
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
