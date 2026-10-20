// Platanus Hack 26: Arcade Challenge — Godzilla Maracucho
// Desarrollado con Phaser 3 (Vanilla JS) para mueble Arcade físico y Web

const W = 800;
const H = 600;

// Mapeo oficial de botones del mueble Arcade a teclas físicas
// DO NOT modify this mapping — matches real arcade cabinet wiring
const CABINET_KEYS = {
  P1_U: ['w', 'ArrowUp'], P1_D: ['s', 'ArrowDown'], P1_L: ['a', 'ArrowLeft'], P1_R: ['d', 'ArrowRight'],
  P1_1: ['u', ' ', 'Enter'], P1_2: ['i'], P1_3: ['o'],
  P1_4: ['j'], P1_5: ['k'], P1_6: ['l'],
  P2_U: ['ArrowUp'], P2_D: ['ArrowDown'], P2_L: ['ArrowLeft'], P2_R: ['ArrowRight'],
  P2_1: ['r'], P2_2: ['t'], P2_3: ['y'],
  P2_4: ['f'], P2_5: ['g'], P2_6: ['h'],
  START1: ['Enter', '1'], START2: ['2'],
};

const KEY_TO_ARCADE = {};
for (const [code, keys] of Object.entries(CABINET_KEYS)) {
  for (const key of keys) {
    KEY_TO_ARCADE[key.length === 1 ? key.toLowerCase() : key] = code;
  }
}

const held = Object.create(null);

window.addEventListener('keydown', (e) => {
  if (typeof audioSynth !== 'undefined') audioSynth.init();
  const code = KEY_TO_ARCADE[e.key.length === 1 ? e.key.toLowerCase() : e.key];
  if (code) held[code] = true;
});

window.addEventListener('keyup', (e) => {
  const code = KEY_TO_ARCADE[e.key.length === 1 ? e.key.toLowerCase() : e.key];
  if (code) held[code] = false;
});

// --- Helpers de almacenamiento persistente (Arcade Bridge / fallback) ---
function getStorage() {
  if (window.platanusArcadeStorage) return window.platanusArcadeStorage;
  return {
    async get(key) {
      try {
        const raw = window.localStorage.getItem(key);
        return raw === null
          ? { found: false, value: null }
          : { found: true, value: JSON.parse(raw) };
      } catch { return { found: false, value: null }; }
    },
    async set(key, value) {
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch {}
    },
  };
}

async function loadData(key) { return getStorage().get(key); }
async function saveData(key, value) { return getStorage().set(key, value); }

let globalHighScore = 0;
loadData('godzilla-maracucho-hs').then((res) => {
  if (res && res.found && typeof res.value === 'number') {
    globalHighScore = res.value;
  }
});

// --- Síntesis de Audio Web (Efectos y Música chiptune sin assets externos) ---
class SoundSynth {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.isPlayingBgm = false;
    this.step = 0;
    this.bgmTimer = null;
  }
  init() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) {
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.setValueAtTime(0.2, this.ctx.currentTime);
        this.master.connect(this.ctx.destination);
        this.buf = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
        const d = this.buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }
  tone(f, type = 'square', dur = 0.12, vol = 0.15) {
    if (!this.ctx) return;
    try {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f, this.ctx.currentTime);
      g.gain.setValueAtTime(vol, this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + dur);
      o.connect(g);
      g.connect(this.master);
      o.start();
      o.stop(this.ctx.currentTime + dur);
    } catch(e) {}
  }
  seq(a, t, d, v, s = 40) {
    a.forEach((f, i) => setTimeout(() => this.tone(f, t, d, v), i * s));
  }
  thunder() {
    if (!this.ctx || !this.buf) return;
    try {
      const t = this.ctx.currentTime, s = this.ctx.createBufferSource();
      s.buffer = this.buf;
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(360, t);
      f.frequency.exponentialRampToValueAtTime(40, t + 1.1);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.5, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 1.1);
      s.connect(f);
      f.connect(g);
      g.connect(this.master);
      s.start(t);
      s.stop(t + 1.1);
      const o = this.ctx.createOscillator(), sg = this.ctx.createGain();
      o.type = 'triangle';
      o.frequency.setValueAtTime(130, t);
      o.frequency.exponentialRampToValueAtTime(30, t + 0.6);
      sg.gain.setValueAtTime(0.4, t);
      sg.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      o.connect(sg);
      sg.connect(this.master);
      o.start(t);
      o.stop(t + 0.6);
    } catch(e) {}
  }
  zap() {
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime, o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(1100, t);
      o.frequency.exponentialRampToValueAtTime(60, t + 0.16);
      g.gain.setValueAtTime(0.25, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      o.connect(g);
      g.connect(this.master);
      o.start(t);
      o.stop(t + 0.16);
    } catch(e) {}
  }
  cepillao() { this.seq([523, 659, 784, 1046], 'sine', 0.12, 0.15, 50); }
  patacon() { this.seq([330, 415, 494, 659, 987], 'sawtooth', 0.22, 0.12, 45); }
  tequeno() { this.seq([440, 554, 659, 880], 'triangle', 0.14, 0.16, 40); }
  cerveza() { this.seq([392, 523, 659, 784, 1046], 'sine', 0.09, 0.14, 35); }
  crash() { this.tone(85, 'sawtooth', 0.28, 0.35); this.tone(55, 'square', 0.35, 0.25); }
  grito() { this.seq([340, 460, 410], 'square', 0.06, 0.08, 50); }
  beep() { this.tone(880, 'sine', 0.07, 0.15); }
  startBgm() {
    if (this.isPlayingBgm || !this.ctx) return;
    this.isPlayingBgm = true;
    this.step = 0;
    const b = [110, 110, 131, 147, 110, 110, 165, 147];
    const m = [440, 0, 523, 587, 659, 587, 523, 440, 494, 0, 587, 659, 698, 659, 587, 494];
    this.bgmTimer = setInterval(() => {
      if (!this.isPlayingBgm) return;
      this.tone(b[this.step % b.length], 'triangle', 0.15, 0.09);
      const mel = m[this.step % m.length];
      if (mel > 0) this.tone(mel, 'square', 0.11, 0.05);
      if (this.step % 2 === 0) this.tone(1600, 'sine', 0.03, 0.02);
      this.step++;
    }, 160);
  }
  stopBgm() {
    this.isPlayingBgm = false;
    if (this.bgmTimer) clearInterval(this.bgmTimer);
  }
}

const audioSynth = new SoundSynth();

