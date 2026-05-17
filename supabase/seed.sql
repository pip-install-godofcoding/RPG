-- ============================================================
-- Seed Data — Item types, rarities, starter items, quests
-- ============================================================

-- Item Types
INSERT INTO item_types (type_name) VALUES ('weapon'), ('armor'), ('potion'), ('quest_item');

-- Rarities
INSERT INTO rarity (rarity_name, drop_rate, color_hex) VALUES
  ('common', 0.80, '#9d9d9d'),
  ('rare', 0.15, '#0070dd'),
  ('epic', 0.04, '#a335ee'),
  ('legendary', 0.01, '#ff8000');

-- Items
INSERT INTO items (name, type_id, rarity_id, attack_bonus, defense_bonus, magic_bonus, hp_bonus, sell_price, lore_text) VALUES
  -- Common weapons
  ('Rusty Sword', 1, 1, 5, 0, 0, 0, 5, 'A well-worn blade, still sharp enough to cut.'),
  ('Wooden Staff', 1, 1, 3, 0, 5, 0, 5, 'Carved from ashenveil oak.'),
  ('Iron Dagger', 1, 1, 4, 0, 0, 0, 8, 'Quick and deadly in the right hands.'),
  ('Short Bow', 1, 1, 6, 0, 0, 0, 7, 'Simple but effective at range.'),
  -- Common armor
  ('Leather Vest', 2, 1, 0, 4, 0, 10, 10, 'Basic protection for aspiring heroes.'),
  ('Cloth Robe', 2, 1, 0, 2, 3, 5, 8, 'Woven with faint magical threads.'),
  -- Common potions
  ('Health Potion', 3, 1, 0, 0, 0, 50, 15, 'Restores 50 HP instantly.'),
  ('Mana Potion', 3, 1, 0, 0, 0, 0, 12, 'Restores 30 Mana instantly.'),
  -- Rare weapons
  ('Shadow Blade', 1, 2, 12, 0, 2, 0, 50, 'Forged in darkness, it hungers for light.'),
  ('Crystal Wand', 1, 2, 5, 0, 15, 0, 55, 'Channels the power of crystal caves.'),
  ('Wolf Fang Bow', 1, 2, 14, 0, 0, 0, 45, 'Strung with wolf sinew. Never misses.'),
  ('Thornmaw Axe', 1, 2, 16, 2, 0, 0, 60, 'Hewn from the Corrupted One''s thorn.'),
  -- Rare armor
  ('Chainmail Armor', 2, 2, 0, 10, 0, 25, 40, 'Forged by Blacksmith Doran himself.'),
  ('Enchanted Cloak', 2, 2, 0, 6, 8, 15, 35, 'Shimmers with protective enchantments.'),
  -- Epic weapons
  ('Dragonfire Blade', 1, 3, 25, 3, 5, 0, 200, 'Burns with the fury of Vorathix.'),
  ('Arcane Scepter', 1, 3, 8, 0, 30, 10, 180, 'The Architect''s apprentice once wielded this.'),
  ('Shadowstep Daggers', 1, 3, 20, 0, 5, 0, 190, 'You move before the enemy can think.'),
  -- Epic armor
  ('Dragon Scale Mail', 2, 3, 2, 20, 5, 50, 250, 'Scales of a lesser dragon, still formidable.'),
  -- Legendary
  ('The Shattered Edge', 1, 4, 40, 5, 10, 20, 1000, 'A fragment of the original Codex, reforged into a blade that cuts through reality itself.'),
  ('Crown of the Architect', 2, 4, 5, 15, 25, 100, 1200, 'Those who wear it hear whispers of the database that underlies all things.');

-- Quests
INSERT INTO quests (title, description, zone, xp_reward, gold_reward, required_level, quest_type) VALUES
  ('First Steps', 'Kill 5 Forest Slimes near the village to prove your worth.', 'ashenveil_village', 100, 50, 1, 'main'),
  ('The Missing Scroll', 'Find the stolen relic hidden deep in the Crystal Caves.', 'crystal_caves', 250, 100, 5, 'main'),
  ('A Debt Repaid', 'Defend Ashenveil Village from the bandit raid! (Timed event)', 'ashenveil_village', 300, 150, 3, 'main'),
  ('Into Darkness', 'Explore 3 distinct areas of the Dark Forest.', 'dark_forest', 200, 80, 10, 'main'),
  ('The Mole', 'Spy on the Shadowguild deep in the forest. A moral choice awaits...', 'dark_forest', 400, 200, 15, 'main'),
  ('Trial of Flames', 'Survive the solo dungeon in the Dragon''s Lair. No party allowed.', 'dragons_lair', 500, 300, 25, 'main'),
  ('Wolf Cull', 'Eliminate 10 Shadow Wolves terrorizing the forest paths.', 'dark_forest', 150, 60, 5, 'side'),
  ('Crystal Collector', 'Gather 5 Crystal Cores from defeated Crystal Golems.', 'crystal_caves', 200, 90, 15, 'side'),
  ('Guild Initiation', 'Complete 3 tasks for the Guild Citadel to earn membership.', 'guild_citadel', 180, 70, 8, 'guild'),
  ('Daily Hunt', 'Defeat any 10 enemies today. Resets at midnight.', 'ashenveil_village', 100, 40, 1, 'daily'),
  ('Market Delivery', 'Deliver supplies from the village to the marketplace.', 'marketplace', 80, 60, 2, 'side'),
  ('Dragon''s Pact', 'Confront the ancient dragon Vorathix. Choose: ally or fight.', 'dragons_lair', 1000, 500, 30, 'main');
