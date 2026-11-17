#!/usr/bin/env node
// Live GitHub telemetry, rendered as a ferrite core-memory plane + an amber CRT.
// Runs in GitHub Actions every few hours:  GITHUB_TOKEN=… node scripts/telemetry.mjs --out dist
// Zero dependencies (Node 20+ for global fetch).

import fs from 'node:fs';
import path from 'node:path';
import { Doc, fonts, n, baseCss } from './lib/svg.mjs';
import { PHOSPHOR, CW, crt, line, lineCss } from './lib/retro.mjs';

const login = process.env.GH_USER || 'yash-144';
const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const outDir = process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : 'dist';
if (!token) throw new Error('set GITHUB_TOKEN');

const query = `query($login:String!){user(login:$login){
  createdAt followers{totalCount}
  contributionsCollection{
    totalCommitContributions totalPullRequestContributions totalPullRequestReviewContributions totalIssueContributions
    contributionCalendar{totalContributions weeks{contributionDays{date contributionCount contributionLevel weekday}}}
  }
  repositories(first:100, ownerAffiliations:OWNER, isFork:false, privacy:PUBLIC){
    totalCount nodes{stargazerCount languages(first:10, orderBy:{field:SIZE, direction:DESC}){edges{size node{name}}}}
  }
}}`;