// --- Generación procedimental de texturas (Gráficos puros en Canvas) ---
function generateGameTextures(scene) {
  if (scene.textures.exists('godzilla_0')) return;

  function mk(k, w, h, fn) {
    const c = scene.textures.createCanvas(k, w, h);
    fn(c.getContext(), w, h);
    c.refresh();
  }

  const C = (ctx, x, y, r, f, s) => {
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    if (f) { ctx.fillStyle = f; ctx.fill(); }
    if (s) { ctx.strokeStyle = s; ctx.stroke(); }
  };
  const E = (ctx, x, y, rx, ry, f, s, ro = 0) => {
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, ro, 0, Math.PI * 2);
    if (f) { ctx.fillStyle = f; ctx.fill(); }
    if (s) { ctx.strokeStyle = s; ctx.stroke(); }
  };
  const R = (ctx, x, y, w, h, r, f, s) => {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
    else ctx.rect(x, y, w, h);
    if (f) { ctx.fillStyle = f; ctx.fill(); }
    if (s) { ctx.strokeStyle = s; ctx.stroke(); }
  };
  const P = (ctx, pts, f, s, c = true) => {
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    if (c) ctx.closePath();
    if (f) { ctx.fillStyle = f; ctx.fill(); }
    if (s) { ctx.strokeStyle = s; ctx.stroke(); }
  };

  [0, 1].forEach((fr) => {
    mk(`godzilla_${fr}`, 106, 114, (ctx) => {
      const b = fr === 1 ? 2.5 : 0;
      const sG = ctx.createRadialGradient(53, 105, 4, 53, 105, 46);
      sG.addColorStop(0, 'rgba(0,0,0,0.65)');
      sG.addColorStop(1, 'rgba(0,0,0,0)');
      E(ctx, 53, 105, 44, 8, sG);
      ctx.lineWidth = 1.5;
      E(ctx, 53, 104, 39, 6.5, null, 'rgba(0,240,255,0.4)');
      ctx.fillStyle = '#0b2615';
      ctx.beginPath();
      ctx.moveTo(28, 74 + b);
      ctx.bezierCurveTo(fr === 0 ? 8 : 4, 82 + b, fr === 0 ? -2 : 0, 62 + b, fr === 0 ? 0 : 3, 50 + b);
      ctx.bezierCurveTo(9, 58 + b, 18, 66 + b, 30, 62 + b);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#1e5f35';
      ctx.lineWidth = 1.8;
      ctx.stroke();
      P(ctx, [[6, 56 + b], [1, 49 + b], [11, 54 + b]], '#00f0ff');
      P(ctx, [[14, 65 + b], [9, 58 + b], [18, 62 + b]], '#00f0ff');

      const spines = [
        [25, 30 + b, 18, -0.42],
        [17, 47 + b, 23, -0.26],
        [19, 68 + b, 20, -0.14],
        [25, 86 + b, 15, -0.05],
      ];
      spines.forEach(([x, y, s, a]) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(a);
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = fr === 1 ? 22 : 13;
        const spG = ctx.createLinearGradient(0, -s, 0, s);
        spG.addColorStop(0, '#ffffff');
        spG.addColorStop(0.3, '#00f0ff');
        spG.addColorStop(0.7, '#0066cc');
        spG.addColorStop(1, '#002666');
        ctx.fillStyle = spG;
        P(ctx, [[0, -s], [-s * 0.38, -s * 0.32], [-s * 0.65, s * 0.7], [-s * 0.18, s * 0.52], [s * 0.48, s * 0.78], [s * 0.28, -s * 0.22]], spG);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.6;
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.moveTo(0, -s * 0.9);
        ctx.lineTo(0, s * 0.45);
        ctx.stroke();
        ctx.restore();
      });

      const kGrad = ctx.createLinearGradient(20, 18, 80, 95);
      kGrad.addColorStop(0, '#2d7a46');
      kGrad.addColorStop(0.5, '#19542c');
      kGrad.addColorStop(1, '#0c2614');
      R(ctx, 26, 28 + b, 58, 62, [24, 28, 16, 22], kGrad);
      R(ctx, 42, 16 + b, 48, 34, [16, 18, 10, 14], kGrad);

      const scales = [
        [38, 38 + b], [46, 36 + b], [54, 38 + b],
        [34, 48 + b], [42, 50 + b], [36, 62 + b], [44, 64 + b],
      ];
      scales.forEach(([sx, sy]) => {
        P(ctx, [[sx, sy - 3.5], [sx + 4.5, sy], [sx, sy + 3.5], [sx - 4.5, sy]], '#123d20', '#34d399');
      });

      const vG = ctx.createLinearGradient(50, 42, 75, 88);
      vG.addColorStop(0, '#a3e635');
      vG.addColorStop(0.5, '#65a30d');
      vG.addColorStop(1, '#365314');
      E(ctx, 58, 62 + b, 18, 25, vG, null, 0.08);
      ctx.strokeStyle = '#1a330a';
      ctx.lineWidth = 2;
      for (let y = 47; y <= 77; y += 7.5) {
        ctx.beginPath();
        ctx.moveTo(45, y + b);
        ctx.quadraticCurveTo(59, y + 2.5 + b, 72, y + b);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(46, y - 1 + b);
        ctx.lineTo(71, y - 1 + b);
        ctx.stroke();
        ctx.strokeStyle = '#1a330a';
        ctx.lineWidth = 2;
      }

      P(ctx, [[50, 19 + b], [82, 23 + b], [72, 29 + b]], '#0c2415');
      E(ctx, 72, 24 + b, 7, 5, '#dc2626', null, -0.08);
      E(ctx, 72, 24 + b, 5.2, 3.8, '#facc15', null, -0.08);
      R(ctx, 72.4, 21.5 + b, 1.8, 5.2, 0.8, '#000000');
      C(ctx, 70.8, 22.8 + b, 1.4, '#ffffff');
      P(ctx, [[66, 36 + b], [90, 36 + b], [78, 46 + b]], '#450a0a');
      C(ctx, 74, 40 + b, 4, '#00f0ff');
      C(ctx, 74, 40 + b, 1.8, '#ffffff');

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(68, 36 + b); ctx.lineTo(70, 41 + b); ctx.lineTo(72, 36 + b);
      ctx.moveTo(75, 36 + b); ctx.lineTo(77, 42 + b); ctx.lineTo(79, 36 + b);
      ctx.moveTo(82, 36 + b); ctx.lineTo(84, 43 + b); ctx.lineTo(86, 36 + b);
      ctx.moveTo(87, 36 + b); ctx.lineTo(89, 40 + b); ctx.lineTo(90, 36 + b);
      ctx.moveTo(71, 45 + b); ctx.lineTo(73, 40 + b); ctx.lineTo(75, 45 + b);
      ctx.moveTo(78, 45 + b); ctx.lineTo(80, 41 + b); ctx.lineTo(82, 45 + b);
      ctx.fill();

      R(ctx, 58, 57 + b, 28, 15, 6, '#1a542b', '#0b2614');
      P(ctx, [[82, 59 + b], [91, 62 + b], [83, 65 + b]], '#f8fafc', '#334155');
      P(ctx, [[83, 65 + b], [93, 68 + b], [84, 71 + b]], '#f8fafc', '#334155');
      P(ctx, [[80, 71 + b], [89, 74 + b], [82, 76 + b]], '#f8fafc', '#334155');

      const sG2 = ctx.createLinearGradient(16, 0, 88, 25);
      sG2.addColorStop(0, '#b45309');
      sG2.addColorStop(0.3, '#fde047');
      sG2.addColorStop(0.7, '#eab308');
      sG2.addColorStop(1, '#78350f');
      ctx.lineWidth = 1.3;
      E(ctx, 56, 13 + b, 38, 8.5, sG2, '#78350f', -0.04);
      ctx.strokeStyle = 'rgba(120, 53, 15, 0.45)';
      ctx.lineWidth = 1;
      for (let lx = 26; lx <= 86; lx += 6.5) {
        ctx.beginPath(); ctx.moveTo(lx, 9 + b); ctx.lineTo(lx - 4, 17 + b); ctx.stroke();
      }
      R(ctx, 42, 1 + b, 30, 14, [8, 8, 2, 2], sG2, '#78350f');
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(42, 10 + b, 30, 4.5);
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(55, 9 + b, 6.5, 6);
    });
  });

  mk('cepillao', 42, 54, (ctx) => {
    P(ctx, [[9, 22], [33, 22], [27, 50], [15, 50]], '#e53e3e');
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(17, 23); ctx.lineTo(19, 49);
    ctx.moveTo(25, 23); ctx.lineTo(23, 49);
    ctx.stroke();
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.moveTo(25, 22); ctx.lineTo(36, 2); ctx.stroke();
    const ig = ctx.createRadialGradient(21, 16, 2, 21, 16, 15);
    ig.addColorStop(0, '#ff007f');
    ig.addColorStop(0.6, '#ff0055');
    ig.addColorStop(1, '#f6ad55');
    ctx.fillStyle = ig;
    ctx.beginPath(); ctx.arc(21, 19, 14, Math.PI, 0); ctx.fill();
    E(ctx, 21, 15, 9, 4, '#fffaf0');
    ctx.fillStyle = '#fffaf0';
    ctx.fillRect(15, 16, 3, 7);
    ctx.fillRect(23, 16, 2.5, 9);
    ctx.fillStyle = '#fff';
    ctx.fillRect(14, 11, 2, 2);
    ctx.fillRect(26, 12, 2, 2);
  });

  mk('patacon', 46, 46, (ctx) => {
    const pg = ctx.createRadialGradient(23, 23, 5, 23, 23, 20);
    pg.addColorStop(0, '#ecc94b');
    pg.addColorStop(0.7, '#d69e2e');
    pg.addColorStop(1, '#975a16');
    E(ctx, 23, 23, 19, 17, pg, null, 0.2);
    ctx.strokeStyle = '#744210';
    ctx.lineWidth = 1.8;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(10 + i * 5, 14 + (i % 2) * 4);
      ctx.lineTo(15 + i * 5, 30 - (i % 2) * 3);
      ctx.stroke();
    }
    ctx.fillStyle = '#fff';
    for (let j = 0; j < 8; j++) {
      ctx.fillRect(12 + Math.random() * 22, 12 + Math.random() * 22, 2.5, 2.5);
    }
    C(ctx, 32, 12, 3, '#fff');
  });

  mk('tequenos', 44, 40, (ctx) => {
    R(ctx, 4, 18, 36, 18, 5, '#e11d48', '#fff');
    [
      { x: 10, y: 12, w: 24, h: 9.5, a: -0.15 },
      { x: 12, y: 6, w: 23, h: 9, a: 0.1 },
      { x: 9, y: 20, w: 25, h: 10, a: 0.05 },
    ].forEach((tq) => {
      ctx.save();
      ctx.translate(tq.x + tq.w / 2, tq.y + tq.h / 2);
      ctx.rotate(tq.a);
      const tg = ctx.createLinearGradient(-tq.w / 2, 0, tq.w / 2, 0);
      tg.addColorStop(0, '#d97706');
      tg.addColorStop(0.5, '#fbbf24');
      tg.addColorStop(1, '#b45309');
      R(ctx, -tq.w / 2, -tq.h / 2, tq.w, tq.h, 4.5, tg);
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 1.2;
      for (let sx = -tq.w / 2 + 4; sx <= tq.w / 2 - 4; sx += 5) {
        ctx.beginPath();
        ctx.moveTo(sx, -tq.h / 2);
        ctx.lineTo(sx + 3, tq.h / 2);
        ctx.stroke();
      }
      C(ctx, -tq.w / 2 + 2, 0, 2.2, '#fff');
      ctx.restore();
    });
    C(ctx, 36, 5, 2.5, '#fef08a');
  });

  mk('cerveza', 36, 48, (ctx) => {
    const bg = ctx.createLinearGradient(8, 12, 28, 44);
    bg.addColorStop(0, '#f59e0b');
    bg.addColorStop(0.6, '#d97706');
    bg.addColorStop(1, '#b45309');
    P(ctx, [[8, 14], [28, 14], [25, 44], [11, 44]], bg);
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(8, 14); ctx.lineTo(11, 44); ctx.lineTo(25, 44); ctx.lineTo(28, 14);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(27, 20); ctx.quadraticCurveTo(34, 22, 33, 34); ctx.lineTo(26, 36);
    ctx.stroke();
    C(ctx, 15, 32, 1.3, '#fff');
    C(ctx, 21, 24, 1.5, '#fff');
    C(ctx, 12, 12, 5, '#fff');
    C(ctx, 18, 10, 6, '#fff');
    C(ctx, 24, 11, 5.5, '#fff');
  });

  mk('lancha', 84, 40, (ctx) => {
    const hg = ctx.createLinearGradient(10, 15, 75, 35);
    hg.addColorStop(0, '#2b6cb0');
    hg.addColorStop(1, '#1a365d');
    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.moveTo(16, 18);
    ctx.lineTo(62, 18);
    ctx.quadraticCurveTo(80, 20, 82, 23);
    ctx.lineTo(66, 34);
    ctx.lineTo(16, 34);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ecc94b';
    ctx.fillRect(16, 17, 52, 2);
    ctx.fillStyle = '#e53e3e';
    ctx.fillRect(16, 19, 54, 2);
    E(ctx, 32, 8, 8, 3, '#ecc94b');
    ctx.fillRect(28, 4, 8, 5);
    C(ctx, 32, 12, 4, '#f6ad55');
    ctx.fillStyle = '#dd6b20';
    ctx.fillRect(28, 16, 9, 6);
    ctx.fillStyle = '#171923';
    ctx.fillRect(8, 14, 8, 18);
    ctx.fillStyle = '#cbd5e0';
    ctx.fillRect(4, 26, 6, 4);
  });

  mk('puente', 800, 90, (ctx) => {
    ctx.fillStyle = '#1a202c';
    ctx.fillRect(0, 48, 800, 8);
    ctx.fillStyle = '#4a5568';
    ctx.fillRect(0, 46, 800, 2);
    for (let x = 40; x < 800; x += 150) {
      P(ctx, [[x + 24, 6], [x + 6, 48], [x + 16, 48], [x + 25, 20], [x + 34, 48], [x + 44, 48]], '#2d3748');
      ctx.fillStyle = '#171923';
      ctx.fillRect(x + 14, 56, 22, 34);
      ctx.strokeStyle = 'rgba(99, 179, 237, 0.4)';
      ctx.lineWidth = 1;
      [-45, -30, -15, 15, 30, 45].forEach((dx) => {
        ctx.beginPath();
        ctx.moveTo(x + 25, 10);
        ctx.lineTo(x + 25 + dx, 48);
        ctx.stroke();
      });
      ctx.fillStyle = '#e53e3e';
      ctx.fillRect(x + 24, 4, 3, 3);
      ctx.fillStyle = '#ecc94b';
      ctx.fillRect(x - 20, 43, 2, 4);
      ctx.fillRect(x + 70, 43, 2, 4);
    }
  });

  mk('p_spark', 16, 16, (ctx) => {
    P(ctx, [[8, 0], [10, 6], [16, 8], [10, 10], [8, 16], [6, 10], [0, 8], [6, 6]], '#00f0ff');
    C(ctx, 8, 8, 2.5, '#fff');
  });

  mk('p_drop', 12, 12, (ctx) => C(ctx, 6, 6, 5, 'rgba(129,230,217,.85)'));

  mk('p_smoke', 24, 24, (ctx) => {
    const rad = ctx.createRadialGradient(12, 12, 2, 12, 12, 11);
    rad.addColorStop(0, 'rgba(255,255,255,.65)');
    rad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = rad;
    ctx.fillRect(0, 0, 24, 24);
  });

  mk('p_star', 16, 16, (ctx) => {
    P(ctx, [[8, 0], [11, 5], [16, 8], [11, 11], [8, 16], [5, 11], [0, 8], [5, 5]], '#ffd700');
  });

  mk('p_speed', 16, 8, (ctx) => {
    const sg = ctx.createLinearGradient(0, 4, 16, 4);
    sg.addColorStop(0, 'rgba(245,158,11,0)');
    sg.addColorStop(1, '#f59e0b');
    ctx.fillStyle = sg;
    ctx.fillRect(0, 1, 16, 6);
  });

  mk('crt_overlay', 800, 600, (ctx, w, h) => {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.16)';
    for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1.2);
    const rad = ctx.createRadialGradient(w / 2, h / 2, w * 0.42, w / 2, h / 2, w * 0.65);
    rad.addColorStop(0, 'rgba(0,0,0,0)');
    rad.addColorStop(1, 'rgba(0,0,0,0.65)');
    ctx.fillStyle = rad;
    ctx.fillRect(0, 0, w, h);
  });
}

