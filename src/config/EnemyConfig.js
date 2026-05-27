// ============================================================
// EnemyConfig — Enemy type definitions
// ============================================================
export const ENEMY_CONFIG = {
  slime: {
    name: 'Forest Slime', hp: 30, damage: 5, speed: 40, aggroRange: 100,
    attackRange: 30, attackCooldown: 2000, xp: 15, goldMin: 2, goldMax: 5,
    zones: ['ashenveil_village'], respawnTime: 15000, behavior: 'wander',
    sprite: 'slime'
  },
  wolf: {
    name: 'Shadow Wolf', hp: 50, damage: 12, speed: 100, aggroRange: 150,
    attackRange: 35, attackCooldown: 1500, xp: 30, goldMin: 5, goldMax: 10,
    zones: ['dark_forest'], respawnTime: 20000, behavior: 'pack',
    sprite: 'wolf'
  },
  skeleton: {
    name: 'Skeleton Guard', hp: 60, damage: 15, speed: 60, aggroRange: 120,
    attackRange: 40, attackCooldown: 2000, xp: 40, goldMin: 8, goldMax: 15,
    zones: ['dark_forest'], respawnTime: 25000, behavior: 'guard',
    sprite: 'skeleton'
  },
  fire_imp: {
    name: 'Fire Imp', hp: 80, damage: 20, speed: 80, aggroRange: 160,
    attackRange: 120, attackCooldown: 2500, xp: 60, goldMin: 15, goldMax: 25,
    zones: ['dragons_lair'], respawnTime: 30000, behavior: 'ranged',
    sprite: 'fire_imp'
  },
  crystal_golem: {
    name: 'Crystal Golem', hp: 120, damage: 25, speed: 30, aggroRange: 80,
    attackRange: 45, attackCooldown: 3000, xp: 80, goldMin: 20, goldMax: 40,
    zones: ['crystal_caves'], respawnTime: 40000, behavior: 'guard',
    sprite: 'crystal_golem'
  },
  dragon: {
    name: 'Vorathix', hp: 500, damage: 40, speed: 70, aggroRange: 250,
    attackRange: 150, attackCooldown: 2000, xp: 500, goldMin: 100, goldMax: 200,
    zones: ['boss_arena'], respawnTime: 120000, behavior: 'boss', isBoss: true,
    sprite: 'dragon'
  },
  slime_king: {
    name: 'Slime King', hp: 300, damage: 25, speed: 50, aggroRange: 250,
    attackRange: 80, attackCooldown: 2000, xp: 300, goldMin: 50, goldMax: 100,
    zones: ['oakhaven_boss'], respawnTime: 120000, behavior: 'boss', isBoss: true,
    sprite: 'slime_king'
  },
  frost_colossus: {
    name: 'Frost Colossus', hp: 400, damage: 35, speed: 40, aggroRange: 250,
    attackRange: 100, attackCooldown: 2500, xp: 400, goldMin: 80, goldMax: 150,
    zones: ['frostpeak_boss'], respawnTime: 120000, behavior: 'boss', isBoss: true,
    sprite: 'frost_colossus'
  }
};

export const SPAWN_CONFIG = {
  ashenveil_village: [{ type: 'slime', count: 6 }],
  dark_forest: [{ type: 'wolf', count: 5 }, { type: 'skeleton', count: 4 }],
  crystal_caves: [{ type: 'crystal_golem', count: 4 }],
  dragons_lair: [{ type: 'fire_imp', count: 5 }],
  boss_arena: [{ type: 'dragon', count: 1 }],
  oakhaven_village: [],
  oakhaven_boss: [{ type: 'slime_king', count: 1 }],
  frostpeak_village: [],
  frostpeak_boss: [{ type: 'frost_colossus', count: 1 }],
  guild_citadel: [],
  marketplace: []
};
