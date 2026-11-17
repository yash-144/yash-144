// Period-accurate hardware for the README: CRT terminals, seven-segment
// electroluminescent digits, green-bar line-printer paper, and mono text runs.
// Every artifact is a physical object, so it reads well on GitHub's light AND dark themes.

import { fonts, n } from './svg.mjs';

export const CW = 0.6; // Source Code Pro advance, in em

// Phosphor and terminal palettes.
export const PHOSPHOR = {
  amber: { bg: '#0E0A05', hot: '#FFE3B3', main: '#FFB547', dim: '#B47B2F', faint: '#5C3F17' },
  green: { bg: '#050C07', hot: '#D9FFE4', main: '#5CFF95', dim: '#33A862', faint: '#174D2B' },
  // An ANSI colour terminal for the modern tools (git, tree).
  ansi: {
    bg: '#0B0D12', hot: '#F4F6FA', main: '#D3D9E4', dim: '#7C8597', faint: '#3A4150',
    red: '#FF6E6E', green: '#5AF78E', yellow: '#F3F99D', blue: '#57C7FF', magenta: '#FF6AC1', cyan: '#9AEDFE',
  },
};

export const PAPER = { sheet: '#FCFBF4', bar: '#DDEBD5', ink: '#24251F', ink2: '#56584E', ink3: '#8D8F84', hole: '#E6E3D6', perf: '#C9C5B5' };

// Markup for a line of mono text:  **bold**  __underlined__  {color:text}  {color!:bold text}
export function parse(line, base) {
  const segs = [];
  const re = /\*\*(.+?)\*\*|__(.+?)__|\{(\w+)(!?):(.*?)\}/g;
  let last = 0;
  let m;
  while ((m = re.exec(line))) {
    if (m.index > last) segs.push({ t: line.slice(last, m.index), c: base });
    if (m[1] != null) segs.push({ t: m[1], c: base, b: true });
    else if (m[2] != null) segs.push({ t: m[2], c: base, u: true });
    else segs.push({ t: m[5], c: m[3], b: m[4] === '!' });
    last = re.lastIndex;
  }
  if (last < line.length) segs.push({ t: line.slice(last), c: base });
  return segs;
}

export const visibleLength = (line) => [...line.replace(/\*\*(.+?)\*\*|__(.+?)__|\{\w+!?:(.*?)\}/g, (_, a, b, c) => a ?? b ?? c)].length;

// Render segments at fixed character columns. `colors` maps color keys to hex.
export function runs(doc, segs, { x, y, size, colors = {}, boldFont = fonts.monoSemi, font = fonts.mono }) {
  const cw = CW * size;
  let col = 0;
  const out = [];
  for (const s of segs) {
    const fill = colors[s.c] || s.c;
    const len = [...s.t].length;
    if (s.t.trim()) out.push(doc.text(s.t, { x: x + col * cw, y, size, font: s.b ? boldFont : font, fill }));
    if (s.u) {
      // underline each word (man(1) style), skipping spaces
      s.t.replace(/\S+/g, (w, i) => {
        out.push(`<rect x="${n(x + (col + i) * cw)}" y="${n(y + size * 0.2)}" width="${n(w.length * cw)}" height="${n(size * 0.075)}" fill="${fill}"/>`);
        return w;
      });
    }
    col += len;
  }
  return out.join('');
}

export const line = (doc, str, o) => runs(doc, parse(str, o.base || 'main'), o);

// Wrap plain text to a character width.
export function wrapChars(str, width) {
  const out = [];
  for (const para of str.split('\n')) {
    let cur = '';
    for (const w of para.split(/\s+/).filter(Boolean)) {
      if (cur && visibleLength(`${cur} ${w}`) > width) {
        out.push(cur);
        cur = w;
      } else cur = cur ? `${cur} ${w}` : w;
    }
    out.push(cur);
  }
  return out;
}

// Shared CSS for "lines appear one by one" (terminal output / line printer).
export const lineCss = `
.ln{animation:ln .01s steps(1) both}
@keyframes ln{from{opacity:0}to{opacity:1}}
.cur{animation:blink 1.06s steps(1) infinite}
@keyframes blink{50%{opacity:0}}
.roll{animation:roll 7s linear infinite}
@keyframes roll{from{transform:translateY(-140px)}to{transform:translateY(900px)}}
.flick{animation:flick 4.7s steps(1) infinite}
@keyframes flick{0%,100%{opacity:1}47%{opacity:.94}48%{opacity:1}83%{opacity:.97}}
`;

