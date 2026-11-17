// Minimal, dependency-free TrueType / WOFF reader.
//
// Turns text into SVG glyph outlines so every visual in this README renders with
// the exact same typography on every machine (an SVG inside an <img> cannot load
// web fonts, and system fonts differ wildly between macOS, Windows and Linux).
//
// Supports: sfnt (TrueType outlines) and WOFF 1.0 containers, cmap formats 4/12,
// simple + composite glyphs, and pair kerning from GPOS (formats 1 & 2) or `kern`.

import fs from 'node:fs';
import zlib from 'node:zlib';

function readTables(buf) {
  const sig = buf.readUInt32BE(0);
  const tables = {};
  if (sig === 0x774f4646) {
    // 'wOFF'
    const n = buf.readUInt16BE(12);
    for (let i = 0; i < n; i++) {
      const o = 44 + i * 20;
      const tag = buf.toString('latin1', o, o + 4);
      const off = buf.readUInt32BE(o + 4);
      const comp = buf.readUInt32BE(o + 8);
      const orig = buf.readUInt32BE(o + 12);
      const raw = buf.subarray(off, off + comp);
      tables[tag] = comp < orig ? zlib.inflateSync(raw) : raw;
    }
    return { flavor: buf.readUInt32BE(4), tables };
  }
  if (sig === 0x774f4632) throw new Error('WOFF2 is not supported, use a .ttf or .woff');
  const n = buf.readUInt16BE(4);
  for (let i = 0; i < n; i++) {
    const o = 12 + i * 16;
    tables[buf.toString('latin1', o, o + 4)] = buf.subarray(buf.readUInt32BE(o + 8), buf.readUInt32BE(o + 8) + buf.readUInt32BE(o + 12));
  }
  return { flavor: sig, tables };
}

function parseCmap(t) {
  let best = null;
  let bestScore = -1;
  const n = t.readUInt16BE(2);
  for (let i = 0; i < n; i++) {
    const pid = t.readUInt16BE(4 + i * 8);
    const eid = t.readUInt16BE(6 + i * 8);
    const off = t.readUInt32BE(8 + i * 8);
    const fmt = t.readUInt16BE(off);
    let score = -1;
    if (fmt === 12 && ((pid === 3 && eid === 10) || pid === 0)) score = 3;
    else if (fmt === 4 && ((pid === 3 && eid === 1) || pid === 0)) score = 2;
    if (score > bestScore) [best, bestScore] = [{ off, fmt }, score];
  }
  const map = new Map();
  if (!best) return map;
  const { off, fmt } = best;
  if (fmt === 4) {
    const segX2 = t.readUInt16BE(off + 6);
    const endO = off + 14;
    const startO = endO + segX2 + 2;
    const deltaO = startO + segX2;
    const rangeO = deltaO + segX2;
    for (let s = 0; s < segX2 / 2; s++) {
      const end = t.readUInt16BE(endO + s * 2);
      const start = t.readUInt16BE(startO + s * 2);
      const delta = t.readInt16BE(deltaO + s * 2);
      const ro = t.readUInt16BE(rangeO + s * 2);
      for (let c = start; c <= end && c !== 0xffff; c++) {
        let g;
        if (ro === 0) g = (c + delta) & 0xffff;
        else {
          g = t.readUInt16BE(rangeO + s * 2 + ro + (c - start) * 2);
          if (g !== 0) g = (g + delta) & 0xffff;
        }
        if (g) map.set(c, g);
      }
    }
  } else {
    const groups = t.readUInt32BE(off + 12);
    for (let i = 0; i < groups; i++) {
      const o = off + 16 + i * 12;
      const s = t.readUInt32BE(o);
      const e = t.readUInt32BE(o + 4);
      const g0 = t.readUInt32BE(o + 8);
      for (let c = s; c <= e; c++) map.set(c, g0 + (c - s));
    }
  }
  return map;
}

// ---------- GPOS pair kerning ----------

function coverageIndex(t, off, gid) {
  const fmt = t.readUInt16BE(off);
  const n = t.readUInt16BE(off + 2);
  if (fmt === 1) {
    let lo = 0;
    let hi = n - 1;
    while (lo <= hi) {
      const m = (lo + hi) >> 1;
      const g = t.readUInt16BE(off + 4 + m * 2);
      if (g === gid) return m;
      if (g < gid) lo = m + 1;
      else hi = m - 1;
    }
    return -1;
  }
  if (fmt === 2) {
    for (let i = 0; i < n; i++) {
      const o = off + 4 + i * 6;
      const s = t.readUInt16BE(o);
      if (gid >= s && gid <= t.readUInt16BE(o + 2)) return t.readUInt16BE(o + 4) + gid - s;
    }
  }
  return -1;
}

