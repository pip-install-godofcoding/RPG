// ============================================================
// QuestSystem — Branching quests, journal UI, progress tracking
// ============================================================
import Phaser from 'phaser';

const STORY_QUESTS = [
  {
    id: 'first_steps', title: 'First Steps', chapter: 1,
    desc: 'Kill 5 Forest Slimes near the village to prove your worth.',
    zone: 'ashenveil_village', type: 'kill', target: 'slime', required: 5,
    xp: 100, gold: 50, nextQuest: 'into_darkness',
    dialogue: [
      { speaker: 'Elder Mirela', text: 'Welcome, young hero. The forest slimes grow bolder each day.\nProve your mettle by slaying five of them.' },
      { speaker: 'Elder Mirela', text: 'Return when the deed is done. The village will remember your name.', condition: 'complete' }
    ]
  },
  {
    id: 'into_darkness', title: 'Into Darkness', chapter: 1,
    desc: 'Explore the Dark Forest. Beware the wolves.',
    zone: 'dark_forest', type: 'explore', target: 'dark_forest', required: 1,
    xp: 200, gold: 80, nextQuest: 'wolf_cull',
    dialogue: [
      { speaker: 'Wanderer Aelith', text: 'The Dark Forest holds ancient secrets...\nVenture forth, but do not stray from the path.' },
      { speaker: 'Wanderer Aelith', text: 'You\'ve braved the darkness! The forest whispers of greater threats.', condition: 'complete' }
    ]
  },
  {
    id: 'wolf_cull', title: 'Wolf Cull', chapter: 2,
    desc: 'Eliminate 10 Shadow Wolves terrorizing the forest paths.',
    zone: 'dark_forest', type: 'kill', target: 'wolf', required: 10,
    xp: 300, gold: 120, nextQuest: 'crystal_collector',
    dialogue: [
      { speaker: 'Captain Solen', text: 'The wolves have gone mad. Something corrupts them.\nThin their numbers before they reach the village.' },
      { speaker: 'Captain Solen', text: 'The wolf packs are broken. But what drove them to frenzy?', condition: 'complete' }
    ]
  },
  {
    id: 'crystal_collector', title: 'Crystal Collector', chapter: 2,
    desc: 'Defeat 4 Crystal Golems deep in the caves.',
    zone: 'crystal_caves', type: 'kill', target: 'crystal_golem', required: 4,
    xp: 400, gold: 200, nextQuest: 'trial_of_flames',
    dialogue: [
      { speaker: 'Merchant Veth', text: 'The Crystal Caves hold power beyond measure.\nBring me cores from the golems within.' },
      { speaker: 'Merchant Veth', text: 'These cores... they pulse with the Codex\'s energy!', condition: 'complete' }
    ]
  },
  {
    id: 'trial_of_flames', title: 'Trial of Flames', chapter: 3,
    desc: 'Defeat 5 Fire Imps in the Dragon\'s Lair.',
    zone: 'dragons_lair', type: 'kill', target: 'fire_imp', required: 5,
    xp: 500, gold: 300, nextQuest: 'dragons_pact',
    dialogue: [
      { speaker: 'Wanderer Aelith', text: 'The Dragon\'s Lair awaits. Only the worthy survive its trials.\nThe imps guard the path to Vorathix.' },
      { speaker: 'Wanderer Aelith', text: 'The flames bow to you now. Vorathix has noticed.', condition: 'complete' }
    ]
  },
  {
    id: 'dragons_pact', title: 'Dragon\'s Pact', chapter: 4,
    desc: 'Confront the dragon Vorathix in the Boss Arena.',
    zone: 'boss_arena', type: 'kill', target: 'dragon', required: 1,
    xp: 1000, gold: 500, nextQuest: null,
    dialogue: [
      { speaker: 'Elder Mirela', text: 'The Shattered Codex calls you to its guardian.\nVorathix knows the truth of this world. Defeat him, or learn it.' },
      { speaker: 'Vorathix', text: 'You are but data in the Codex, hero.\nYet... you have earned my respect. The database remembers all.', condition: 'complete' }
    ]
  }
];

export class QuestSystem {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    this.quests = STORY_QUESTS;
    this.activeQuests = [];
    this.completedQuests = [];
    this.progress = {};
    this.journalOpen = false;
    this.journalElements = [];

    // Start first quest
    this.startQuest('first_steps');

    // Track kills
    scene.events.on('enemyKilled', ({ enemy }) => {
      this._onKill(enemy.config.sprite);
    });

