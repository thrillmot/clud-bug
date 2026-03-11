import { mkdir, writeFile, readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const API_BASE = 'https://skills.sh/api/v1';
const MAX_SKILLS = 8;

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
    const slug = sanitizeSlug(skill.name);
    const skillDir = join(targetDir, slug);
    await mkdir(skillDir, { recursive: true });
    const content = skill.content ?? await client.getContent(skill.source, skill.name);
    await writeFile(join(skillDir, 'SKILL.md'), content);
    written.push({ slug, source: skill.source, kind: skill.kind || 'remote' });
  }
  return written;
}

function sanitizeSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
}

export const _internal = { normalizeList, sanitizeSlug, MAX_SKILLS, API_BASE };
