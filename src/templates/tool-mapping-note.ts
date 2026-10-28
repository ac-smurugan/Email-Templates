import { present, v } from '../placeholders.ts';
import { SAMPLE_APP_URL, SAMPLE_BASE } from '../samples.ts';
import { defineTemplate } from '../template.ts';

/** Someone mentioned a person in a note on a security tool's mapping. */
export const toolMappingNote = defineTemplate({
  id: 'tool-mapping-note',
  name: 'Security tool mapping note',
  group: 'Tools & runbooks',
  source: 'authserver, java-utils / ToolConfigurationNotesServiceImpl · template/email/security-tool-mapping-note-notification.html',
  who: 'The person mentioned',
  when: 'Someone mentions them in a note on a security tool’s mapping',
  fields: {
    whoMentioned: { about: 'Who mentioned them (“Jane Doe”)' },
    toolConfigurationNote: { about: 'The note, as plain text' },
    toolConfigurationNoteUrl: { about: 'The note in ArmorCode' },
    amcLogoUrl: { about: 'The ArmorCode logo (this email had `${logoUrl}` at the bottom; the brand row uses `amcLogoUrl` like the others)', isNew: true },
    toolName: { about: 'The security tool (“Snyk”)', optional: true, isNew: true },
    toolConfigurationName: { about: 'The tool configuration the note is on', optional: true, isNew: true },
  },
  sample: {
    ...SAMPLE_BASE,
    whoMentioned: 'Jane Doe',
    toolConfigurationNote: '@John Smith the payments repositories moved to the new GitHub organization. Can you remap them to the Payments product?',
    toolConfigurationNoteUrl: `${SAMPLE_APP_URL}/tools/github/configurations/12/notes`,
    toolName: 'GitHub',
    toolConfigurationName: 'Example Corp GitHub',
  },
  build: () => ({
    subject: [v('whoMentioned'), ' mentioned you in a security tool mapping note'],
    preview: [v('whoMentioned'), ' left a note for you on a tool mapping in ArmorCode.'],
    eyebrow: 'Mention',
    tone: 'accent',
    title: [v('whoMentioned'), ' mentioned you in a note'],
    subtitle: 'On a security tool mapping',
    blocks: [
      { kind: 'quote', label: 'The note', text: v('toolConfigurationNote') },
      {
        kind: 'details',
        rows: [
          { label: 'Tool', value: v('toolName'), when: present('toolName') },
          { label: 'Configuration', value: v('toolConfigurationName'), when: present('toolConfigurationName') },
        ],
        when: present('toolName'),
      },
    ],
    action: { label: 'View the note', url: v('toolConfigurationNoteUrl') },
    reason: ['You got this email because ', v('whoMentioned'), ' mentioned you in ArmorCode.'],
    footer: 'operational',
  }),
});
