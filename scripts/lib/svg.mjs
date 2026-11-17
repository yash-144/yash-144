import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Font } from './font.mjs';
import { dotText } from './dots.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const load = (file, id) => new Font(path.join(here, '..', 'fonts', file), id);

export const fonts = {
  mono: load('SourceCodePro-Regular.ttf', 'f'),
  monoMed: load('SourceCodePro-Medium.ttf', 'g'),
  monoSemi: load('SourceCodePro-Semibold.ttf', 'h'),
};
fonts.body = fonts.mono;

// Compact number formatting for coordinates.
export const n = (v, p = 2) => {
  const s = Number(v).toFixed(p);
  return s.includes('.') ? s.replace(/0+$/, '').replace(/\.$/, '') : s;
};

export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Deterministic PRNG so every build is byte-identical.
export function rng(seed = 7) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Doc {
  constructor(w, h, { title = '', theme } = {}) {
    Object.assign(this, { w, h, title, theme });
    this.glyphs = new Map();
    this.defs = [];
    this.styles = [];
    this.parts = [];
    this.seq = 0;
  }

  uid(prefix = 'u') {
    return `${prefix}${(this.seq++).toString(36)}`;
  }

  css(...s) {
    this.styles.push(...s);
    return this;
  }

  def(...s) {
    this.defs.push(...s);
    return this;
  }

  add(...s) {
    this.parts.push(...s.flat(Infinity).filter(Boolean));
    return this;
  }

  glyph(font, gid) {
    const key = font.id + gid;
    if (!this.glyphs.has(key)) this.glyphs.set(key, { id: font.id + gid.toString(36), d: font.path(gid) });
    return this.glyphs.get(key).id;
  }

  // Text as outlined glyphs. Options:
  //   x, y (baseline), font, size, fill, anchor ('start'|'middle'|'end'), ls (em),
  //   cls / style / attrs for the wrapper, glyphAttrs(i, glyph) for per-glyph attributes.
  text(str, o) {
    const font = o.font || fonts.body;
    const size = o.size || 16;
    const k = size / font.upm;
    const { glyphs, width } = font.layout(String(str), (o.ls || 0) * font.upm);
    let x = o.x || 0;
    if (o.anchor === 'middle') x -= (width * k) / 2;
    else if (o.anchor === 'end') x -= width * k;
    let i = -1;
    const uses = glyphs
      .map((g) => {
        if (/\s/.test(g.ch)) return '';
        if (g.gid === 0) console.warn(`  ! missing glyph ${JSON.stringify(g.ch)} in font ${font.id}`);
        i++;
        const extra = o.glyphAttrs ? ` ${o.glyphAttrs(i, g, g.x * k)}` : '';
        return `<use href="#${this.glyph(font, g.gid)}" x="${g.x}"${extra}/>`;
      })
      .join('');
    const attrs = [
      `transform="translate(${n(x)} ${n(o.y || 0)}) scale(${n(k, 6)})"`,
      o.fill ? `fill="${o.fill}"` : '',
      o.opacity != null ? `opacity="${o.opacity}"` : '',
      o.cls ? `class="${o.cls}"` : '',
      o.style ? `style="${o.style}"` : '',
      o.attrs || '',
    ]
      .filter(Boolean)
      .join(' ');
    return `<g ${attrs}>${uses}</g>`;
  }

  // Multi-line text block. Returns { svg, height, lines }.
  para(str, o) {
    const font = o.font || fonts.body;
    const lines = font.wrap(str, o.size, o.width, o.ls || 0);
    const lh = o.lineHeight || o.size * 1.5;
    const svg = lines.map((line, i) => this.text(line, { ...o, y: o.y + i * lh })).join('');
    return { svg, height: lines.length * lh, lines };
  }

  // Dot-matrix text. Returns markup for lit dots; `dotAttrs(dot, i)` can add per-dot attributes.
  dots(str, { x, y, pitch, r, fill, gap = 1, cls, dotAttrs }) {
    const { dots } = dotText(str, gap);
    return dots
      .map((d, i) => {
        const extra = dotAttrs ? ` ${dotAttrs(d, i)}` : '';
        return `<circle cx="${n(x + d.c * pitch)}" cy="${n(y + d.r * pitch)}" r="${n(r)}"${fill ? ` fill="${fill}"` : ''}${cls ? ` class="${cls}"` : ''}${extra}/>`;
      })
      .join('');
  }

  render() {
    const glyphDefs = [...this.glyphs.values()].map((g) => `<path id="${g.id}" d="${g.d}"/>`).join('');
    return [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${this.w}" height="${this.h}" viewBox="0 0 ${this.w} ${this.h}" fill="none" role="img" aria-label="${esc(this.title)}">`,
      `<title>${esc(this.title)}</title>`,
      this.styles.length ? `<style>${this.styles.join('')}</style>` : '',
      `<defs>${glyphDefs}${this.defs.join('')}</defs>`,
      this.parts.join(''),
      `</svg>`,
    ].join('');
  }
}

// Shared CSS: motion is opt-out for people who prefer reduced motion.
export const baseCss = `
@media (prefers-reduced-motion: reduce){*{animation:none!important;transition:none!important}}
`;
