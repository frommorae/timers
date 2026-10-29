/*! morae-timer-styles.js · the drawing for every Morae Timers style (classic ring, flip clock, hourglass, candle,
 * water, fill, apple tree), its colour sets and the image-colour reader. Shared by Morae Timers and Morae MCAT's
 * full-screen focus, so both always look the same. No libraries, no network (except reading image colours through
 * wsrv.nl when a site blocks it, the same as Morae Timers).
 * Use: MoraeTimerStyles.mount({ root, stage, theme(), label(), round(), state() -> { mode, running, done, frac }, pal(), onPaint })
 *      then MoraeTimerStyles.time(MoraeTimerStyles.fmt(msLeft)) on every tick. root must hold #glow, #tide and #tideCv. */
(function () {
'use strict';
let H = null;
const $ = s => (H && H.root || document).querySelector(s);
const ST = { get done(){ return H.state().done; }, get mode(){ return H.state().mode; }, get running(){ return H.state().running; } };
const frac = () => H.state().frac;
const pal = () => H.pal();
const PALETTES = [
  { id: 'sahara', name: 'Sahara', dark: false, bg: '#F1EAE0', ink: '#35291F', muted: '#6A5A4B', accent: '#9E5426', onAccent: '#FFFFFF', panel: '#FFFEFB', sand: '#D6A86F', frame: '#8C6A4F', glass: '#CDBBA8', water: '#93B9D6', wax: '#FBF4E8', flame: '#F3A65A', leaf: '#A6CC8F', leaf2: '#86B471', trunk: '#A47A58', ground: '#C9D9A8', flower: '#F3B2BF', card: '#3B3029', cardTop: '#4A3D34', apple: '#E07A6E', cardInk: '#F6EEE3' },
  { id: 'ink', name: 'Ink', dark: false, bg: '#F2F4F7', ink: '#1E2532', muted: '#556074', accent: '#355C8C', onAccent: '#FFFFFF', panel: '#FFFFFF', sand: '#D9B78E', frame: '#66768C', glass: '#BAC5D3', water: '#8FB4DA', wax: '#FBFAF7', flame: '#F2A65A', leaf: '#A3CDAA', leaf2: '#82B48E', trunk: '#9A7A62', ground: '#C7DCC4', flower: '#F2B3C4', card: '#232A36', cardTop: '#2E3644', apple: '#DD7B78', cardInk: '#EEF2F7' },
  { id: 'blush', name: 'Blush', dark: false, bg: '#F7ECEB', ink: '#4A2F33', muted: '#85666A', accent: '#B05F6D', onAccent: '#FFFFFF', panel: '#FFF9F8', sand: '#DDB07D', frame: '#9A6B72', glass: '#D8BFC2', water: '#A8C5DF', wax: '#FFF8F4', flame: '#F3A65A', leaf: '#AACDA0', leaf2: '#8AB683', trunk: '#A27B66', ground: '#D3DFB8', flower: '#F2A9B8', card: '#3F2B2F', cardTop: '#4E373B', apple: '#E0767E', cardInk: '#FBEFEF' },
  { id: 'sage', name: 'Sage', dark: false, bg: '#EBF0E6', ink: '#2B372A', muted: '#5F6E5B', accent: '#5C7F55', onAccent: '#FFFFFF', panel: '#F9FBF6', sand: '#D8B07A', frame: '#6F7F5E', glass: '#C2CDB8', water: '#98BFD0', wax: '#FDFBF4', flame: '#F3A65A', leaf: '#A8CC92', leaf2: '#86B272', trunk: '#9C7A5C', ground: '#CADBB2', flower: '#F1B0B9', card: '#2C3529', cardTop: '#384334', apple: '#DE7A6C', cardInk: '#F0F4EA' },
  { id: 'night', name: 'Night', dark: true, bg: '#13100D', ink: '#FFF8EF', muted: '#BBA996', accent: '#FFBD82', onAccent: '#1A1209', panel: '#2A231D', sand: '#D9A86C', frame: '#7C5C41', glass: '#5E4E40', water: '#6F9BC6', wax: '#EFE3D0', flame: '#FFB561', leaf: '#8FBE7E', leaf2: '#72A262', trunk: '#8E6A4E', ground: '#4E5E3A', flower: '#E79AAB', card: '#2A231D', cardTop: '#362D26', apple: '#E58575', cardInk: '#FFF8EF' },
  { id: 'dusk', name: 'Dusk', dark: true, bg: '#171A23', ink: '#ECEFF6', muted: '#A2A8BA', accent: '#AAB9E6', onAccent: '#141824', panel: '#222734', sand: '#D8AE78', frame: '#56607A', glass: '#4A5268', water: '#7FA6D4', wax: '#EEF0F6', flame: '#FFB561', leaf: '#93C2A0', leaf2: '#74A684', trunk: '#8C7062', ground: '#3E4E48', flower: '#E6A0B6', card: '#222734', cardTop: '#2C3242', apple: '#E58A8F', cardInk: '#ECEFF6' },
];
const THEMES = [['classic', 'Classic'], ['flip', 'Flip clock'], ['hourglass', 'Hourglass'], ['candle', 'Candle'], ['liquid', 'Water'], ['fill', 'Fill'], ['grow', 'Apple tree']];

/* ---------------- canvas helpers ---------------- */
const RAF = { id: 0, last: 0 };
function fit(cv, maxD = 2){
  const r = cv.getBoundingClientRect(); if (!r.width) return null;
  const d = Math.min(devicePixelRatio || 1, maxD), w = Math.round(r.width * d), h = Math.round(r.height * d);
  if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  return { c: cv.getContext('2d'), w, h, d };
}
const hex = (h, a = 1) => { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; };
const shade = (h, k) => { const n = parseInt(h.slice(1), 16); const f = v => Math.max(0, Math.min(255, Math.round(v + (k > 0 ? (255 - v) * k : v * k)))); return `rgb(${f(n >> 16 & 255)},${f(n >> 8 & 255)},${f(n & 255)})`; };
const isBreak = () => ST.mode === 'short' || ST.mode === 'long';
// in design units: every drawing uses a 200 × 260 box, scaled to fit the canvas
function box(f, W = 200, H = 260){ const s = Math.min(f.w / W, f.h / H), ox = (f.w - W * s) / 2, oy = (f.h - H * s) / 2; f.c.setTransform(s, 0, 0, s, ox, oy); return { s, ox, oy }; }

/* Hourglass (same shape as the planner): the top surface dips, a cone grows below, grains fall; the glass turns over for a break. */
const HG = (() => {
  const yT = 26, yN = 130, yB = 234, R = 52, rn = 2.4, dy = 0.5, cx = 100;
  const bulb = t => { let r = rn + (R - rn) * Math.pow(Math.cos(t * Math.PI / 2), 1.15); if (t < 0.12) r *= 0.72 + 0.28 * Math.sqrt(1 - ((0.12 - t) / 0.12) ** 2); return r; };
  const r = y => y <= yN ? bulb(Math.min(1, Math.max(0, (y - yT) / (yN - yT)))) : bulb(Math.min(1, Math.max(0, (yB - y) / (yB - yN))));
  const rows = []; for (let y = yT; y <= yB + 1e-9; y += dy) rows.push([y, r(y)]);
  let Atop = 0, Abot = 0; for (const [y, w] of rows) { if (y < yN) Atop += 2 * w * dy; else Abot += 2 * w * dy; }
  const topCum = []; let a = 0; for (let i = rows.length - 1; i >= 0; i--) { const [y, w] = rows[i]; if (y >= yN) continue; a += 2 * w * dy; topCum.push([y, a]); }
  return { yT, yN, yB, R, cx, r, rows, Atop, Abot, topCum, F: 0.78, k: 0.6, cc: 7, pile: { key: -1, y: 0 }, flipAt: -1e9, lastMode: null, dip: 0, speck: null };
})();
const hgTopY = area => { for (const [y, a] of HG.topCum) if (a >= area) return y; return HG.yT; };
function hgPileY(done){
  const key = Math.round(done * 4000); if (HG.pile.key === key) return HG.pile.y;
  const area = yA => { let a = 0; for (const [y, w] of HG.rows) { if (y < yA || y < HG.yN) continue; const xp = Math.sqrt(((y - yA) / HG.k + HG.cc) ** 2 - HG.cc ** 2); a += 2 * Math.min(w, xp) * 0.5; } return a; };
  const target = HG.F * HG.Abot * done; let lo = HG.yN + 4, hi = HG.yB;
  for (let i = 0; i < 26; i++) { const m = (lo + hi) / 2; if (area(m) > target) lo = m; else hi = m; }
  HG.pile = { key, y: (lo + hi) / 2 }; return HG.pile.y;
}
function drawHourglass(f, t, dt){
  const { c } = f, p = pal(), cx = HG.cx; c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, f.w, f.h); box(f);
  if (HG.lastMode && HG.lastMode !== ST.mode) HG.flipAt = performance.now(); HG.lastMode = ST.mode;
  const done = frac(), flowing = ST.running && done > 0.0005 && done < 0.9995;
  HG.dip += ((flowing ? 1 : 0) - HG.dip) * Math.min(1, dt * 1.5);
  const fp = Math.min(1, (performance.now() - HG.flipAt) / 750), turn = fp < 1 ? Math.PI * (1 - (fp < .5 ? 2 * fp * fp : 1 - (-2 * fp + 2) ** 2 / 2)) : 0;
  c.fillStyle = hex(p.ink, .10); c.beginPath(); c.ellipse(cx, 252, 66, 4, 0, 0, Math.PI * 2); c.fill();
  c.save(); c.translate(cx, HG.yN); c.rotate(turn); c.translate(-cx, -HG.yN);
  const path = pad => { c.beginPath(); HG.rows.forEach(([y, r], i) => i ? c.lineTo(cx - r - pad, y) : c.moveTo(cx - r - pad, y)); for (let i = HG.rows.length - 1; i >= 0; i--) c.lineTo(cx + HG.rows[i][1] + pad, HG.rows[i][0]); c.closePath(); };
  path(1.6); c.fillStyle = hex(p.panel, .55); c.fill();
  c.save(); path(0); c.clip();
  const rem = 1 - done;
  if (rem > 0.0005) {
    const yS = hgTopY(HG.F * HG.Atop * rem), half = HG.r(Math.max(yS, HG.yT + 1)), dip = Math.min(6, 2 + 30 * rem) * HG.dip;
    c.beginPath(); c.moveTo(cx - 70, HG.yN + .5);
    for (let x = -70; x <= 70; x += 2) c.lineTo(cx + x, yS - dip * .3 + dip * Math.exp(-((x / (half * .55 + 2)) ** 2)));
    c.lineTo(cx + 70, HG.yN + .5); c.closePath(); c.fillStyle = p.sand; c.fill();
  }
  const yA = done > 0.0005 ? hgPileY(done) : HG.yB + 2;
  if (done > 0.0005) { c.beginPath(); c.moveTo(cx - 70, HG.yB + 4); for (let x = -70; x <= 70; x += 1.5) c.lineTo(cx + x, yA + HG.k * (Math.sqrt(x * x + HG.cc ** 2) - HG.cc)); c.lineTo(cx + 70, HG.yB + 4); c.closePath(); c.fillStyle = p.sand; c.fill(); }
  const sh = c.createLinearGradient(0, HG.yT, 0, HG.yB); sh.addColorStop(0, 'rgba(255,255,255,.12)'); sh.addColorStop(.49, 'rgba(0,0,0,.10)'); sh.addColorStop(.51, 'rgba(255,255,255,.08)'); sh.addColorStop(1, 'rgba(0,0,0,.12)');
  c.globalCompositeOperation = 'source-atop'; c.fillStyle = sh; c.fillRect(0, 0, 200, 260);
  for (let i = 0; i < 90; i++) { const x = (i * 37.7) % 120 + 40, y = (i * 53.3) % 210 + 24; c.fillStyle = i % 2 ? 'rgba(255,255,255,.18)' : 'rgba(0,0,0,.14)'; c.fillRect(x, y, .8, .8); }
  c.globalCompositeOperation = 'source-over';
  if (flowing && fp >= 1) { const len = Math.max(0, yA - HG.yN); c.fillStyle = p.sand; c.fillRect(cx - .6, HG.yN - 1, 1.2, len + 1); for (let i = 0; i < 9; i++) { const q = (t * 95 + i * len / 9) % (len || 1); c.beginPath(); c.arc(cx + Math.sin(i * 12.9) * .25, HG.yN + q, .8, 0, Math.PI * 2); c.fill(); } }
  c.restore();
  path(1.2); c.strokeStyle = p.glass; c.lineWidth = 2.2; c.lineJoin = 'round'; c.stroke();
  c.beginPath(); let first = true; for (const [y, r] of HG.rows) { if (y < HG.yT + 6 || y > HG.yN - 22) continue; const x = cx - r + 6; first ? c.moveTo(x, y) : c.lineTo(x, y); first = false; }
  c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 2.4; c.lineCap = 'round'; c.stroke();
  const plate = y => { const g = c.createLinearGradient(0, y, 0, y + 12); g.addColorStop(0, shade(p.frame, .18)); g.addColorStop(1, p.frame); c.fillStyle = g; c.beginPath(); c.roundRect ? c.roundRect(26, y, 148, 12, 5) : c.rect(26, y, 148, 12); c.fill(); };
  c.fillStyle = p.frame; c.beginPath(); c.roundRect ? (c.roundRect(33, 16, 6, 228, 3), c.roundRect(161, 16, 6, 228, 3)) : (c.rect(33, 16, 6, 228), c.rect(161, 16, 6, 228)); c.fill();
  plate(8); plate(238);
  c.restore();
}

/* Water: drains while you focus and refills on a break; three layered waves, nothing else. */
const LQ = { level: null };
function drawLiquid(f, t, dt){
  const { c } = f, p = pal(); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, f.w, f.h); box(f);
  const gx = 38, gy = 22, gw = 124, gh = 214, rr = 18;
  const target = isBreak() ? frac() : 1 - frac();
  if (LQ.level == null) LQ.level = target; LQ.level += (target - LQ.level) * Math.min(1, dt * 1.6);
  const lv = LQ.level, moving = ST.running, A = (moving ? 4.5 : 2.5) * (isBreak() && moving ? 1.25 : 1) * (.85 + .15 * Math.sin(t * .37));
  const glass = () => { c.beginPath(); c.moveTo(gx, gy); c.lineTo(gx, gy + gh - rr); c.quadraticCurveTo(gx, gy + gh, gx + rr, gy + gh); c.lineTo(gx + gw - rr, gy + gh); c.quadraticCurveTo(gx + gw, gy + gh, gx + gw, gy + gh - rr); c.lineTo(gx + gw, gy); };
  c.fillStyle = hex(p.ink, .07); c.beginPath(); c.ellipse(100, gy + gh + 10, 66, 4, 0, 0, Math.PI * 2); c.fill();
  glass(); c.closePath(); c.fillStyle = hex(p.panel, .55); c.fill();
  c.save(); glass(); c.closePath(); c.clip();
  const y0 = gy + gh * (1 - lv) + 4, sp = isBreak() ? 1.25 : 1;
  const wave = (amp, speed, ph, off) => { const pts = []; for (let x = gx - 4; x <= gx + gw + 4; x += 3) { const u = (x - gx) / gw * Math.PI * 2 * 1.2; pts.push([x, y0 + off + amp * (.58 * Math.sin(u + t * speed + ph) + .28 * Math.sin(u * 2.3 - t * speed * 1.45 + ph * 1.7) + .14 * Math.sin(u * 4.2 + t * speed * 2.3 + ph * .6))]); } return pts; };
  const fillW = (pts, st) => { c.beginPath(); c.moveTo(pts[0][0], gy + gh + 2); for (const q of pts) c.lineTo(q[0], q[1]); c.lineTo(pts[pts.length - 1][0], gy + gh + 2); c.closePath(); c.fillStyle = st; c.fill(); };
  if (lv > 0.002) {
    fillW(wave(A * 1.1, .7 * sp, 2.1, -A * .55), hex(p.water, .35));
    fillW(wave(A * .9, -.9 * sp, 4, -A * .2), hex(p.water, .55));
    const front = wave(A, 1.15 * sp, 0, 0); fillW(front, hex(p.water, .92));
    const g = c.createLinearGradient(0, y0, 0, gy + gh); g.addColorStop(0, 'rgba(255,255,255,.06)'); g.addColorStop(1, 'rgba(0,0,0,.10)'); fillW(front, g);
    c.beginPath(); front.forEach((q, i) => i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1])); c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = 1.2; c.stroke();
  }
  c.restore();
  glass(); c.strokeStyle = p.glass; c.lineWidth = 2.4; c.lineJoin = 'round'; c.stroke();
  c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath(); c.moveTo(gx + 10, gy + 18); c.lineTo(gx + 10, gy + gh - 40); c.stroke();
}

