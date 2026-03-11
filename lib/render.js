import { readFile } from 'node:fs/promises';

const PLACEHOLDER_RE = /\{\{([A-Z_]+)\}\}/g;

export function render(template, vars) {
  return template.replace(PLACEHOLDER_RE, (match, key) => {
    if (!(key in vars)) {
      throw new Error(`Missing template variable: ${key}`);
    }
    return vars[key];
  });
}

export async function renderFile(path, vars) {
  const tmpl = await readFile(path, 'utf8');
  return render(tmpl, vars);
}

export function pickTemplate(languages) {
  if (languages.includes('typescript') || languages.includes('javascript')) {
    return 'workflow-ts.yml.tmpl';
  }
  if (languages.includes('python')) {
    return 'workflow-py.yml.tmpl';
  }
  return 'workflow.yml.tmpl';
}
