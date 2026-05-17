-- ============================================================
-- Realm of Ashenveil — Full Database Schema
-- Supabase PostgreSQL (3NF normalized)
-- ============================================================

-- GUILDS (must be created before players due to FK)
CREATE TABLE guilds (
  guild_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_name VARCHAR(64) UNIQUE,
  guild_tag VARCHAR(5),
  level INT DEFAULT 1,
  xp INT DEFAULT 0,
  gold_bank INT DEFAULT 0,
  max_members INT DEFAULT 20,
  created_at TIMESTAMP DEFAULT NOW()
);

-- PLAYERS
CREATE TABLE players (
  player_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(32) UNIQUE NOT NULL,
  class VARCHAR(16),
  level INT DEFAULT 1,
  xp INT DEFAULT 0,
  hp INT DEFAULT 100,
  max_hp INT DEFAULT 100,
  mana INT DEFAULT 50,
  gold INT DEFAULT 100,
  position_x FLOAT DEFAULT 0,
  position_y FLOAT DEFAULT 0,
  current_zone VARCHAR(64) DEFAULT 'ashenveil_village',
  guild_id UUID REFERENCES guilds(guild_id),
  last_seen TIMESTAMP DEFAULT NOW(),
  is_online BOOLEAN DEFAULT false
);

-- ITEM TYPES (1NF → 2NF normalization)
CREATE TABLE item_types (
  type_id SERIAL PRIMARY KEY,
  type_name VARCHAR(32)
);

-- RARITY (2NF → 3NF normalization)
CREATE TABLE rarity (
  rarity_id SERIAL PRIMARY KEY,
  rarity_name VARCHAR(16),
  drop_rate FLOAT,
  color_hex VARCHAR(7)
);

-- ITEMS
CREATE TABLE items (
  item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(64),
  type_id INT REFERENCES item_types(type_id),
  rarity_id INT REFERENCES rarity(rarity_id),
  attack_bonus INT DEFAULT 0,
  defense_bonus INT DEFAULT 0,
  magic_bonus INT DEFAULT 0,
  hp_bonus INT DEFAULT 0,
  sell_price INT DEFAULT 10,
  lore_text TEXT,
  icon_path VARCHAR(128)
);

-- INVENTORY
CREATE TABLE inventory (
  inv_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES players(player_id) ON DELETE CASCADE,
  item_id UUID REFERENCES items(item_id),
  quantity INT DEFAULT 1,
  equipped BOOLEAN DEFAULT false,
  slot VARCHAR(16)
);

-- GUILD MEMBERS
CREATE TABLE guild_members (
  player_id UUID REFERENCES players(player_id),
  guild_id UUID REFERENCES guilds(guild_id),
  rank VARCHAR(16) DEFAULT 'recruit',
  joined_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (player_id, guild_id)
);

-- QUESTS
CREATE TABLE quests (
  quest_id SERIAL PRIMARY KEY,
  title VARCHAR(128),
  description TEXT,
  zone VARCHAR(64),
  xp_reward INT,
  gold_reward INT,
  item_reward UUID REFERENCES items(item_id),
  required_level INT DEFAULT 1,
  quest_type VARCHAR(16)
);

-- PLAYER QUESTS
CREATE TABLE player_quests (
  player_id UUID REFERENCES players(player_id),
  quest_id INT REFERENCES quests(quest_id),
  status VARCHAR(16) DEFAULT 'active',
  progress JSONB DEFAULT '{}',
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  PRIMARY KEY (player_id, quest_id)
);

-- BATTLE LOG
CREATE TABLE battle_log (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attacker_id UUID,
  defender_id UUID,
  damage INT,
  skill_used VARCHAR(64),
  is_critical BOOLEAN DEFAULT false,
  timestamp TIMESTAMP DEFAULT NOW(),
  zone VARCHAR(64)
);