/* Candle: burns down while you focus. Wax runs down the sides to the dish and pools there; at the end only a puddle and the wick are left.
   Its light spreads across the whole page. On a break the flame is out and smoke curls up. */
const CD = { height: null, smoke: [] };
const DRIPS = [[-15, .04, 5.2], [11, .12, 4.4], [-4, .22, 4.8], [17, .32, 4], [-19, .44, 4.4], [6, .54, 5], [-10, .66, 4.2], [14, .76, 4.6]];
const easeOutBack = x => { x = Math.min(1, Math.max(0, x)); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
function setGlow(f, B, x, y, a){
  const g = $('#glow'), cv = $('#cv'); if (!g || !cv) return; const r = cv.getBoundingClientRect(), d = f.w / r.width;
  g.style.setProperty('--gx', (r.left + (B.ox + x * B.s) / d) + 'px'); g.style.setProperty('--gy', (r.top + (B.oy + y * B.s) / d) + 'px');
  g.style.setProperty('--gc', hex(pal().flame, pal().dark ? .30 : .26)); g.style.setProperty('--ga', String(a));
}
function drawCandle(f, t, dt){
  const { c } = f, p = pal(); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, f.w, f.h); const B = box(f);
  const cx = 100, base = 228, cw = 40, full = 64, stub = base - 7;
  const burn = isBreak() ? 1 : frac(), run = ST.running && !isBreak();
  const target = full + (stub - full) * Math.pow(burn, .92);
  if (CD.height == null) CD.height = target; CD.height += (target - CD.height) * Math.min(1, dt * 3);
  const top = CD.height, melt = Math.min(1, burn * 1.15);
  // dish
  c.fillStyle = hex(p.ink, .07); c.beginPath(); c.ellipse(cx, base + 13, 74, 5, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = p.frame; c.beginPath(); c.ellipse(cx, base + 6, 62, 10, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = shade(p.frame, .22); c.beginPath(); c.ellipse(cx, base + 3, 56, 7, 0, 0, Math.PI * 2); c.fill();
  // wax pooled on the dish: an uneven puddle that spreads as the candle melts
  const pool = 16 + 44 * melt, ph = 3.2 + 4 * melt;
  const blob = (sc, col) => { c.fillStyle = col; c.beginPath(); for (let a = 0; a <= Math.PI * 2 + .01; a += .1) { const r = 1 + .10 * Math.sin(a * 3 + 1.3) + .07 * Math.sin(a * 5 + .4) + .05 * Math.sin(a * 9 + 2) * melt; const x = cx + Math.cos(a) * pool * sc * r, y = base + 2 + Math.sin(a) * ph * sc * r; a ? c.lineTo(x, y) : c.moveTo(x, y); } c.closePath(); c.fill(); };
  blob(1, shade(p.wax, -.10)); blob(.94, shade(p.wax, -.03));
  // lumps where drips reached the dish
  DRIPS.forEach(([dx, at, w], i) => { const k = Math.min(1, Math.max(0, (burn - at - .22) / .2)); if (k <= 0) return; const x = cx + dx * 1.35 + (dx < 0 ? -6 : 6) * k;
    c.fillStyle = shade(p.wax, -.06); c.beginPath(); c.ellipse(x, base + 2.5, (w + 3) * k, (2.2 + 1.2 * k), 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.ellipse(x - 1.5, base + 1.6, (w * .5) * k, .8, 0, 0, Math.PI * 2); c.fill(); });
  c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(cx - pool * .3, base, pool * .3, 1.3, 0, 0, Math.PI * 2); c.fill();
  // the foot flares out into the puddle
  const skirt = 2 + 13 * melt, sh = Math.min(base - top - 4, 8 + 16 * melt);
  c.fillStyle = shade(p.wax, -.04); c.beginPath(); c.moveTo(cx - cw / 2 - skirt, base + 3); c.quadraticCurveTo(cx - cw / 2 - 1, base + 1, cx - cw / 2, base - sh); c.lineTo(cx + cw / 2, base - sh); c.quadraticCurveTo(cx + cw / 2 + 1, base + 1, cx + cw / 2 + skirt, base + 3); c.closePath(); c.fill();
  // body (gets lumpier and wider at the foot as it melts)
  const body = c.createLinearGradient(cx - cw / 2, 0, cx + cw / 2, 0); body.addColorStop(0, shade(p.wax, -.07)); body.addColorStop(.35, p.wax); body.addColorStop(1, shade(p.wax, -.17));
  const foot = 3 * melt;
  c.fillStyle = body; c.beginPath(); c.moveTo(cx - cw / 2 - foot, base + 1); c.quadraticCurveTo(cx - cw / 2, base - 8, cx - cw / 2, top + 5);
  for (let i = 0; i <= 8; i++) { const x = cx - cw / 2 + i * cw / 8, bump = (i % 2 ? 2.2 : -.6) * (.4 + melt) + Math.sin(i * 2.1) * .8; c.lineTo(x, top + 3 - bump); }
  c.lineTo(cx + cw / 2, top + 5); c.quadraticCurveTo(cx + cw / 2, base - 8, cx + cw / 2 + foot, base + 1); c.closePath(); c.fill();
  c.fillStyle = 'rgba(255,255,255,.28)'; c.fillRect(cx - cw / 2 + 5, top + 10, 3, Math.max(0, base - top - 18));
  // drips: they grow down the sides and reach the dish, getting fuller on the way
  for (const [dx, at, w] of DRIPS) {
    const k = Math.min(1, Math.max(0, (burn - at) / .28)); if (k <= 0) continue;
    const L = Math.max(0, (base - top - 2) * (1 - Math.pow(1 - k, 2))), x = cx + dx, tw = w + 2;
    const g = c.createLinearGradient(x - tw, 0, x + tw, 0); g.addColorStop(0, shade(p.wax, -.03)); g.addColorStop(.5, p.wax); g.addColorStop(1, shade(p.wax, -.12));
    c.fillStyle = g; c.beginPath(); c.moveTo(x - tw, top + 2); c.quadraticCurveTo(x - w * .55, top + L * .5, x - w * .5, top + L);
    c.arc(x, top + L, w * .5 + .4, Math.PI, 0, true); c.quadraticCurveTo(x + w * .55, top + L * .5, x + tw, top + 2); c.closePath(); c.fill();
    c.strokeStyle = hex(p.ink, .10); c.lineWidth = .7; c.stroke();
    if (L > 6) { c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(x - w * .2, top + L - 1, 1, 1.6, 0, 0, Math.PI * 2); c.fill(); }
  }
  // melted top with a little pool around the wick
  c.fillStyle = shade(p.wax, -.06); c.beginPath(); c.ellipse(cx, top + 3, cw / 2 - 5, 2.6, 0, 0, Math.PI * 2); c.fill();
  // wick
  const fy = top - 8;
  c.strokeStyle = hex(p.ink, .85); c.lineWidth = 1.6; c.lineCap = 'round'; c.beginPath(); c.moveTo(cx, top + 2); c.quadraticCurveTo(cx + 1, top - 4, cx + (isBreak() ? 2.4 : .6), fy); c.stroke();
  if (!isBreak()) {
    const n = run ? Math.sin(t * 7.3) * .5 + Math.sin(t * 13.1) * .3 + Math.sin(t * 2.1) * .2 : Math.sin(t * 1.4) * .15;
    const h = (run ? 28 : 21) + n * 3, w = run ? 8.5 : 7, sway = n * 2.2;
    const halo = c.createRadialGradient(cx, fy - h * .45, 1, cx, fy - h * .45, h * 1.2); halo.addColorStop(0, hex(p.flame, .35)); halo.addColorStop(1, hex(p.flame, 0));
    c.fillStyle = halo; c.beginPath(); c.arc(cx, fy - h * .45, h * 1.2, 0, Math.PI * 2); c.fill();
    const fl = c.createRadialGradient(cx, fy - h * .3, 1, cx, fy - h * .35, h); fl.addColorStop(0, '#FFFBEA'); fl.addColorStop(.38, shade(p.flame, .3)); fl.addColorStop(1, hex(p.flame, 0));
    c.fillStyle = fl; c.beginPath(); c.moveTo(cx, fy + 2); c.bezierCurveTo(cx - w * 1.4, fy - h * .25, cx - w * .4 + sway, fy - h * .8, cx + sway * 1.3, fy - h); c.bezierCurveTo(cx + w * .4 + sway, fy - h * .8, cx + w * 1.4, fy - h * .25, cx, fy + 2); c.fill();
    c.fillStyle = 'rgba(90,140,255,.4)'; c.beginPath(); c.ellipse(cx, fy - 1, 2.4, 3.4, 0, 0, Math.PI * 2); c.fill();
    setGlow(f, B, cx, fy - h * .45, (run ? .9 : .65) + (run ? .1 * n : 0));
  } else {
    setGlow(f, B, cx, fy, 0);
    if (ST.running && Math.random() < dt * 4) CD.smoke.push({ y: 0, a: .55, ph: Math.random() * 6 });
    CD.smoke = CD.smoke.filter(s => (s.y += dt * 20, s.a -= dt * .15) > 0);
    c.lineWidth = 1.8; c.lineCap = 'round';
    for (const s of CD.smoke) { c.strokeStyle = hex(p.muted, s.a); c.beginPath(); for (let k = 0; k <= 12; k++) { const yy = fy - 2 - s.y - k * 3.2; const xx = cx + 2 + Math.sin(k * .55 + s.ph + t * 1.3) * (1.5 + k * .9); k ? c.lineTo(xx, yy) : c.moveTo(xx, yy); } c.stroke(); }
  }
}

/* Apple tree: a seed sprouts, the trunk and branches grow, the crown fills in, white blossoms open, then apples ripen
   from green to red. When the round ends the apples drop into the basket: the basket holds every apple you've harvested. */
const CROWN = [[0, -6, 30], [-28, 6, 22], [28, 6, 22], [-16, -26, 22], [17, -26, 22], [0, 16, 20], [-38, -8, 16], [38, -8, 16], [0, -34, 18]];
const FRUIT = [[-22, -4], [14, -24], [26, 10], [-6, 8], [-30, -16], [6, -12], [-12, -28], [32, -6], [18, 4], [-18, 14]];
const AT = { falling: [], lastDone: null };
const mixHex = (a, b, k) => { const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16), f = s => Math.round(((A >> s) & 255) * (1 - k) + ((B >> s) & 255) * k); return `rgb(${f(16)},${f(8)},${f(0)})`; };
function leafBall(c, x, y, r, col, hi){
  c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
  for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; c.beginPath(); c.arc(x + Math.cos(a) * r * .86, y + Math.sin(a) * r * .86, r * .28, 0, Math.PI * 2); c.fill(); }
  c.fillStyle = hi; c.beginPath(); c.arc(x - r * .3, y - r * .35, r * .42, 0, Math.PI * 2); c.fill();
}
function appleTree(c, p, x, y, g, t, sway){
  c.save(); c.translate(x, y);
  if (g < .06) { c.fillStyle = shade(p.trunk, -.15); c.beginPath(); c.ellipse(0, -1, 4, 3, .4, 0, Math.PI * 2); c.fill(); c.restore(); return; }
  if (g < .2) { // sprout with two leaves, then a pair more
    const k = easeOutBack((g - .06) / .14), h = 8 + 16 * k;
    c.strokeStyle = p.leaf2; c.lineWidth = 2.2; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(1.5, -h * .5, 0, -h); c.stroke();
    c.fillStyle = p.leaf; [[-1, 1], [1, 1], [-1, .55], [1, .55]].forEach(([sd, at], i) => { const s2 = i < 2 ? k : Math.max(0, (k - .5) * 2); if (s2 <= 0) return; c.beginPath(); c.ellipse(sd * 5.5 * s2, -h * at, 6 * s2, 3.4 * s2, sd * -.45, 0, Math.PI * 2); c.fill(); });
    c.restore(); return;
  }
  c.rotate(Math.sin(t * .7) * sway);
  const tg = Math.min(1, (g - .16) / .5), H = 30 + 66 * (1 - Math.pow(1 - tg, 2)), W = 4 + 12 * tg, crown = -H;
  // trunk and branches
  const tr = c.createLinearGradient(-W, 0, W, 0); tr.addColorStop(0, shade(p.trunk, .14)); tr.addColorStop(1, shade(p.trunk, -.16));
  c.fillStyle = tr; c.beginPath(); c.moveTo(-W * .7, 2); c.quadraticCurveTo(-W * .42, crown * .5, -W * .28, crown + 8); c.lineTo(W * .28, crown + 8); c.quadraticCurveTo(W * .42, crown * .5, W * .7, 2); c.quadraticCurveTo(0, 5, -W * .7, 2); c.fill();
  c.strokeStyle = p.trunk; c.lineCap = 'round';
  [[.26, -1, .58, 22], [.32, 1, .52, 24], [.4, -1, .78, 16], [.44, 1, .74, 15]].forEach(([at, sd, hy, len]) => { const k = Math.min(1, Math.max(0, (g - at) / .14)); if (!k) return; c.lineWidth = (3 + W * .18) * k; c.beginPath(); c.moveTo(0, crown * hy); c.quadraticCurveTo(sd * len * .5 * k, crown * (hy + .06), sd * len * k, crown * (hy + .2)); c.stroke(); });
  // young tree: a few leaf pairs on the branches before the crown fills in
  if (g < .52) { const fade = g > .44 ? 1 - (g - .44) / .08 : 1; c.globalAlpha = fade; [[-6, .45], [6, .52], [-9, .66], [9, .62], [-14, .8], [14, .76], [-7, .94], [8, .92], [0, 1.03]].forEach(([dx, hy], i) => { const k = easeOutBack((g - .19 - i * .018) / .08); if (k <= 0) return; c.fillStyle = i % 2 ? p.leaf2 : p.leaf; c.beginPath(); c.ellipse(dx, crown * hy, 7.5 * k, 4.2 * k, dx < 0 ? .5 : -.5, 0, Math.PI * 2); c.fill(); }); c.globalAlpha = 1; }
  // crown
  CROWN.forEach(([dx, dy, r], i) => { const k = easeOutBack((g - .4 - i * .03) / .12); if (k <= 0) return; leafBall(c, dx * Math.min(1, k), crown + dy, r * k, i % 3 === 1 ? p.leaf2 : p.leaf, 'rgba(255,255,255,.16)'); });
  // blossoms, then apples ripening from green to red
  const harvested = isBreak();
  FRUIT.forEach(([dx, dy], i) => {
    const bx = dx, by = crown + dy, bk = easeOutBack((g - .68 - i * .008) / .05), ak = Math.min(1, Math.max(0, (g - .8 - i * .006) / .14));
    if (bk > 0 && ak < .3) { const fade = 1 - ak / .3; c.globalAlpha = fade; c.fillStyle = '#FFF8F2'; for (let j = 0; j < 5; j++) { const a = j * Math.PI * 2 / 5 + i; c.beginPath(); c.arc(bx + Math.cos(a) * 2.8 * bk, by + Math.sin(a) * 2.8 * bk, 2.3 * bk, 0, Math.PI * 2); c.fill(); } c.fillStyle = p.flower; c.beginPath(); c.arc(bx, by, 1.4 * bk, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1; }
    if (ak > 0 && !harvested) apple(c, bx, by + 2, 2 + 3.6 * ak, mixHex(p.leaf2, p.apple, Math.min(1, ak * 1.3)));
  });
  c.restore();
}
function apple(c, x, y, r, col){
  c.fillStyle = col; c.beginPath(); c.arc(x - r * .35, y, r * .78, 0, Math.PI * 2); c.arc(x + r * .35, y, r * .78, 0, Math.PI * 2); c.fill();
  c.fillStyle = 'rgba(255,255,255,.38)'; c.beginPath(); c.ellipse(x - r * .45, y - r * .3, r * .22, r * .32, -.4, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#6B4A33'; c.lineWidth = Math.max(.6, r * .18); c.lineCap = 'round'; c.beginPath(); c.moveTo(x, y - r * .6); c.lineTo(x + r * .15, y - r * 1.05); c.stroke();
}
function basket(c, p, x, y, n, t){
  // apples heaped inside (drawn first so the front of the basket covers their lower half)
  const shown = Math.min(n, 14);
  for (let i = 0; i < shown; i++) { const row = i < 6 ? 0 : i < 11 ? 1 : 2, inRow = row === 0 ? i : row === 1 ? i - 6 : i - 11, cnt = row === 0 ? 6 : row === 1 ? 5 : 3;
    apple(c, x + (inRow - (cnt - 1) / 2) * 7.2, y - 4 - row * 5.5, 4.2, p.apple); }
  const w = 50, h = 22;
  const g = c.createLinearGradient(0, y - 4, 0, y + h); g.addColorStop(0, shade(p.trunk, .25)); g.addColorStop(1, shade(p.trunk, -.05));
  c.fillStyle = g; c.beginPath(); c.moveTo(x - w / 2, y - 3); c.lineTo(x + w / 2, y - 3); c.lineTo(x + w / 2 - 6, y + h); c.lineTo(x - w / 2 + 6, y + h); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(0,0,0,.14)'; c.lineWidth = .8;
  for (let i = 1; i < 4; i++) { const yy = y - 3 + i * h / 4; c.beginPath(); c.moveTo(x - w / 2 + 6 * i / 4, yy); c.lineTo(x + w / 2 - 6 * i / 4, yy); c.stroke(); }
  for (let i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(x + i * 7, y - 3); c.lineTo(x + i * 6, y + h); c.stroke(); }
  c.fillStyle = shade(p.trunk, .35); c.beginPath(); c.roundRect ? c.roundRect(x - w / 2 - 2, y - 6, w + 4, 5, 2.5) : c.rect(x - w / 2 - 2, y - 6, w + 4, 5); c.fill();
  if (n > 14) { c.fillStyle = p.ink; c.font = '600 9px "IBM Plex Sans", sans-serif'; c.textAlign = 'center'; c.fillText(`${n} apples`, x, y + h + 12); }
}
function drawGrow(f, t, dt){
  const { c } = f, p = pal(); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, f.w, f.h); box(f);
  const g = isBreak() ? 1 : frac(), cx = 84, gy = 214, bx = 160, by = 226;
  // harvest: when the focus round ends, its apples drop into the basket
  if (AT.lastDone != null && ST.done > AT.lastDone) AT.falling = FRUIT.map(([dx, dy], i) => ({ x: cx + dx, y: gy - 96 + dy, vx: (bx - (cx + dx)) / 1.1, vy: -20 - i * 3, t: 0 }));
  AT.lastDone = ST.done;
  // ground
  c.fillStyle = hex(p.ink, .06); c.beginPath(); c.ellipse(110, gy + 20, 84, 5, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = p.ground; c.beginPath(); c.ellipse(cx + 6, gy + 10, 70, 15, 0, Math.PI, 0); c.lineTo(cx + 76, gy + 14); c.quadraticCurveTo(cx + 6, gy + 22, cx - 64, gy + 14); c.closePath(); c.fill();
  c.fillStyle = 'rgba(255,255,255,.18)'; c.beginPath(); c.ellipse(cx - 18, gy + 1, 26, 4, -.08, 0, Math.PI * 2); c.fill();
  appleTree(c, p, cx, gy - 1, g, t, ST.running ? .01 : .004);
  basket(c, p, bx, by, ST.done * FRUIT.length, t);
  // falling apples
  AT.falling = AT.falling.filter(a => { a.t += dt; a.x += a.vx * dt; a.vy += 160 * dt; a.y += a.vy * dt; if (a.y > by - 6 && a.t > .4) return false; apple(c, a.x, a.y, 5.6, p.apple); return true; });
  // soft rain on breaks
  if (isBreak() && ST.running && Math.random() < dt * 10) GR.drops.push({ x: 20 + Math.random() * 130, y: 6, v: 80 + Math.random() * 40 });
  GR.drops = GR.drops.filter(d => (d.y += d.v * dt) < gy - 4);
  c.strokeStyle = hex(p.water, .6); c.lineWidth = 1.3; c.lineCap = 'round'; for (const d of GR.drops) { c.beginPath(); c.moveTo(d.x, d.y); c.lineTo(d.x - .8, d.y + 5); c.stroke(); }
}
const GR = { drops: [] };

/* Fill: the whole page is water. It drains while you focus and fills back up on a break (same drawing as Morae Planner's Fill). */
const TD = { level: null };
const rgbOf = h => { const n = parseInt(String(h).slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const mixRGB = (a, b, k) => { const A = rgbOf(a), B = rgbOf(b); return A.map((v, i) => Math.round(v * k + B[i] * (1 - k))); };
const rgbaS = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
function drawTide(f, t, dt){
  const { c, w, h, d } = f, p = pal(); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, w, h);
  const brk = isBreak(), target = brk ? frac() : 1 - frac();
  if (TD.level == null) TD.level = target; TD.level += (target - TD.level) * Math.min(1, dt * 1.8);
  const lv = TD.level; if (lv <= 0.001) return;
  const col = brk ? mixRGB(p.accent, p.bg, .3) : mixRGB(p.water, p.bg, p.dark ? .44 : .62);
  const filling = brk && ST.running, css = Math.min(w, h) / d;
  const A = Math.max(7, Math.min(17, css * 0.02)) * d * (filling ? 1.3 : ST.running ? 1 : 0.6) * (0.85 + 0.15 * Math.sin(t * 0.37));
  const y0 = h * (1 - lv) + A * 0.3, sp = filling ? 1.35 : 1, k = Math.max(1.1, w / (560 * d));
  const wave = (amp, speed, ph, yOff) => { const pts = [], step = 5 * d; for (let x = -step; x <= w + step; x += step) { const u = (x / w) * Math.PI * 2 * k; pts.push([x, y0 + yOff + amp * (0.58 * Math.sin(u + t * speed + ph) + 0.28 * Math.sin(u * 2.3 - t * speed * 1.45 + ph * 1.7) + 0.14 * Math.sin(u * 4.2 + t * speed * 2.3 + ph * 0.6))]); } return pts; };
  const fillWave = (pts, st) => { c.beginPath(); c.moveTo(pts[0][0], h + 2); for (const q of pts) c.lineTo(q[0], q[1]); c.lineTo(pts[pts.length - 1][0], h + 2); c.closePath(); c.fillStyle = st; c.fill(); };
  fillWave(wave(A * 1.1, 0.75 * sp, 2.1, -A * 0.55), rgbaS(col, 0.38));
  fillWave(wave(A * 0.9, -0.95 * sp, 4.0, -A * 0.2), rgbaS(col, 0.55));
  const front = wave(A, 1.25 * sp, 0, 0); fillWave(front, rgbaS(col, 1));
  const g = c.createLinearGradient(0, y0, 0, h); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,0.10)'); fillWave(front, g);
  c.beginPath(); front.forEach((q, i) => i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1])); c.strokeStyle = 'rgba(255,255,255,0.42)'; c.lineWidth = 2 * d; c.stroke();
}

/* ---------------- views ---------------- */
let VIEW = {};
const digits = g => g.map(x => [...x].map(d => `<span class="mts-d">${d}</span>`).join('')).join('<span class="mts-c">:</span>');
const setDigits = g => { const el = $('#time'); if (!el) return; const h = digits(g); if (el._h !== h) { el.innerHTML = h; el._h = h; } };
/* Flip clock: each card keeps its elements. When a digit changes, the old top half falls to the hinge,
   then the new bottom half drops into place (two short turns, like a real split-flap). */
function flipView(st, lab, round){
  st.innerHTML = `<div class="vis">${lab}<div class="flip" id="flip"></div><div class="flip-cap" id="flipCap"></div>${round}<span class="time" id="time" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)"></span></div>`;
  let cards = [], n = 0;
  const build = k => {
    n = k; const names = k === 3 ? ['hours', 'minutes', 'seconds'] : ['minutes', 'seconds'];
    $('#flip').innerHTML = names.map((_, i) => `${i ? '<div class="mts-sep" aria-hidden="true"><i></i><i></i></div>' : ''}<div class="grp"><div class="mts-card"></div><div class="mts-card"></div></div>`).join('');
    $('#flip').classList.toggle('h3', k === 3); $('#flipCap').innerHTML = names.map(x => `<span>${x}</span>`).join('');
    cards = [...$('#flip').querySelectorAll('.mts-card')].map(el => {
      el.innerHTML = '<div class="h mts-t"><span></span></div><div class="h mts-b"><span></span></div><div class="h mts-t flt"><span></span><i class="sh"></i></div><div class="h mts-b flb"><span></span><i class="sh"></i></div><i class="seam"></i><i class="tab l"></i><i class="tab r"></i>';
      const q = c => el.querySelector(c); return { el, v: null, T: q('.mts-t:not(.flt)'), B: q('.mts-b:not(.flb)'), FT: q('.flt'), FB: q('.flb'), anims: [] };
    });
  };
  const put = (node, x) => { node.firstChild.textContent = x; };
  const setCard = (cd, v) => {
    if (cd.v === v) return; const old = cd.v; cd.v = v;
    cd.anims.forEach(a => a.cancel()); cd.anims = [];
    const hide = () => { cd.FT.style.visibility = 'hidden'; cd.FB.style.visibility = 'hidden'; };
    if (old == null || document.hidden || !cd.el.animate || matchMedia('(prefers-reduced-motion: reduce)').matches) { put(cd.T, v); put(cd.B, v); hide(); return; }
    put(cd.T, v); put(cd.B, old); put(cd.FT, old); put(cd.FB, v); cd.FT.style.visibility = 'visible'; cd.FB.style.visibility = 'visible';
    const P = `perspective(${Math.round(cd.el.offsetHeight * 5)}px) `, D = 280;
    cd.anims = [
      cd.FT.animate([{ transform: P + 'rotateX(0deg)' }, { transform: P + 'rotateX(-90deg)' }], { duration: D, easing: 'cubic-bezier(.55,0,1,.45)', fill: 'forwards' }),
      cd.FT.lastChild.animate([{ opacity: 0 }, { opacity: .38 }], { duration: D, fill: 'forwards' }),
      cd.FB.animate([{ transform: P + 'rotateX(90deg)' }, { transform: P + 'rotateX(0deg)' }], { duration: D, delay: D, easing: 'cubic-bezier(0,.55,.45,1)', fill: 'both' }),
      cd.FB.lastChild.animate([{ opacity: .3 }, { opacity: 0 }], { duration: D, delay: D, fill: 'both' }),
    ];
    cd.anims[2].onfinish = () => { put(cd.B, v); hide(); cd.anims.forEach(a => a.cancel()); cd.anims = []; };
  };
  VIEW.time = g => { if (g.length !== n) build(g.length); [...g.join('')].forEach((d, i) => setCard(cards[i], d)); $('#time').textContent = g.join(':'); };
}
function paint(){
  const th = H.theme(), st = H.stage; cancelAnimationFrame(RAF.id); RAF.id = 0; VIEW = {}; $('#glow').style.setProperty('--ga', '0'); $('#tide').hidden = th !== 'fill';
  const lab = `<div class="label" id="lab">${H.label()}</div>`, round = `<div class="round" id="rnd">${H.round()}</div>`;
  const loop = (cv, draw, maxD) => { RAF.last = 0; const frame = ts => { RAF.id = requestAnimationFrame(frame); if (!ST.running && ts - (RAF.last || 0) < 50) return; // paused or idle: about 20 frames a second is plenty
    const f = fit(cv, maxD); const dt = Math.min(.1, Math.max(0, (ts - (RAF.last || ts)) / 1000)); RAF.last = ts; if (f) try { draw(f, ts / 1000, dt); } catch (e) { console.warn(e); } }; RAF.id = requestAnimationFrame(frame); };
  if (th === 'classic') {
    st.innerHTML = `<div class="mts-ring"><svg viewBox="0 0 120 120" aria-hidden="true"><circle class="mts-track" cx="60" cy="60" r="54" fill="none" stroke-width="4"/><circle class="mts-bar" id="bar" cx="60" cy="60" r="54" fill="none" stroke-width="4" stroke-linecap="round" stroke-dasharray="339.3"/></svg>
      <div class="inner">${lab}<div class="time" id="time"></div>${round}</div></div>`;
    VIEW.time = g => { setDigits(g); $('#bar').style.strokeDashoffset = String(339.3 * (isBreak() ? 1 - frac() : frac())); };
  } else if (th === 'flip') {
    flipView(st, lab, round);
  } else if (th === 'fill') {
    st.innerHTML = `<div class="vis mts-big">${lab}<div class="time" id="time"></div>${round}</div>`;
    loop($('#tideCv'), drawTide, 1.5);
    VIEW.time = setDigits;
  } else {
    st.innerHTML = `<div class="vis"><canvas id="cv" aria-hidden="true"></canvas>${lab}<div class="time" id="time"></div>${round}</div>`;
    loop($('#cv'), { hourglass: drawHourglass, liquid: drawLiquid, candle: drawCandle, grow: drawGrow }[th] || drawHourglass, 2);
    VIEW.time = setDigits;
  }
  if (H.onPaint) H.onPaint();
}

const hexOf = rgb => '#' + rgb.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
function toHsl([r, g, b]){ r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; let h = 0, s = 0;
  if (mx !== mn) { const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); h = (mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60; } return [h, s, l]; }
function hsl(h, s, l){ h = ((h % 360) + 360) % 360 / 360; const f = n => { const k = (n + h * 12) % 12, a = s * Math.min(l, 1 - l); return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); }; return hexOf([f(0), f(8), f(4)].map(v => v * 255)); }
const lumi = hx => { const [r, g, b] = rgbOf(hx).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * r + .7152 * g + .0722 * b; };
const contrast = (a, b) => { const x = lumi(a), y = lumi(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
// step lightness until a colour reaches a contrast target against the background
function fitL(h, s, l, bg, target, dir){ let c = hsl(h, s, l); for (let i = 0; i < 70 && contrast(c, bg) < target; i++) { l = Math.max(0, Math.min(1, l + dir * .015)); c = hsl(h, s, l); } return c; }
function imagePalettes(px){
  const bins = new Map(); let n = 0;
  for (let i = 0; i < px.length; i += 4) { if (px[i + 3] < 128) continue; const r = px[i], g = px[i + 1], b = px[i + 2], k = (r >> 4) << 8 | (g >> 4) << 4 | (b >> 4);
    const o = bins.get(k) || { n: 0, r: 0, g: 0, b: 0 }; o.n++; o.r += r; o.g += g; o.b += b; bins.set(k, o); n++; }
  if (!n) return null;
  const cols = [...bins.values()].map(o => ({ n: o.n, hsl: toHsl([o.r / o.n, o.g / o.n, o.b / o.n]) }));
  const dom = cols.slice().sort((a, b) => b.n - a.n)[0];
  // small bright signs beat large dull areas: area counts a little, saturation and mid lightness count a lot
  const vivid = c => Math.pow(c.n, .3) * Math.pow(c.hsl[1], 1.5) * (c.hsl[2] >= .35 && c.hsl[2] <= .8 ? 1 : c.hsl[2] >= .2 ? .45 : .15);
  const viv = cols.slice().sort((a, b) => vivid(b) - vivid(a)), v1 = viv[0];
  const hd = (a, b) => { const d = Math.abs(a - b) % 360; return Math.min(d, 360 - d); };
  const v2 = viv.find(c => hd(c.hsl[0], v1.hsl[0]) > 45 && c.hsl[1] > .25) || null;
  const H = dom.hsl[0], ds = dom.hsl[1], aH = v1.hsl[0], aS = Math.max(.45, Math.min(.9, v1.hsl[1]));
  const wH = v2 ? v2.hsl[0] : (aH + 160) % 360, wS = v2 ? Math.max(.35, Math.min(.75, v2.hsl[1])) : .45, neon = v1.hsl[1] > .7 && v1.hsl[2] > .35;
  const mk = dark => {
    const base = dark ? PALETTES[4] : PALETTES[0];
    const bg = dark ? hsl(H, Math.min(ds, .38), .085) : hsl(H, Math.min(ds, .28), .935);
    const panel = dark ? hsl(H, Math.min(ds, .3), .15) : hsl(H, Math.min(ds, .22), .975);
    let accent = fitL(aH, aS, dark ? .66 : .44, bg, dark ? 4.5 : 3.2, dark ? 1 : -1);
    if (!dark) for (let l = .44; contrast(accent, '#FFFFFF') < 4.5 && l > .1; l -= .02) accent = hsl(aH, aS, l);
    return { ...base, id: dark ? 'img-dark' : 'img-light', name: dark ? 'Image · dark' : 'Image · light', dark, bg, panel,
      ink: fitL(H, Math.min(ds, .3), dark ? .9 : .16, bg, 12, dark ? 1 : -1), muted: fitL(H, Math.min(ds, .18), dark ? .68 : .42, bg, 4.6, dark ? 1 : -1),
      accent, onAccent: dark ? hsl(aH, .3, .08) : '#FFFFFF', water: hsl(wH, wS, dark ? .58 : .7), sand: hsl(32, .5, dark ? .6 : .66),
      frame: hsl(H, .18, dark ? .36 : .45), glass: hsl(H, .12, dark ? .34 : .76), card: hsl(H, Math.min(ds, .28), dark ? .14 : .2), cardTop: hsl(H, Math.min(ds, .28), dark ? .19 : .26),
      cardInk: hsl(H, .15, .95), flame: neon ? hsl(aH, .9, .66) : base.flame };
  };
  return { light: mk(false), dark: mk(true), neon };
}
// pixels of an image. A chosen file always works. For a link: ask the site first; if it doesn't share its pixels,
// read a tiny 72 px copy through wsrv.nl (free image service, no key; only used for colours, the background still
// loads from the original link); if that fails too, just check the image opens.
function readPixels(src){
  return new Promise(res => {
    const isData = src.startsWith('data:');
    const pixels = img => { const k = Math.min(1, 72 / Math.max(img.naturalWidth, img.naturalHeight, 1)), cv = document.createElement('canvas');
      cv.width = Math.max(1, Math.round(img.naturalWidth * k)); cv.height = Math.max(1, Math.round(img.naturalHeight * k));
      const c = cv.getContext('2d', { willReadFrequently: true }); c.drawImage(img, 0, 0, cv.width, cv.height); return c.getImageData(0, 0, cv.width, cv.height).data; };
    const next = step => { if (step === 'direct') { if (isData) res({ err: 'load' }); else tryLoad('proxy'); } else if (step === 'proxy') tryLoad('plain'); else res({ err: 'load' }); };
    const tryLoad = step => {
      const img = new Image(); if (step !== 'plain') img.crossOrigin = 'anonymous';
      img.onload = () => { if (step === 'plain') return res({ err: 'cors' }); try { res({ px: pixels(img), via: step }); } catch (e) { next(step); } };
      img.onerror = () => next(step);
      img.src = step === 'proxy' ? `https://wsrv.nl/?url=${encodeURIComponent(src)}&w=72&h=72&fit=inside&output=png` : src;
    };
    tryLoad('direct');
  });
}
const p2 = n => String(n).padStart(2, '0');
const fmt = ms => { const s = Math.ceil(ms / 1000), h = Math.floor(s / 3600); return h ? [p2(h), p2(Math.floor(s % 3600 / 60)), p2(s % 60)] : [p2(Math.floor(s / 60)), p2(s % 60)]; };
function mount(host){ H = host; paint(); }
function time(g){ if (H && VIEW.time) VIEW.time(g); }
function unmount(){ cancelAnimationFrame(RAF.id); RAF.id = 0; VIEW = {}; H = null; }
// the colour set as CSS variables on an element (the page root for Morae Timers, the full-screen layer in Morae MCAT)
function applyPalette(el, p){
  const r = el.style;
  r.setProperty('--bg', p.bg); r.setProperty('--ink', p.ink); r.setProperty('--muted', p.muted); r.setProperty('--accent', p.accent); r.setProperty('--on-accent', p.onAccent); r.setProperty('--panel', p.panel);
  r.setProperty('--card', p.card); r.setProperty('--card-top', p.cardTop); r.setProperty('--card-ink', p.cardInk); r.setProperty('--bad', p.dark ? '#F2978B' : '#A8322A'); r.setProperty('color-scheme', p.dark ? 'dark' : 'light');
}
const CSS = `/* Morae timer styles (shared). Colours come from CSS variables set by applyPalette(). */
.vis{position:relative;display:grid;justify-items:center;gap:6px}
.vis canvas{display:block;width:min(40vh, 360px);height:min(50vh, 450px)}
.time{font-family:var(--f-display);font-weight:300;font-size:clamp(64px, 11vh, 120px);line-height:1;letter-spacing:-.02em;display:flex;justify-content:center}
.time .mts-d{display:inline-block;width:.6em;text-align:center}
.time .mts-c{display:inline-block;width:.3em;text-align:center;opacity:.6}
.label{font-weight:700;font-size:13px;letter-spacing:.18em;text-transform:uppercase;color:var(--muted);text-align:center}
.round{font-size:13px;color:var(--muted);text-align:center}
.mts-ring{position:relative;width:min(56vh, 500px);aspect-ratio:1;max-width:100%}
.mts-ring svg{width:100%;height:100%;transform:rotate(-90deg)}
.mts-ring .mts-track{stroke:color-mix(in oklab, var(--ink) 10%, transparent)}
.mts-ring .mts-bar{stroke:var(--accent);transition:stroke-dashoffset .3s linear}
.mts-ring .inner{position:absolute;inset:0;display:grid;place-content:center;gap:10px;justify-items:center}
.flip{display:flex;align-items:center;gap:clamp(12px, 1.8vw, 26px)}
.flip .grp{display:flex;gap:clamp(6px, .8vw, 12px)}
.flip .mts-sep{display:grid;gap:18px}.flip .mts-sep i{width:12px;height:12px;border-radius:50%;background:var(--muted);opacity:.55}
.mts-card{--w:clamp(80px, 9.5vw, 150px);--h:calc(var(--w) * 1.45);position:relative;width:var(--w);height:var(--h);font-family:var(--f-display);font-weight:700;font-size:calc(var(--w) * 1.08);color:var(--card-ink);border-radius:12px;box-shadow:0 14px 24px color-mix(in oklab, var(--ink) 18%, transparent)}
.mts-card .h{position:absolute;left:0;right:0;height:50%;overflow:hidden}
.mts-card .h span{position:absolute;left:0;right:0;top:0;height:var(--h);line-height:var(--h);text-align:center;font-variant-numeric:tabular-nums}
.mts-card .mts-t{top:0;background:var(--card-top);border-radius:12px 12px 0 0}
.mts-card .mts-b{bottom:0;background:var(--card);border-radius:0 0 12px 12px}
.mts-card .mts-b span{top:-100%}
.mts-card .flt{transform-origin:50% 100%;z-index:2;visibility:hidden}
.mts-card .flb{transform-origin:50% 0;z-index:2;visibility:hidden}
.mts-card .sh{position:absolute;inset:0;background:#000;opacity:0;pointer-events:none}
.mts-card .seam{position:absolute;left:0;right:0;top:50%;height:2px;margin-top:-1px;background:rgba(0,0,0,.45);z-index:3}
.mts-card .tab{position:absolute;top:50%;width:7px;height:calc(var(--w) * .26);margin-top:calc(var(--w) * -.13);background:var(--card);border:2px solid color-mix(in oklab, var(--card-ink) 60%, transparent);border-radius:2px;z-index:4}
.mts-card .tab.l{left:-5px}.mts-card .tab.r{right:-5px}
.flip-cap{display:flex;justify-content:space-around;width:100%;font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:var(--muted);font-weight:700}
.tide{position:fixed;inset:0;z-index:0;pointer-events:none}
.tide canvas{display:block;width:100%;height:100%}
.vis.mts-big .time{font-size:clamp(96px, 26vh, 300px)}
.vis.mts-big .label{font-size:15px}
.has-bg .time,.has-bg .label,.has-bg .round,.has-bg .flip-cap{text-shadow:0 1px 14px color-mix(in oklab, var(--bg) 75%, transparent)}
.glow{position:fixed;inset:0;pointer-events:none;z-index:0;background:radial-gradient(circle at var(--gx, 50%) var(--gy, 40%), var(--gc, transparent) 0, transparent 60vmax);opacity:var(--ga, 0);transition:opacity .8s ease}
@media (max-width: 760px){
  .mts-ring{width:min(84vw, 50vh)}
  .vis canvas{width:min(62vw, 34vh);height:min(78vw, 43vh)}
  .time{font-size:clamp(52px, 17vw, 96px)}
  .vis.mts-big .time{font-size:clamp(72px, 25vw, 170px)}
  .flip{gap:8px}.flip .grp{gap:5px}.flip .mts-sep{gap:10px}.flip .mts-sep i{width:8px;height:8px}
  .mts-card{--w:clamp(48px, 18vw, 100px);border-radius:9px}
  .flip.h3 .mts-card{--w:clamp(38px, 12.5vw, 80px)}
  .mts-card .mts-t,.mts-card .flt{border-radius:9px 9px 0 0}.mts-card .mts-b,.mts-card .flb{border-radius:0 0 9px 9px}
  .mts-card .tab{width:5px;border-width:1.5px}.mts-card .tab.l{left:-3px}.mts-card .tab.r{right:-3px}
  .flip-cap{font-size:10.5px;letter-spacing:.14em}
}
@media (max-height: 520px) and (orientation: landscape){
  .time{font-size:clamp(40px, 14vh, 80px)}
  .mts-ring{width:min(70vh, 360px)}
  .mts-card{--w:clamp(40px, 11vh, 80px)}
  .vis canvas{height:min(40vh, 260px);width:min(32vh, 210px)}
  .vis{gap:2px}.label{font-size:11px}.round{font-size:11.5px}
}`;
(function addCss(){ if (document.getElementById('mts-css')) return; const s = document.createElement('style'); s.id = 'mts-css'; s.textContent = CSS; (document.head || document.documentElement).appendChild(s); })();
window.MoraeTimerStyles = { version: '1.0.0', PALETTES, THEMES, mount, time, unmount, fmt, applyPalette, imagePalettes, readPixels, contrast, isMounted: () => !!H };
})();
