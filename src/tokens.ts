/**
 * Colors, type and shape, from ArmorCode Zero's email tokens. They're hex because email clients
 * don't read CSS variables, and translucent colors are already blended over the surface they sit
 * on because Outlook doesn't do rgba. Templates never use a color that isn't here.
 */
export const LIGHT = {
  canvas: '#ebeef3',
  card: '#ffffff',
  /** The subtle background that sets an area apart, instead of a border. */
  well: '#f4f5f6',
  fg: '#15181e',
  muted: '#676a71',
  line: '#ecedef',
  accent: '#624cf5',
  /** Links: a darker accent, readable as text. */
  link: '#4a35d6',
  /** A change for the better or the worse. */
  better: '#157a41',
  worse: '#c4252b',
};

export const DARK: typeof LIGHT = {
  canvas: '#0a0b0e',
  card: '#101216',
  well: '#1c1e22',
  fg: '#eceef2',
  muted: '#9ea1a8',
  line: '#212326',
  accent: '#7c6bff',
  link: '#b3a9ff',
  better: '#6fe0a2',
  worse: '#ff8a8f',
};

/** The eyebrow's status dot, strong enough on either scheme. */
export const TONES = { accent: '#624cf5', ok: '#1f9d55', warn: '#e2a400', danger: '#e5484d' } as const;
export type Tone = keyof typeof TONES;

/** Risk ratings in severity's colors, the same on both schemes. */
export const RATINGS = ['critical', 'high', 'moderate', 'minimal', 'unrated'] as const;
export type Rating = (typeof RATINGS)[number];
export const RATING_COLORS: Record<Rating, string> = {
  critical: '#e5484d',
  high: '#f2711c',
  moderate: '#e2a400',
  minimal: '#1f9d55',
  unrated: '#a1a7b2',
};
export const RATING_NAMES: Record<Rating, string> = {
  critical: 'Critical',
  high: 'High',
  moderate: 'Moderate',
  minimal: 'Minimal',
  unrated: 'Unrated',
};

export const FONT = "-apple-system,BlinkMacSystemFont,'SF Pro Text','Segoe UI',Roboto,Helvetica,Arial,sans-serif";
/** Outlook on Windows falls back to Times for fonts it doesn't know, so it gets Arial. */
export const MSO_FONT = 'Arial,sans-serif';

/** Size and line height, in px. */
export const TYPE = {
  title: [21, 28],
  body: [15, 23],
  detail: [14, 21],
  small: [13, 20],
  caption: [12, 18],
  stat: [22, 28],
} as const;
export const type = (name: keyof typeof TYPE) => `font-size:${TYPE[name][0]}px;line-height:${TYPE[name][1]}px`;

export const RADIUS = { card: 14, well: 10, button: 8 } as const;

export const WIDTH = {
  /** The card's widest. */
  max: 600,
  /** Below this, the phone rules apply. */
  phone: 620,
} as const;

/** Padding, in px. */
export const SPACE = {
  canvas: '32px 16px',
  canvasPhone: '20px 8px',
  card: 32,
  cardPhone: '24px 20px',
  well: '14px 16px',
  /** Above the first block, and between blocks. */
  firstBlock: 12,
  block: 18,
  button: 24,
} as const;

/** Subjects stay under 80 characters, so the inbox shows them whole. */
export const SUBJECT_MAX = 78;