function classOf(t, off, gid) {
  const fmt = t.readUInt16BE(off);
  if (fmt === 1) {
    const start = t.readUInt16BE(off + 2);
    const n = t.readUInt16BE(off + 4);
    return gid >= start && gid < start + n ? t.readUInt16BE(off + 6 + (gid - start) * 2) : 0;
  }
  if (fmt === 2) {
    const n = t.readUInt16BE(off + 2);
    for (let i = 0; i < n; i++) {
      const o = off + 4 + i * 6;
      if (gid >= t.readUInt16BE(o) && gid <= t.readUInt16BE(o + 2)) return t.readUInt16BE(o + 4);
    }
  }
  return 0;
}

const vrSize = (fmt) => {
  let n = 0;
  for (let b = 0; b < 8; b++) if (fmt & (1 << b)) n++;
  return n * 2;
};

function xAdvance(t, o, fmt) {
  if (!(fmt & 4)) return 0;
  return t.readInt16BE(o + (fmt & 1 ? 2 : 0) + (fmt & 2 ? 2 : 0));
}

function parseGpos(t) {
  if (!t) return null;
  const fl = t.readUInt16BE(6);
  const ll = t.readUInt16BE(8);
  const lookupIdx = new Set();
  const fCount = t.readUInt16BE(fl);
  for (let i = 0; i < fCount; i++) {
    const rec = fl + 2 + i * 6;
    if (t.toString('latin1', rec, rec + 4) !== 'kern') continue;
    const fo = fl + t.readUInt16BE(rec + 4);
    const n = t.readUInt16BE(fo + 2);
    for (let j = 0; j < n; j++) lookupIdx.add(t.readUInt16BE(fo + 4 + j * 2));
  }
  if (!lookupIdx.size) return null;
  const lookups = [];
  for (const li of [...lookupIdx].sort((a, b) => a - b)) {
    const lo = ll + t.readUInt16BE(ll + 2 + li * 2);
    const type = t.readUInt16BE(lo);
    const n = t.readUInt16BE(lo + 4);
    const subs = [];
    for (let s = 0; s < n; s++) {
      let so = lo + t.readUInt16BE(lo + 6 + s * 2);
      let st = type;
      if (type === 9) {
        st = t.readUInt16BE(so + 2);
        so += t.readUInt32BE(so + 4);
      }
      if (st === 2) subs.push(so);
    }
    if (subs.length) lookups.push(subs);
  }
  return (l, r) => {
    let total = 0;
    for (const subs of lookups) {
      for (const so of subs) {
        const fmt = t.readUInt16BE(so);
        const ci = coverageIndex(t, so + t.readUInt16BE(so + 2), l);
        if (ci < 0) continue;
        const vf1 = t.readUInt16BE(so + 4);
        const vf2 = t.readUInt16BE(so + 6);
        const s1 = vrSize(vf1);
        const s2 = vrSize(vf2);
        if (fmt === 1) {
          const ps = so + t.readUInt16BE(so + 10 + ci * 2);
          const n = t.readUInt16BE(ps);
          const rec = 2 + s1 + s2;
          let lo = 0;
          let hi = n - 1;
          let hit = null;
          while (lo <= hi) {
            const m = (lo + hi) >> 1;
            const o = ps + 2 + m * rec;
            const g2 = t.readUInt16BE(o);
            if (g2 === r) {
              hit = xAdvance(t, o + 2, vf1);
              break;
            }
            if (g2 < r) lo = m + 1;
            else hi = m - 1;
          }
          if (hit === null) continue;
          total += hit;
          break;
        }
        if (fmt === 2) {
          const c1 = classOf(t, so + t.readUInt16BE(so + 8), l);
          const c2 = classOf(t, so + t.readUInt16BE(so + 10), r);
          const c1n = t.readUInt16BE(so + 12);
          const c2n = t.readUInt16BE(so + 14);
          if (c1 >= c1n || c2 >= c2n) continue;
          total += xAdvance(t, so + 16 + (c1 * c2n + c2) * (s1 + s2), vf1);
          break;
        }
      }
    }
    return total;
  };
}

