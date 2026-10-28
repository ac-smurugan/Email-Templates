import type { Block, Inline } from '../layout.ts';
import { present, v } from '../placeholders.ts';
import { when } from '../layout.ts';

/** Where to turn when sign-in fails, for the transactional emails. */
export const SUPPORT_LINE: readonly Inline[] = [
  'Contact your ArmorCode administrator',
  when(present('supportEmail'), [' or ', v('supportEmail')]),
  '.',
];

/** The link as text, for when the button doesn't work. */
export const signInFallback: Block = {
  kind: 'text',
  quiet: true,
  text: ['Button not working? Paste this link into your browser: ', v('amcUrl')],
};
