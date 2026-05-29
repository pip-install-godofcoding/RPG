// ============================================================
// AudioSystem — Web Audio API procedural sound effects
// ============================================================
export class AudioSystem {
  constructor() {
    this.ctx = null;
    this.initialized = false;
    this.volume = 0.15;
  }

  init() {
    if (this.initialized) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.initialized = true;
    } catch (e) { console.warn('Audio not available'); }
  }

  _play(fn) {
    if (!this.initialized) this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    fn(this.ctx, this.volume);
  }

  startBGM() {
    if (this.bgmOscs) return; // Already playing
    this._play((ctx, vol) => {
      this.bgmGain = ctx.createGain();
      this.bgmGain.gain.setValueAtTime(0, ctx.currentTime);
      this.bgmGain.gain.linearRampToValueAtTime(vol * 0.12, ctx.currentTime + 4);
      
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 300;
      filter.connect(this.bgmGain);
      this.bgmGain.connect(ctx.destination);

      // Slow LFO for filter cutoff (creates swelling atmospheric effect)
      this.lfo = ctx.createOscillator();
      this.lfo.type = 'sine';
      this.lfo.frequency.value = 0.05; // 20 second cycle
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 200; // modulate cutoff frequency by +/- 200Hz
      this.lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      this.lfo.start();

      // Atmospheric drone chord (A minor 7: A2, C3, E3, G3)
      this.bgmOscs = [110.00, 130.81, 164.81, 196.00].map(freq => {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = freq;
        osc.detune.value = (Math.random() - 0.5) * 15; // rich chorus effect
        
        const g = ctx.createGain();
        g.gain.value = 0.25;
        osc.connect(g);
        g.connect(filter);
        
        osc.start();
        return osc;
      });
    });
  }

  stopBGM() {
    if (!this.bgmGain || !this.ctx) return;
    this.bgmGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 2);
    setTimeout(() => {
      if (this.bgmOscs) {
        this.bgmOscs.forEach(o => { try { o.stop(); } catch(e){} });
        this.bgmOscs = null;
      }
      if (this.lfo) {
        try { this.lfo.stop(); } catch(e){}
        this.lfo = null;
      }
    }, 2000);
  }

  footstep() {
    this._play((ctx, vol) => {
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.04, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.3;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(vol * 0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      src.connect(gain).connect(ctx.destination);
      src.start();
    });
  }

  swordSwing() {
    this._play((ctx, vol) => {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.15);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.connect(gain).connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + 0.15);
    });
  }

  fireball() {
    this._play((ctx, vol) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.3);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + 0.3);
      // Noise layer
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.2;
      const src = ctx.createBufferSource(); src.buffer = buf;
      const g2 = ctx.createGain();
      g2.gain.setValueAtTime(vol * 0.5, ctx.currentTime);
      g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      src.connect(g2).connect(ctx.destination); src.start();
    });
  }

  arrowShot() {
    this._play((ctx, vol) => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.1);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.connect(gain).connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + 0.1);
    });
  }

  hit() {
    this._play((ctx, vol) => {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.connect(gain).connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + 0.08);
    });
  }

  heal() {
    this._play((ctx, vol) => {
      [400, 600, 800].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const gain = ctx.createGain();
        const t = ctx.currentTime + i * 0.12;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(vol, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t); osc.stop(t + 0.15);
      });
    });
  }

  levelUp() {
    this._play((ctx, vol) => {
      [200, 400, 600, 800].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.value = freq;
        const gain = ctx.createGain();
        const t = ctx.currentTime + i * 0.15;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(vol * 0.8, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t); osc.stop(t + 0.3);
      });
    });
  }

  pickup() {
    this._play((ctx, vol) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.05);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(vol * 0.6, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.connect(gain).connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + 0.1);
    });
  }

  death() {
    this._play((ctx, vol) => {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 1);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1);
      osc.connect(gain).connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + 1);
    });
  }

  menuSelect() {
    this._play((ctx, vol) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 1000;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(vol * 0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
      osc.connect(gain).connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + 0.03);
    });
  }

  zoneEnter() {
    this._play((ctx, vol) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 100;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(vol * 0.5, ctx.currentTime + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + 1.5);
    });
  }
}
