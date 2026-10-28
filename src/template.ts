import { richText, toHtml, toText, type Email } from './layout.ts';

/** The placeholders every email uses besides its own, for the brand row. */
export const BASE_FIELDS = {
  amcLogoUrl: {
    about:
      'The ArmorCode mark (the circles, without the white wordmark, which vanishes on light backgrounds): host assets/armorcode-mark@2x.png, shown 28px high',
  },
} as const satisfies Fields;

/** Only in operational emails: anything that isn't about someone's own account. */
export const SETTINGS_FIELD = {
  notificationSettingsUrl: { about: 'ArmorCode’s notification settings page', isNew: true },
} as const satisfies Fields;

export interface Field {
  /** What it holds, for the README and the backend. */
  about: string;
  /** The template still works without it (it sits inside an `#if`, or prints nothing when it's empty). */
  optional?: boolean;
  /** Not among today’s placeholders: the backend has to supply it. */
  isNew?: boolean;
}
export type Fields = Record<string, Field>;

/** Sample values, for the preview only: John Smith at Example Corp, never real people or tenants. */
export type Sample = Record<string, unknown>;

/** The groups the preview and the README list emails under, in order. */
export const GROUPS = [
  'Account & access',
  'Findings & alerts',
  'Reports & sharing',
  'Exports',
  'Uploads',
  'Risk register',
  'Tools & runbooks',
  'Platform notices',
] as const;
export type Group = (typeof GROUPS)[number];

export interface EmailTemplate {
  id: string;
  name: string;
  group: Group;
  kind: 'transactional' | 'operational';
  engine: 'velocity' | 'substitution';
  /** Where it's sent from today: repo, and the class or template file. */
  source: string;
  /** Who gets it. */
  who: string;
  /** When it's sent. */
  when: string;
  /** Every placeholder the email uses, its own and the shared ones. */
  fields: Fields;
  sample: Sample;
  email: Email;
  subject: string;
  preview: string;
  html: string;
  text: string;
}

export function defineTemplate(spec: {
  id: string;
  name: string;
  group: Group;
  source: string;
  who: string;
  when: string;
  /** Its own placeholders; one with a shared name overrides the shared description. */
  fields: Fields;
  sample: Sample;
  build(): Email;
}): EmailTemplate {
  const email = spec.build();
  const shared = email.footer === 'operational' ? { ...BASE_FIELDS, ...SETTINGS_FIELD } : BASE_FIELDS;
  return {
    id: spec.id,
    name: spec.name,
    group: spec.group,
    kind: email.footer,
    engine: email.engine ?? 'velocity',
    source: spec.source,
    who: spec.who,
    when: spec.when,
    fields: { ...shared, ...spec.fields },
    sample: spec.sample,
    email,
    subject: richText(email.subject),
    preview: richText(email.preview),
    html: toHtml(email),
    text: toText(email),
  };
}
