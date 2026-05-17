// ============================================================
// ClassConfig — Data-driven class definitions
// ============================================================
export const CLASS_CONFIG = {
  warrior: {
    name: 'Warrior',
    color: 0xcc3333,
    description: 'Frontline brawler with heavy armor and devastating melee attacks.',
    stats: { hp: 200, maxHp: 200, mana: 30, maxMana: 30, attack: 18, defense: 15, speed: 140 },
    resource: 'mana',
    abilities: [
      { name: 'Shield Bash', key: 1, cost: 10, cooldown: 3000, damage: 25, range: 50, type: 'melee', effect: 'knockback', desc: 'Bash enemies back with your shield' },
      { name: 'War Cry', key: 2, cost: 15, cooldown: 8000, damage: 0, range: 150, type: 'buff', effect: 'attackUp', duration: 5000, desc: 'Increase attack for 5 seconds' },
      { name: 'Heavy Strike', key: 3, cost: 20, cooldown: 5000, damage: 45, range: 50, type: 'melee', effect: 'stun', desc: 'Powerful strike that stuns' },
      { name: 'Fortify', key: 4, cost: 25, cooldown: 12000, damage: 0, range: 0, type: 'buff', effect: 'defenseUp', duration: 8000, desc: 'Double defense for 8 seconds' }
    ]
  },
  mage: {
    name: 'Mage',
    color: 0x3366cc,
    description: 'Master of arcane arts. Devastating AoE spells but fragile.',
    stats: { hp: 80, maxHp: 80, mana: 150, maxMana: 150, attack: 8, defense: 5, speed: 130 },
    resource: 'mana',
    abilities: [
      { name: 'Fireball', key: 1, cost: 20, cooldown: 2000, damage: 35, range: 250, type: 'projectile', effect: 'burn', desc: 'Launch a fireball at enemies' },
      { name: 'Ice Nova', key: 2, cost: 35, cooldown: 6000, damage: 25, range: 120, type: 'aoe', effect: 'freeze', desc: 'Freeze all nearby enemies' },
      { name: 'Heal', key: 3, cost: 30, cooldown: 5000, damage: -40, range: 0, type: 'self', effect: 'heal', desc: 'Restore 40 HP' },
      { name: 'Mana Shield', key: 4, cost: 40, cooldown: 15000, damage: 0, range: 0, type: 'buff', effect: 'manaShield', duration: 6000, desc: 'Absorb damage using mana' }
    ]
  },
  rogue: {
    name: 'Rogue',
    color: 0x33aa55,
    description: 'Shadow assassin with stealth mechanics and deadly backstabs.',
    stats: { hp: 120, maxHp: 120, mana: 100, maxMana: 100, attack: 14, defense: 8, speed: 180 },
    resource: 'stamina',
    abilities: [
      { name: 'Stealth', key: 1, cost: 25, cooldown: 8000, damage: 0, range: 0, type: 'buff', effect: 'stealth', duration: 4000, desc: 'Become invisible for 4 seconds' },
      { name: 'Backstab', key: 2, cost: 20, cooldown: 3000, damage: 50, range: 45, type: 'melee', effect: 'backstab', desc: '2x damage from behind' },
      { name: 'Dodge Roll', key: 3, cost: 15, cooldown: 2000, damage: 0, range: 0, type: 'movement', effect: 'dodge', desc: 'Invincible dash forward' },
      { name: 'Poison Blade', key: 4, cost: 30, cooldown: 10000, damage: 10, range: 45, type: 'melee', effect: 'poison', duration: 5000, desc: 'Poison enemy for 5 seconds' }
    ]
  },
  archer: {
    name: 'Archer',
    color: 0xcc9933,
    description: 'Sharpshooter with ranged attacks, traps, and keen vision.',
    stats: { hp: 100, maxHp: 100, mana: 100, maxMana: 100, attack: 12, defense: 7, speed: 160 },
    resource: 'stamina',
    abilities: [
      { name: 'Arrow Shot', key: 1, cost: 10, cooldown: 1500, damage: 22, range: 300, type: 'projectile', effect: 'none', desc: 'Fire an arrow at long range' },
      { name: 'Trap', key: 2, cost: 20, cooldown: 6000, damage: 30, range: 0, type: 'placed', effect: 'snare', duration: 3000, desc: 'Place a trap that snares enemies' },
      { name: 'Eagle Eye', key: 3, cost: 15, cooldown: 10000, damage: 0, range: 0, type: 'utility', effect: 'zoom', duration: 5000, desc: 'Zoom camera out to see further' },
      { name: 'Rain of Arrows', key: 4, cost: 40, cooldown: 12000, damage: 18, range: 200, type: 'aoe', effect: 'none', desc: 'Rain arrows on an area (multi-hit)' }
    ]
  }
};