function parseKern(t) {
  if (!t || t.readUInt16BE(0) !== 0) return null;
  const pairs = new Map();
  let o = 4;
  for (let i = 0; i < t.readUInt16BE(2); i++) {
    const len = t.readUInt16BE(o + 2);
    const cov = t.readUInt16BE(o + 4);
    if (cov >> 8 === 0 && cov & 1) {
      const n = t.readUInt16BE(o + 6);
      for (let p = 0; p < n; p++) {
        const q = o + 14 + p * 6;
        pairs.set(t.readUInt16BE(q) * 65536 + t.readUInt16BE(q + 2), t.readInt16BE(q + 4));
      }
    }
    o += len;
  }
  return (l, r) => pairs.get(l * 65536 + r) || 0;
}

// ---------- the font ----------

const fmt = (v) => (Number.isInteger(v) ? String(v) : v.toFixed(1).replace(/\.0$/, ''));

export class Font {
  constructor(file, id) {
    const { flavor, tables } = readTables(fs.readFileSync(file));
    if (flavor === 0x4f54544f) throw new Error(`${file}: CFF outlines are not supported`);
    this.id = id;
    this.t = tables;
    this.upm = tables.head.readUInt16BE(18);
    this.locFmt = tables.head.readInt16BE(50);
    this.ascender = tables.hhea.readInt16BE(4);
    this.descender = tables.hhea.readInt16BE(6);
    this.numHM = tables.hhea.readUInt16BE(34);
    const os2 = tables['OS/2'];
    this.capHeight = os2 && os2.readUInt16BE(0) >= 2 ? os2.readInt16BE(88) : Math.round(this.ascender * 0.7);
    this.xHeight = os2 && os2.readUInt16BE(0) >= 2 ? os2.readInt16BE(86) : Math.round(this.capHeight * 0.72);
    this.cmap = parseCmap(tables.cmap);
    this.kernFn = parseGpos(tables.GPOS) || parseKern(tables.kern) || (() => 0);
    this.paths = new Map();
  }

  gid(cp) {
    return this.cmap.get(cp) ?? 0;
  }

  advance(gid) {
    const h = this.t.hmtx;
    return h.readUInt16BE((gid < this.numHM ? gid : this.numHM - 1) * 4);
  }

  contours(gid, depth = 0) {
    const { loca, glyf } = this.t;
    const off = this.locFmt === 0 ? loca.readUInt16BE(gid * 2) * 2 : loca.readUInt32BE(gid * 4);
    const next = this.locFmt === 0 ? loca.readUInt16BE(gid * 2 + 2) * 2 : loca.readUInt32BE(gid * 4 + 4);
    if (next <= off || depth > 8) return [];
    const g = glyf.subarray(off, next);
    const nC = g.readInt16BE(0);
    if (nC >= 0) {
      const ends = [];
      let p = 10;
      for (let i = 0; i < nC; i++, p += 2) ends.push(g.readUInt16BE(p));
      const nPts = nC ? ends[nC - 1] + 1 : 0;
      p += 2 + g.readUInt16BE(p);
      const flags = [];
      while (flags.length < nPts) {
        const f = g[p++];
        flags.push(f);
        if (f & 8) for (let r = g[p++]; r > 0; r--) flags.push(f);
      }
      const xs = [];
      const ys = [];
      let v = 0;
      for (let i = 0; i < nPts; i++) {
        const f = flags[i];
        if (f & 2) v += f & 16 ? g[p++] : -g[p++];
        else if (!(f & 16)) (v += g.readInt16BE(p)), (p += 2);
        xs.push(v);
      }
      v = 0;
      for (let i = 0; i < nPts; i++) {
        const f = flags[i];
        if (f & 4) v += f & 32 ? g[p++] : -g[p++];
        else if (!(f & 32)) (v += g.readInt16BE(p)), (p += 2);
        ys.push(v);
      }
      const out = [];
      let s = 0;
      for (const e of ends) {
        const c = [];
        for (let i = s; i <= e; i++) c.push({ x: xs[i], y: ys[i], on: !!(flags[i] & 1) });
        out.push(c);
        s = e + 1;
      }
      return out;
    }
    const out = [];
    let p = 10;
    for (let more = true; more; ) {
      const flags = g.readUInt16BE(p);
      const cg = g.readUInt16BE(p + 2);
      p += 4;
      let a1;
      let a2;
      if (flags & 1) (a1 = g.readInt16BE(p)), (a2 = g.readInt16BE(p + 2)), (p += 4);
      else (a1 = g.readInt8(p)), (a2 = g.readInt8(p + 1)), (p += 2);
      const f2 = (o) => g.readInt16BE(o) / 16384;
      let [a, b, c, d] = [1, 0, 0, 1];
      if (flags & 8) (a = d = f2(p)), (p += 2);
      else if (flags & 0x40) (a = f2(p)), (d = f2(p + 2)), (p += 4);
      else if (flags & 0x80) (a = f2(p)), (b = f2(p + 2)), (c = f2(p + 4)), (d = f2(p + 6)), (p += 8);
      const dx = flags & 2 ? a1 : 0;
      const dy = flags & 2 ? a2 : 0;
      for (const cont of this.contours(cg, depth + 1)) {
        out.push(cont.map((pt) => ({ x: Math.round(pt.x * a + pt.y * c + dx), y: Math.round(pt.x * b + pt.y * d + dy), on: pt.on })));
      }
      more = !!(flags & 0x20);
    }
    return out;
  }

