/**
 * 《牌宗》程序化音效（Web Audio，无需资源文件）
 */
const SFX = {
  ctx: null,
  enabled: true,
  volume: 0.35,

  load() {
    try {
      const s = localStorage.getItem('paizong_sfx');
      if (s) {
        const o = JSON.parse(s);
        if (typeof o.enabled === 'boolean') this.enabled = o.enabled;
        if (typeof o.volume === 'number') this.volume = o.volume;
      }
    } catch (_) {}
  },

  save() {
    try {
      localStorage.setItem('paizong_sfx', JSON.stringify({ enabled: this.enabled, volume: this.volume }));
    } catch (_) {}
  },

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  },

  tone(freq, dur = 0.12, type = 'sine', gain = 1, slideTo = null) {
    if (!this.enabled) return;
    const ctx = this.ensure();
    if (!ctx) return;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo != null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
    const v = this.volume * gain;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(v, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  },

  noise(dur = 0.08, gain = 0.4) {
    if (!this.enabled) return;
    const ctx = this.ensure();
    if (!ctx) return;
    const n = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = this.volume * gain;
    src.connect(g);
    g.connect(ctx.destination);
    src.start();
  },

  play(name) {
    switch (name) {
      case 'click':
        this.tone(880, 0.05, 'square', 0.25);
        break;
      case 'select':
        this.tone(540, 0.045, 'triangle', 0.28);
        setTimeout(() => this.tone(680, 0.04, 'sine', 0.18), 30);
        break;
      case 'play':
        this.tone(320, 0.06, 'triangle', 0.38);
        setTimeout(() => this.tone(420, 0.07, 'triangle', 0.32), 35);
        setTimeout(() => this.tone(560, 0.08, 'sine', 0.22), 70);
        this.noise(0.04, 0.08);
        break;
      case 'pass':
        this.tone(220, 0.1, 'sine', 0.25, 160);
        break;
      case 'jiguan':
        this.tone(660, 0.07, 'sawtooth', 0.2);
        setTimeout(() => this.tone(990, 0.1, 'square', 0.15), 50);
        break;
      case 'score':
        this.tone(523, 0.09, 'sine', 0.35);
        setTimeout(() => this.tone(659, 0.1, 'sine', 0.3), 70);
        setTimeout(() => this.tone(784, 0.12, 'sine', 0.28), 140);
        break;
      case 'bigscore':
        this.tone(392, 0.12, 'triangle', 0.4);
        setTimeout(() => this.tone(523, 0.12, 'triangle', 0.4), 80);
        setTimeout(() => this.tone(659, 0.14, 'triangle', 0.45), 160);
        setTimeout(() => this.tone(1046, 0.2, 'sine', 0.35), 260);
        this.noise(0.12, 0.15);
        break;
      case 'win':
        [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.18, 'sine', 0.4), i * 90));
        setTimeout(() => this.noise(0.15, 0.2), 200);
        break;
      case 'lose':
        this.tone(300, 0.2, 'sawtooth', 0.25, 100);
        setTimeout(() => this.tone(180, 0.25, 'triangle', 0.3, 80), 120);
        break;
      case 'shop':
        this.tone(740, 0.08, 'sine', 0.3);
        setTimeout(() => this.tone(980, 0.1, 'sine', 0.25), 60);
        break;
      case 'enemy':
        this.tone(180, 0.08, 'triangle', 0.25, 140);
        break;
      default:
        this.tone(440, 0.06, 'sine', 0.2);
    }
  },

  toggle() {
    this.enabled = !this.enabled;
    this.save();
    if (this.enabled) this.play('click');
    return this.enabled;
  },
};

SFX.load();