// A CRT terminal in a bezel. Returns { before, after, sx, sy, sw, sh } — draw content between.
export function crt(doc, { x, y, w, h, p, label = 'YG-100', inset = 24 }) {
  const id = doc.uid('c');
  const sx = x + inset;
  const sy = y + inset;
  const sw = w - inset * 2;
  const sh = h - inset * 2 - 10;
  doc.def(
    `<linearGradient id="${id}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2A2D31"/><stop offset="1" stop-color="#17191C"/></linearGradient>`,
    `<radialGradient id="${id}v" cx=".5" cy=".5" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".62"/></radialGradient>`,
    `<radialGradient id="${id}g" cx=".5" cy=".45" r=".7"><stop offset="0" stop-color="${p.main}" stop-opacity=".07"/><stop offset="1" stop-color="${p.main}" stop-opacity="0"/></radialGradient>`,
    `<linearGradient id="${id}r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.main}" stop-opacity="0"/><stop offset=".5" stop-color="${p.main}" stop-opacity=".05"/><stop offset="1" stop-color="${p.main}" stop-opacity="0"/></linearGradient>`,
    `<pattern id="${id}s" width="4" height="3" patternUnits="userSpaceOnUse"><rect width="4" height="1.2" fill="#000" opacity=".28"/></pattern>`,
    `<clipPath id="${id}k"><rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" rx="18"/></clipPath>`,
    `<filter id="${id}f" x="-2%" y="-2%" width="104%" height="104%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`,
  );
  const before = [
    `<rect x="${x + 2}" y="${y + 8}" width="${w - 4}" height="${h - 4}" rx="30" fill="#000" opacity=".28"/>`,
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="30" fill="url(#${id}b)" stroke="#0E0F11" stroke-width="2"/>`,
    `<rect x="${x + 6}" y="${y + 5}" width="${w - 12}" height="${h - 12}" rx="26" fill="none" stroke="#3A3E44" stroke-opacity=".7"/>`,
    `<rect x="${sx - 3}" y="${sy - 3}" width="${sw + 6}" height="${sh + 6}" rx="20" fill="#050505"/>`,
    `<g clip-path="url(#${id}k)"><rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" fill="${p.bg}"/><rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" fill="url(#${id}g)"/>`,
    `<g class="flick" filter="url(#${id}f)">`,
  ].join('');
  const after = [
    `</g>`,
    `<rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" fill="url(#${id}s)"/>`,
    `<g transform="translate(0 ${sy})"><rect class="roll" x="${sx}" y="0" width="${sw}" height="140" fill="url(#${id}r)"/></g>`,
    `<rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" fill="url(#${id}v)"/>`,
    `<path d="M${sx + 30} ${sy + 14} h${sw * 0.42} q-${sw * 0.2} 22 -${sw * 0.42} 46 z" fill="#fff" opacity=".035"/>`,
    `</g>`,
    doc.text(label, { x: x + w - 34, y: y + h - 13, size: 10, font: fonts.monoSemi, fill: '#5B6068', anchor: 'end', ls: 0.2 }),
    `<circle cx="${x + 30}" cy="${y + h - 17}" r="3.2" fill="#3DFF7A"/><circle cx="${x + 30}" cy="${y + h - 17}" r="7" fill="#3DFF7A" opacity=".16"/>`,
  ].join('');
  return { before, after, sx, sy, sw, sh };
}

// Seven-segment digit. Returns polygon markup for the requested segments.
const SEG = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg', '-': 'g', '+': 'g', ' ': '' };
export function seg7(ch, x, y, w, h, t, fill, all = false) {
  const g = t * 0.22;
  const hs = (x1, x2, yy) => `${x1 + g},${yy} ${x1 + g + t / 2},${yy - t / 2} ${x2 - g - t / 2},${yy - t / 2} ${x2 - g},${yy} ${x2 - g - t / 2},${yy + t / 2} ${x1 + g + t / 2},${yy + t / 2}`;
  const vs = (xx, y1, y2) => `${xx},${y1 + g} ${xx + t / 2},${y1 + g + t / 2} ${xx + t / 2},${y2 - g - t / 2} ${xx},${y2 - g} ${xx - t / 2},${y2 - g - t / 2} ${xx - t / 2},${y1 + g + t / 2}`;
  const m = y + h / 2;
  const P = { a: hs(x, x + w, y), g: hs(x, x + w, m), d: hs(x, x + w, y + h), f: vs(x, y, m), b: vs(x + w, y, m), e: vs(x, m, y + h), c: vs(x + w, m, y + h) };
  const on = all ? 'abcdefg' : SEG[ch] ?? '';
  let out = [...on].map((s) => `<polygon points="${P[s].split(' ').map((pt) => pt.split(',').map((v) => n(v, 1)).join(',')).join(' ')}" fill="${fill}"/>`).join('');
  if (ch === '+' && !all) out += `<rect x="${n(x + w / 2 - t / 2)}" y="${n(m - h * 0.28)}" width="${n(t)}" height="${n(h * 0.56)}" rx="${n(t / 2)}" fill="${fill}"/>`;
  return out;
}

// Continuous-form green-bar paper with tractor-feed strips.
export function paper(doc, { x, y, w, h, lh, top = 0 }) {
  const strip = 30;
  const id = doc.uid('p');
  const out = [`<rect x="${x + 3}" y="${y + 7}" width="${w}" height="${h}" fill="#000" opacity=".22"/>`, `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${PAPER.sheet}"/>`];
  doc.def(`<clipPath id="${id}"><rect x="${x + strip}" y="${y}" width="${w - strip * 2}" height="${h}"/></clipPath>`);
  const bars = [];
  for (let by = y + top; by < y + h; by += lh * 6) bars.push(`<rect x="${x + strip}" y="${n(by)}" width="${w - strip * 2}" height="${n(lh * 3)}" fill="${PAPER.bar}"/>`);
  out.push(`<g clip-path="url(#${id})">${bars.join('')}</g>`);
  for (const sx of [x + strip, x + w - strip]) out.push(`<line x1="${sx}" y1="${y}" x2="${sx}" y2="${y + h}" stroke="${PAPER.perf}" stroke-dasharray="3 3"/>`);
  for (let hy = y + 14; hy < y + h - 6; hy += 25) for (const hx of [x + strip / 2, x + w - strip / 2]) out.push(`<circle cx="${hx}" cy="${hy}" r="5" fill="${PAPER.hole}" stroke="${PAPER.perf}" stroke-width=".8"/>`);
  return out.join('');
}