-- TRADES
CREATE TABLE trades (
  trade_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES players(player_id),
  buyer_id UUID REFERENCES players(player_id),
  item_id UUID REFERENCES items(item_id),
  gold_amount INT,
  status VARCHAR(16) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_players_zone ON players(current_zone);
CREATE INDEX idx_players_online ON players(is_online);
CREATE INDEX idx_inventory_player ON inventory(player_id);
CREATE INDEX idx_battle_log_time ON battle_log(timestamp DESC);
CREATE INDEX idx_items_rarity ON items(rarity_id);

-- ============================================================
-- VIEWS
-- ============================================================
CREATE VIEW top_warriors_this_week AS
  SELECT p.username, p.class, p.level,
         COUNT(b.log_id) as kills,
         SUM(b.damage) as total_damage
  FROM players p
  JOIN battle_log b ON b.attacker_id = p.player_id
  WHERE b.timestamp > NOW() - INTERVAL '7 days'
  GROUP BY p.player_id, p.username, p.class, p.level
  ORDER BY total_damage DESC
  LIMIT 10;

CREATE VIEW guild_leaderboard AS
  SELECT g.guild_name, g.guild_tag, g.level,
         COUNT(gm.player_id) as member_count,
         SUM(p.level) as combined_power
  FROM guilds g
  JOIN guild_members gm ON gm.guild_id = g.guild_id
  JOIN players p ON p.player_id = gm.player_id
  GROUP BY g.guild_id, g.guild_name, g.guild_tag, g.level
  ORDER BY combined_power DESC;

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto level-up when XP threshold crossed
CREATE OR REPLACE FUNCTION check_level_up() RETURNS TRIGGER AS $$
BEGIN
  WHILE NEW.xp >= (NEW.level * NEW.level * 100) LOOP
    NEW.level := NEW.level + 1;
    NEW.max_hp := NEW.max_hp + 20;
    NEW.hp := NEW.max_hp;
    NEW.xp := NEW.xp - ((NEW.level-1) * (NEW.level-1) * 100);
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_level_up
BEFORE UPDATE OF xp ON players
FOR EACH ROW EXECUTE FUNCTION check_level_up();

-- Auto-equip best weapon on loot
CREATE OR REPLACE FUNCTION auto_equip_best() RETURNS TRIGGER AS $$
DECLARE best_attack INT;
BEGIN
  SELECT MAX(i.attack_bonus) INTO best_attack
  FROM inventory inv JOIN items i ON i.item_id = inv.item_id
  WHERE inv.player_id = NEW.player_id AND inv.slot = 'weapon';

  UPDATE inventory SET equipped = false
  WHERE player_id = NEW.player_id AND slot = 'weapon';

  UPDATE inventory SET equipped = true
  WHERE player_id = NEW.player_id AND slot = 'weapon'
    AND item_id = (
      SELECT inv.item_id FROM inventory inv
      JOIN items i ON i.item_id = inv.item_id
      WHERE inv.player_id = NEW.player_id AND inv.slot = 'weapon'
      ORDER BY i.attack_bonus DESC LIMIT 1
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auto_equip
AFTER INSERT ON inventory
FOR EACH ROW
WHEN (NEW.slot = 'weapon')
EXECUTE FUNCTION auto_equip_best();

-- ============================================================
-- STORED PROCEDURES (RPC)
-- ============================================================

-- LootDrop
CREATE OR REPLACE FUNCTION LootDrop(p_player UUID, enemy_level INT)
RETURNS TABLE(item_name TEXT, rarity TEXT) AS $$
DECLARE
  roll FLOAT := random();
  selected_item UUID;
  selected_rarity INT;
BEGIN
  IF roll < 0.01 THEN selected_rarity := 4;
  ELSIF roll < 0.05 THEN selected_rarity := 3;
  ELSIF roll < 0.20 THEN selected_rarity := 2;
  ELSE selected_rarity := 1;
  END IF;

  SELECT item_id INTO selected_item FROM items
  WHERE rarity_id = selected_rarity
  ORDER BY random() LIMIT 1;

  IF selected_item IS NOT NULL THEN
    INSERT INTO inventory(player_id, item_id, quantity)
    VALUES (p_player, selected_item, 1)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN QUERY SELECT i.name::TEXT, r.rarity_name::TEXT
  FROM items i JOIN rarity r ON r.rarity_id = i.rarity_id
  WHERE i.item_id = selected_item;
END;
$$ LANGUAGE plpgsql;

-- StartBattle
CREATE OR REPLACE FUNCTION StartBattle(atk UUID, def UUID)
RETURNS JSONB AS $$
DECLARE
  atk_power INT; def_power INT; dmg INT; crit BOOLEAN;
  result JSONB;
BEGIN
  SELECT COALESCE(SUM(i.attack_bonus), 10) INTO atk_power
  FROM inventory inv JOIN items i ON i.item_id = inv.item_id
  WHERE inv.player_id = atk AND inv.equipped = true;

  SELECT COALESCE(SUM(i.defense_bonus), 5) INTO def_power
  FROM inventory inv JOIN items i ON i.item_id = inv.item_id
  WHERE inv.player_id = def AND inv.equipped = true;

  crit := random() < 0.15;
  dmg := GREATEST(1, atk_power - def_power + floor(random()*10)::INT);
  IF crit THEN dmg := dmg * 2; END IF;

  UPDATE players SET hp = GREATEST(0, hp - dmg) WHERE player_id = def;

  INSERT INTO battle_log(attacker_id, defender_id, damage, is_critical)
  VALUES (atk, def, dmg, crit);

  result := jsonb_build_object('damage', dmg, 'critical', crit,
                                'attacker', atk, 'defender', def);
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- JoinGuild
CREATE OR REPLACE FUNCTION JoinGuild(p UUID, g UUID) RETURNS BOOLEAN AS $$
DECLARE member_count INT;
BEGIN
  SELECT COUNT(*) INTO member_count FROM guild_members WHERE guild_id = g;
  IF member_count >= (SELECT max_members FROM guilds WHERE guild_id = g) THEN
    RETURN false;
  END IF;

  DELETE FROM guild_members WHERE player_id = p;
  INSERT INTO guild_members(player_id, guild_id) VALUES (p, g);
  UPDATE players SET guild_id = g WHERE player_id = p;
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Players viewable by all" ON players FOR SELECT USING (true);
CREATE POLICY "Players update own" ON players FOR UPDATE USING (auth.uid() = player_id);
CREATE POLICY "Players insert own" ON players FOR INSERT WITH CHECK (auth.uid() = player_id);

ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own inventory" ON inventory FOR ALL USING (auth.uid() = player_id);

ALTER TABLE guilds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Guilds viewable" ON guilds FOR SELECT USING (true);
CREATE POLICY "Guilds insertable" ON guilds FOR INSERT WITH CHECK (true);

ALTER TABLE guild_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Guild members viewable" ON guild_members FOR SELECT USING (true);

ALTER TABLE battle_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Battle log viewable" ON battle_log FOR SELECT
  USING (auth.uid() = attacker_id OR auth.uid() = defender_id);
CREATE POLICY "Battle log insert" ON battle_log FOR INSERT WITH CHECK (true);

ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Trade access" ON trades FOR ALL
  USING (auth.uid() = seller_id OR auth.uid() = buyer_id);

ALTER TABLE quests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Quests viewable" ON quests FOR SELECT USING (true);

ALTER TABLE player_quests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own quests" ON player_quests FOR ALL USING (auth.uid() = player_id);
