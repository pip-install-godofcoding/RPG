-- ==============================================================================
-- REALM OF ASHENVEIL — PostgreSQL Database Schema
-- Run this entire script in your Supabase SQL Editor to set up the backend.
-- Features: 3NF Tables, Triggers, RPCs, RLS, Indexes, and Views.
-- ==============================================================================

-- 1. CLEANUP (Drop existing objects if they exist)
DROP FUNCTION IF EXISTS check_level_up CASCADE;
DROP TABLE IF EXISTS player_quests CASCADE;
DROP TABLE IF EXISTS quests CASCADE;
DROP TABLE IF EXISTS battle_log CASCADE;
DROP TABLE IF EXISTS inventory CASCADE;
DROP TABLE IF EXISTS items CASCADE;
DROP TABLE IF EXISTS rarity CASCADE;
DROP TABLE IF EXISTS item_types CASCADE;
DROP TABLE IF EXISTS players CASCADE;
DROP TABLE IF EXISTS guilds CASCADE;

-- ==============================================================================
-- 2. TABLES (3NF Normalized)
-- ==============================================================================

-- GUILDS (Independent Entity)
CREATE TABLE guilds (
    guild_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_name VARCHAR(64) UNIQUE NOT NULL,
    guild_tag VARCHAR(4) UNIQUE NOT NULL,
    level INT DEFAULT 1,
    gold_bank INT DEFAULT 0,
    max_members INT DEFAULT 50,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PLAYERS (Main Entity)
CREATE TABLE players (
    player_id UUID PRIMARY KEY DEFAULT auth.uid(), -- Links to Supabase Auth
    username VARCHAR(32) UNIQUE NOT NULL,
    class VARCHAR(16) NOT NULL DEFAULT 'warrior',
    level INT DEFAULT 1,
    xp INT DEFAULT 0,
    hp INT DEFAULT 200,
    max_hp INT DEFAULT 200,
    mana INT DEFAULT 100,
    gold INT DEFAULT 100,
    position_x FLOAT DEFAULT 0,
    position_y FLOAT DEFAULT 0,
    current_zone VARCHAR(64) DEFAULT 'ashenveil_village',
    guild_id UUID REFERENCES guilds(guild_id) ON DELETE SET NULL,
    is_online BOOLEAN DEFAULT true,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ITEM_TYPES (Lookup Table - 1NF)
CREATE TABLE item_types (
    type_id SERIAL PRIMARY KEY,
    type_name VARCHAR(32) UNIQUE NOT NULL -- 'weapon', 'armor', 'potion', 'quest'
);

-- RARITY (Lookup Table - 1NF)
CREATE TABLE rarity (
    rarity_id SERIAL PRIMARY KEY,
    rarity_name VARCHAR(16) UNIQUE NOT NULL, -- 'common', 'rare', 'epic', 'legendary'
    color_code VARCHAR(7) NOT NULL
);

-- ITEMS (Extracts type and rarity to eliminate transitive dependencies - 3NF)
CREATE TABLE items (
    item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(64) NOT NULL,
    type_id INT REFERENCES item_types(type_id),
    rarity_id INT REFERENCES rarity(rarity_id),
    attack_bonus INT DEFAULT 0,
    defense_bonus INT DEFAULT 0,
    sell_price INT DEFAULT 1,
    lore_text TEXT
);

-- INVENTORY (Junction Table M:N between players and items)
CREATE TABLE inventory (
    inv_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES players(player_id) ON DELETE CASCADE,
    item_id UUID REFERENCES items(item_id) ON DELETE CASCADE,
    quantity INT DEFAULT 1,
    equipped BOOLEAN DEFAULT false,
    slot VARCHAR(16), -- 'main_hand', 'head', 'chest'
    UNIQUE(player_id, item_id) -- Prevents duplicate stacks for non-stackable items
);

-- BATTLE_LOG (Append-only Audit Table)
CREATE TABLE battle_log (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attacker_id UUID REFERENCES players(player_id) ON DELETE SET NULL,
    defender_id VARCHAR(64), -- Can be a monster name or UUID
    damage INT NOT NULL,
    skill_used VARCHAR(32),
    is_critical BOOLEAN DEFAULT false,
    zone VARCHAR(64),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- QUESTS (Quest Templates)
CREATE TABLE quests (
    quest_id SERIAL PRIMARY KEY,
    title VARCHAR(64) NOT NULL,
    description TEXT,
    zone VARCHAR(64),
    xp_reward INT DEFAULT 0,
    gold_reward INT DEFAULT 0,
    required_level INT DEFAULT 1
);

-- PLAYER_QUESTS (Junction Table M:N)
CREATE TABLE player_quests (
    player_id UUID REFERENCES players(player_id) ON DELETE CASCADE,
    quest_id INT REFERENCES quests(quest_id) ON DELETE CASCADE,
    status VARCHAR(16) DEFAULT 'active', -- 'active', 'completed', 'failed'
    progress JSONB DEFAULT '{}'::jsonb,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    PRIMARY KEY (player_id, quest_id)
);

-- ==============================================================================
-- 3. TRIGGERS
-- ==============================================================================

-- Trigger Function: Auto Level-Up
CREATE OR REPLACE FUNCTION check_level_up()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if new XP crosses the threshold for the next level
    -- Formula: next_level^2 * 100
    WHILE NEW.xp >= (NEW.level * NEW.level * 100) LOOP
        NEW.level := NEW.level + 1;
        NEW.max_hp := NEW.max_hp + 20;
        NEW.hp := NEW.max_hp; -- Full heal on level up
    END LOOP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Bind Trigger to Players table
CREATE TRIGGER trg_level_up
BEFORE UPDATE OF xp ON players
FOR EACH ROW
EXECUTE FUNCTION check_level_up();

-- ==============================================================================
-- 4. VIEWS
-- ==============================================================================

-- Leaderboard View
CREATE OR REPLACE VIEW v_leaderboard AS
SELECT username, class, level, xp, gold
FROM players
ORDER BY level DESC, xp DESC
LIMIT 50;

-- Guild Stats View (Joins and Aggregates)
CREATE OR REPLACE VIEW v_guild_stats AS
SELECT 
    g.guild_name,
    COUNT(p.player_id) as member_count,
    AVG(p.level)::numeric(5,2) as avg_level,
    SUM(p.gold) as total_wealth
FROM guilds g
LEFT JOIN players p ON g.guild_id = p.guild_id
GROUP BY g.guild_id, g.guild_name
ORDER BY total_wealth DESC;

-- ==============================================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ==============================================================================

-- Enable RLS on core tables
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_quests ENABLE ROW LEVEL SECURITY;

-- Policy: Players can view everyone (for multiplayer)
CREATE POLICY "Anyone can view players"
ON players FOR SELECT
USING (true);

-- Policy: Players can ONLY update their own row
CREATE POLICY "Players can update their own data"
ON players FOR UPDATE
USING (auth.uid() = player_id)
WITH CHECK (auth.uid() = player_id);

-- Policy: Players can insert their own row (on first join)
CREATE POLICY "Players can insert their own row"
ON players FOR INSERT
WITH CHECK (auth.uid() = player_id);

-- Note: In this educational demo, since we might not be fully implementing Supabase Auth,
-- you might want to disable RLS or allow anonymous updates if testing without logging in.
-- To allow anon testing, uncomment these:
-- CREATE POLICY "Anon update" ON players FOR UPDATE USING (true);
-- CREATE POLICY "Anon insert" ON players FOR INSERT WITH CHECK (true);

-- ==============================================================================
-- 6. INDEXES
-- ==============================================================================

CREATE INDEX idx_players_zone ON players(current_zone);
CREATE INDEX idx_inventory_player ON inventory(player_id);
CREATE INDEX idx_battle_timestamp ON battle_log(timestamp DESC);

-- ==============================================================================
-- 7. STORED PROCEDURES (RPCs)
-- ==============================================================================

-- RPC to handle ability usage (validates mana)
CREATE OR REPLACE FUNCTION rpc_use_ability(p_player_id UUID, p_ability VARCHAR, p_cost INT)
RETURNS BOOLEAN AS $$
DECLARE
    current_mana INT;
BEGIN
    -- Get current mana
    SELECT mana INTO current_mana FROM players WHERE player_id = p_player_id;
    
    -- Check if enough mana
    IF current_mana >= p_cost THEN
        -- Deduct mana
        UPDATE players SET mana = mana - p_cost WHERE player_id = p_player_id;
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 8. INITIAL DATA SEEDING
-- ==============================================================================

INSERT INTO item_types (type_name) VALUES ('weapon'), ('armor'), ('potion'), ('quest') ON CONFLICT DO NOTHING;
INSERT INTO rarity (rarity_name, color_code) VALUES 
    ('common', '#9d9d9d'), 
    ('rare', '#0070dd'), 
    ('epic', '#a335ee'), 
    ('legendary', '#ff8000') 
ON CONFLICT DO NOTHING;
