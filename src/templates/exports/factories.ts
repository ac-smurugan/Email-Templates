import { when, type Block, type Inline, type Rich } from '../../layout.ts';
import { above, equals, v } from '../../placeholders.ts';
import { SAMPLE_APP_URL, SAMPLE_BASE } from '../../samples.ts';
import { defineTemplate, type EmailTemplate, type Fields, type Group, type Sample } from '../../template.ts';

// The export and bulk-upload emails: a few shapes, so every one of them reads the same.

const WHO_EXPORT = 'The person who requested the export';
const WHO_UPLOAD = 'The person who uploaded the file';

/** The link as text, for when the button doesn't work. */
const fallback = (name: string): Block => ({
  kind: 'text',
  quiet: true,
  text: ['Button not working? Paste this link into your browser: ', v(name)],
});

const SUPPORT = 'If it keeps failing, contact ArmorCode support.';

// ——— Export ready ———

/** How long the download link works: as today's email says it, or not at all. */
type Expiry = { hours: number } | 'placeholder' | 'none';

interface ReadySpec {
  id: string;
  name: string;
  source: string;
  when: string;
  who?: string;
  subject: Rich;
  preview?: Rich;
  title: Rich;
  /** The paragraph under the title: what's ready. */
  lead: Rich;
  /** Facts about the file, when today's email carries any. */
  details?: Extract<Block, { kind: 'details' }>['rows'];
  /** The button: “Download the CSV”. */
  button: string;
  expiry: Expiry;
  /** “exported findings from ArmorCode”, after “You got this email because you”. */
  reasonWhat: Rich;
  fields?: Fields;
  sample?: Sample;
  /** The sample download's file name. */
  file: string;
}

const expiryLine = (expiry: Expiry): Inline[] | undefined =>
  expiry === 'none'
    ? undefined
    : [
        'The download link works for ',
        expiry === 'placeholder' ? v('expiryInHours') : String(expiry.hours),
        ' hours. After that, export again for a new link.',
      ];

/** An export finished: the file is ready to download. */
export function exportReady(spec: ReadySpec): EmailTemplate {
  const expiry = expiryLine(spec.expiry);
  return defineTemplate({
    id: spec.id,
    name: spec.name,
    group: 'Exports',
    source: spec.source,
    who: spec.who ?? WHO_EXPORT,
    when: spec.when,
    fields: {
      ...spec.fields,
      downloadLink: {
        about: spec.expiry === 'none' ? 'The file to download' : 'The file to download; the link stops working after a while',
      },
      ...(spec.expiry === 'placeholder' ? { expiryInHours: { about: 'How many hours the download link works, as a number (“24”)' } } : {}),
    },
    sample: {
      ...SAMPLE_BASE,
      ...spec.sample,
      downloadLink: `${SAMPLE_APP_URL}/downloads/${spec.file}`,
      ...(spec.expiry === 'placeholder' ? { expiryInHours: 24 } : {}),
    },
    build: () => ({
      subject: spec.subject,
      preview: spec.preview ?? (expiry ? ['Download it from this email. ', ...expiry] : 'Download it from this email.'),
      eyebrow: 'Export ready',
      tone: 'ok',
      title: spec.title,
      blocks: [
        { kind: 'text', text: spec.lead },
        ...(spec.details ? [{ kind: 'details', rows: spec.details } as const] : []),
        ...(expiry ? [{ kind: 'text', text: expiry } as const] : []),
        fallback('downloadLink'),
      ],
      action: { label: spec.button, url: v('downloadLink') },
      reason: ['You got this email because you ', spec.reasonWhat, ' in ArmorCode.'],
      footer: 'transactional',
    }),
  });
}

// ——— Export failed ———

interface FailedSpec {
  id: string;
  name: string;
  source: string;
  when: string;
  subject: Rich;
  preview: Rich;
  title: Rich;
  /** What failed, and why when today's email says. */
  lead: Rich;
  /** More, like the error the backend reported. */
  blocks?: readonly Block[];
  /** What to do next. */
  next: Rich;
  /** The button back to the page the export was started from: “Open the audit log”. */
  button: string;
  /** That page, for the field's description: “the audit log page”. */
  page: string;
  /** The sample page's path. */
  path: string;
  reasonWhat: Rich;
  fields?: Fields;
  sample?: Sample;
}

/** An export didn't finish: what went wrong, and a way back to try again. */
export function exportFailed(spec: FailedSpec): EmailTemplate {
  return defineTemplate({
    id: spec.id,
    name: spec.name,
    group: 'Exports',
    source: spec.source,
    who: WHO_EXPORT,
    when: spec.when,
    fields: {
      ...spec.fields,
      exportPageUrl: { about: `Where to export again in ArmorCode: ${spec.page} (today's email has no link)`, isNew: true },
    },
    sample: { ...SAMPLE_BASE, ...spec.sample, exportPageUrl: `${SAMPLE_APP_URL}${spec.path}` },
    build: () => ({
      subject: spec.subject,
      preview: spec.preview,
      eyebrow: 'Export failed',
      tone: 'danger',
      title: spec.title,
      blocks: [{ kind: 'text', text: spec.lead }, ...(spec.blocks ?? []), { kind: 'text', text: spec.next }],
      action: { label: spec.button, url: v('exportPageUrl') },
      reason: ['You got this email because you ', spec.reasonWhat, ' in ArmorCode.'],
      footer: 'transactional',
    }),
  });
}

