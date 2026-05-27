// ============================================================
// DayNightCycle — 5-minute cycle with visual overlay
// ============================================================
export class DayNightCycle {
  constructor(scene) {
    this.scene = scene;
    this.overlay = scene.add.rectangle(640, 360, 1280, 720, 0x000033, 0)
      .setDepth(90).setScrollFactor(0);
    this.cycleDuration = 300000; // 5 minutes
    this.elapsed = 60000; // start at dawn
    this.phase = 'dawn';
    this.timeScale = 1;

    // Clock display
    this.clockText = scene.add.text(1200, 20, '☀ DAY', {
      fontFamily: 'Inter, sans-serif', fontSize: '10px', color: '#e0d0b0'
    }).setDepth(102).setScrollFactor(0);
  }

  update(delta) {
    this.elapsed = (this.elapsed + delta * this.timeScale) % this.cycleDuration;
    const pct = this.elapsed / this.cycleDuration;

    // Dawn: 0-0.2, Day: 0.2-0.6, Dusk: 0.6-0.8, Night: 0.8-1.0
    let alpha = 0, color = 0x000033, phaseName = 'day', icon = '☀';

    if (pct < 0.2) {
      // Dawn
      phaseName = 'dawn';
      icon = '🌅';
      alpha = 0.15 * (1 - pct / 0.2);
      color = 0x442200;
    } else if (pct < 0.6) {
      // Day
      phaseName = 'day';
      icon = '☀';
      alpha = 0;
    } else if (pct < 0.8) {
      // Dusk
      phaseName = 'dusk';
      icon = '🌇';
      const duskPct = (pct - 0.6) / 0.2;
      alpha = duskPct * 0.4;
      color = 0x221133;
    } else {
      // Night
      phaseName = 'night';
      icon = '🌙';
      alpha = 0.45;
      color = 0x000022;
    }

    this.overlay.setFillStyle(color, alpha);
    this.phase = phaseName;
    this.clockText.setText(`${icon} ${phaseName.toUpperCase()}`);
  }

  isNight() { return this.phase === 'night'; }
}
