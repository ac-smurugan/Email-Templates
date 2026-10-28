import { v } from '../placeholders.ts';
import { SAMPLE_APP_URL, SAMPLE_BASE } from '../samples.ts';
import { defineTemplate } from '../template.ts';

/** A connected tool has a new project that needs setting up in ArmorCode. */
export const projectMapping = defineTemplate({
  id: 'project-mapping',
  name: 'Project mapping',
  group: 'Tools & runbooks',
  source: 'java-utils / EmailService.sendProjectMappingEmail; background-jobs / ToolFetchProjectJob, ToolNewProjectsScanJobProcessorImpl · template/email/project-mapping.html',
  who: 'The people who manage the tool’s configuration',
  when: 'ArmorCode finds a new project in a connected security tool',
  fields: {
    tenant: { about: 'The tenant (account)' },
    businessUnitName: { about: 'The organization (business unit)' },
    toolName: { about: 'The security tool (“GitHub”, “Snyk”)' },
    project: { about: 'The tool configuration’s name' },
    toolUrl: { about: 'Where the project is configured in ArmorCode' },
  },
  sample: {
    ...SAMPLE_BASE,
    tenant: 'Example Corp',
    businessUnitName: 'Example Corp Engineering',
    toolName: 'GitHub',
    project: 'example-corp/payments-api',
    toolUrl: `${SAMPLE_APP_URL}/tools/github/configure`,
  },
  build: () => ({
    subject: ['Action needed: set up a new ', v('toolName'), ' project in ArmorCode'],
    preview: [v('project'), ' needs mapping before ArmorCode can place its findings.'],
    eyebrow: 'Action needed',
    tone: 'warn',
    title: ['Set up a new ', v('toolName'), ' project'],
    blocks: [
      {
        kind: 'text',
        text: [
          'ArmorCode found a new project in ',
          v('toolName'),
          '. Map it to a product and sub-product so ArmorCode knows where its findings belong.',
        ],
      },
      {
        kind: 'details',
        rows: [
          { label: 'Tool', value: v('toolName') },
          { label: 'Configuration', value: { strong: v('project') } },
          { label: 'Organization', value: v('businessUnitName') },
          { label: 'Tenant', value: v('tenant') },
        ],
      },
      { kind: 'text', quiet: true, text: ['Button not working? Paste this link into your browser: ', v('toolUrl')] },
    ],
    action: { label: 'Start configuration', url: v('toolUrl') },
    reason: ['You got this email because a new ', v('toolName'), ' project in ', v('businessUnitName'), ' needs setting up.'],
    footer: 'operational',
  }),
});
