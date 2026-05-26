#!/usr/bin/env node
/**
 * Content linter for the per-deployment overlay tree under `content/`.
 *
 * What it checks:
 *  1. Frontmatter parses cleanly under the same forgiving rules as
 *     `src/lib/content.js`. Anything the loader would silently drop is
 *     surfaced here as an error.
 *  2. Required frontmatter fields are present per slot (home, faqs,
 *     footer, voter-directory, errors), with the right primitive types.
 *  3. Body is non-empty for slots whose components render markdown.
 *  4. FAQ filenames match the convention `NNN-slug.md` and the leading
 *     number matches the `order` frontmatter field (so ordering on
 *     disk and in the UI can never disagree).
 *  5. Unknown slot slugs (e.g. `home/foo.md`) are flagged — the home,
 *     footer, voter-directory, and errors slots have a fixed set of
 *     slugs the components actually render. FAQs are open-ended.
 *  6. `theme.json` overrides at `content/<deployment>/theme.json` only
 *     use known keys, with HSL triplets / valid radius / non-empty
 *     font-family strings.
 *
 * Reference documentation lives alongside the tree: `content/README.md`
 * (overlay + theming guide) and `content/_default/theme.sample.json`
 * (copy-pasteable example). Both are recognized here as docs files and
 * skipped — they are not loaded at runtime.
 *
 * Run via `npm run lint:content`. Exits 1 on any error, 0 otherwise.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = join(ROOT, 'content');

const c = {
	red: (s) => `\x1b[31m${s}\x1b[0m`,
	yellow: (s) => `\x1b[33m${s}\x1b[0m`,
	dim: (s) => `\x1b[2m${s}\x1b[0m`,
	bold: (s) => `\x1b[1m${s}\x1b[0m`
};

// ---------- frontmatter parser (mirror of src/lib/content.js) ----------

function parseFrontmatter(raw) {
	const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
	if (!match) return { data: {}, body: raw.replace(/^\s+/, ''), missingFrontmatter: true };

	const [, fmBlock, body] = match;
	const data = {};
	const malformed = [];

	const lines = fmBlock.split(/\r?\n/);
	lines.forEach((line, i) => {
		if (!line.trim() || line.trim().startsWith('#')) return;
		const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
		if (!m) {
			malformed.push({ line: i + 2, content: line }); // +2: 1-indexed + leading `---`
			return;
		}
		const [, key, rawValue] = m;
		let value = rawValue.trim();
		if (
			(value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'"))
		) {
			value = value.slice(1, -1);
		}
		if (/^-?\d+$/.test(value)) value = parseInt(value, 10);
		else if (value === 'true') value = true;
		else if (value === 'false') value = false;
		data[key] = value;
	});

	return { data, body: body.replace(/^\s+/, ''), malformed };
}

// ---------- slot schemas ----------

const STRING = (v) => typeof v === 'string' && v.length > 0;
const NUMBER = (v) => typeof v === 'number' && Number.isFinite(v);
// Frontmatter parser coerces all-digit quoted values to numbers ("2025" → 2025),
// so for fields meant to display as text we accept either shape.
const YEAR = (v) =>
	(typeof v === 'string' && /^\d{4}$/.test(v)) || (typeof v === 'number' && v >= 1900 && v <= 9999);

const SLOT_SCHEMAS = {
	'home/hero': {
		fields: {
			title: { required: true, check: STRING },
			ctaLabel: { check: STRING },
			ctaHref: { check: STRING }
		},
		bodyRequired: true,
		fixedSlugs: ['hero', 'upcoming', 'live', 'closed']
	},
	'home/upcoming': { fields: { title: { required: true, check: STRING } }, bodyRequired: true },
	'home/live': { fields: { title: { required: true, check: STRING } }, bodyRequired: true },
	'home/closed': { fields: { title: { required: true, check: STRING } }, bodyRequired: true },
	faqs: {
		fields: {
			question: { required: true, check: STRING },
			order: { required: true, check: NUMBER }
		},
		bodyRequired: true
	},
	'footer/tagline': {
		fields: {
			name: { required: true, check: STRING },
			pronunciation: { required: true, check: STRING }
		},
		bodyRequired: true
	},
	'footer/copyright': {
		fields: { holder: { required: true, check: STRING }, year: { required: true, check: YEAR } },
		bodyRequired: false
	},
	'voter-directory/intro': {
		fields: { title: { required: true, check: STRING } },
		bodyRequired: true
	},
	'errors/generic': { fields: { title: { required: true, check: STRING } }, bodyRequired: true }
};

// Slots whose slug set is fixed (i.e. only the listed filenames render).
const FIXED_SLOTS = {
	home: ['hero', 'upcoming', 'live', 'closed'],
	footer: ['tagline', 'copyright'],
	'voter-directory': ['intro'],
	errors: ['generic']
};

// ---------- theme.json schema ----------

const COLOR_KEYS = [
	'primary',
	'primary-foreground',
	'secondary',
	'secondary-foreground',
	'accent',
	'accent-foreground',
	'destructive',
	'destructive-foreground',
	'ring',
	'header-background',
	'header-foreground',
	'brand',
	'brand-hover',
	'brand-fg',
	'brand-soft',
	'brand-soft-fg',
	'network-warning',
	'network-warning-foreground'
];
const THEME_KEYS = new Set([...COLOR_KEYS, 'radius', 'font-heading', 'font-body']);
// Accepts #RGB, #RGBA, #RRGGBB, #RRGGBBAA — alpha is parsed but discarded
// at apply time (Tailwind's <alpha-value> handles opacity utilities).
const HEX_COLOR = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const RADIUS = /^\d+(?:\.\d+)?(rem|em|px)$/;

// ---------- walker ----------

function walk(dir, out = []) {
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		const st = statSync(full);
		if (st.isDirectory()) walk(full, out);
		else out.push(full);
	}
	return out;
}

// ---------- linter ----------

const errors = [];
const warnings = [];
function err(file, msg, line) {
	errors.push({ file, msg, line });
}
function warn(file, msg, line) {
	warnings.push({ file, msg, line });
}

function lintMarkdown(absPath) {
	const rel = relative(ROOT, absPath);
	const parts = rel.split('/');
	// Expected shape: content/<deployment>/<lang>/<slot>/<slug>.md
	if (parts.length !== 5 || parts[0] !== 'content' || !parts[4].endsWith('.md')) {
		err(rel, 'unexpected file path — expected content/<deployment>/<lang>/<slot>/<slug>.md');
		return;
	}
	const [, , , slot, fileName] = parts;
	const slug = fileName.replace(/\.md$/, '');

	// Filename sanity for FAQs
	if (slot === 'faqs' && !/^\d{2,4}-[a-z0-9-]+$/.test(slug)) {
		err(rel, `faq filename must look like NNN-slug.md (got "${fileName}")`);
	}

	// Unknown fixed-slot slug
	if (FIXED_SLOTS[slot] && !FIXED_SLOTS[slot].includes(slug)) {
		err(rel, `unknown ${slot} slug "${slug}" — known slugs: ${FIXED_SLOTS[slot].join(', ')}`);
	}

	const raw = readFileSync(absPath, 'utf8');
	const { data, body, missingFrontmatter, malformed = [] } = parseFrontmatter(raw);

	if (missingFrontmatter) {
		err(rel, 'no frontmatter block — files must start with `---` … `---`');
		return;
	}
	for (const m of malformed) {
		err(rel, `malformed frontmatter line: ${JSON.stringify(m.content)}`, m.line);
	}

	const schemaKey = slot === 'faqs' ? 'faqs' : `${slot}/${slug}`;
	const schema = SLOT_SCHEMAS[schemaKey];
	if (!schema) {
		// Unknown slot — already reported above if it was in FIXED_SLOTS,
		// otherwise let it pass with a soft warn so new slots can land
		// without immediately failing the lint.
		if (!FIXED_SLOTS[slot]) warn(rel, `no schema registered for slot "${slot}"`);
		return;
	}

	for (const [key, def] of Object.entries(schema.fields)) {
		const value = data[key];
		if (value === undefined) {
			if (def.required) err(rel, `missing required frontmatter field "${key}"`);
			continue;
		}
		if (!def.check(value)) {
			err(rel, `frontmatter field "${key}" failed type check (got ${JSON.stringify(value)})`);
		}
	}

	if (schema.bodyRequired && !body.trim()) {
		err(rel, 'body is empty — this slot renders markdown content');
	}

	// FAQ-specific: filename prefix must match `order`
	if (slot === 'faqs' && typeof data.order === 'number') {
		const prefix = slug.match(/^(\d+)-/)?.[1];
		if (prefix && parseInt(prefix, 10) !== data.order) {
			err(rel, `faq filename prefix (${prefix}) must equal the \`order\` field (${data.order})`);
		}
	}
}

function lintTheme(absPath) {
	const rel = relative(ROOT, absPath);
	let parsed;
	try {
		parsed = JSON.parse(readFileSync(absPath, 'utf8'));
	} catch (e) {
		err(rel, `invalid JSON: ${e.message}`);
		return;
	}
	if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
		err(rel, 'theme.json must be a flat JSON object');
		return;
	}
	for (const [key, value] of Object.entries(parsed)) {
		if (!THEME_KEYS.has(key)) {
			warn(rel, `unknown theme key "${key}" — will be ignored at runtime`);
			continue;
		}
		if (COLOR_KEYS.includes(key)) {
			if (typeof value !== 'string' || !HEX_COLOR.test(value)) {
				err(
					rel,
					`"${key}" must be a hex color like "#0F172A" (got ${JSON.stringify(value)})`
				);
			}
		} else if (key === 'radius') {
			if (typeof value !== 'string' || !RADIUS.test(value)) {
				err(rel, `"radius" must be a CSS length like "0.5rem" (got ${JSON.stringify(value)})`);
			}
		} else if (key === 'font-heading' || key === 'font-body') {
			if (typeof value !== 'string' || !value.trim()) {
				err(rel, `"${key}" must be a non-empty Google Font family name`);
			}
		}
	}
}

// ---------- run ----------

let files;
try {
	files = walk(CONTENT);
} catch (e) {
	console.error(c.red(`Failed to read ${CONTENT}: ${e.message}`));
	process.exit(2);
}

// Docs files that live in the tree but aren't loaded at runtime. Skipped
// silently so the lint stays clean.
const DOC_FILES = new Set(['README.md', 'theme.sample.json']);

for (const f of files) {
	if (DOC_FILES.has(basename(f))) continue;
	if (f.endsWith('.md')) lintMarkdown(f);
	else if (basename(f) === 'theme.json') lintTheme(f);
	else warn(relative(ROOT, f), 'unexpected file (only .md and theme.json are recognized)');
}

function fmt(list, label, color) {
	if (!list.length) return;
	console.error(`\n${color(c.bold(`${label} (${list.length})`))}`);
	for (const e of list) {
		const where = e.line ? `${e.file}:${e.line}` : e.file;
		console.error(`  ${color(label[0])} ${c.bold(where)} — ${e.msg}`);
	}
}

fmt(warnings, 'warnings', c.yellow);
fmt(errors, 'errors', c.red);

if (errors.length) {
	console.error(`\n${c.red(c.bold(`✗ content lint failed with ${errors.length} error(s)`))}`);
	process.exit(1);
}
const linted = files.filter((f) => !DOC_FILES.has(basename(f)));
console.log(
	c.dim(
		`✓ content ok — ${linted.filter((f) => f.endsWith('.md')).length} markdown, ${linted.filter((f) => basename(f) === 'theme.json').length} theme${warnings.length ? `, ${warnings.length} warning(s)` : ''}`
	)
);