// --- Escena Menú Principal ---
class MenuScene extends Phaser.Scene {
  constructor() { super('MenuScene'); }

  create() {
    generateGameTextures(this);
    const w = this.cameras.main.width, h = this.cameras.main.height;

    const bg = this.add.graphics();
    bg.fillGradientStyle(0x060218, 0x060218, 0x031733, 0x012b45, 1);
    bg.fillRect(0, 0, w, h);

    for (let i = 0; i < 35; i++) {
      const st = this.add.circle(Phaser.Math.Between(15, w - 15), Phaser.Math.Between(15, 200), Phaser.Math.FloatBetween(0.8, 2), 0xffffff, 0.85);
      this.tweens.add({ targets: st, alpha: { from: 0.2, to: 1 }, duration: Phaser.Math.Between(900, 2200), yoyo: true, repeat: -1 });
    }

    this.time.addEvent({
      delay: 4000,
      callback: () => {
        const fl = this.add.rectangle(w / 2, h / 2, w, h, 0x00f0ff, 0.2);
        audioSynth.zap();
        this.tweens.add({ targets: fl, alpha: 0, duration: 240, onComplete: () => fl.destroy() });
      },
      loop: true,
    });

    const badgeBg = this.add.graphics();
    badgeBg.fillStyle(0x0a1628, 0.85);
    badgeBg.fillRoundedRect(w / 2 - 145, 18, 290, 22, 11);
    badgeBg.lineStyle(1.5, 0x00f0ff, 0.7);
    badgeBg.strokeRoundedRect(w / 2 - 145, 18, 290, 22, 11);

    this.add.text(w / 2, 29, '⚡ CATATUMBO ARCADE CHALLENGE ⚡', {
      fontFamily: 'Trebuchet MS, Impact, sans-serif', fontSize: '11px', fontStyle: 'bold', color: '#00f0ff', letterSpacing: 1.5,
    }).setOrigin(0.5);

    const tTxt = this.add.text(w / 2, 65, 'GODZILLA MARACUCHO', {
      fontFamily: 'Impact, Trebuchet MS, sans-serif', fontSize: '44px', color: '#00f0ff', stroke: '#ff0055', strokeThickness: 7,
      shadow: { blur: 18, color: '#00f0ff', fill: true }, letterSpacing: 2,
    }).setOrigin(0.5);

    const sub = this.add.text(w / 2, 98, '— FURIA EN EL LAGO DE MARACAIBO —', {
      fontFamily: 'Trebuchet MS, Impact, sans-serif', fontSize: '12px', fontStyle: 'bold', color: '#ffd700', stroke: '#000', strokeThickness: 3, letterSpacing: 2.5,
    }).setOrigin(0.5);
    this.tweens.add({ targets: [tTxt, sub], scale: { from: 0.985, to: 1.015 }, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this.add.image(w / 2, 155, 'puente').setScale(1.05).setAlpha(0.7);

    const waterG = this.add.graphics();
    waterG.fillGradientStyle(0x021733, 0x021733, 0x013d5a, 0x00557a, 0.95);
    waterG.fillRect(0, 195, w, h - 195);

    if (!this.anims.exists('swim')) {
      this.anims.create({ key: 'swim', frames: [{ key: 'godzilla_0' }, { key: 'godzilla_1' }], frameRate: 3.5, repeat: -1 });
    }
    const gz = this.add.sprite(w / 2, 235, 'godzilla_0').setScale(1.5).play('swim');
    this.tweens.add({ targets: gz, y: 241, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this.add.particles(w / 2, 290, 'p_drop', {
      speed: { min: 15, max: 45 }, angle: { min: 180, max: 360 }, scale: { start: 0.7, end: 0 }, alpha: { start: 0.6, end: 0 }, lifespan: 700, frequency: 120,
    });

    const pill = this.add.graphics();
    pill.fillStyle(0x08162e, 0.9);
    pill.fillRoundedRect(w / 2 - 120, 310, 240, 26, 13);
    pill.lineStyle(1.5, 0xffd700, 0.9);
    pill.strokeRoundedRect(w / 2 - 120, 310, 240, 26, 13);

    this.hsText = this.add.text(w / 2, 323, `🏆 RÉCORD: ${globalHighScore} PTS`, {
      fontFamily: 'Trebuchet MS, Impact, sans-serif', fontSize: '13px', fontStyle: 'bold', color: '#ffd700',
    }).setOrigin(0.5);

    loadData('godzilla-maracucho-hs').then((res) => {
      if (res && res.found && typeof res.value === 'number') {
        globalHighScore = res.value;
        if (this.hsText && this.hsText.active) {
          this.hsText.setText(`🏆 RÉCORD: ${globalHighScore} PTS`);
        }
      }
    });

    const legendBox = this.add.graphics();
    legendBox.fillStyle(0x040c1d, 0.92);
    legendBox.fillRoundedRect(w / 2 - 275, 348, 550, 92, 10);
    legendBox.lineStyle(1.6, 0x00f0ff, 0.7);
    legendBox.strokeRoundedRect(w / 2 - 275, 348, 550, 92, 10);

    this.add.image(w / 2 - 245, 372, 'cepillao').setScale(0.72);
    this.add.text(w / 2 - 222, 372, 'Cepillao: -22% Calor', {
      fontFamily: 'Trebuchet MS, sans-serif', fontSize: '12px', fontStyle: 'bold', color: '#38bdf8',
    }).setOrigin(0, 0.5);

    this.add.image(w / 2 + 35, 372, 'patacon').setScale(0.75);
    this.add.text(w / 2 + 58, 372, 'Patacón: Anti-Rayos x 15s', {
      fontFamily: 'Trebuchet MS, sans-serif', fontSize: '12px', fontStyle: 'bold', color: '#ffd700',
    }).setOrigin(0, 0.5);

    this.add.image(w / 2 - 245, 415, 'tequenos').setScale(0.8);
    this.add.text(w / 2 - 222, 415, 'Tequeños: Anti-Lanchas x 10s', {
      fontFamily: 'Trebuchet MS, sans-serif', fontSize: '12px', fontStyle: 'bold', color: '#fb923c',
    }).setOrigin(0, 0.5);

    this.add.image(w / 2 + 35, 415, 'cerveza').setScale(0.72);
    this.add.text(w / 2 + 58, 415, 'Cerveza: +Velocidad Turbo x 8s', {
      fontFamily: 'Trebuchet MS, sans-serif', fontSize: '12px', fontStyle: 'bold', color: '#a3e635',
    }).setOrigin(0, 0.5);

    this.add.text(w / 2, 456, '🕹️ ARCADE: JOYSTICK P1  •  START1 / BOTÓN 1  |  PC: WASD / Flechas / Click', {
      fontFamily: 'Trebuchet MS, sans-serif', fontSize: '11px', color: '#94a3b8',
    }).setOrigin(0.5);

    const btn = this.add.rectangle(w / 2, 498, 240, 46, 0xff0055).setInteractive({ useHandCursor: true });
    btn.setStrokeStyle(2.5, 0xffffff);

    const btnT = this.add.text(w / 2, 498, '¡JUGAR VOS!', {
      fontFamily: 'Impact, Trebuchet MS, sans-serif', fontSize: '23px', color: '#ffffff', letterSpacing: 2,
    }).setOrigin(0.5);
    this.tweens.add({ targets: [btn, btnT], scale: { from: 1.0, to: 1.03 }, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const startGame = () => {
      audioSynth.init();
      audioSynth.cepillao();
      this.scene.start('GameScene');
    };

    btn.on('pointerover', () => { btn.setFillStyle(0x00f0ff); btnT.setColor('#050510'); });
    btn.on('pointerout', () => { btn.setFillStyle(0xff0055); btnT.setColor('#ffffff'); });
    btn.on('pointerdown', startGame);

    this.input.keyboard.once('keydown-SPACE', startGame);
    this.input.keyboard.once('keydown-ENTER', startGame);

    this.add.text(w / 2, 542, 'PRESIONA [ START ] O [ BOTÓN 1 ] PARA JUGAR', {
      fontFamily: 'Trebuchet MS, sans-serif', fontSize: '11px', fontStyle: 'bold', color: '#00f0ff', letterSpacing: 1,
    }).setOrigin(0.5);

    this.add.image(w / 2, h / 2, 'crt_overlay').setAlpha(0.6).setDepth(100);
  }

  update() {
    if (held.START1 || held.P1_1) {
      held.START1 = false;
      held.P1_1 = false;
      audioSynth.init();
      audioSynth.cepillao();
      this.scene.start('GameScene');
    }
  }
}

// --- Escena Principal del Juego ---
class GameScene extends Phaser.Scene {
  constructor() { super('GameScene'); }

  create() {
    audioSynth.init();
    audioSynth.startBgm();

    this.w = this.cameras.main.width;
    this.h = this.cameras.main.height;

    this.score = 0;
    this.combo = 1;
    this.comboTimer = 0;
    this.temperature = 10;
    this.heatRate = 0.04;
    this.isImmune = false;
    this.immunityTime = 0;
    this.isBoatImmune = false;
    this.boatImmunityTime = 0;
    this.isSpeedBoosted = false;
    this.speedBoostTime = 0;
    this.baseSpeed = 270;
    this.speed = 270;
    this.isSlowed = false;
    this.gameTime = 0;
    this.lightningInterval = 1500;

    this.skyG = this.add.graphics();
    this.skyG.fillGradientStyle(0x08041d, 0x08041d, 0x021b3a, 0x021b3a, 1);
    this.skyG.fillRect(0, 0, this.w, 140);

    this.add.image(this.w / 2, 95, 'puente').setScale(1.05).setAlpha(0.85);

    this.ambientFlash = this.add.rectangle(this.w / 2, this.h / 2, this.w, this.h, 0x9900ff, 0).setDepth(2);
    this.waterG = this.add.graphics().setDepth(3);

    if (!this.anims.exists('swim')) {
      this.anims.create({ key: 'swim', frames: [{ key: 'godzilla_0' }, { key: 'godzilla_1' }], frameRate: 4, repeat: -1 });
    }

    this.player = this.physics.add.sprite(this.w / 2, this.h * 0.65, 'godzilla_0');
    this.player.setCollideWorldBounds(true).setDepth(20);
    this.player.body.setSize(54, 54).setOffset(24, 30);
    this.player.play('swim');

    this.auraG = this.add.graphics().setDepth(21).setVisible(false);
    this.boatAuraG = this.add.graphics().setDepth(21).setVisible(false);

    this.add.particles(0, 0, 'p_drop', {
      speed: { min: 25, max: 70 }, angle: { min: 40, max: 140 }, scale: { start: 0.9, end: 0 },
      alpha: { start: 0.65, end: 0 }, lifespan: 500, quantity: 2, follow: this.player, followOffset: { x: 0, y: 34 },
    }).setDepth(15);

    this.goldEmitter = this.add.particles(0, 0, 'p_star', {
      speed: { min: 30, max: 80 }, scale: { start: 0.8, end: 0 }, lifespan: 600, emitting: false, follow: this.player,
    }).setDepth(22);

    this.speedEmitter = this.add.particles(0, 0, 'p_speed', {
      speed: { min: 20, max: 60 }, scale: { start: 1, end: 0 }, alpha: { start: 0.8, end: 0 }, lifespan: 300, emitting: false, follow: this.player, followOffset: { x: 0, y: 20 },
    }).setDepth(19);

    this.sparkEmitter = this.add.particles(0, 0, 'p_spark', {
      speed: { min: 80, max: 240 }, scale: { start: 1.2, end: 0 }, lifespan: 400, emitting: false,
    }).setDepth(35);

    this.smokeEmitter = this.add.particles(0, 0, 'p_smoke', {
      speed: { min: 20, max: 50 }, angle: { min: 250, max: 290 }, scale: { start: 0.6, end: 1.4 },
      alpha: { start: 0.5, end: 0 }, lifespan: 700, emitting: false, follow: this.player, followOffset: { x: 0, y: -22 },
    }).setDepth(25);

    this.cepillaos = this.physics.add.group();
    this.patacones = this.physics.add.group();
    this.tequenos = this.physics.add.group();
    this.cervezas = this.physics.add.group();
    this.lanchas = this.physics.add.group();

    this.physics.add.overlap(this.player, this.cepillaos, this.collectCepillao, null, this);
    this.physics.add.overlap(this.player, this.patacones, this.collectPatacon, null, this);
    this.physics.add.overlap(this.player, this.tequenos, this.collectTequenos, null, this);
    this.physics.add.overlap(this.player, this.cervezas, this.collectCerveza, null, this);
    this.physics.add.overlap(this.player, this.lanchas, this.hitLancha, null, this);

    // Controles táctiles / Mouse de apoyo para pruebas locales
    this.input.on('pointermove', (ptr) => {
      if (ptr.isDown) this.physics.moveTo(this.player, ptr.x, Math.max(160, ptr.y), this.speed);
    });
    this.input.on('pointerdown', (ptr) => {
      this.physics.moveTo(this.player, ptr.x, Math.max(160, ptr.y), this.speed);
    });

    this.time.addEvent({ delay: 1700, callback: this.spawnCepillao, callbackScope: this, loop: true });
    this.time.addEvent({ delay: 10000, callback: this.spawnPatacon, callbackScope: this, loop: true });
    this.time.addEvent({ delay: 13000, callback: this.spawnTequenos, callbackScope: this, loop: true });
    this.time.addEvent({ delay: 11000, callback: this.spawnCerveza, callbackScope: this, loop: true });
    this.time.addEvent({ delay: 2400, callback: this.spawnLancha, callbackScope: this, loop: true });

    this.lightningTimer = this.time.addEvent({
      delay: this.lightningInterval, callback: this.triggerLightning, callbackScope: this, loop: true,
    });

    this.time.addEvent({
      delay: 1000,
      callback: () => {
        this.gameTime++;
        this.score += 10 * this.combo;
        this.heatRate += 0.0014;

        if (this.comboTimer > 0) {
          this.comboTimer--;
          if (this.comboTimer === 0) this.setCombo(1);
        }

        if (this.isImmune) {
          this.immunityTime--;
          if (this.immunityTime <= 0) {
            this.isImmune = false;
            this.auraG.setVisible(false);
            this.goldEmitter.stop();
          }
        }

        if (this.isBoatImmune) {
          this.boatImmunityTime--;
          if (this.boatImmunityTime <= 0) {
            this.isBoatImmune = false;
            this.boatAuraG.setVisible(false);
          }
        }

        if (this.isSpeedBoosted) {
          this.speedBoostTime--;
          if (this.speedBoostTime <= 0) {
            this.isSpeedBoosted = false;
            this.speed = this.baseSpeed;
            this.speedEmitter.stop();
            this.player.clearTint();
          }
        }

        if (this.gameTime > 15 && this.lightningInterval > 520) {
          this.lightningInterval -= 18;
          this.lightningTimer.reset({ delay: this.lightningInterval, callback: this.triggerLightning, callbackScope: this, loop: true });
        }
      },
      loop: true,
    });

    this.createHUD();
    this.add.image(this.w / 2, this.h / 2, 'crt_overlay').setAlpha(0.5).setDepth(99);
  }

  createHUD() {
    const hud = this.add.graphics().setDepth(50);
    hud.fillStyle(0x040814, 0.88);
    hud.fillRect(0, 0, this.w, 52);
    hud.lineStyle(2, 0x00f0ff, 0.7);
    hud.lineBetween(0, 52, this.w, 52);

    this.add.text(18, 14, 'CALOR:', { fontFamily: 'Impact, Trebuchet MS, sans-serif', fontSize: '18px', color: '#ffbe0b' }).setDepth(51);

    this.tempBarBg = this.add.graphics().setDepth(51);
    this.tempBarBg.fillStyle(0x1a202c, 1);
    this.tempBarBg.fillRoundedRect(90, 14, 180, 22, 6);
    this.tempBarBg.lineStyle(2, 0x4a5568, 1);
    this.tempBarBg.strokeRoundedRect(90, 14, 180, 22, 6);

    this.tempBar = this.add.graphics().setDepth(52);
    this.tempText = this.add.text(180, 17, '0°C', { fontSize: '13px', fontStyle: 'bold', color: '#fff' }).setOrigin(0.5, 0).setDepth(53);

    this.comboText = this.add.text(this.w * 0.44, 15, '1x COMBO', { fontFamily: 'Impact, Trebuchet MS, sans-serif', fontSize: '18px', color: '#00f0ff' }).setDepth(51);
    this.scoreText = this.add.text(this.w - 18, 14, '0 PTS', { fontFamily: 'Impact, Trebuchet MS, sans-serif', fontSize: '22px', color: '#00f0ff' }).setOrigin(1, 0).setDepth(51);

    this.powerupBanner = this.add.text(this.w / 2, 66, '', {
      fontFamily: 'Impact, Trebuchet MS, sans-serif', fontSize: '16px', color: '#ffd700', stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5, 0).setDepth(52);
  }

  update() {
    const t = this.time.now;
    this.temperature += this.heatRate;
    this.renderBar();

    if (this.temperature >= 100) {
      this.gameOver('¡TE DIO UN GOLPE DE CALOR EN EL LAGO!');
      return;
    }

    if (this.temperature > 72) {
      this.smokeEmitter.start();
      if (Math.random() < 0.05) audioSynth.beep();
    } else {
      this.smokeEmitter.stop();
    }

    this.scoreText.setText(`${this.score} PTS`);

    const statusList = [];
    if (this.isImmune) statusList.push(`⚡ RAYOS: ${this.immunityTime}s`);
    if (this.isBoatImmune) statusList.push(`🧀 TEQUEÑOS: ${this.boatImmunityTime}s`);
    if (this.isSpeedBoosted) statusList.push(`🍺 TURBO: ${this.speedBoostTime}s`);
    this.powerupBanner.setText(statusList.join('   |   '));

    this.waterG.clear();
    this.waterG.fillGradientStyle(0x02162e, 0x02162e, 0x013752, 0x004d73, 1);
    this.waterG.fillRect(0, 135, this.w, this.h - 135);

    [
      { y: 145, a: 4, f: 0.02, s: 0.003, c: 0x032b4d, al: 0.6 },
      { y: 240, a: 6, f: 0.015, s: 0.002, c: 0x02456b, al: 0.5 },
      { y: 380, a: 7, f: 0.012, s: 0.0025, c: 0x006699, al: 0.4 },
      { y: 530, a: 8, f: 0.01, s: 0.002, c: 0x0088cc, al: 0.3 },
    ].forEach((l) => {
      this.waterG.fillStyle(l.c, l.al);
      this.waterG.beginPath();
      this.waterG.moveTo(0, this.h);
      this.waterG.lineTo(0, l.y);
      for (let x = 0; x <= this.w; x += 15) {
        this.waterG.lineTo(x, l.y + Math.sin(x * l.f + t * l.s) * l.a);
      }
      this.waterG.lineTo(this.w, this.h);
      this.waterG.closePath();
      this.waterG.fill();
    });

    // Control físico de Arcade Cabinet (P1_L, P1_R, P1_U, P1_D)
    let vx = 0, vy = 0;
    if (held.P1_L) vx = -this.speed;
    else if (held.P1_R) vx = this.speed;

    if (held.P1_U) vy = -this.speed;
    else if (held.P1_D) vy = this.speed;

    if (!this.input.activePointer.isDown) {
      this.player.setVelocity(vx, vy);
    }

    if (this.player.y < 160) this.player.y = 160;

    if (this.isImmune) {
      this.auraG.clear();
      const rad = 50 + Math.sin(t * 0.01) * 3;
      this.auraG.lineStyle(4, 0xffd700, 0.9);
      this.auraG.strokeCircle(this.player.x, this.player.y, rad);
      this.auraG.fillStyle(0xffaa00, 0.22);
      this.auraG.fillCircle(this.player.x, this.player.y, rad);
      this.auraG.lineStyle(2, 0x00f0ff, 0.7);
      this.auraG.strokeCircle(this.player.x, this.player.y, rad + 8);
      this.auraG.setVisible(true);
    }

    if (this.isBoatImmune) {
      this.boatAuraG.clear();
      const radB = 54 + Math.cos(t * 0.012) * 4;
      this.boatAuraG.lineStyle(3.5, 0xf97316, 0.9);
      this.boatAuraG.strokeCircle(this.player.x, this.player.y, radB);
      this.boatAuraG.fillStyle(0xfde047, 0.2);
      this.boatAuraG.fillCircle(this.player.x, this.player.y, radB);
      this.boatAuraG.lineStyle(2, 0xffffff, 0.8);
      for (let a = 0; a < 6; a++) {
        const ang = a * Math.PI / 3 + t * 0.003;
        this.boatAuraG.strokeCircle(this.player.x + Math.cos(ang) * radB, this.player.y + Math.sin(ang) * radB, 4);
      }
      this.boatAuraG.setVisible(true);
    }

    this.cepillaos.children.each((c) => { if (c && c.y > this.h + 50) c.destroy(); });
    this.patacones.children.each((p) => { if (p && p.y > this.h + 50) p.destroy(); });
    this.tequenos.children.each((tk) => { if (tk && tk.y > this.h + 50) tk.destroy(); });
    this.cervezas.children.each((cz) => { if (cz && cz.y > this.h + 50) cz.destroy(); });
    this.lanchas.children.each((l) => { if (l && (l.x < -120 || l.x > this.w + 120)) l.destroy(); });
  }

  renderBar() {
    this.tempBar.clear();
    const p = Math.min(100, Math.max(0, this.temperature)) / 100;
    let col = 0x00ff88;
    if (p > 0.5 && p <= 0.78) col = 0xffbe0b;
    else if (p > 0.78) col = (Math.floor(this.time.now / 120) % 2 === 0) ? 0xff0055 : 0xff3b00;
    this.tempBar.fillStyle(col, 1);
    if (p > 0) this.tempBar.fillRoundedRect(92, 16, 176 * p, 18, 5);
    this.tempText.setText(`${Math.round(this.temperature * 0.4 + 25)}°C`);
  }

  setCombo(m) {
    this.combo = m;
    this.comboTimer = 6;
    this.comboText.setText(`${this.combo}x COMBO`);
    this.comboText.setColor(m > 1 ? '#ffd700' : '#00f0ff');
    this.tweens.add({ targets: this.comboText, scale: { from: 1.4, to: 1 }, duration: 240 });
  }

  spawnItem(grp, key, prob, vyMin, vyMax, tw) {
    if (prob && Math.random() > prob) return;
    const x = Phaser.Math.Between(50, this.w - 50);
    const item = grp.create(x, 140, key).setDepth(18);
    item.setVelocityY(Phaser.Math.Between(vyMin, vyMax));
    if (tw) this.tweens.add({ targets: item, ...tw });
  }

  spawnCepillao() { this.spawnItem(this.cepillaos, 'cepillao', 0, 85, 145, { angle: { from: -8, to: 8 }, duration: 900, yoyo: true, repeat: -1 }); }
  spawnPatacon() { this.spawnItem(this.patacones, 'patacon', 0.4, 110, 160, { scale: { from: 0.9, to: 1.25 }, duration: 450, yoyo: true, repeat: -1 }); }
  spawnTequenos() { this.spawnItem(this.tequenos, 'tequenos', 0.45, 95, 150, { scale: { from: 0.95, to: 1.2 }, duration: 500, yoyo: true, repeat: -1 }); }
  spawnCerveza() { this.spawnItem(this.cervezas, 'cerveza', 0.45, 100, 155, { angle: { from: -6, to: 6 }, duration: 800, yoyo: true, repeat: -1 }); }

  spawnLancha() {
    const ltr = Math.random() > 0.5;
    const x = ltr ? -60 : this.w + 60;
    const y = Phaser.Math.Between(175, this.h - 65);
    const b = this.lanchas.create(x, y, 'lancha').setDepth(19);
    b.setFlipX(!ltr);
    b.setVelocityX(Phaser.Math.Between(130, 230) * (ltr ? 1 : -1));
    this.add.particles(0, 0, 'p_drop', {
      speed: { min: 15, max: 40 }, angle: ltr ? { min: 150, max: 210 } : { min: -30, max: 30 },
      scale: { start: 0.7, end: 0 }, alpha: { start: 0.6, end: 0 }, lifespan: 400, quantity: 1,
      follow: b, followOffset: { x: ltr ? -35 : 35, y: 8 },
    }).setDepth(16);
  }

  triggerLightning() {
    const tx = Phaser.Math.Between(55, this.w - 55), ty = Phaser.Math.Between(170, this.h - 55);
    const warn = this.add.graphics().setDepth(25);
    this.tweens.addCounter({
      from: 0, to: 1, duration: 600,
      onUpdate: (tw) => {
        const pr = tw.getValue();
        warn.clear();
        warn.lineStyle(3, 0xff0055, 0.9);
        warn.strokeCircle(tx, ty, 40 * (1 - pr * 0.3));
        warn.fillStyle(0xff0055, 0.18);
        warn.fillCircle(tx, ty, 35);
        warn.lineBetween(tx - 25, ty, tx + 25, ty);
        warn.lineBetween(tx, ty - 25, tx, ty + 25);
      },
      onComplete: () => { warn.destroy(); this.strike(tx, ty); },
    });
  }

  strike(tx, ty) {
    audioSynth.thunder();
    audioSynth.zap();
    this.cameras.main.shake(220, 0.016);
    this.ambientFlash.setAlpha(0.65);
    this.tweens.add({ targets: this.ambientFlash, alpha: 0, duration: 240 });

    const bolt = this.add.graphics().setDepth(30);
    function branch(x1, y1, x2, y2, d) {
      if (d <= 0) { bolt.lineBetween(x1, y1, x2, y2); return; }
      const mx = (x1 + x2) / 2 + Phaser.Math.Between(-28, 28);
      const my = (y1 + y2) / 2 + Phaser.Math.Between(-10, 20);
      branch(x1, y1, mx, my, d - 1);
      branch(mx, my, x2, y2, d - 1);
      if (Math.random() < 0.45 && d >= 2) {
        branch(mx, my, mx + Phaser.Math.Between(-35, 35), my + Phaser.Math.Between(20, 45), d - 2);
      }
    }

    bolt.lineStyle(8, 0x00f0ff, 0.45); branch(tx + Phaser.Math.Between(-30, 30), 0, tx, ty, 4);
    bolt.lineStyle(3.5, 0x90e0ef, 0.85); branch(tx + Phaser.Math.Between(-15, 15), 0, tx, ty, 4);
    bolt.lineStyle(1.8, 0xffffff, 1); branch(tx, 0, tx, ty, 4);

    this.sparkEmitter.explode(18, tx, ty);
    const spG = this.add.graphics().setDepth(31);
    spG.fillStyle(0x00f0ff, 0.75);
    spG.fillCircle(tx, ty, 38);
    spG.lineStyle(3, 0xffffff, 0.9);
    spG.strokeCircle(tx, ty, 46);
    this.tweens.add({ targets: [bolt, spG], alpha: 0, duration: 280, onComplete: () => { bolt.destroy(); spG.destroy(); } });

    if (Phaser.Math.Distance.Between(this.player.x, this.player.y, tx, ty) < 60) {
      if (this.isImmune) {
        this.score += 200 * this.combo;
        this.setCombo(this.combo + 1);
        this.popup(this.player.x, this.player.y - 35, '⚡ ¡CATATUMBO ABSORBIDO! +200', '#ffd700');
        this.goldEmitter.explode(20, this.player.x, this.player.y);
      } else {
        this.temperature += 22;
        this.cameras.main.flash(200, 255, 0, 85);
        this.popup(this.player.x, this.player.y - 35, '⚡ ¡RAYAZO! +22% CALOR', '#ff0055');
      }
    }
  }

  collectCepillao(pl, c) {
    audioSynth.cepillao();
    c.destroy();
    this.score += 100 * this.combo;
    this.temperature = Math.max(0, this.temperature - 22);
    this.setCombo(Math.min(5, this.combo + 1));
    this.sparkEmitter.explode(10, pl.x, pl.y);
    this.popup(pl.x, pl.y - 25, '🍧 -22% CALOR ¡REFRIGERADO!', '#00ff88');
  }

  collectPatacon(pl, p) {
    audioSynth.patacon();
    p.destroy();
    this.score += 350 * this.combo;
    this.isImmune = true;
    this.immunityTime = 15;
    this.setCombo(Math.min(5, this.combo + 1));
    this.goldEmitter.start();
    this.popup(pl.x, pl.y - 30, '🍌 ¡PATACÓN POWER! ANTI-RAYOS 15s', '#ffd700');
    this.cameras.main.flash(180, 255, 215, 0);
  }

  collectTequenos(pl, tk) {
    audioSynth.tequeno();
    tk.destroy();
    this.score += 300 * this.combo;
    this.isBoatImmune = true;
    this.boatImmunityTime = 10;
    this.setCombo(Math.min(5, this.combo + 1));
    this.sparkEmitter.explode(12, pl.x, pl.y);
    this.popup(pl.x, pl.y - 30, '🧀 ¡ESCUDO DE TEQUEÑOS! INMUNE A LANCHAS 10s', '#fb923c');
    this.cameras.main.flash(150, 251, 146, 60);
  }

  collectCerveza(pl, cz) {
    audioSynth.cerveza();
    cz.destroy();
    this.score += 250 * this.combo;
    this.isSpeedBoosted = true;
    this.speedBoostTime = 8;
    this.speed = this.baseSpeed * 1.45;
    this.speedEmitter.start();
    this.player.setTint(0x7dd3fc);
    this.setCombo(Math.min(5, this.combo + 1));
    this.popup(pl.x, pl.y - 30, '🍺 ¡BIRRA TURBO! +VELOCIDAD 8s', '#a3e635');
  }

  hitLancha(pl, l) {
    if (this.isBoatImmune) {
      audioSynth.crash();
      this.score += 150 * this.combo;
      this.sparkEmitter.explode(15, l.x, l.y);
      this.popup(l.x, l.y - 30, '🧀 ¡TEQUEÑAZO! LANCHA DESTRUIDA +150', '#fb923c');
      l.destroy();
      return;
    }

    audioSynth.crash();
    audioSynth.grito();
    const quotes = [
      "¡LLÉVAME PA' TU CASA!", "¡QUÉ FUE, VERGA!", "¡VAS A TUMBAR EL PUENTE, CABEZÓN!",
      "¡LLÉVAME PA' TU CASA, MIJITO!", "¡QUITÁ DE AHÍ, MAMARRACHO!", "¡DIALOOOO, VOS SI SOIS GRANDE!"
    ];
    this.popup(l.x, l.y - 32, Phaser.Utils.Array.GetRandom(quotes), '#fff', '#ff0055');
    this.temperature += 15;
    this.setCombo(1);
    this.sparkEmitter.explode(14, l.x, l.y);
    l.destroy();

    if (!this.isSlowed) {
      this.isSlowed = true;
      this.speed = (this.isSpeedBoosted ? this.baseSpeed : this.baseSpeed * 0.42);
      this.player.setTint(0xff5555);
      this.time.delayedCall(2200, () => {
        this.isSlowed = false;
        this.speed = this.isSpeedBoosted ? this.baseSpeed * 1.45 : this.baseSpeed;
        if (!this.isSpeedBoosted) this.player.clearTint();
        else this.player.setTint(0x7dd3fc);
      });
    }
  }

  popup(x, y, txt, col = '#fff', strk = '#000') {
    const t = this.add.text(x, y, txt, {
      fontFamily: 'Trebuchet MS, sans-serif', fontSize: '15px', fontStyle: 'bold', color: col, stroke: strk, strokeThickness: 5,
    }).setOrigin(0.5).setDepth(60);
    this.tweens.add({ targets: t, y: y - 45, alpha: 0, duration: 1300, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
  }

  gameOver(reason) {
    audioSynth.stopBgm();
    if (this.score > globalHighScore) {
      globalHighScore = this.score;
      saveData('godzilla-maracucho-hs', this.score);
    }
    this.scene.start('GameOverScene', { score: this.score, reason: reason });
  }
}

// --- Escena Game Over ---
class GameOverScene extends Phaser.Scene {
  constructor() { super('GameOverScene'); }

  create(data) {
    const w = this.cameras.main.width, h = this.cameras.main.height;

    const bg = this.add.graphics();
    bg.fillGradientStyle(0x320210, 0x320210, 0x0a0108, 0x020005, 1);
    bg.fillRect(0, 0, w, h);

    this.add.text(w / 2, 105, '¡NOS CAYÓ LA PAVA!\nGAME OVER', {
      fontFamily: 'Impact, Trebuchet MS, sans-serif', fontSize: '42px', color: '#ff0055', align: 'center', stroke: '#fff', strokeThickness: 5,
      shadow: { blur: 18, color: '#ff0055', fill: true },
    }).setOrigin(0.5);

    const frases = [
      '¡EL CATATUMBO TE DEJÓ FRITO, MIJITO!',
      '¡MAMARRACHO, TE DIO UN GOLPE DE CALOR!',
      '¡SE TE DERRITIÓ EL SOMBRERO DE COGOLLO!',
      '¡NOS CAYÓ LA PAVA EN PLENO PUENTE!',
      "¡TE FALTÓ OTRO CEPILLAO PA' AGUANTAR LA PEA!"
    ];

    this.add.text(w / 2, 205, data.reason || Phaser.Utils.Array.GetRandom(frases), {
      fontFamily: 'Trebuchet MS, sans-serif', fontSize: '16px', fontStyle: 'bold', color: '#ffd700', align: 'center',
    }).setOrigin(0.5);

    const box = this.add.graphics();
    box.fillStyle(0x0a0515, 0.9);
    box.fillRoundedRect(w / 2 - 170, 255, 340, 120, 12);
    box.lineStyle(2, 0xff0055, 0.9);
    box.strokeRoundedRect(w / 2 - 170, 255, 340, 120, 12);

    this.add.text(w / 2, 290, `PUNTAJE: ${data.score || 0}`, {
      fontFamily: 'Impact, Trebuchet MS, sans-serif', fontSize: '24px', color: '#00f0ff', letterSpacing: 1,
    }).setOrigin(0.5);

    this.add.text(w / 2, 335, `RÉCORD MÁXIMO: ${globalHighScore} PTS`, {
      fontFamily: 'Trebuchet MS, sans-serif', fontSize: '16px', fontStyle: 'bold', color: '#ffd700',
    }).setOrigin(0.5);

    const rBtn = this.add.rectangle(w / 2, 435, 250, 48, 0x00f0ff).setInteractive({ useHandCursor: true });
    rBtn.setStrokeStyle(3, 0xffffff);

    const rTxt = this.add.text(w / 2, 435, '¡OTRA VEZ, VOS!', {
      fontFamily: 'Impact, Trebuchet MS, sans-serif', fontSize: '24px', color: '#000', letterSpacing: 2,
    }).setOrigin(0.5);

    const restartGame = () => {
      audioSynth.init();
      audioSynth.cepillao();
      this.scene.start('GameScene');
    };

    rBtn.on('pointerover', () => { rBtn.setFillStyle(0xff0055); rTxt.setColor('#fff'); });
    rBtn.on('pointerout', () => { rBtn.setFillStyle(0x00f0ff); rTxt.setColor('#000'); });
    rBtn.on('pointerdown', restartGame);

    const mBtn = this.add.rectangle(w / 2, 500, 250, 42, 0x2d3748).setInteractive({ useHandCursor: true });
    mBtn.setStrokeStyle(2, 0x718096);
    this.add.text(w / 2, 500, 'MENÚ PRINCIPAL', {
      fontFamily: 'Trebuchet MS, sans-serif', fontSize: '16px', fontStyle: 'bold', color: '#fff',
    }).setOrigin(0.5);
    mBtn.on('pointerdown', () => this.scene.start('MenuScene'));

    this.add.text(w / 2, 555, 'PRESIONA [ START ] PARA REINTENTAR  •  [ BOTÓN 2 ] MENÚ', {
      fontFamily: 'Trebuchet MS, sans-serif', fontSize: '12px', fontStyle: 'bold', color: '#94a3b8',
    }).setOrigin(0.5);

    this.add.image(w / 2, h / 2, 'crt_overlay').setAlpha(0.6).setDepth(100);
  }

  update() {
    if (held.START1 || held.P1_1) {
      held.START1 = false;
      held.P1_1 = false;
      audioSynth.init();
      audioSynth.cepillao();
      this.scene.start('GameScene');
    } else if (held.P1_2) {
      held.P1_2 = false;
      this.scene.start('MenuScene');
    }
  }
}

// --- Inicialización del juego con Phaser 3 ---
const config = {
  type: Phaser.AUTO,
  parent: 'game-root',
  width: W,
  height: H,
  backgroundColor: '#030814',
  render: { pixelArt: false, antialias: true, roundPixels: true },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: { default: 'arcade', arcade: { gravity: { y: 0 }, debug: false } },
  scene: [MenuScene, GameScene, GameOverScene],
};

new Phaser.Game(config);
