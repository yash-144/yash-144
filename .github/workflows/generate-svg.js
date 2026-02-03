import fs from "fs";

const WIDTH = 900;
const HEIGHT = 260;
const BLOCK = 14;
const SHIP_Y = HEIGHT - 30;
const CENTER_X = WIDTH / 2;

const weeks = 26; // left + right
const maxPerDay = 5;

function starField(count) {
  return Array.from({ length: count }).map(() => {
    const x = Math.random() * WIDTH;
    const y = Math.random() * HEIGHT;
    const r = Math.random() * 1.2;
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="white" opacity="0.6"/>`;
  }).join("");
}

function commitBlocks() {
  let blocks = "";
  let id = 0;

  for (let w = -weeks; w <= weeks; w++) {
    for (let d = 0; d < 7; d++) {
      const count = Math.floor(Math.random() * maxPerDay);
      for (let c = 0; c < count; c++) {
        const x = CENTER_X + w * (BLOCK + 2);
        const y = 40 + d * (BLOCK + 2);

        blocks += `
        <rect id="b${id}" x="${x}" y="${y}" width="${BLOCK}" height="${BLOCK}"
          rx="2" fill="#22c55e">
          <animate attributeName="opacity"
            begin="${id * 0.12}s"
            dur="0.2s"
            from="1"
            to="0"
            fill="freeze"/>
        </rect>`;
        id++;
      }
    }
  }
  return blocks;
}

function bullets(direction) {
  const dx = direction === "left" ? -WIDTH : WIDTH;
  return `
  <rect x="${CENTER_X - 1}" y="${SHIP_Y - 10}" width="2" height="10" fill="#facc15">
    <animateTransform attributeName="transform"
      type="translate"
      from="0 0"
      to="${dx} -160"
      dur="2s"
      repeatCount="indefinite"/>
  </rect>`;
}

const svg = `
<svg viewBox="0 0 ${WIDTH} ${HEIGHT}"
     width="${WIDTH}" height="${HEIGHT}"
     xmlns="http://www.w3.org/2000/svg">

  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#020617"/>
      <stop offset="100%" stop-color="#000000"/>
    </linearGradient>
  </defs>

  <rect width="100%" height="100%" fill="url(#bg)"/>
  ${starField(120)}

  ${commitBlocks()}

  <!-- Ship -->
  <polygon points="
    ${CENTER_X - 8},${SHIP_Y}
    ${CENTER_X},${SHIP_Y - 14}
    ${CENTER_X + 8},${SHIP_Y}
  " fill="#38bdf8"/>

  <!-- Bullets -->
  ${bullets("left")}
  ${bullets("right")}

</svg>
`;

fs.mkdirSync("dist", { recursive: true });
fs.writeFileSync("dist/rocket-commits.svg", svg);

console.log("SVG generated");
