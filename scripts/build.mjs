#!/usr/bin/env node
// Builds every static visual in /assets.  `node scripts/build.mjs`
// Zero dependencies: text is outlined from the bundled OFL fonts, so the
// artifacts look identical on every machine and on both GitHub themes.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Doc, fonts, n, baseCss } from './lib/svg.mjs';
import { dotText } from './lib/dots.mjs';
import { PHOSPHOR, PAPER, CW, crt, seg7, paper, line, wrapChars, lineCss } from './lib/retro.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'assets');
fs.mkdirSync(out, { recursive: true });

const save = (name, doc) => {
  const svg = doc.render();
  fs.writeFileSync(path.join(out, name), svg);
  console.log(`  ${name.padEnd(22)} ${(svg.length / 1024).toFixed(1).padStart(6)} KB`);
};

const appear = (i, step = 0.06, start = 0.2) => `class="ln" style="animation-delay:${n(start + i * step)}s"`;

// ─────────────────────────────────────────────────────────────────────────────
// 1. HERO — Apollo Guidance Computer DSKY + a phosphor CRT
// ─────────────────────────────────────────────────────────────────────────────
function hero() {
  const d = new Doc(1280, 600, { title: 'Yash Goyal: AI builder and full-stack engineer. An Apollo DSKY flashing program alarm 1202 beside a CRT terminal.' });
  d.css(baseCss, lineCss, `
.sa{animation:sa 10s steps(1) infinite}.sb{opacity:0;animation:sb 10s steps(1) infinite}
@keyframes sa{0%{opacity:1}68%{opacity:0}100%{opacity:1}}
@keyframes sb{0%{opacity:0}68%{opacity:1}100%{opacity:0}}
.vn{animation:blink .9s steps(1) infinite}
.ca{animation:ca 2.3s steps(1) infinite}
@keyframes ca{0%{opacity:1}12%{opacity:.08}19%{opacity:1}41%{opacity:.08}44%{opacity:1}73%{opacity:.08}88%{opacity:1}}
.up{animation:ca 3.1s steps(1) infinite reverse}
.dm{animation:dm .5s ease-out both}
@keyframes dm{from{opacity:0}to{opacity:1}}
`);

  // ── DSKY body
  const X = 20;
  const Y = 22;
  const W = 560;
  const H = 556;
  d.def(
    `<linearGradient id="body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6A6E73"/><stop offset=".5" stop-color="#55595E"/><stop offset="1" stop-color="#43474B"/></linearGradient>`,
    `<linearGradient id="key" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3A3D41"/><stop offset="1" stop-color="#25272A"/></linearGradient>`,
    `<filter id="el" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`,
  );
  d.add(
    `<rect x="${X + 3}" y="${Y + 9}" width="${W}" height="${H}" rx="16" fill="#000" opacity=".3"/>`,
    `<rect x="${X}" y="${Y}" width="${W}" height="${H}" rx="16" fill="url(#body)" stroke="#2C2F32" stroke-width="2"/>`,
    `<rect x="${X + 5}" y="${Y + 4}" width="${W - 10}" height="${H - 9}" rx="13" fill="none" stroke="#8A8F95" stroke-opacity=".35"/>`,
  );
  for (const [sx, sy] of [[X + 12, Y + 12], [X + W - 12, Y + 12], [X + 12, Y + H - 12], [X + W - 12, Y + H - 12]]) {
    d.add(`<circle cx="${sx}" cy="${sy}" r="4.2" fill="#3B3F43" stroke="#2A2D30"/><path d="M${sx - 2.8} ${sy}h5.6" stroke="#202225" stroke-width="1.2"/>`);
  }

  // ── caution & warning lamps (left panel)
  const LX = X + 22;
  const LY = Y + 24;
  d.add(`<rect x="${LX}" y="${LY}" width="250" height="284" rx="7" fill="#1E2022" stroke="#141516"/>`);
  const lamps = [
    ['UPLINK|ACTY', 'w', 'up'], ['TEMP', 'a'],
    ['NO ATT', 'w'], ['GIMBAL|LOCK', 'a'],
    ['STBY', 'w'], ['PROG', 'a', 'prog'],
    ['KEY REL', 'w', 'kr'], ['RESTART', 'a'],
    ['OPR ERR', 'w'], ['TRACKER', 'a'],
    ['', 'w'], ['ALT', 'a'],
    ['', 'w'], ['VEL', 'a'],
  ];
  lamps.forEach(([label, tone, anim], i) => {
    const lx = LX + 10 + (i % 2) * 120;
    const ly = LY + 10 + Math.floor(i / 2) * 39.2;
    const lit = tone === 'w' ? '#F3EFE2' : '#FFC24D';
    const textC = '#26282A';
    d.add(`<rect x="${lx}" y="${ly}" width="110" height="32" rx="3" fill="#56595C" stroke="#141516"/>`);
    if (anim) {
      const cls = anim === 'prog' ? 'sb' : anim === 'kr' ? 'vn' : 'up';
      d.add(`<g class="${cls}"><rect x="${lx}" y="${ly}" width="110" height="32" rx="3" fill="${lit}"/><rect x="${lx}" y="${ly}" width="110" height="32" rx="3" fill="${lit}" opacity=".5" filter="url(#el)"/></g>`);
    }
    const parts = label.split('|').filter(Boolean);
    parts.forEach((p, j) => d.add(d.text(p, { x: lx + 55, y: ly + 20 + (j - (parts.length - 1) / 2) * 11.5, size: 10.5, font: fonts.monoSemi, fill: textC, anchor: 'middle', ls: 0.04 })));
  });

  // ── electroluminescent display (right panel)
  const EX = X + 288;
  const EY = Y + 24;
  const EL = '#7DFFA8';
  const ELoff = '#14241A';
  d.add(`<rect x="${EX}" y="${EY}" width="250" height="284" rx="7" fill="#0A0D0B" stroke="#141516"/>`);
  const label = (t, x, y, w = 72) => d.add(`<rect x="${x}" y="${y}" width="${w}" height="16" rx="2" fill="${EL}"/>`, d.text(t, { x: x + w / 2, y: y + 12, size: 10.5, font: fonts.monoSemi, fill: '#08130C', anchor: 'middle', ls: 0.08 }));
  d.add(`<g class="ca"><rect x="${EX + 12}" y="${EY + 12}" width="72" height="54" rx="3" fill="${EL}"/></g><rect x="${EX + 12}" y="${EY + 12}" width="72" height="54" rx="3" fill="${EL}" opacity=".12"/>`);
  d.add(d.text('COMP', { x: EX + 48, y: EY + 36, size: 11, font: fonts.monoSemi, fill: '#0B1A10', anchor: 'middle' }), d.text('ACTY', { x: EX + 48, y: EY + 50, size: 11, font: fonts.monoSemi, fill: '#0B1A10', anchor: 'middle' }));
  label('PROG', EX + 164, EY + 12);
  label('VERB', EX + 12, EY + 82);
  label('NOUN', EX + 164, EY + 82);

  const dw = 22;
  const dh = 36;
  const dt = 5;
  const pairs = { prog: [EX + 170, EY + 34], verb: [EX + 18, EY + 104], noun: [EX + 170, EY + 104] };
  const regs = [EY + 156, EY + 198, EY + 240].map((y) => [EX + 14, y]);
  const base = [];
  for (const [x, y] of Object.values(pairs)) for (let k = 0; k < 2; k++) base.push(seg7('8', x + k * 32, y, dw, dh, dt, ELoff, true));
  regs.forEach(([x, y], r) => {
    d.add(`<rect x="${EX + 10}" y="${y - 7}" width="230" height="2.5" fill="${EL}" opacity=".85"/>`);
    for (let k = 0; k < 6; k++) base.push(seg7('8', x + k * 38, y + 2, 24, 30, 4.6, ELoff, true));
  });
  d.add(base.join(''));
  const show = (s) => {
    const o = [];
    for (const [key, [x, y]] of Object.entries(pairs)) [...s[key]].forEach((ch, k) => o.push(`<g ${key !== 'prog' && s.flash ? 'class="vn"' : ''}>${seg7(ch, x + k * 32, y, dw, dh, dt, EL)}</g>`));
    s.regs.forEach((val, r) => [...val].forEach((ch, k) => o.push(seg7(ch, regs[r][0] + k * 38, regs[r][1] + 2, 24, 30, 4.6, EL))));
    return o.join('');
  };
  // State A: V16 N68 — monitoring.  R1 rank, R2 teams, R3 concurrent users.
  d.add(`<g class="sa" filter="url(#el)">${show({ prog: '63', verb: '16', noun: '68', regs: ['+00001', '+00080', '+00500'] })}</g>`);
  // State B: V05 N09 — the Apollo 11 "1202" program alarm.
  d.add(`<g class="sb" filter="url(#el)">${show({ prog: '63', verb: '05', noun: '09', flash: true, regs: [' 01202', ' 00000', ' 00000'] })}</g>`);

  // ── keyboard
  const KX = X + 22;
  const KY = Y + 330;
  const kw = 66;
  const kh = 58;
  const gx = 9.5;
  const key = (t, c, r, half = 0) => {
    const kx = KX + c * (kw + gx);
    const ky = KY + r * (kh + 10) + half * ((kh + 10) / 2);
    const parts = t.split('|');
    d.add(`<rect x="${kx}" y="${ky + 3}" width="${kw}" height="${kh}" rx="6" fill="#141517"/>`, `<rect x="${kx}" y="${ky}" width="${kw}" height="${kh}" rx="6" fill="url(#key)" stroke="#121314"/>`, `<rect x="${kx + 2}" y="${ky + 1.5}" width="${kw - 4}" height="${kh * 0.45}" rx="5" fill="#fff" opacity=".05"/>`);
    parts.forEach((p, j) => d.add(d.text(p, { x: kx + kw / 2, y: ky + kh / 2 + 6 + (j - (parts.length - 1) / 2) * 15, size: p.length > 2 ? 13 : 20, font: fonts.monoSemi, fill: '#ECEDEE', anchor: 'middle' })));
  };
  key('VERB', 0, 0, 1);
  key('NOUN', 0, 1, 1);
  [['+', '-', '0'], ['7', '4', '1'], ['8', '5', '2'], ['9', '6', '3'], ['CLR', 'PRO', 'KEY|REL']].forEach((col, c) => col.forEach((t, r) => key(t, c + 1, r)));
  key('ENTR', 6, 0, 1);
  key('RSET', 6, 1, 1);

  // ── the CRT
  const p = PHOSPHOR.amber;
  const t = crt(d, { x: 600, y: 22, w: 660, h: 556, p, label: 'YG-100 · AMBER P3' });
  d.add(t.before);
  const cx = t.sx + 26;
  const C = { main: p.main, hot: p.hot, dim: p.dim, faint: p.faint };
  const L = (str, y, o = {}) => line(d, str, { x: cx, y, size: o.size || 14, colors: C, base: o.base || 'main' });
  let i = 0;
  const row = (str, y, o) => d.add(`<g ${appear(i++, 0.11, 1.2)}>${L(str, y, o)}</g>`);
  row('{dim:LUMINARY099 :: YASH_GOYAL.agc}            {dim:REV 2026.11    P.0001}', t.sy + 38, { size: 12.5 });
  // dot-matrix name
  const { dots } = dotText('YASH GOYAL');
  const pitch = 9.5;
  d.add(`<g>${dots.map((q) => `<circle cx="${n(cx + 2 + q.c * pitch)}" cy="${n(t.sy + 70 + q.r * pitch)}" r="3.9" fill="${p.hot}" class="dm" style="animation-delay:${n(0.15 + q.c * 0.018)}s"/>`).join('')}</g>`);
  row('{hot!:AI BUILDER & FULL-STACK ENGINEER}', t.sy + 172, { size: 20 });
  row('DELHI, IN · B.TECH CSE @ SRM UNIVERSITY HARYANA · CLASS OF 29', t.sy + 202);
  row('CO-FOUNDER @ ARTDRAWN STUDIO · TECH LEAD @ XETECH x XEBIA', t.sy + 224);
  row('{dim:# BUILD, BABY, BUILD -- MASTER SHIPPING ROUTINE}', t.sy + 266);
  row('{hot:SHIPIT}     TC      BANKCALL        {dim:# FROM AN EMPTY REPO}', t.sy + 290);
  row('           CADR    PRODUCTION      {dim:# TO REAL USERS}', t.sy + 312);
  row('           TC      SHIPIT          {dim:# AND AGAIN. AND AGAIN.}', t.sy + 334);
  row('{dim:# 1202 :: EXECUTIVE OVERFLOW. LOAD SHED. MISSION GO.}', t.sy + 372);
  row('{hot:V37N00} > SELECT PROGRAM  {hot:SUTRA} {hot:FYC} {hot:SANGAM} {hot:NAFNET} {hot:VERGE}', t.sy + 410);
  const curX = cx + 2 * CW * 14;
  d.add(`<rect class="cur" x="${n(curX)}" y="${t.sy + 433}" width="${n(CW * 14)}" height="17" fill="${p.main}"/>`);
  d.add(`<g ${appear(i++, 0.11, 1.2)}>${L('{dim:>}', t.sy + 446)}</g>`);
  row('{faint:P63 BRAKING PHASE :: V05N09 R1 01202 :: CF. APOLLO 11 DESCENT, 1969-07-20}', t.sy + 488, { size: 11.5 });
  d.add(t.after);
  save('hero.svg', d);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. KEYCAPS — the links, as DSKY keys
// ─────────────────────────────────────────────────────────────────────────────
function keycaps() {
  const keys = [
    ['key-web', 'PORTFOLIO', 'yashgoel.tech'],
    ['key-linkedin', 'LINKEDIN', 'in/yashgoyal-dev'],
    ['key-mail', 'EMAIL', 'goyalyash144@gmail'],
    ['key-studio', 'ARTDRAWN', 'artdrawnstudio.com'],
  ];
  for (const [file, label, sub] of keys) {
    const d = new Doc(300, 96, { title: `${label}: ${sub}` });
    d.def(`<linearGradient id="k" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3C3F43"/><stop offset="1" stop-color="#232528"/></linearGradient>`);
    d.add(
      `<rect x="6" y="10" width="288" height="80" rx="12" fill="#0F1012"/>`,
      `<rect x="6" y="4" width="288" height="80" rx="12" fill="url(#k)" stroke="#111214" stroke-width="1.5"/>`,
      `<rect x="9" y="6" width="282" height="34" rx="10" fill="#fff" opacity=".06"/>`,
      `<circle cx="30" cy="44" r="5" fill="#FFB547"/><circle cx="30" cy="44" r="10" fill="#FFB547" opacity=".18"/>`,
      d.text(label, { x: 50, y: 41, size: 21, font: fonts.monoSemi, fill: '#F1F2F3', ls: 0.06 }),
      d.text(sub, { x: 50, y: 64, size: 13, font: fonts.mono, fill: '#A2A7AD' }),
    );
    save(`${file}.svg`, d);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. PUNCH CARD — a FORTRAN statement card, encoded in IBM 029 Hollerith code
// ─────────────────────────────────────────────────────────────────────────────
const HOLLERITH = {
  '&': [12], '-': [11], '/': [0, 1], '.': [12, 8, 3], '<': [12, 8, 4], '(': [12, 8, 5], '+': [12, 8, 6], '$': [11, 8, 3], '*': [11, 8, 4],
  ')': [11, 8, 5], ';': [11, 8, 6], ',': [0, 8, 3], '%': [0, 8, 4], _: [0, 8, 5], '>': [0, 8, 6], '?': [0, 8, 7], ':': [8, 2], '#': [8, 3],
  '@': [8, 4], "'": [8, 5], '=': [8, 6], '"': [8, 7],
};
function punches(ch) {
  if (ch === ' ') return [];
  if (/[0-9]/.test(ch)) return [+ch];
  const c = ch.charCodeAt(0);
  if (ch >= 'A' && ch <= 'I') return [12, c - 64];
  if (ch >= 'J' && ch <= 'R') return [11, c - 73];
  if (ch >= 'S' && ch <= 'Z') return [0, c - 81];
  if (HOLLERITH[ch]) return HOLLERITH[ch];
  throw new Error(`no Hollerith code for ${ch}`);
}

function punchCard() {
  const statement = "      PRINT *, 'YASH GOYAL -- AI BUILDER & FULL-STACK ENGINEER'";
  const text = statement.padEnd(72, ' ') + 'YG000001';
  if (text.length !== 80) throw new Error(`card is ${text.length} columns`);
  const d = new Doc(1280, 600, { title: `IBM punch card, FORTRAN statement: ${statement.trim()}` });
  d.css(baseCss, `.h{animation:h .05s steps(1) both}@keyframes h{from{opacity:0}to{opacity:1}}`);
  const X = 24;
  const Y = 34;
  const W = 1232;
  const H = 543;
  const ink = '#3F5F50';
  const shape = (x, y) => `M${x + 36} ${y}H${x + W - 10}q10 0 10 10V${y + H - 10}q0 10-10 10H${x + 10}q-10 0-10-10V${y + 36}Z`;
  d.def(`<linearGradient id="card" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F4E6BC"/><stop offset="1" stop-color="#EAD8A6"/></linearGradient>`);
  // a small deck behind it
  d.add(`<g transform="rotate(-1.6 640 300)"><path d="${shape(X + 6, Y - 10)}" fill="#D9C48C" stroke="#BCA66C"/></g>`, `<g transform="rotate(1.1 640 300)"><path d="${shape(X - 4, Y - 4)}" fill="#E2CF98" stroke="#C3AD73"/></g>`);
  d.add(`<path d="${shape(X, Y + 8)}" fill="#000" opacity=".22"/>`, `<path d="${shape(X, Y)}" fill="url(#card)" stroke="#C7B27A"/>`);
  const colX = (c) => X + 40 + c * 14.64;
  const rowY = (k) => Y + 44 + k * 41.4; // k: 0 => row 12, 1 => row 11, 2..11 => rows 0..9
  const rowIndex = (r) => (r === 12 ? 0 : r === 11 ? 1 : r + 2);
  // printed digits & column numbers
  const printed = [];
  for (let r = 0; r <= 9; r++) for (let c = 0; c < 80; c++) printed.push(d.text(String(r), { x: colX(c), y: rowY(r + 2) + 4.5, size: 11, font: fonts.monoMed, fill: ink, anchor: 'middle', opacity: 0.8 }));
  for (let c = 0; c < 80; c++) {
    printed.push(d.text(String(c + 1), { x: colX(c), y: rowY(2) + 22, size: 6.2, font: fonts.mono, fill: ink, anchor: 'middle', opacity: 0.7 }));
    printed.push(d.text(String(c + 1), { x: colX(c), y: rowY(11) + 22, size: 6.2, font: fonts.mono, fill: ink, anchor: 'middle', opacity: 0.7 }));
  }
  d.add(printed.join(''));
  // FORTRAN form: field dividers and headings
  for (const c of [5, 6, 72]) d.add(`<line x1="${n((colX(c - 1) + colX(c)) / 2)}" y1="${Y + 24}" x2="${n((colX(c - 1) + colX(c)) / 2)}" y2="${Y + H - 4}" stroke="${ink}" stroke-width="1.1" opacity=".75"/>`);
  const fy = Y + H - 9;
  d.add(
    d.text('STATEMENT', { x: (colX(0) + colX(4)) / 2, y: fy - 7, size: 6.6, font: fonts.monoSemi, fill: ink, anchor: 'middle' }),
    d.text('NUMBER', { x: (colX(0) + colX(4)) / 2, y: fy, size: 6.6, font: fonts.monoSemi, fill: ink, anchor: 'middle' }),
    d.text('C', { x: colX(5), y: fy, size: 7, font: fonts.monoSemi, fill: ink, anchor: 'middle' }),
    d.text('FORTRAN STATEMENT', { x: (colX(6) + colX(71)) / 2, y: fy, size: 10, font: fonts.monoSemi, fill: ink, anchor: 'middle', ls: 0.3 }),
    d.text('IDENTIFICATION', { x: (colX(72) + colX(79)) / 2, y: fy, size: 7.4, font: fonts.monoSemi, fill: ink, anchor: 'middle' }),
    `<g transform="translate(${X + 22} ${Y + H / 2 + 40}) rotate(-90)">${d.text('DO NOT FOLD, SPINDLE OR MUTILATE', { x: 0, y: 0, size: 9.5, font: fonts.monoSemi, fill: ink, anchor: 'middle', opacity: 0.85, ls: 0.14 })}</g>`,
  );
  // holes + interpreter line, punched column by column
  [...text].forEach((ch, c) => {
    const hs = punches(ch);
    if (!hs.length) return;
    const delay = `style="animation-delay:${n(0.35 + c * 0.045)}s"`;
    const holes = hs.map((r) => `<rect x="${n(colX(c) - 4.6)}" y="${n(rowY(rowIndex(r)) - 10.5)}" width="9.2" height="21" rx="1" fill="#1A1610"/>`).join('');
    d.add(`<g class="h" ${delay}>${holes}${d.text(ch, { x: colX(c), y: Y + 20, size: 13, font: fonts.monoSemi, fill: '#231F18', anchor: 'middle' })}</g>`);
  });
  save('punchcard.svg', d);
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. finger(1) — the .plan file, on a green P1 phosphor terminal
// ─────────────────────────────────────────────────────────────────────────────
function finger() {
  const d = new Doc(1280, 610, { title: 'finger output for yash: Yash Goyal, project and plan.' });
  d.css(baseCss, lineCss);
  const p = PHOSPHOR.green;
  const t = crt(d, { x: 20, y: 18, w: 1240, h: 578, p, label: 'YG-100 · GREEN P1' });
  d.add(t.before);
  const lines = [
    '{hot:yash@pdp-11}:{dim:~}$ finger -l yash@yashgoel.tech',
    '[yashgoel.tech]',
    'Login: {hot:yash}                                 Name: {hot:Yash Goyal}',
    'Directory: /home/yash                       Shell: /bin/zsh',
    'On since Wed Nov 30 13:26 2022 (UTC) on ttys000 from delhi.in',
    'No unread mail.',
    'Project: {hot:take things from an empty repo to real users.}',
    'Plan:',
    '  {hot:*} 1st of 80 teams at CodeX 3.0 -- SUTRA. INR 75,000 prize, 36 hours, team of 5.',
    '  {hot:*} 500+ students on one realtime app, at once, in one auditorium -- Find Your Crew.',
    '  {hot:*} A savings pot on mainnet that no organizer can run away with -- Sangam.',
    '  {hot:*} 10+ client projects as co-founder of Artdrawn Studio, a creative AI visual agency.',
    '  {hot:*} 300+ students trained in workshops; DevOps Essentials for 140+ with Xebia.',
    '  {hot:+} shipping: a community app for 200-300 Arya Samaj temples (Expo, Django, Postgres).',
    '  {hot:+} studying: B.Tech CSE at SRM University Haryana, CGPA 8.8, class of 2029.',
    '{dim:  (* done   + in progress)}',
    '{hot:yash@pdp-11}:{dim:~}$ ',
  ];
  const C = { main: p.main, hot: p.hot, dim: p.dim };
  lines.forEach((s, k) => d.add(`<g ${appear(k, 0.09, 0.3)}>${line(d, s, { x: t.sx + 28, y: t.sy + 42 + k * 28.5, size: 16, colors: C })}</g>`));
  d.add(`<rect class="cur" x="${n(t.sx + 28 + 16 * CW * 16)}" y="${n(t.sy + 42 + 16 * 28.5 - 15)}" width="${n(CW * 16)}" height="19" fill="${p.main}"/>`);
  d.add(t.after);
  save('finger.svg', d);
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. man(1) pages on green-bar line-printer paper
// ─────────────────────────────────────────────────────────────────────────────
function manText({ name, sec, title, foot, sections, width }) {
  const head = `${name.toUpperCase()}(${sec})`;
  const center = (l, c, r) => {
    const gap = width - l.length - c.length - r.length;
    const a = Math.floor(gap / 2);
    return l + ' '.repeat(a) + c + ' '.repeat(gap - a) + r;
  };
  const out = [center(head, title, head), ''];
  for (const s of sections) {
    out.push(`**${s.h}**`);
    for (const b of [].concat(s.body)) {
      if (b === '') out.push('');
      else if (b.startsWith('|')) out.push(`     ${b.slice(1)}`);
      else for (const l of wrapChars(b, width - 5)) out.push(`     ${l}`);
    }
    out.push('');
  }
  return { lines: out, foot: center(foot[0], foot[1], head) };
}

function manPage(file, title, w, h, columns, foot) {
  const d = new Doc(w, h, { title });
  d.css(baseCss, lineCss);
  const lh = 19.5;
  const size = 13.4;
  const px = w === 1280 || file.endsWith('-l.svg') ? 8 : 14;
  const pw = w === 1280 ? 1264 : 618;
  d.add(paper(d, { x: px, y: 8, w: pw, h: h - 22, lh, top: 12 }));
  const tx = px + 30 + 20;
  const C = { main: PAPER.ink, dim: PAPER.ink2, faint: PAPER.ink3 };
  let k = 0;
  const colW = (pw - 100) / columns.length;
  columns.forEach((lines, ci) => {
    lines.forEach((s, j) => {
      if (!s) return;
      d.add(`<g ${appear(k++, 0.035, 0.2)}>${line(d, s, { x: tx + ci * colW, y: 8 + 44 + j * lh, size, colors: C })}</g>`);
    });
  });
  d.add(`<g ${appear(k++, 0.035, 0.2)}>${line(d, foot, { x: tx, y: h - 34, size, colors: C })}</g>`);
  save(file, d);
}

function manPages() {
  // full width: two columns of 70 characters
  const sutraL = manText({
    name: 'sutra', sec: 8, title: "System Manager's Manual", width: 144, foot: ['CodeX 3.0', 'October 2026'],
    sections: [],
  });
  const left = [
    { h: 'NAME', body: 'sutra -- student early-warning & intervention orchestration engine' },
    { h: 'SYNOPSIS', body: '|**sutra** [**--campus** __id__] [**--explain**] __signal__ ...' },
    {
      h: 'DESCRIPTION',
      body: [
        'Turns every student risk signal into a tracked case with an owner, a deadline, a follow-up and a documented outcome. The ML model explains its reasoning; a human always decides.',
        '',
        'I owned the backend and integration: a FastAPI gateway with Supabase JWT auth and multi-campus data isolation, plus a 10-state case lifecycle with a transactional outbox, so no alert is ever silently dropped. SHA-256 document fingerprints are anchored on Base Sepolia, so records verify without trusting the database.',
      ],
    },
  ];
  const right = [
    {
      h: 'LIFECYCLE (abridged)',
      body: [
        '|signal --> review --> approved --> assigned --> in_progress',
        '|             |                                      |',
        '|             +--> rejected   closed <-- follow_up <-+',
      ],
    },
    { h: 'AWARDS', body: '1st place, CodeX 3.0 -- 80 teams, INR 75,000. Team of 5, 36 hours.' },
    { h: 'BUGS', body: 'None known. The model may explain; it may never decide.' },
    { h: 'SEE ALSO', body: 'fastapi(1), supabase(1), postgres(1), next(1), base-sepolia(7), https://sutra-livid-psi.vercel.app' },
  ];
  const col = (secs) => manText({ name: 'x', sec: 0, title: '', width: 68, foot: ['', ''], sections: secs }).lines.slice(2);
  manPage('man-sutra.svg', 'man page SUTRA(8): student early-warning and intervention engine. 1st place at CodeX 3.0 out of 80 teams.', 1280, 540, [[sutraL.lines[0], '', ...col(left)], ['', '', ...col(right)]], sutraL.foot);

  const half = (file, title, spec) => {
    const m = manText({ ...spec, width: 64 });
    manPage(file, title, 640, 660, [m.lines], m.foot);
  };
  half('man-fyc-l.svg', 'man page FYC(1): Find Your Crew, first-year induction platform used live by 500+ students at once.', {
    name: 'fyc', sec: 1, title: 'User Commands', foot: ['SRM Univ. Haryana', 'August 2026'],
    sections: [
      { h: 'NAME', body: 'fyc -- find your crew: first-year induction & peer matching' },
      { h: 'SYNOPSIS', body: '|**fyc** **--live** [**--match** __interests__] __student__ ...' },
      {
        h: 'DESCRIPTION',
        body: [
          "SRM University Haryana's official first-year induction platform: a gamified onboarding flow that matches new students with peers who share their interests. Google OAuth, real-time state sync and a hand-made sprite interface.",
          '',
          'Live session state runs on Cloudflare Durable Objects. I set the concurrency target and load-test thresholds, and went from empty repo to deployed product in under an hour with Claude Code.',
        ],
      },
      { h: 'EXIT STATUS', body: '0 if every student found a crew.' },
      { h: 'BUGS', body: '500 students in one auditorium is not a load test. It was the load test.' },
      { h: 'SEE ALSO', body: 'durable-objects(7), oauth(7), https://fyc-srmuh.vercel.app' },
    ],
  });
  half('man-sangam-r.svg', 'man page SANGAM(2): an on-chain chit fund (ROSCA) live on mainnet, with commit-reveal winner selection.', {
    name: 'sangam', sec: 2, title: 'System Calls Manual', foot: ['Web3', 'Jun-Sep 2026'],
    sections: [
      { h: 'NAME', body: 'sangam_join, sangam_reveal -- on-chain chit fund (ROSCA)' },
      { h: 'SYNOPSIS', body: ['|**#include <sangam.h>**', '|', '|int **sangam_join**(pot_t *__pot__, wallet_t __who__);', '|int **sangam_reveal**(pot_t *__pot__, uint256 __secret__);'] },
      {
        h: 'DESCRIPTION',
        body: 'A rotating-savings circle where a smart contract holds the pot in escrow, so no organizer ever takes custody of member funds. Each round\'s winner is drawn with a commit-reveal scheme no participant can manipulate. Next.js frontend with wallet integration.',
      },
      { h: 'HISTORY', body: 'Prototyped on Stellar testnet in Soroban (Rust), then ported to Solidity and shipped live on Botchain mainnet.' },
      { h: 'RETURN VALUE', body: '0 on success. The organizer cannot run away with the pot. This is a feature.' },
      { h: 'SEE ALSO', body: 'soroban(1), solc(1), https://sangam-bot.vercel.app' },
    ],
  });
  half('man-nafnet-l.svg', 'man page NAFNET(3): low-dose SEM image restoration for KLA at SEMICON India 2026, SSIM 0.61 to 0.86.', {
    name: 'nafnet', sec: 3, title: 'Library Functions Manual', foot: ['SEMICON India / KLA', 'August 2026'],
    sections: [
      { h: 'NAME', body: 'nafnet_restore -- denoise + 2x super-resolve low-dose SEM images' },
      { h: 'SYNOPSIS', body: ['|**#include <torch/nafnet.h>**', '|', '|tensor **nafnet_restore**(const tensor *__low_dose__, int __scale__);'] },
      {
        h: 'DESCRIPTION',
        body: [
          "Joint denoising and 2x super-resolution (128x128 -> 256x256) of low-dose scanning electron microscope micrographs, for KLA's problem statement at the SEMICON India Hackathon 2026. Team of 4.",
          '',
          'I designed the NAFNet training pipeline end to end: degradation simulation, augmentation, checkpoints and evaluation. Noise is modelled physically -- Poisson shot noise and multiplicative Gamma speckle -- so synthetic data matches real sensors.',
        ],
      },
      { h: 'RESULTS', body: 'SSIM 0.61 (bicubic) -> **0.86**. 2.5M parameters. Validated against a 248-test suite.' },
      { h: 'BUGS', body: 'The bicubic baseline is still upset about it.' },
    ],
  });
  half('man-verge-r.svg', 'man page VERGE(6): the official tech-fest app for a 5,000+ student university, on Google Play.', {
    name: 'verge', sec: 6, title: 'Games Manual', foot: ['Verge 2026', 'March 2026'],
    sections: [
      { h: 'NAME', body: 'verge -- official tech-fest app (iOS + Android)' },
      { h: 'SYNOPSIS', body: '|**verge** [**--platform** __ios,android__] [**--notify**]' },
      {
        h: 'DESCRIPTION',
        body: 'The official tech-fest app for a 5,000+ student university, published on Google Play. React Native and Expo on a Node.js and Firebase backend, with a live schedule, event listings and push notifications.',
      },
      { h: 'NOTES', body: 'Filed in section 6, games and amusements, because a fest is one.' },
      { h: 'BUGS', body: 'Push notifications may cause students to arrive on time.' },
      { h: 'SEE ALSO', body: 'expo(1), firebase(1), play.google.com/store/apps/details?id=com.verge.converge' },
    ],
  });

  const art = manText({ name: 'artdrawn', sec: 7, title: 'Miscellaneous Information Manual', width: 144, foot: ['Artdrawn Studio', 'since January 2026'], sections: [] });
  const aL = col([
    { h: 'NAME', body: 'artdrawn -- creative AI visual agency (co-founder, web developer)' },
    { h: 'SYNOPSIS', body: '|**artdrawn** **--brand** | **--concept** | **--visuals** __client__ ...' },
    {
      h: 'DESCRIPTION',
      body: [
        'Co-founded a creative AI visual agency and delivered 10+ client projects across branding, concept development and visual production.',
        '',
        "Built and shipped the studio's production web platform, and architected its media delivery and caching.",
      ],
    },
  ]);
  const aR = col([
    { h: 'ENVIRONMENT', body: ['|FRAMEWORK=next.js       LANG=typescript', '|STYLE=tailwind          MOTION=gsap', '|CACHE=redis             BLOB=vercel-blob', '|MEDIA=cloudinary'] },
    { h: 'FILES', body: '|https://artdrawnstudio.com' },
    { h: 'SEE ALSO', body: 'next(1), gsap(3), redis-server(1), cloudinary(7)' },
  ]);
  manPage('man-artdrawn.svg', 'man page ARTDRAWN(7): co-founder of Artdrawn Studio, a creative AI visual agency with 10+ client projects.', 1280, 450, [[art.lines[0], '', ...aL], ['', '', ...aR]], art.foot);
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. git log --graph — the changelog of a life
// ─────────────────────────────────────────────────────────────────────────────
function gitLog() {
  const d = new Doc(1280, 560, { title: 'git log graph of milestones from 2022 to 2026.' });
  d.css(baseCss, lineCss);
  const p = PHOSPHOR.ansi;
  const t = crt(d, { x: 20, y: 18, w: 1240, h: 528, p, label: 'YG-100 · ANSI' });
  d.add(t.before);
  const lines = [
    '{green:yash@pdp-11}:{blue:~/life}$ git log --graph --date=short --format="%h %ad%d %s"',
    '{red:*} {yellow:c0dec30} {dim:2026-10} {yellow:(}{cyan:HEAD -> }{green:main}{yellow:, tag: v1.0-champion)} {hot:feat(sutra): 1st place at CodeX 3.0, 80 teams}',
    '{red:*} {yellow:a7e3b1e} {dim:2026-09} feat(contract): community app for 200-300 Arya Samaj temples',
    '{red:|} {green:*} {yellow:5a96adb} {dim:2026-09} {yellow:(}{red:origin/sangam}{yellow:)} deploy(sangam): live on Botchain mainnet',
    '{red:*} {green:|} {yellow:f1dc4e3} {dim:2026-08} feat(fyc): induction platform, 500+ students live at once',
    '{red:*} {green:|} {yellow:5e4f00d} {dim:2026-08} research(sem): NAFNet restoration, SSIM 0.61 -> 0.86',
    '{red:|} {green:*} {yellow:50ba5ed} {dim:2026-06} feat(sangam): ROSCA prototype on Stellar testnet (Soroban/Rust)',
    '{red:|}{green:/}',
    '{red:*} {yellow:7e46e26} {dim:2026-03} release(verge): official fest app on Google Play',
    '{red:*} {yellow:a4dd4a1} {dim:2026-01} feat(studio): co-founded Artdrawn Studio',
    '{red:*} {yellow:4ee1300} {dim:2025-10} lead(appirates): co-leader, 20-person core team, 300+ trained',
    '{red:*} {yellow:de70b5e} {dim:2025-09} lead(xetech): DevOps Essentials for 140+ students with Xebia',
    '{red:*} {yellow:4b825dc} {dim:2022-11} init: hello, world {dim:(root-commit, empty tree)}',
  ];
  const C = p;
  lines.forEach((s, k) => d.add(`<g ${appear(k, 0.12, 0.3)}>${line(d, s, { x: t.sx + 28, y: t.sy + 44 + k * 30, size: 15, colors: C })}</g>`));
  const ey = t.sy + 44 + lines.length * 30;
  d.add(`<g ${appear(lines.length, 0.12, 0.3)}><rect x="${t.sx + 26}" y="${ey - 15}" width="${n(5 * CW * 15 + 4)}" height="20" fill="${p.main}"/>${d.text('(END)', { x: t.sx + 28, y: ey, size: 15, font: fonts.monoSemi, fill: p.bg })}</g>`);
  d.add(t.after);
  save('gitlog.svg', d);
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. tree(1) — the stack, as a filesystem
// ─────────────────────────────────────────────────────────────────────────────
function tree() {
  const fs_ = [
    ['ai', [['claude-code', 'l', '~/.local/bin/claude'], ['claude-api'], ['pytorch'], ['computer-vision']]],
    ['lang', [['typescript', 'x'], ['javascript', 'x'], ['python3', 'x'], ['rustc', 'x'], ['solc', 'x', null, 'solidity'], ['cc', 'x', null, 'c'], ['go', 'x'], ['kotlinc', 'x']]],
    ['web', [['next.js'], ['react'], ['tailwindcss'], ['gsap'], ['vite']]],
    ['mobile', [['react-native'], ['expo'], ['flutter', 'x']]],
    ['backend', [['node', 'x'], ['fastapi'], ['django'], ['google-oauth']]],
    ['data', [['postgres', 'x'], ['redis-server', 'x'], ['supabase'], ['firebase']]],
    ['cloud', [['cloudflare', 'l', 'durable-objects/'], ['vercel'], ['gcloud', 'x'], ['az', 'x']]],
    ['devops', [['docker', 'x'], ['kubectl', 'x'], ['jenkins'], ['linux', 'l', '/boot/vmlinuz']]],
    ['web3', [['soroban', 'x'], ['stellar'], ['evm']]],
  ];
  const fmt = (dirs, isLastGroup) => {
    const out = [];
    dirs.forEach(([dir, files], di) => {
      const lastDir = isLastGroup && di === dirs.length - 1;
      out.push(`${lastDir ? '`-- ' : '|-- '}{blue!:${dir}/}`);
      files.forEach(([f, kind, target, note], fi) => {
        const pre = `${lastDir ? '    ' : '|   '}${fi === files.length - 1 ? '`-- ' : '|-- '}`;
        let s = kind === 'x' ? `{green!:${f}*}` : kind === 'l' ? `{cyan!:${f}} -> ${target}` : f;
        if (note) s += `   {dim:# ${note}}`;
        out.push(pre + s);
      });
    });
    return out;
  };
  const cols = [fmt(fs_.slice(0, 2), false), fmt(fs_.slice(2, 5), false), fmt(fs_.slice(5), true)];
  cols[0].unshift('{blue!:/usr/local/stack/}');
  const files = fs_.reduce((a, [, f]) => a + f.length, 0);
  const d = new Doc(1280, 730, { title: `tree of /usr/local/stack: ${fs_.map(([dir, f]) => `${dir}: ${f.map((x) => x[0]).join(', ')}`).join('; ')}` });
  d.css(baseCss, lineCss);
  const p = PHOSPHOR.ansi;
  const t = crt(d, { x: 20, y: 18, w: 1240, h: 700, p, label: 'YG-100 · ANSI' });
  d.add(t.before);
  const lh = 27;
  const x0 = t.sx + 28;
  d.add(`<g ${appear(0, 0.05, 0.3)}>${line(d, '{green:yash@pdp-11}:{blue:~}$ tree -F --dirsfirst --charset=ascii /usr/local/stack', { x: x0, y: t.sy + 44, size: 15, colors: p })}</g>`);
  let k = 1;
  cols.forEach((c, ci) => c.forEach((s, j) => d.add(`<g ${appear(k++, 0.025, 0.4)}>${line(d, s, { x: x0 + ci * 392, y: t.sy + 44 + (j + 1.4) * lh, size: 14.5, colors: p })}</g>`)));
  const rows = Math.max(...cols.map((c) => c.length));
  d.add(`<g ${appear(k++, 0.025, 0.4)}>${line(d, `${fs_.length} directories, ${files} files`, { x: x0, y: t.sy + 44 + (rows + 2.2) * lh, size: 15, colors: p })}</g>`);
  d.add(t.after);
  save('tree.svg', d);
  return { dirs: fs_.length, files };
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. Section headers + footer
// ─────────────────────────────────────────────────────────────────────────────
function header(file, label, cmd, num) {
  const d = new Doc(1280, 92, { title: `${num} ${label}` });
  d.css(baseCss, `.dm{animation:dm .4s ease-out both}@keyframes dm{from{opacity:0}to{opacity:1}}`);
  const pitch = 6.4;
  const amber = '#D9902F';
  const grey = '#8B949E';
  const numDots = dotText(num);
  const ndw = (numDots.cols - 1) * pitch;
  d.add(numDots.dots.map((q) => `<circle cx="${n(14 + q.c * pitch)}" cy="${n(26 + q.r * pitch)}" r="2.45" fill="${grey}"/>`).join(''));
  const lx = 14 + ndw + 30;
  const { dots, cols } = dotText(label);
  d.add(dots.map((q) => `<circle class="dm" style="animation-delay:${n(q.c * 0.012)}s" cx="${n(lx + q.c * pitch)}" cy="${n(26 + q.r * pitch)}" r="2.45" fill="${amber}"/>`).join(''));
  const end = lx + (cols - 1) * pitch + 26;
  const cmdW = fonts.mono.measure(cmd, 16);
  d.add(d.text(cmd, { x: 1266, y: 51, size: 16, font: fonts.mono, fill: grey, anchor: 'end' }));
  d.add(`<line x1="${n(end)}" y1="45.2" x2="${n(1266 - cmdW - 22)}" y2="45.2" stroke="${grey}" stroke-opacity=".45" stroke-dasharray="2 5"/>`);
  d.add(`<line x1="14" y1="84" x2="1266" y2="84" stroke="${grey}" stroke-opacity=".25"/>`);
  save(file, d);
}

function footer() {
  const d = new Doc(1280, 520, { title: 'Contact: yashgoel.tech, linkedin.com/in/yashgoyal-dev, goyalyash144@gmail.com. You are not expected to understand this.' });
  d.css(baseCss, lineCss);
  const p = PHOSPHOR.amber;
  const t = crt(d, { x: 20, y: 18, w: 1240, h: 490, p, label: 'YG-100 · AMBER P3' });
  d.add(t.before);
  const lines = [
    '{hot:yash@pdp-11}:{dim:~}$ ./contact --all',
    '  web        {hot:https://yashgoel.tech}',
    '  linkedin   {hot:https://linkedin.com/in/yashgoyal-dev}',
    '  mail       {hot:goyalyash144@gmail.com}',
    '  studio     {hot:https://artdrawnstudio.com}',
    '{hot:yash@pdp-11}:{dim:~}$ grep -B1 -A1 expected /usr/sys/ken/slp.c',
    '        /*',
    '         * {hot:You are not expected to understand this.}',
    '         */',
    '{hot:yash@pdp-11}:{dim:~}$ logout',
    '{dim:Connection to yashgoel.tech closed.}',
  ];
  lines.forEach((s, k) => d.add(`<g ${appear(k, 0.1, 0.3)}>${line(d, s, { x: t.sx + 28, y: t.sy + 44 + k * 32, size: 16, colors: p })}</g>`));
  d.add(t.after);
  save('footer.svg', d);
}

console.log('building assets/');
hero();
keycaps();
punchCard();
finger();
manPages();
gitLog();
const stack = tree();
header('h-whoami.svg', 'WHOAMI', '$ finger -l yash', '0');
header('h-work.svg', 'SELECTED WORK', '$ man -k yash | sort', '1');
header('h-log.svg', 'CHANGELOG', '$ git log --graph life/', '2');
header('h-stack.svg', 'STACK', `$ tree /usr/local/stack  # ${stack.files} files`, '3');
header('h-core.svg', 'CORE DUMP', '$ uptime; cat /dev/core', '4');
footer();