/** The usual next step when today's email gives no reason. */
export const TRY_AGAIN: Rich = `Export again from ArmorCode. ${SUPPORT}`;

// ——— Bulk upload result ———

interface UploadSpec {
  id: string;
  name: string;
  group?: Group;
  source: string;
  when: string;
  /** What each row makes: “product”, “products”. */
  one: string;
  many: string;
  /** “created” or “updated”. */
  verb: 'created' | 'updated';
  /** The page listing them, for the button. */
  page: { field: string; about: string; label: string; path: string };
  sample: { fileName: string; totalCount: number; successCount: number; failedCount: number };
}

/** A bulk CSV upload finished: how many rows worked, with the failed rows' errors attached. */
export function uploadResult(spec: UploadSpec): EmailTemplate {
  const failVerb = spec.verb === 'created' ? 'create' : 'update';
  return defineTemplate({
    id: spec.id,
    name: spec.name,
    group: spec.group ?? 'Uploads',
    source: spec.source,
    who: WHO_UPLOAD,
    when: spec.when,
    fields: {
      fileName: { about: 'The uploaded file’s name' },
      totalCount: { about: `How many ${spec.many} the file had, as a number` },
      successCount: { about: `How many were ${spec.verb}, as a number` },
      failedCount: { about: `How many failed to ${failVerb}, as a number` },
      [spec.page.field]: { about: `${spec.page.about} (today's email has no link)`, isNew: true },
    },
    sample: { ...SAMPLE_BASE, ...spec.sample, [spec.page.field]: `${SAMPLE_APP_URL}${spec.page.path}` },
    build: () => ({
      subject: [v('fileName'), ': ', v('successCount'), ' of ', v('totalCount'), ` ${spec.many} ${spec.verb}`],
      preview: [
        v('successCount'),
        ` ${spec.verb}, `,
        v('failedCount'),
        ' failed.',
        when(above('failedCount', 0), ' The errors for each failed row are attached.'),
      ],
      eyebrow: spec.verb === 'created' ? 'Upload complete' : 'Update complete',
      tone: 'accent',
      title: [v('successCount'), ' of ', v('totalCount'), ` ${spec.many} ${spec.verb}`],
      subtitle: v('fileName'),
      blocks: [
        {
          kind: 'stats',
          items: [
            { label: 'Uploaded', value: v('totalCount') },
            { label: cap(spec.verb), value: v('successCount') },
            { label: `Failed to ${failVerb}`, value: v('failedCount') },
          ],
        },
        {
          kind: 'text',
          when: above('failedCount', 0),
          text: [
            `The attached CSV file gives the error for each ${spec.one} that failed. Fix those rows and upload them again.`,
          ],
        },
        { kind: 'text', when: equals('failedCount', 0), text: `Every ${spec.one} in the file was ${spec.verb}.` },
      ],
      action: { label: spec.page.label, url: v(spec.page.field) },
      reason: ['You got this email because you uploaded ', v('fileName'), ' to ArmorCode.'],
      footer: 'transactional',
    }),
  });
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// ——— Upload rejected ———

interface RejectedSpec {
  id: string;
  name: string;
  source: string;
  when: string;
  subject: Rich;
  preview: Rich;
  title: Rich;
  lead: Rich;
  blocks?: readonly Block[];
  next: Rich;
  page: { field: string; about: string; label: string; path: string };
  fields: Fields;
  sample: Sample;
}

/** A bulk upload was turned away before any row was processed. */
export function uploadRejected(spec: RejectedSpec): EmailTemplate {
  return defineTemplate({
    id: spec.id,
    name: spec.name,
    group: 'Uploads',
    source: spec.source,
    who: WHO_UPLOAD,
    when: spec.when,
    fields: { ...spec.fields, [spec.page.field]: { about: `${spec.page.about} (today's email has no link)`, isNew: true } },
    sample: { ...SAMPLE_BASE, ...spec.sample, [spec.page.field]: `${SAMPLE_APP_URL}${spec.page.path}` },
    build: () => ({
      subject: spec.subject,
      preview: spec.preview,
      eyebrow: 'Upload failed',
      tone: 'danger',
      title: spec.title,
      subtitle: v('fileName'),
      blocks: [{ kind: 'text', text: spec.lead }, ...(spec.blocks ?? []), { kind: 'text', text: spec.next }],
      action: { label: spec.page.label, url: v(spec.page.field) },
      reason: ['You got this email because you uploaded ', v('fileName'), ' to ArmorCode.'],
      footer: 'transactional',
    }),
  });
}
