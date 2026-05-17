// ============================================================
// Constants — Shared game values
// ============================================================
export const TILE_SIZE = 32;
export const PLAYER_SPEED = 160;
export const RUN_MULTIPLIER = 1.6;
export const WORLD_WIDTH = 200;
export const WORLD_HEIGHT = 200;
export const WORLD_PX_W = WORLD_WIDTH * TILE_SIZE;
export const WORLD_PX_H = WORLD_HEIGHT * TILE_SIZE;

export const DIR = { DOWN: 0, LEFT: 1, RIGHT: 2, UP: 3 };

export const COLORS = {
  warrior: 0xcc3333,
  mage: 0x3366cc,
  rogue: 0x33aa55,
  archer: 0xcc9933,
  slime: 0x44cc44,
  skeleton: 0xcccccc,
  wolf: 0x888899,
  fire_imp: 0xff6633,
  crystal_golem: 0x33cccc,
  dragon: 0xff2222,
  npc_elder: 0xeedd88,
  npc_merchant: 0xcc88dd,
  npc_blacksmith: 0xaa7744,
  npc_guard: 0x6688aa,
  // tiles
  grass: 0x3a7d44,
  dark_grass: 0x1a4d24,
  stone: 0x777788,
  wood: 0x8b6914,
  water: 0x2255aa,
  lava: 0xdd4411,
  crystal: 0x66ddee,
  obsidian: 0x222233,
  sand: 0xccbb77,
  road: 0x998866,
  wall: 0x555566,
  // rarity
  common: 0x9d9d9d,
  rare: 0x0070dd,
  epic: 0xa335ee,
  legendary: 0xff8000,
  // ui
  hpBar: 0xcc2222,
  mpBar: 0x2255cc,
  xpBar: 0xccaa22,
  staminaBar: 0xcccc22
};

export const ZONES = {
  ashenveil_village: { x: 60, y: 40, w: 40, h: 40, name: 'Ashenveil Village', ground: 'grass', accent: 'road' },
  guild_citadel:     { x: 10, y: 10, w: 30, h: 30, name: 'Guild Citadel', ground: 'stone', accent: 'wall' },
  marketplace:       { x: 110, y: 10, w: 25, h: 25, name: 'Marketplace', ground: 'sand', accent: 'road' },
  dark_forest:       { x: 10, y: 90, w: 50, h: 50, name: 'Dark Forest', ground: 'dark_grass', accent: 'grass' },
  crystal_caves:     { x: 110, y: 90, w: 45, h: 45, name: 'Crystal Caves', ground: 'obsidian', accent: 'crystal' },
  dragons_lair:      { x: 60, y: 140, w: 35, h: 35, name: "Dragon's Lair", ground: 'obsidian', accent: 'lava' },
  boss_arena:        { x: 75, y: 175, w: 30, h: 25, name: 'Boss Arena', ground: 'obsidian', accent: 'stone' }
};

export const SUPABASE_URL = 'https://vcuiodofvaprdesdatts.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjdWlvZG9mdmFwcmRlc2RhdHRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0MzQwNTgsImV4cCI6MjA5NDAxMDA1OH0.NXZAzJzdiGzcPDMrLxI1DTH8olxe-HzBJUeVep3Y4RM';
