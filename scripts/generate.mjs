// === Daily self-updating profile asset. Renders ONE composed hero.svg from
// === LIVE public GitHub data — wordmark + four stat numbers, animated.
// === No deps. Fails loud — never writes a partial or empty SVG.
import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const USER = "KBLCode";
const API = "https://api.github.com";
const ASSETS = join(dirname(fileURLToPath(import.meta.url)), "..", "assets");

// === fetch — timed out, authed if token present, throws on any non-200 ===
async function gh(path) {
  const headers = { "User-Agent": USER, Accept: "application/vnd.github+json" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const res = await fetch(`${API}${path}`, { headers, signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`GitHub ${res.status} on ${path}`);
  return res.json();
}

// === pull only PUBLIC, non-fork numbers — the firewall against leaking private repos ===
async function collect() {
  const user = await gh(`/users/${USER}`);
  const repos = [];
  for (let page = 1; page <= 5; page++) {
    const batch = await gh(`/users/${USER}/repos?per_page=100&page=${page}&type=owner`);
    repos.push(...batch);
    if (batch.length < 100) break;
  }
  const pub = repos.filter((r) => !r.private && !r.fork);
  const stars = pub.reduce((sum, r) => sum + (r.stargazers_count ?? 0), 0);
  const langs = [...new Set(pub.map((r) => r.language).filter(Boolean))];
  return {
    followers: user.followers ?? 0,
    publicRepos: pub.length,
    stars,
    coreLangs: langs.length,
  };
}

// === the four stat columns. Fixed left-aligned x per column handles ANY small
// === integer cleanly — single-digit and multi-digit numbers never collide. ===
const COLS = [
  { x: 84, lx: 86, key: "stars", label: "STARS EARNED", accent: false },
  { x: 370, lx: 372, key: "publicRepos", label: "PUBLIC REPOS", accent: false },
  { x: 640, lx: 642, key: "followers", label: "FOLLOWERS", accent: false },
  { x: 910, lx: 912, key: "coreLangs", label: "CORE LANGUAGES", accent: true },
];

function heroSvg(d) {
  const n = (k) => String(d[k] ?? 0);
  const aria = `KBLCode — ${d.stars} stars earned, ${d.publicRepos} public repos, ${d.followers} followers, ${d.coreLangs} core languages`;
  const desc = `${d.stars} stars earned · ${d.publicRepos} public repos · ${d.followers} followers · ${d.coreLangs} core languages`;
  // SMIL-only motion. Numbers are visible by default — GitHub strips <style>, so we
  // must NEVER gate visibility on CSS. <animate> survives the README sanitizer.
  const stats = COLS.map((c, i) => {
    const begin = (0.25 + i * 0.15).toFixed(2);
    const fill = c.accent ? "#e0905a" : "#fafafa";
    const lfill = c.accent ? "#9a6a48" : "#6a6f75";
    return `      <g>
        <text x="${c.x}" y="284" font-size="100" font-weight="700" fill="${fill}">${n(c.key)}</text>
        <animate attributeName="opacity" from="0" to="1" dur="0.6s" begin="${begin}s" fill="freeze"/>
      </g>
      <text x="${c.lx}" y="314" font-size="12" letter-spacing="2.5" fill="${lfill}">${c.label}</text>`;
  }).join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="360" viewBox="0 0 1200 360" fill="none" role="img" aria-label="${aria}">
  <title>KBLCode</title>
  <desc>${desc}</desc>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.35" y2="1">
      <stop offset="0" stop-color="#0c0c10"/>
      <stop offset="1" stop-color="#070708"/>
    </linearGradient>
    <radialGradient id="emberA" cx="9%" cy="-8%" r="58%">
      <stop offset="0" stop-color="#e0905a" stop-opacity="0.20"/>
      <stop offset="0.6" stop-color="#e0905a" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="emberB" cx="98%" cy="118%" r="62%">
      <stop offset="0" stop-color="#b9764a" stop-opacity="0.15"/>
      <stop offset="0.62" stop-color="#b9764a" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="rule" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#e0905a"/>
      <stop offset="0.55" stop-color="#e0905a" stop-opacity="0.35"/>
      <stop offset="1" stop-color="#e0905a" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="shimmer" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#fafafa" stop-opacity="0"/>
      <stop offset="0.5" stop-color="#fafafa" stop-opacity="0.5"/>
      <stop offset="1" stop-color="#fafafa" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="travel" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#e0905a" stop-opacity="0"/>
      <stop offset="0.5" stop-color="#e0905a" stop-opacity="0.9"/>
      <stop offset="1" stop-color="#e0905a" stop-opacity="0"/>
    </linearGradient>
    <mask id="wordmask">
      <rect width="1200" height="360" fill="#000"/>
      <text x="80" y="142" font-family="ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif" font-size="72" font-weight="600" letter-spacing="-3" fill="#fff">KBLCode</text>
    </mask>
    <clipPath id="card"><rect width="1200" height="360" rx="18"/></clipPath>
  </defs>

  <g clip-path="url(#card)">
    <rect width="1200" height="360" fill="url(#bg)"/>
    <rect width="1200" height="360" fill="url(#emberA)"/>
    <rect width="1200" height="360" fill="url(#emberB)"/>

    <g stroke="#ffffff" stroke-opacity="0.022">
      <line x1="0" y1="80" x2="1200" y2="80"/>
      <line x1="0" y1="160" x2="1200" y2="160"/>
      <line x1="0" y1="240" x2="1200" y2="240"/>
      <line x1="400" y1="0" x2="400" y2="360"/>
      <line x1="800" y1="0" x2="800" y2="360"/>
    </g>

    <g fill="#e0905a">
      <circle cx="150" cy="320" r="1.6" opacity="0.7">
        <animate attributeName="cy" values="320;40" dur="9s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0;0.8;0" dur="9s" repeatCount="indefinite"/>
      </circle>
      <circle cx="320" cy="300" r="1.2" opacity="0.6">
        <animate attributeName="cy" values="300;30" dur="11s" begin="2s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0;0.7;0" dur="11s" begin="2s" repeatCount="indefinite"/>
      </circle>
      <circle cx="540" cy="330" r="1.8" opacity="0.5">
        <animate attributeName="cy" values="330;50" dur="10s" begin="1s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0;0.6;0" dur="10s" begin="1s" repeatCount="indefinite"/>
      </circle>
      <circle cx="980" cy="310" r="1.4" opacity="0.6">
        <animate attributeName="cy" values="310;60" dur="12s" begin="3s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0;0.7;0" dur="12s" begin="3s" repeatCount="indefinite"/>
      </circle>
      <circle cx="1120" cy="340" r="1.2" opacity="0.5">
        <animate attributeName="cy" values="340;90" dur="13s" begin="1.5s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0;0.6;0" dur="13s" begin="1.5s" repeatCount="indefinite"/>
      </circle>
    </g>

    <rect x="0.75" y="0.75" width="1198.5" height="358.5" rx="17.25" fill="none" stroke="#ffffff" stroke-opacity="0.06"/>
    <rect x="0" y="0" width="3" height="360" fill="#e0905a" opacity="0.9"/>

    <g font-family="ui-monospace,SFMono-Regular,Menlo,Consolas,monospace">
      <circle cx="84" cy="74" r="3.4" fill="#e0905a">
        <animate attributeName="r" values="3.4;4.8;3.4" dur="2.4s" repeatCount="indefinite"/>
        <animate attributeName="fill-opacity" values="1;0.5;1" dur="2.4s" repeatCount="indefinite"/>
      </circle>
      <text x="100" y="79" font-size="12" letter-spacing="3" fill="#7d8288">SOFTWARE ENGINEER</text>
      <text x="1120" y="79" text-anchor="end" font-size="12" letter-spacing="2" fill="#4f545b">LIVE · github.com/KBLCode</text>
    </g>

    <text x="80" y="142" font-family="ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif" font-size="72" font-weight="600" letter-spacing="-3" fill="#b9bcc0">KBLCode</text>

    <g mask="url(#wordmask)">
      <rect x="-420" y="0" width="320" height="360" fill="url(#shimmer)">
        <animate attributeName="x" values="-420;1300" dur="5.5s" begin="1.2s" repeatCount="indefinite"/>
      </rect>
    </g>

    <rect x="84" y="178" width="1032" height="1.5" fill="url(#rule)" opacity="0.5"/>
    <rect x="84" y="177" width="160" height="2.5" rx="1.25" fill="url(#travel)">
      <animate attributeName="x" values="84;956;84" dur="7s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.5;1" keySplines="0.16 1 0.3 1;0.16 1 0.3 1"/>
    </rect>

    <!-- stat zone backing — reads as the single focal mass when squinted -->
    <rect x="64" y="198" width="1072" height="128" rx="14" fill="#101015" fill-opacity="0.85"/>
    <rect x="64.5" y="198.5" width="1071" height="127" rx="13.5" fill="none" stroke="#e0905a" stroke-opacity="0.10"/>

    <g font-family="ui-monospace,SFMono-Regular,Menlo,Consolas,monospace" style="font-variant-numeric:tabular-nums">
${stats}
    </g>

    <g stroke="#ffffff" stroke-opacity="0.08" stroke-linecap="round">
      <line x1="320" y1="226" x2="320" y2="300"/>
      <line x1="590" y1="226" x2="590" y2="300"/>
      <line x1="860" y1="226" x2="860" y2="300"/>
    </g>
  </g>
</svg>
`;
}

async function main() {
  const d = await collect();
  if (d.publicRepos === 0) throw new Error("0 public repos returned — refusing to write empty hero");
  await mkdir(ASSETS, { recursive: true });
  await writeFile(join(ASSETS, "hero.svg"), heroSvg(d));
  console.log(`generated · stars=${d.stars} repos=${d.publicRepos} followers=${d.followers} langs=${d.coreLangs}`);
}

main().catch((err) => {
  console.error("generate failed:", err.message);
  process.exit(1);
});
