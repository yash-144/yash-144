import fs from "fs";

const USER = process.env.GITHUB_ACTOR;
const TOKEN = process.env.GITHUB_TOKEN;

const CELL = 14;
const GAP = 2;
const WEEKS = 53;

const WIDTH = WEEKS * (CELL + GAP) + 200;
const HEIGHT = 7 * (CELL + GAP) + 120;

const GRID_X = 100;
const GRID_Y = 40;
const ROCKET_X = GRID_X + (WIDTH - 200) / 2;
const ROCKET_Y = HEIGHT - 40;

const COLORS = [
  "#161b22",
  "#0e4429",
  "#006d32",
  "#26a641",
  "#39d353",
];

function colorFor(count) {
  if (count === 0) return COLORS[0];
  if (count <= 2) return COLORS[1];
  if (count <= 4) return COLORS[2];
  if (count <= 7) return COLORS[3];
  return COLORS[4];
}

async function fetchContributions() {
  const query = `
  query {
    user(login: "${USER}") {
      contributionsCollection {
        contributionCalendar {
          weeks {
            contributionDays {
              contributionCount
              weekday
            }
          }
        }
      }
    }
  }`;

  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });

  const json = await res.json();
  return json.data.user.contributionsCollection.contributionCalendar.weeks;
}

const weeks = await fetchContributions();

let blocks = "";
let bullets = "";
let explosions = "";

let t = 0; // timeline cursor
const STEP = 0.25;

weeks.forEach((week, w) => {
  week.contributionDays.forEach((day, d) => {
    const count = day.contributionCount;
    if (count === 0) return;

    const x = GRID_X + w * (CELL + GAP);
    const y = GRID_Y + d * (CELL + GAP);
    const id = `cell-${w}-${d}`;

    // Commit cell
    blocks += `
      <rect id="${id}" x="${x}" y="${y}"
        width="${CELL}" height="${CELL}" rx="2"
        fill="${colorFor(count)}">
        <animate attributeName="opacity"
          begin="${t + STEP}s"
          dur="0.15s"
          from="1" to="0"
          fill="freeze"/>
      </rect>
    `;

    // Bullet (horizontal only)
    bullets += `
      <rect x="${ROCKET_X}" y="${y + CELL / 2 - 1}"
        width="10" height="2" fill="#facc15">
        <animateTransform
          attributeName="transform"
          type="translate"
          from="0 0"
          to="${x - ROCKET_X} 0"
          begin="${t}s"
          dur="${STEP}s"
          fill="freeze"/>
      </rect>
    `;

    // Explosion flash
    explosions += `
      <circle cx="${x + CELL / 2}" cy="${y + CELL / 2}" r="6"
        fill="#facc15" opacity="0">
        <animate attributeName="opacity"
          begin="${t + STEP}s"
          dur="0.15s"
          from="1" to="0"
          fill="freeze"/>
      </circle>
    `;

    t += STEP;
  });
});

const svg = `
<svg viewBox="0 0 ${WIDTH} ${HEIGHT}"
  xmlns="http://www.w3.org/2000/svg">

  <rect width="100%" height="100%" fill="#020617"/>

  ${blocks}

  <!-- Rocket -->
  <polygon points="
    ${ROCKET_X - 10},${ROCKET_Y}
    ${ROCKET_X},${ROCKET_Y - 16}
    ${ROCKET_X + 10},${ROCKET_Y}
  " fill="#38bdf8"/>

  ${bullets}
  ${explosions}

</svg>
`;

fs.mkdirSync("dist", { recursive: true });
fs.writeFileSync("dist/rocket-commits.svg", svg);

console.log("Exact commit graph destroyed 🚀");