  // SVG path in font units with the y axis flipped (SVG y grows downward).
  // Emitted with relative commands to keep the files small.
  path(gid) {
    if (this.paths.has(gid)) return this.paths.get(gid);
    let d = '';
    let cx = 0;
    let cy = 0;
    const nums = (...v) => v.map((x, i) => (i && x >= 0 ? ' ' : '') + fmt(x)).join('');
    for (const c of this.contours(gid)) {
      if (c.length < 2) continue;
      const first = c.findIndex((pt) => pt.on);
      let pts;
      if (first === -1) {
        const m = { x: (c[0].x + c[1].x) / 2, y: (c[0].y + c[1].y) / 2, on: true };
        pts = [m, ...c.slice(1), c[0]];
      } else pts = [...c.slice(first), ...c.slice(0, first)];
      pts = pts.map((pt) => ({ x: pt.x, y: -pt.y, on: pt.on }));
      const sx = pts[0].x;
      const sy = pts[0].y;
      d += d ? `m${nums(sx - cx, sy - cy)}` : `M${nums(sx, sy)}`;
      [cx, cy] = [sx, sy];
      let ctrl = null;
      const lineTo = (x, y) => {
        if (y === cy) d += `h${fmt(x - cx)}`;
        else if (x === cx) d += `v${fmt(y - cy)}`;
        else d += `l${nums(x - cx, y - cy)}`;
        [cx, cy] = [x, y];
      };
      const quadTo = (qx, qy, x, y) => {
        d += `q${nums(qx - cx, qy - cy, x - cx, y - cy)}`;
        [cx, cy] = [x, y];
      };
      for (let k = 1; k <= pts.length; k++) {
        const pt = pts[k % pts.length];
        if (pt.on) {
          if (ctrl) quadTo(ctrl.x, ctrl.y, pt.x, pt.y);
          else if (k < pts.length) lineTo(pt.x, pt.y);
          ctrl = null;
        } else {
          if (ctrl) quadTo(ctrl.x, ctrl.y, (ctrl.x + pt.x) / 2, (ctrl.y + pt.y) / 2);
          ctrl = pt;
        }
      }
      d += 'z';
      [cx, cy] = [sx, sy];
    }
    this.paths.set(gid, d);
    return d;
  }

  // Lay out a string. Returns glyph ids with pen positions, in font units.
  layout(str, tracking = 0) {
    const glyphs = [];
    let x = 0;
    let prev = null;
    for (const ch of str) {
      const gid = this.gid(ch.codePointAt(0));
      if (prev !== null) x += this.kernFn(prev, gid) + tracking;
      glyphs.push({ gid, x, ch });
      x += this.advance(gid);
      prev = gid;
    }
    return { glyphs, width: x };
  }

  // Width of a string in px at the given size. `ls` is letter-spacing in em.
  measure(str, size, ls = 0) {
    return (this.layout(str, ls * this.upm).width * size) / this.upm;
  }

  // Greedy word wrap into lines no wider than maxWidth px.
  wrap(str, size, maxWidth, ls = 0) {
    const lines = [];
    for (const para of str.split('\n')) {
      let line = '';
      for (const word of para.split(/\s+/).filter(Boolean)) {
        const test = line ? `${line} ${word}` : word;
        if (line && this.measure(test, size, ls) > maxWidth) {
          lines.push(line);
          line = word;
        } else line = test;
      }
      lines.push(line);
    }
    return lines;
  }

  nameRecord(id) {
    const t = this.t.name;
    const count = t.readUInt16BE(2);
    const strOff = t.readUInt16BE(4);
    for (let i = 0; i < count; i++) {
      const o = 6 + i * 12;
      if (t.readUInt16BE(o + 6) !== id || t.readUInt16BE(o) !== 3) continue;
      const len = t.readUInt16BE(o + 8);
      const off = strOff + t.readUInt16BE(o + 10);
      return Buffer.from(t.subarray(off, off + len)).swap16().toString('utf16le');
    }
    return '';
  }
}