    // Track zone visits
    scene.zoneManager.onZoneChange = (key, zone) => {
      scene.hud?.updateZone(zone.name || 'The Wilds');
      scene.audio?.zoneEnter();
      scene._saveGame();
      this._onExplore(key);
    };

    // Journal toggle (J key)
    scene.input.keyboard.addKey('J').on('down', () => this.toggleJournal());

    // Quest tracker HUD
    this._createTracker();
  }

  startQuest(id) {
    const q = this.quests.find(q => q.id === id);
    if (!q || this.activeQuests.includes(id) || this.completedQuests.includes(id)) return;
    this.activeQuests.push(id);
    this.progress[id] = 0;

    // Show notification
    this._showNotification(`New Quest: ${q.title}`, q.desc);

    // Show start dialogue
    if (q.dialogue[0]) {
      this.scene.time.delayedCall(1500, () => this._showQuestDialogue(q.dialogue[0]));
    }
  }

  _onKill(enemyType) {
    this.activeQuests.forEach(id => {
      const q = this.quests.find(q => q.id === id);
      if (q && q.type === 'kill' && q.target === enemyType) {
        this.progress[id] = (this.progress[id] || 0) + 1;
        this._updateTracker();
        if (this.progress[id] >= q.required) {
          this._completeQuest(id);
        }
      }
    });
  }

  _onExplore(zoneKey) {
    this.activeQuests.forEach(id => {
      const q = this.quests.find(q => q.id === id);
      if (q && q.type === 'explore' && q.target === zoneKey) {
        this.progress[id] = 1;
        this._updateTracker();
        this._completeQuest(id);
      }
    });
  }

  _completeQuest(id) {
    const q = this.quests.find(q => q.id === id);
    if (!q) return;

    this.activeQuests = this.activeQuests.filter(qid => qid !== id);
    this.completedQuests.push(id);

    // Rewards
    this.player.gainXP(q.xp);
    this.player.gold += q.gold;

    // Show completion
    this._showNotification(`Quest Complete: ${q.title}`, `+${q.xp} XP  +${q.gold} Gold`);
    this.scene.audio?.levelUp();

    // Completion dialogue
    const completeDlg = q.dialogue.find(d => d.condition === 'complete');
    if (completeDlg) {
      this.scene.time.delayedCall(2000, () => this._showQuestDialogue(completeDlg));
    }

    // Chain next quest
    if (q.nextQuest) {
      this.scene.time.delayedCall(4000, () => this.startQuest(q.nextQuest));
    }

    this._updateTracker();

    // DBMS mode logging
    if (window.ASHENVEIL?.dbmsMode) {
      console.log(`%c[SQL] UPDATE player_quests SET status='completed', completed_at=NOW() WHERE quest_id='${id}';`, 'color:#ff8800');
      console.log(`%c[SQL] UPDATE players SET xp=xp+${q.xp}, gold=gold+${q.gold} WHERE username='${window.ASHENVEIL.username}';`, 'color:#ff8800');
    }
  }

  _showNotification(title, desc) {
    const s = this.scene;
    const bg = s.add.rectangle(640, 120, 450, 60, 0x111122, 0.92)
      .setStrokeStyle(2, 0xa855f7, 0.8).setDepth(200).setScrollFactor(0).setAlpha(0);
    const t1 = s.add.text(640, 107, title, {
      fontFamily: 'Inter, sans-serif', fontSize: '15px', color: '#ffdd44',
      stroke: '#000000', strokeThickness: 2
    }).setOrigin(0.5).setDepth(201).setScrollFactor(0).setAlpha(0);
    const t2 = s.add.text(640, 130, desc, {
      fontFamily: 'Inter', fontSize: '16px', color: '#cccccc'
    }).setOrigin(0.5).setDepth(201).setScrollFactor(0).setAlpha(0);

    s.tweens.add({ targets: [bg, t1, t2], alpha: 1, y: '-=10', duration: 400 });
    s.time.delayedCall(3000, () => {
      s.tweens.add({ targets: [bg, t1, t2], alpha: 0, y: '-=20', duration: 500,
        onComplete: () => { bg.destroy(); t1.destroy(); t2.destroy(); }
      });
    });
  }

  _showQuestDialogue(dlg) {
    const s = this.scene;
    const cx = 640, cy = 540;
    const bg = s.add.rectangle(cx, cy, 620, 120, 0x111122, 0.95)
      .setStrokeStyle(2, 0xa855f7, 0.8).setDepth(200).setScrollFactor(0);
    const name = s.add.text(cx - 290, cy - 45, dlg.speaker, {
      fontFamily: 'Inter, sans-serif', fontSize: '13px', color: '#a855f7'
    }).setDepth(201).setScrollFactor(0);
    const txt = s.add.text(cx - 290, cy - 20, dlg.text, {
      fontFamily: 'Inter', fontSize: '13px', color: '#e0d0b0',
      wordWrap: { width: 580 }, lineSpacing: 4
    }).setDepth(201).setScrollFactor(0);

    s.time.delayedCall(5000, () => { bg.destroy(); name.destroy(); txt.destroy(); });
  }

  _createTracker() {
    const s = this.scene;
    this.trackerBg = s.add.rectangle(1170, 475, 200, 110, 0x0a0a1a, 0.7)
      .setStrokeStyle(1, 0x4444aa, 0.4).setDepth(99).setScrollFactor(0);
    this.trackerTitle = s.add.text(1080, 430, '📜 QUEST', {
      fontFamily: 'Inter, sans-serif', fontSize: '9px', color: '#a855f7'
    }).setDepth(100).setScrollFactor(0);
    this.trackerText = s.add.text(1080, 445, '', {
      fontFamily: 'Inter, sans-serif', fontSize: '13px', color: '#e0d0b0',
      wordWrap: { width: 180 }, lineSpacing: 3
    }).setDepth(100).setScrollFactor(0);
    this._updateTracker();
  }

  _updateTracker() {
    if (this.activeQuests.length === 0) {
      this.trackerText.setText('No active quests');
      return;
    }
    const id = this.activeQuests[0];
    const q = this.quests.find(q => q.id === id);
    const prog = this.progress[id] || 0;
    this.trackerText.setText(`${q.title}\n${q.desc}\n[${prog}/${q.required}]`);
  }

  toggleJournal() {
    if (this.journalOpen) {
      this.journalElements.forEach(e => e.destroy());
      this.journalElements = [];
      this.journalOpen = false;
      return;
    }
    this.journalOpen = true;
    const s = this.scene;
    const cx = 640, cy = 360;

    const bg = s.add.rectangle(cx, cy, 700, 500, 0x0a0a1a, 0.95)
      .setStrokeStyle(2, 0xa855f7, 0.8).setDepth(300).setScrollFactor(0);
    const title = s.add.text(cx, cy - 230, '📜 QUEST JOURNAL — The Shattered Codex', {
      fontFamily: 'Inter, sans-serif', fontSize: '16px', color: '#ffdd44'
    }).setOrigin(0.5).setDepth(301).setScrollFactor(0);
    const close = s.add.text(cx + 330, cy - 230, '[J] Close', {
      fontFamily: 'Inter, sans-serif', fontSize: '10px', color: '#888899'
    }).setOrigin(1, 0.5).setDepth(301).setScrollFactor(0);

    this.journalElements.push(bg, title, close);

    this.quests.forEach((q, i) => {
      const y = cy - 180 + i * 60;
      const isActive = this.activeQuests.includes(q.id);
      const isDone = this.completedQuests.includes(q.id);
      const status = isDone ? '✅' : isActive ? '⚔️' : '🔒';
      const color = isDone ? '#44ff44' : isActive ? '#ffdd44' : '#555566';

      const line = s.add.text(cx - 320, y, `${status} Ch.${q.chapter} — ${q.title}`, {
        fontFamily: 'Inter, sans-serif', fontSize: '12px', color
      }).setDepth(301).setScrollFactor(0);

      const desc = s.add.text(cx - 300, y + 18, q.desc, {
        fontFamily: 'Inter', fontSize: '15px', color: '#999999',
        wordWrap: { width: 500 }
      }).setDepth(301).setScrollFactor(0);

      if (isActive) {
        const prog = this.progress[q.id] || 0;
        const pText = s.add.text(cx + 280, y, `${prog}/${q.required}`, {
          fontFamily: 'Inter, sans-serif', fontSize: '12px', color: '#ffaa44'
        }).setOrigin(1, 0).setDepth(301).setScrollFactor(0);
        this.journalElements.push(pText);
      }

      if (isDone) {
        const reward = s.add.text(cx + 280, y, `+${q.xp}XP +${q.gold}G`, {
          fontFamily: 'Inter, sans-serif', fontSize: '9px', color: '#44ff44'
        }).setOrigin(1, 0).setDepth(301).setScrollFactor(0);
        this.journalElements.push(reward);
      }

      this.journalElements.push(line, desc);
    });
  }

  getSaveData() {
    return { active: this.activeQuests, completed: this.completedQuests, progress: this.progress };
  }

  loadSaveData(data) {
    if (!data) return;
    this.activeQuests = data.active || [];
    this.completedQuests = data.completed || [];
    this.progress = data.progress || {};
    this._updateTracker();
  }
}
