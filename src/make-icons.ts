/**
 * `node src/make-icons.ts`: renders the eyebrow badges: the icon's glyph in a dark shade of the email's tone
 * color on a light tint of it, as `assets/icons/<icon>-<tone>.png` (40px, shown at 20px). Mail clients
 * can't show SVG or icon fonts, so the badges are images the backend hosts at `${iconBaseUrl}`.
 * Needs macOS (`sips` rasterizes the SVG). Only the icon and tone pairs the emails use are made.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { badgeFile } from './icons.ts';
import { TEMPLATES } from './templates/index.ts';
import { TONES } from './tokens.ts';

const ICONS = fileURLToPath(new URL('../assets/icons/', import.meta.url));
const SIZE = 40;
/** The glyph's share of the badge, centered. */
const GLYPH = 0.62;
/**
 * The badge is opaque, so it reads the same on a light or a dark card (an email can't swap images by
 * scheme): the circle is the tone lightened toward white, the glyph the tone darkened toward black.
 * The same hue at the same lightness washed out, amber most of all.
 */
const WASH = 0.78;
const INK = 0.5;
/** Strokes in the glyphs' 24px grid (Zero's are 1.5): heavier, so they hold up at 20px. */
const STROKE = 1.9;

function mix(hex: string, toward: 0 | 255, amount: number): string {
  const channels = [1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * (1 - amount) + toward * amount));
  return `#${channels.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

/** Glyphs that are small in their 24px grid, so they get a bigger share of the badge. */
const GLYPH_BY_ICON: Record<string, number> = { exclamation: 0.95 };

const pairs = new Map<string, { icon: string; tone: keyof typeof TONES }>();
for (const t of TEMPLATES) pairs.set(badgeFile(t.email.icon!, t.email.tone), { icon: t.email.icon!, tone: t.email.tone });

for (const file of readdirSync(ICONS)) if (file.endsWith('.png')) rmSync(join(ICONS, file));
const work = join(tmpdir(), 'armorcode-badges');
mkdirSync(work, { recursive: true });

for (const [file, { icon, tone }] of pairs) {
  const glyph = readFileSync(`${ICONS}glyphs/${icon}.svg`, 'utf8')
    .replace(/^<svg[^>]*>/, '')
    .replace('</svg>', '')
    .replaceAll('currentColor', mix(TONES[tone], 0, INK))
    .replaceAll('stroke-width="1.5"', `stroke-width="${STROKE}"`);
  const scale = GLYPH_BY_ICON[icon] ?? GLYPH;
  const offset = (24 - 24 * scale) / 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="${mix(TONES[tone], 255, WASH)}"/><g fill="none" transform="translate(${offset} ${offset}) scale(${scale})">${glyph}</g></svg>\n`;
  const source = join(work, file.replace('.png', '.svg'));
  writeFileSync(source, svg);
  execFileSync('sips', ['-s', 'format', 'png', source, '--out', `${ICONS}${file}`], { stdio: 'ignore' });
}
console.log(`Wrote ${pairs.size} badges to assets/icons/.`);
