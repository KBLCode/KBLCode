// === Daily self-updating profile assets. Renders metrics.svg + greppy.svg from
// === LIVE public GitHub data. No deps. Fails loud — never writes a partial SVG.
import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const USER = "KBLCode";
const SHOWCASE = "greppy";
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
  const show = pub.find((r) => r.name.toLowerCase() === SHOWCASE.toLowerCase()) ?? null;
  return {
    followers: user.followers ?? 0,
    publicRepos: pub.length,
    stars,
    coreLangs: langs.length,
    showcase: show && {
      name: show.name,
      stars: show.stargazers_count ?? 0,
      desc: show.description ?? "",
      license: show.license?.spdx_id ?? "—",
      topics: (show.topics ?? []).slice(0, 3).join(" · "),
    },
  };
}

const esc = (s) => String(s).replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c]);

function metricsSvg(d) {
  const col = (x, n, label, accent = false) => `
    <text x="${x}" y="66" font-size="44" font-weight="700" fill="${accent ? "#e0905a" : "#fafafa"}">${n}</text>
    <text x="${x}" y="90" font-size="12" letter-spacing="2" fill="#6a6f75">${label}</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="120" viewBox="0 0 1200 120" fill="none" role="img" aria-label="Metrics">
  <defs><linearGradient id="mbg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d0d11"/><stop offset="1" stop-color="#090909"/></linearGradient></defs>
  <rect width="1200" height="120" rx="14" fill="url(#mbg)"/>
  <rect x="0.5" y="0.5" width="1199" height="119" rx="13.5" fill="none" stroke="#ffffff" stroke-opacity="0.06"/>
  <g font-family="ui-monospace,SFMono-Regular,Menlo,monospace" style="font-variant-numeric:tabular-nums">${col(80, d.stars, "STARS EARNED")}${col(360, d.publicRepos, "PUBLIC REPOS")}${col(600, d.followers, "FOLLOWERS")}${col(840, d.coreLangs, "CORE LANGUAGES", true)}</g>
  <g stroke="#ffffff" stroke-opacity="0.07"><line x1="320" y1="36" x2="320" y2="84"/><line x1="560" y1="36" x2="560" y2="84"/><line x1="800" y1="36" x2="800" y2="84"/></g>
  <text x="1120" y="56" text-anchor="end" font-family="ui-sans-serif,system-ui,sans-serif" font-size="14" fill="#7d8288">building in the open</text>
  <text x="1120" y="78" text-anchor="end" font-family="ui-monospace,Menlo,monospace" font-size="12" fill="#5a5f66">united kingdom</text>
</svg>
`;
}

function greppySvg(s) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="200" viewBox="0 0 1200 200" fill="none" role="img" aria-label="${esc(s.name)} — ${esc(s.desc)}">
  <defs>
    <linearGradient id="gbg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0e0d11"/><stop offset="1" stop-color="#090909"/></linearGradient>
    <radialGradient id="gglow" cx="100%" cy="0%" r="70%"><stop offset="0" stop-color="#e0905a" stop-opacity="0.12"/><stop offset="0.6" stop-color="#e0905a" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="1200" height="200" rx="14" fill="url(#gbg)"/>
  <rect width="1200" height="200" rx="14" fill="url(#gglow)"/>
  <rect x="0.5" y="0.5" width="1199" height="199" rx="13.5" fill="none" stroke="#ffffff" stroke-opacity="0.06"/>
  <rect x="0" y="0" width="3" height="200" rx="1.5" fill="#e0905a"/>
  <g font-family="ui-monospace,SFMono-Regular,Menlo,monospace">
    <text x="40" y="58" font-size="13" fill="#6a4f3c" letter-spacing="2">PUBLIC · RUST · ${esc(s.license).toUpperCase()}</text>
    <text x="40" y="98" font-family="ui-sans-serif,system-ui,sans-serif" font-size="32" font-weight="700" letter-spacing="-1" fill="#fafafa">${esc(s.name)}</text>
  </g>
  <text x="40" y="134" font-family="ui-sans-serif,system-ui,sans-serif" font-size="16" fill="#aeb4ba">Sub-millisecond local semantic code search for AI coding tools.</text>
  <text x="40" y="160" font-family="ui-sans-serif,system-ui,sans-serif" font-size="16" fill="#7d8288">Single binary · daemon architecture · instant results.</text>
  <g font-family="ui-monospace,SFMono-Regular,Menlo,monospace" text-anchor="end">
    <text x="1160" y="70" font-size="40" font-weight="700" fill="#e0905a" style="font-variant-numeric:tabular-nums">${s.stars}</text>
    <text x="1160" y="92" font-size="12" letter-spacing="2" fill="#6a6f75">STARS</text>
  </g>
  <g font-family="ui-monospace,SFMono-Regular,Menlo,monospace" text-anchor="end" fill="#7d8288" font-size="13">
    <text x="1160" y="140">${esc(s.topics)}</text>
    <text x="1160" y="162">github.com/${USER}/${esc(s.name)} →</text>
  </g>
</svg>
`;
}

async function main() {
  const d = await collect();
  if (d.publicRepos === 0) throw new Error("0 public repos returned — refusing to write empty metrics");
  await mkdir(ASSETS, { recursive: true });
  const writes = [writeFile(join(ASSETS, "metrics.svg"), metricsSvg(d))];
  if (d.showcase) writes.push(writeFile(join(ASSETS, "greppy.svg"), greppySvg(d.showcase)));
  await Promise.all(writes);
  console.log(`generated · stars=${d.stars} repos=${d.publicRepos} followers=${d.followers} langs=${d.coreLangs}`);
}

main().catch((err) => {
  console.error("generate failed:", err.message);
  process.exit(1);
});
