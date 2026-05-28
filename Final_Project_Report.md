# FINAL PROJECT REPORT: REALM OF ASHENVEIL

---

## 1. Introduction
**Realm of Ashenveil** is a browser-based, massively multiplayer 2D role-playing game (MMORPG) built entirely on modern web technologies. Designed with a retro top-down aesthetic, the game seamlessly blends classic RPG elements—such as turn-based combat, exploration, and leveling—with real-time cloud database synchronization. 

What makes *Realm of Ashenveil* unique is its transparent backend architecture. The game features an integrated "DBMS Mode" which acts as an educational overlay, visually demonstrating the raw PostgreSQL transactions happening in real-time as players move, attack, trade, and interact with the game world.

---

## 2. Objectives
The primary objectives of this project are:
1. **Interactive Gameplay:** To deliver a fully functional 2D RPG experience, including class selection, stat scaling, turn-based monster battles, and quest tracking.
2. **Real-time Multiplayer Synchronization:** To achieve low-latency state synchronization across multiple clients, allowing players to see each other's movements and engage in direct Player vs. Player (PvP) combat.
3. **Database Transparency & Education:** To expose the underlying database operations (SQL `INSERT`, `UPDATE`, `SELECT`) to the player in real-time, bridging the gap between front-end gaming and back-end data engineering.
4. **Cross-Platform Accessibility:** To ensure the game is fully responsive and playable across both desktop browsers and mobile touch-devices (via virtual joysticks) without requiring software installation.

---

## 3. Application & Features
The application serves as both a fully playable game and an interactive demonstration of modern cloud-database capabilities.

### Key Use Cases & Mechanics:
*   **Player Progression:** Players can choose distinct classes (Warrior, Mage, Ranger, Rogue, Paladin), defeat enemies to earn XP, and level up to dynamically increase their Health, Mana, Attack, and Defense stats.
*   **Turn-Based Combat (PvE & PvP):** A robust battle engine where players can fight AI monsters or challenge other live players to duels. The system handles ability cooldowns, resource costs (Mana/Stamina), critical hits, and evasions.
*   **Guild Management:** Players can form guilds, pool their gold into a shared guild bank, and view real-time member rosters.
*   **Dynamic Marketplace:** An interactive shop system where players can spend earned gold on weapons, armor, and potions.
*   **Live DBMS Terminal:** A specialized toggleable UI that displays the actual SQL queries being executed on the Supabase backend during game events (e.g., viewing an `UPDATE players SET hp = ...` query trigger when taking damage).

---

## 4. Relational Schema & ER Diagram
The backend is powered by a PostgreSQL database managed via Supabase. The database architecture strictly adheres to **Third Normal Form (3NF)** to ensure data integrity, eliminate redundancy, and efficiently resolve many-to-many relationships through junction tables.

### 4.1. Entity-Relationship Diagram

```mermaid
erDiagram
    %% Core Entities
    GUILDS {
        uuid guild_id PK
        varchar guild_name "UNIQUE"
        varchar guild_tag "UNIQUE"
        int level
        int gold_bank
        int max_members
        timestamp created_at
    }

    PLAYERS {
        uuid player_id PK "Auth UID"
        varchar username "UNIQUE"
        varchar class
        int level
        int xp
        int hp
        int max_hp
        int mana
        int gold
        float position_x
        float position_y
        varchar current_zone
        uuid guild_id FK
        boolean is_online
        timestamp last_seen
        timestamp created_at
    }

    ITEMS {
        uuid item_id PK
        varchar name
        int type_id FK
        int rarity_id FK
        int attack_bonus
        int defense_bonus
        int sell_price
        text lore_text
    }

    QUESTS {
        int quest_id PK
        varchar title
        text description
        varchar zone
        int xp_reward
        int gold_reward
        int required_level
    }

    %% Lookup Tables (1NF Optimization)
    ITEM_TYPES {
        int type_id PK
        varchar type_name "UNIQUE"
    }

    RARITY {
        int rarity_id PK
        varchar rarity_name "UNIQUE"
        varchar color_code
    }

    %% Junction Tables (Many-to-Many resolution)
    INVENTORY {
        uuid inv_id PK
        uuid player_id FK
        uuid item_id FK
        int quantity
        boolean equipped
        varchar slot
    }

    PLAYER_QUESTS {
        uuid player_id PK, FK
        int quest_id PK, FK
        varchar status
        jsonb progress
        timestamp started_at
        timestamp completed_at
    }

    %% Audit / Log Tables
    BATTLE_LOG {
        uuid log_id PK
        uuid attacker_id FK
        varchar defender_id
        int damage
        varchar skill_used
        boolean is_critical
        varchar zone
        timestamp timestamp
    }

    %% Relationships Mapping
    GUILDS ||--o{ PLAYERS : "has many"
    PLAYERS ||--o{ INVENTORY : "owns"
    ITEMS ||--o{ INVENTORY : "is stacked in"
    ITEM_TYPES ||--o{ ITEMS : "categorizes"
    RARITY ||--o{ ITEMS : "describes"
    PLAYERS ||--o{ PLAYER_QUESTS : "tracks"
    QUESTS ||--o{ PLAYER_QUESTS : "defines"
    PLAYERS ||--o{ BATTLE_LOG : "initiates"
```

### 4.2. Schema Design Notes
*   **UUIDs for Security:** The database extensively uses Universally Unique Identifiers (UUIDs) for primary keys, specifically tying `player_id` to Supabase Authentication tokens to secure Row Level Security (RLS) policies.
*   **Junction Tables:** The `INVENTORY` and `PLAYER_QUESTS` tables act as necessary mapping tables to resolve Many-to-Many relationships without duplicating core player or item data.
*   **Lookup Normalization:** Repeating strings like "Weapon" or "Legendary" are broken out into `ITEM_TYPES` and `RARITY` tables, meaning the massive `ITEMS` table only needs to store lightweight integer references (Foreign Keys).
