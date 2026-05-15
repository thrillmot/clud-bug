import { mkdir, writeFile, readdir, readFile, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';

const API_BASE = 'https://skills.sh/api/v1';
const MAX_SKILLS = 8;
const MANIFEST_FILE = '.clud-bug.json';
const MANIFEST_VERSION = 1;

export class SkillsClient {
  constructor({ fetch = globalThis.fetch, base = API_BASE, userAgent = 'clud-bug' } = {}) {
    this.fetch = fetch;
    this.base = base;
    this.userAgent = userAgent;
  }

  async #json(path) {
    const res = await this.fetch(`${this.base}${path}`, {
      headers: { 'User-Agent': this.userAgent, accept: 'application/json' },
    });
    if (!res.ok) {
      throw new Error(`skills.sh ${path} → ${res.status}`);
    }
    return res.json();
  }

  async search(terms) {
    const q = terms.filter(Boolean).join(' ').trim();
    if (!q) return [];
    const data = await this.#json(`/skills/search?q=${encodeURIComponent(q)}`);
    return normalizeList(data);
  }

  async curated() {
    const data = await this.#json('/skills/curated');
    return normalizeList(data);
  }

  async getContent(source, name) {
    const data = await this.#json(`/skills/${encodeURIComponent(source)}/${encodeURIComponent(name)}`);
    // The API may return content as `body`, `content`, or under `files[0].content`.
    // Try the documented shapes in order; fail loudly if none match so we know
    // the API contract changed.
    if (typeof data?.content === 'string') return data.content;
    if (typeof data?.body === 'string') return data.body;
    if (typeof data?.files?.[0]?.content === 'string') return data.files[0].content;
    throw new Error(`skills.sh response for ${source}/${name} had no content field`);
  }
}

function normalizeList(data) {
  // Tolerate either { skills: [...] } or a bare array.
  const list = Array.isArray(data) ? data : (data?.skills || data?.results || []);
  return list.map(item => ({
    source: item.source || item.repo || '',
    name: item.name || item.slug || '',
    description: item.description || item.summary || '',
    installs: item.installs || item.installCount || 0,
  })).filter(s => s.source && s.name);
}