const res = await fetch('https://api.github.com/graphql', {
  method: 'POST',
  headers: { Authorization: `bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'profile-telemetry' },
  body: JSON.stringify({ query, variables: { login } }),
});
const json = await res.json();
if (!res.ok || json.errors) throw new Error(JSON.stringify(json.errors || json));
const u = json.data.user;
const cc = u.contributionsCollection;
const weeks = cc.contributionCalendar.weeks;
const days = weeks.flatMap((w) => w.contributionDays);

// ── numbers
const counts = days.map((d) => d.contributionCount);
const avg = (k) => counts.slice(-k).reduce((a, b) => a + b, 0) / Math.min(k, counts.length);
let current = 0;
for (let i = counts.length - 1; i >= 0; i--) {
  if (counts[i] > 0) current++;
  else if (i === counts.length - 1) continue; // today isn't over yet
  else break;
}
let longest = 0;
let run = 0;
for (const c of counts) longest = Math.max(longest, (run = c > 0 ? run + 1 : 0));
const best = days.reduce((a, b) => (b.contributionCount > a.contributionCount ? b : a), days[0]);
const langs = new Map();
let stars = 0;
for (const r of u.repositories.nodes) {
  stars += r.stargazerCount;
  for (const e of r.languages.edges) langs.set(e.node.name, (langs.get(e.node.name) || 0) + e.size);
}
const totalBytes = [...langs.values()].reduce((a, b) => a + b, 0) || 1;
const sorted = [...langs.entries()].sort((a, b) => b[1] - a[1]);
const top = sorted.slice(0, 6);
const rest = sorted.slice(6).reduce((a, [, v]) => a + v, 0);
if (rest) top.push(['(other)', rest]);
const now = new Date();
const uptimeDays = Math.floor((now - new Date(u.createdAt)) / 864e5);
const fmtN = (v) => v.toLocaleString('en-US');
const human = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)}M` : b >= 1024 ? `${Math.round(b / 1024)}K` : `${b}B`);

// ── render
const total = cc.contributionCalendar.totalContributions;
const d = new Doc(1280, 930, { title: `${fmtN(total)} contributions in the last year. Current streak ${current} days, longest ${longest} days. Top languages: ${top.map(([l]) => l).join(', ')}.` });
d.css(baseCss, lineCss, `
.core{animation:core .35s ease-out both}@keyframes core{from{opacity:0}to{opacity:1}}
.sweep{animation:sweep 6s linear 2.5s infinite}@keyframes sweep{from{transform:translateX(0)}to{transform:translateX(1180px)}}
`);

// core memory plane
const BX = 20;
const BY = 18;
const BW = 1240;
const BH = 318;
const silk = '#D9CFB6';
d.def(
  `<linearGradient id="pcb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1C1912"/><stop offset="1" stop-color="#11100B"/></linearGradient>`,
  `<linearGradient id="sw" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FFB547" stop-opacity="0"/><stop offset=".5" stop-color="#FFB547" stop-opacity=".22"/><stop offset="1" stop-color="#FFB547" stop-opacity="0"/></linearGradient>`,
  `<filter id="hot" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`,
  `<clipPath id="plane"><rect x="${BX + 40}" y="${BY + 70}" width="${BW - 80}" height="200"/></clipPath>`,
);
d.add(
  `<rect x="${BX + 2}" y="${BY + 8}" width="${BW}" height="${BH}" rx="12" fill="#000" opacity=".28"/>`,
  `<rect x="${BX}" y="${BY}" width="${BW}" height="${BH}" rx="12" fill="url(#pcb)" stroke="#4A3B22" stroke-width="2"/>`,
  `<rect x="${BX + 10}" y="${BY + 10}" width="${BW - 20}" height="${BH - 20}" rx="8" fill="none" stroke="#B87333" stroke-opacity=".55" stroke-width="1.5"/>`,
);
for (let k = 0; k < 60; k++) d.add(`<circle cx="${n(BX + 30 + k * 20)}" cy="${BY + 22}" r="2.6" fill="#C9A15B" opacity=".75"/><circle cx="${n(BX + 30 + k * 20)}" cy="${BY + BH - 22}" r="2.6" fill="#C9A15B" opacity=".75"/>`);
d.add(
  d.text(`CORE PLANE · 53 x 7 · 1 WORD / DAY · ${fmtN(total)} CONTRIBUTIONS, LAST 365 DAYS`, { x: BX + 32, y: BY + 50, size: 12.5, font: fonts.monoSemi, fill: silk, ls: 0.08 }),
  d.text('YG-CM2026  REV B', { x: BX + BW - 32, y: BY + 50, size: 12.5, font: fonts.monoSemi, fill: silk, anchor: 'end', ls: 0.08 }),
);
const pitchX = 21.4;
const pitchY = 24;
const gx = BX + (BW - (weeks.length - 1) * pitchX) / 2 + 14;
const gy = BY + 104;
for (let r = 0; r < 7; r++) d.add(`<line x1="${n(gx - 20)}" y1="${gy + r * pitchY}" x2="${n(gx + (weeks.length - 1) * pitchX + 14)}" y2="${gy + r * pitchY}" stroke="#B87333" stroke-opacity=".45" stroke-width=".9"/>`);
weeks.forEach((w, c) => d.add(`<line x1="${n(gx + c * pitchX)}" y1="${gy - 16}" x2="${n(gx + c * pitchX)}" y2="${gy + 6 * pitchY + 16}" stroke="#B87333" stroke-opacity=".45" stroke-width=".9"/>`));
['MON', 'WED', 'FRI'].forEach((t, i) => d.add(d.text(t, { x: gx - 26, y: gy + (1 + i * 2) * pitchY + 4, size: 10, font: fonts.monoSemi, fill: silk, anchor: 'end', opacity: 0.7 })));
let lastMonth = -1;
weeks.forEach((w, c) => {
  const m = new Date(`${w.contributionDays[0].date}T00:00:00Z`).getUTCMonth();
  if (m !== lastMonth && c < weeks.length - 2) {
    d.add(d.text(['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][m], { x: gx + c * pitchX - 6, y: gy - 22, size: 10, font: fonts.monoSemi, fill: silk, opacity: 0.7 }));
    lastMonth = m;
  }
});
const LEVEL = { NONE: 0, FIRST_QUARTILE: 1, SECOND_QUARTILE: 2, THIRD_QUARTILE: 3, FOURTH_QUARTILE: 4 };
const tone = ['#4A4132', '#8A5D26', '#C88833', '#F5AA45', '#FFE0A0'];
const cores = [];
weeks.forEach((w, c) => {
  for (const day of w.contributionDays) {
    const r = day.weekday;
    const lv = LEVEL[day.contributionLevel] ?? 0;
    const cx = gx + c * pitchX;
    const cy = gy + r * pitchY;
    const rot = (c + r) % 2 ? 45 : -45;
    cores.push(`<ellipse class="core" style="animation-delay:${n(0.2 + c * 0.03)}s" cx="${n(cx)}" cy="${cy}" rx="7" ry="3.6" transform="rotate(${rot} ${n(cx)} ${cy})" stroke="${tone[lv]}" stroke-width="${lv ? 2.8 : 2.2}"${lv >= 3 ? ' filter="url(#hot)"' : ''}/>`);
  }
});
d.add(cores.join(''));
d.add(`<g clip-path="url(#plane)"><rect class="sweep" x="${BX - 60}" y="${BY + 70}" width="120" height="200" fill="url(#sw)"/></g>`);
d.add(d.text('0 = CLEAR · 1 = MAGNETIZED · BRIGHTNESS = DAILY CONTRIBUTION QUARTILE', { x: BX + 32, y: BY + BH - 38, size: 10.5, font: fonts.mono, fill: silk, opacity: 0.6, ls: 0.06 }));
tone.forEach((t, i) => d.add(`<ellipse cx="${BX + BW - 150 + i * 24}" cy="${BY + BH - 42}" rx="7" ry="3.6" transform="rotate(-45 ${BX + BW - 150 + i * 24} ${BY + BH - 42})" stroke="${t}" stroke-width="2.6"/>`));

// the terminal
const p = PHOSPHOR.amber;
const t = crt(d, { x: 20, y: 356, w: 1240, h: 560, p, label: 'YG-100 · AMBER P3' });
d.add(t.before);
const hhmm = now.toISOString().slice(11, 16);
const pad = (s, w) => String(s).padEnd(w);
const lines = [
  '{hot:yash@pdp-11}:{dim:~}$ uptime',
  ` ${hhmm}  up ${fmtN(uptimeDays)} days,  1 user,  load averages: {hot!:${avg(7).toFixed(2)} ${avg(30).toFixed(2)} ${avg(365).toFixed(2)}}   {dim:# contributions/day, 7d 30d 365d}`,
  '{hot:yash@pdp-11}:{dim:~}$ cat /proc/yash/stat',
  `contributions  {hot!:${pad(fmtN(total), 12)}} commits  {hot!:${pad(fmtN(cc.totalCommitContributions), 8)}} pull requests  {hot!:${pad(cc.totalPullRequestContributions, 6)}} reviews {hot!:${cc.totalPullRequestReviewContributions}}`,
  `streak         {hot!:${pad(`${current} days`, 12)}} longest  {hot!:${pad(`${longest} days`, 8)}} best day       {hot!:${best.contributionCount}} {dim:(${best.date})}`,
  `public repos   {hot!:${pad(u.repositories.totalCount, 12)}} stars    {hot!:${pad(stars, 8)}} followers      {hot!:${u.followers.totalCount}}`,
  '{hot:yash@pdp-11}:{dim:~}$ du -sh ~/src/* | sort -rh        {dim:# public code, by language}',
];
const size = 15.5;
const lh = 30;
const x0 = t.sx + 28;
lines.forEach((s, k) => d.add(`<g class="ln" style="animation-delay:${n(0.4 + k * 0.12)}s">${line(d, s, { x: x0, y: t.sy + 44 + k * lh, size, colors: p })}</g>`));
const barX = x0 + 26 * CW * size;
const barW = 560;
top.forEach(([name, bytes], k) => {
  const y = t.sy + 44 + (lines.length + k) * lh;
  const share = bytes / totalBytes;
  const s = `${human(bytes).padStart(6)}  ${name.toLowerCase().slice(0, 15)}`;
  d.add(
    `<g class="ln" style="animation-delay:${n(0.4 + (lines.length + k) * 0.12)}s">`,
    line(d, s, { x: x0, y, size, colors: p }),
    `<rect x="${n(barX)}" y="${y - 12}" width="${barW}" height="13" fill="${p.faint}" opacity=".55"/>`,
    `<rect x="${n(barX)}" y="${y - 12}" width="${n(Math.max(3, barW * share))}" height="13" fill="${k === 0 ? p.hot : p.main}"/>`,
    line(d, `${(share * 100).toFixed(1).padStart(5)}%`, { x: barX + barW + 18, y, size, colors: p }),
    '</g>',
  );
});
const endY = t.sy + 44 + (lines.length + top.length) * lh;
const stamp = now.toUTCString().replace('GMT', 'UTC');
d.add(`<g class="ln" style="animation-delay:${n(0.4 + (lines.length + top.length) * 0.12)}s">${line(d, `{hot:yash@pdp-11}:{dim:~}$ date -u   {dim:# ${stamp} -- regenerated by .github/workflows/core-dump.yml}`, { x: x0, y: endY, size, colors: p })}</g>`);
d.add(`<rect class="cur" x="${n(x0)}" y="${endY + lh - 14}" width="${n(CW * size)}" height="18" fill="${p.main}"/>`);
d.add(t.after);

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'core-dump.svg'), d.render());
console.log(`core-dump.svg  total=${total} streak=${current}/${longest} langs=${top.map(([l]) => l).join(',')}`);