// Deduplicates by source/name and caps at MAX_SKILLS, preferring curated then by install count.
export function rankAndCap(curated, searched, baseline, cap = MAX_SKILLS) {
  const seen = new Set(baseline.map(b => `local:${b.name}`));
  const out = [...baseline];
  const remaining = cap - baseline.length;
  if (remaining <= 0) return out.slice(0, cap);

  const curatedSorted = [...curated].sort((a, b) => b.installs - a.installs);
  const searchedSorted = [...searched].sort((a, b) => b.installs - a.installs);

  for (const skill of [...curatedSorted, ...searchedSorted]) {
    if (out.length >= cap) break;
    const key = `${skill.source}/${skill.name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ ...skill, kind: skill.kind || 'remote' });
  }
  return out;
}

export async function loadBaseline(baselineDir) {
  const skills = [];
  let entries;
  try {
    entries = await readdir(baselineDir, { withFileTypes: true });
  } catch {
    return skills;
  }
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
    const content = await readFile(join(baselineDir, entry.name), 'utf8');
    skills.push({
      source: 'clud-bug-baseline',
      name: entry.name.replace(/\.md$/, ''),
      description: '(bundled baseline)',
      installs: 0,
      kind: 'baseline',
      content,
    });
  }
  return skills;
}

export async function writeSkills(targetDir, skills, client) {
  await mkdir(targetDir, { recursive: true });
  const written = [];
  for (const skill of skills) {
    const entry = await writeSkill(targetDir, skill, client);
    written.push(entry);
  }
  await writeManifest(targetDir, mergeManifest(await readManifest(targetDir), written));
  return written;
}

export async function writeSkill(targetDir, skill, client) {
  await mkdir(targetDir, { recursive: true });
  const slug = sanitizeSlug(skill.name);
  const skillDir = join(targetDir, slug);
  await mkdir(skillDir, { recursive: true });
  const content = skill.content ?? await client.getContent(skill.source, skill.name);
  await writeFile(join(skillDir, 'SKILL.md'), content);
  return {
    slug,
    name: skill.name,
    source: skill.source,
    kind: skill.kind || 'remote',
    description: skill.description || '',
  };
}

export async function readManifest(targetDir) {
  try {
    const text = await readFile(join(targetDir, MANIFEST_FILE), 'utf8');
    const data = JSON.parse(text);
    return {
      version: data.version || MANIFEST_VERSION,
      installed: Array.isArray(data.installed) ? data.installed : [],
    };
  } catch {
    return { version: MANIFEST_VERSION, installed: [] };
  }
}

export async function writeManifest(targetDir, manifest) {
  await mkdir(targetDir, { recursive: true });
  const out = {
    version: manifest.version || MANIFEST_VERSION,
    installed: manifest.installed || [],
  };
  await writeFile(join(targetDir, MANIFEST_FILE), JSON.stringify(out, null, 2) + '\n');
}

export function mergeManifest(existing, newEntries) {
  const byKey = new Map();
  for (const entry of existing.installed || []) {
    byKey.set(entryKey(entry), entry);
  }
  for (const entry of newEntries) {
    byKey.set(entryKey(entry), entry);
  }
  return { version: MANIFEST_VERSION, installed: [...byKey.values()] };
}

function entryKey(entry) {
  // Baseline skills have no source; key by slug. Remote skills key by source/name.
  return entry.kind === 'baseline' ? `baseline:${entry.slug}` : `${entry.source}/${entry.name || entry.slug}`;
}

export async function removeSkill(targetDir, slug) {
  const manifest = await readManifest(targetDir);
  const entry = manifest.installed.find(e => e.slug === slug);
  if (!entry) {
    throw new Error(`'${slug}' is not in the clud-bug manifest. If it's a custom skill, delete it manually with: rm -rf .claude/skills/${slug}`);
  }
  await rm(join(targetDir, slug), { recursive: true, force: true });
  manifest.installed = manifest.installed.filter(e => e.slug !== slug);
  await writeManifest(targetDir, manifest);
  return entry;
}

export async function listInstalled(targetDir) {
  const manifest = await readManifest(targetDir);
  const managedSlugs = new Set(manifest.installed.map(e => e.slug));
  const groups = { baseline: [], remote: [], custom: [] };
  for (const entry of manifest.installed) {
    (groups[entry.kind === 'baseline' ? 'baseline' : 'remote']).push(entry);
  }

  let entries;
  try {
    entries = await readdir(targetDir, { withFileTypes: true });
  } catch {
    return groups;
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (managedSlugs.has(entry.name)) continue;
    const skillFile = join(targetDir, entry.name, 'SKILL.md');
    let description = '';
    try {
      const text = await readFile(skillFile, 'utf8');
      const m = text.match(/^description:\s*(.+)$/m);
      description = m?.[1]?.trim() || '';
    } catch {
      continue; // not a skill dir
    }
    groups.custom.push({ slug: entry.name, kind: 'custom', description });
  }
  return groups;
}

// Diff a current manifest against a freshly-recommended skill set.
// Returns { add: [], remove: [], unchanged: [] }. Custom skills are never affected.
export function diffManifest(manifest, recommended) {
  const recByKey = new Map(recommended.map(s => [
    s.kind === 'baseline' ? `baseline:${sanitizeSlug(s.name)}` : `${s.source}/${s.name}`,
    s,
  ]));
  const installedByKey = new Map(manifest.installed.map(e => [entryKey(e), e]));

  const add = [];
  const remove = [];
  const unchanged = [];

  for (const [key, skill] of recByKey) {
    if (installedByKey.has(key)) {
      unchanged.push(skill);
    } else {
      add.push(skill);
    }
  }
  for (const [key, entry] of installedByKey) {
    if (entry.kind === 'baseline') continue; // baseline always stays
    if (!recByKey.has(key)) remove.push(entry);
  }
  return { add, remove, unchanged };
}

function sanitizeSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
}

export const _internal = { normalizeList, sanitizeSlug, entryKey, MAX_SKILLS, API_BASE, MANIFEST_FILE };
