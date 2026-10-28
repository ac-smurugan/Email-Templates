import { when } from '../../layout.ts';
import { flag, is, loop, not, present, v } from '../../placeholders.ts';
import { SAMPLE_APP_URL, SAMPLE_BASE } from '../../samples.ts';
import { defineTemplate } from '../../template.ts';

const GROUP = 'Platform notices';

/** 49. A project clone finished. */
export const projectCloned = defineTemplate({
  id: 'project-cloned',
  name: 'Project cloning completed',
  group: GROUP,
  source: 'java-utils / project cloning (in code; the class isn’t named in the inventory)',
  who: 'The person who started the clone',
  when: 'A project cloning process finishes successfully',
  fields: {
    projectFieldName: { about: 'What the tenant calls a project (“Product”, “Application”)' },
    projectName: { about: 'The project that was cloned' },
    clonedProjectName: { about: 'The new copy’s name' },
    projectUrl: { about: 'The new copy in ArmorCode' },
  },
  sample: {
    ...SAMPLE_BASE,
    projectFieldName: 'Product',
    projectName: 'Payments Platform',
    clonedProjectName: 'Payments Platform (copy)',
    projectUrl: `${SAMPLE_APP_URL}/products/3310`,
  },
  build: () => ({
    subject: ['Cloning finished for ', v('projectFieldName'), ': ', v('projectName')],
    preview: [v('clonedProjectName'), ' is ready to review in ArmorCode.'],
    eyebrow: 'Clone ready',
    tone: 'ok',
    title: 'Cloning finished',
    subtitle: [v('projectFieldName'), ': ', v('projectName')],
    blocks: [
      {
        kind: 'text',
        text: ['ArmorCode finished cloning your ', v('projectFieldName'), '. Review the new copy to check it’s set up the way you want.'],
      },
      {
        kind: 'details',
        rows: [
          { label: 'Cloned from', value: v('projectName') },
          { label: 'New copy', value: { strong: v('clonedProjectName') } },
        ],
      },
    ],
    action: { label: ['Review ', v('clonedProjectName')], url: v('projectUrl') },
    reason: ['You got this email because you started cloning this ', v('projectFieldName'), '.'],
    footer: 'operational',
  }),
});

const MODE = when(is('mode', 'dry'), 'dry run', 'live run');

/** 50. An AQL query/filter migration (or rollback) run finished. */
export const aqlMigration = defineTemplate({
  id: 'aql-migration',
  name: 'AQL migration notice',
  group: GROUP,
  source: 'java-utils / AqlMigrationNotifier (in code)',
  who: 'The migration run’s configured notification recipients',
  when: 'An AQL query and filter migration, or its rollback, finishes a run',
  fields: {
    operation: { about: '“Migration” or “Rollback”' },
    shortMigrationId: { about: 'The run’s short ID, for the subject' },
    migrationId: { about: 'The run’s full ID' },
    status: { about: 'SUCCESS, PARTIAL_FAILURE, ERROR or NO_TENANTS' },
    mode: { about: '“dry” or “live”' },
    forced: {
      about: 'true when the run was forced (today’s email adds “| FORCE”; the source doc gives the flag no name, so this one is a guess)',
      optional: true,
    },
    durationMs: { about: 'How long the run took, in milliseconds' },
    sources: { about: 'One summary line per source, as text (today’s `sourceSummary`); each item is the line itself' },
    downloadUrls: { about: 'Report download links, one URL per item; empty when there are none', optional: true },
    amcUrl: { about: 'ArmorCode, for the button (today’s email has no link)', isNew: true },
  },
  sample: {
    ...SAMPLE_BASE,
    operation: 'Migration',
    shortMigrationId: '7f3c9a2e',
    migrationId: '7f3c9a2e-41d6-4b8e-9c0a-5d2e8f61b734',
    status: 'PARTIAL_FAILURE',
    mode: 'live',
    forced: false,
    durationMs: 48213,
    sources: [
      'Saved searches: 412 migrated, 3 failed, 18 skipped',
      'Dashboard filters: 96 migrated, 0 failed, 2 skipped',
    ],
    downloadUrls: [`${SAMPLE_APP_URL}/downloads/aql-migration-7f3c9a2e.csv`],
    amcUrl: SAMPLE_APP_URL,
  },
  build: () => ({
    subject: ['AQL ', v('operation'), ' ', v('shortMigrationId'), ': ', v('status'), ' (', MODE, ')'],
    preview: [v('operation'), ' run ', v('migrationId'), ' finished with status ', v('status'), '.'],
    eyebrow: 'AQL run',
    // The tone is fixed per template, so it can't follow the status; the Status row's dot does.
    tone: 'warn',
    title: ['AQL ', v('operation'), ' report'],
    subtitle: [v('migrationId'), ' · ', MODE],
    blocks: [
      {
        kind: 'details',
        rows: [
          {
            label: 'Status',
            value: [
              {
                choose: [
                  [is('status', 'SUCCESS'), { rating: 'minimal' }],
                  [is('status', 'PARTIAL_FAILURE'), { rating: 'moderate' }],
                  [is('status', 'ERROR'), { rating: 'critical' }],
                ],
                else: { rating: 'unrated' },
              },
              ' ',
              { strong: v('status') },
            ],
          },
          { label: 'Operation', value: v('operation') },
          { label: 'Migration ID', value: { code: v('migrationId') } },
          { label: 'Mode', value: [when(is('mode', 'dry'), 'Dry run', 'Live'), when(flag('forced'), ' · forced')] },
          { label: 'Duration', value: [v('durationMs'), ' ms'] },
        ],
      },
      { kind: 'list', label: 'Results by source', each: loop('sources', 'source'), item: v('source') },
      { kind: 'list', label: 'Report downloads', each: loop('downloadUrls', 'url'), item: v('url'), when: present('downloadUrls') },
      { kind: 'text', quiet: true, text: 'Report downloads: none.', when: not(present('downloadUrls')) },
    ],
    action: { label: 'Open ArmorCode', url: v('amcUrl') },
    reason: 'You got this email because you’re a notification recipient for AQL migration runs.',
    footer: 'operational',
  }),
});

/** 51. An organization's automated Anya usage crossed a threshold. */
export const anyaUsageAlert = defineTemplate({
  id: 'anya-usage-alert',
  name: 'Anya usage alert',
  group: GROUP,
  source: 'java-utils / AnyaMeterNotificationService (in code)',
  who: 'The organization’s administrators',
  when: 'An organization’s monthly automated Anya action usage crosses a configured threshold',
  fields: {
    orgName: { about: 'The organization' },
    thresholdPercent: { about: 'The threshold crossed, as a number (“80”)' },
    displayMonth: { about: 'The month, as text (“October 2026”)' },
    accountTeamUrl: { about: 'How to reach the ArmorCode account team: a mailto: link or a contact page (today’s email names the team but has no link)', isNew: true },
  },
  sample: {
    ...SAMPLE_BASE,
    orgName: 'Example Corp',
    thresholdPercent: 80,
    displayMonth: 'October 2026',
    accountTeamUrl: 'mailto:account-team@armorcode.example.com',
  },
  build: () => ({
    subject: ['Anya usage: ', v('orgName'), ' has reached ', v('thresholdPercent'), '% of its monthly allowance'],
    preview: ['Automated Anya actions for ', v('displayMonth'), ' are at ', v('thresholdPercent'), '% of the allowance.'],
    eyebrow: 'Usage alert',
    tone: 'warn',
    title: [v('orgName'), ' has used ', v('thresholdPercent'), '% of its Anya allowance'],
    subtitle: ['Automated Anya actions · ', v('displayMonth')],
    blocks: [
      {
        kind: 'stats',
        items: [
          { label: 'Allowance used', value: [v('thresholdPercent'), '%'] },
          { label: 'Month', value: v('displayMonth') },
        ],
      },
      {
        kind: 'text',
        text: [
          'Automated Anya actions (API, MCP and runbooks) will be blocked once the monthly allocation and any purchased packs are used up. ',
          { strong: 'Using Anya in the ArmorCode app is never blocked.' },
        ],
      },
      { kind: 'text', text: 'To review or increase capacity, contact the ArmorCode account team.' },
    ],
    action: { label: 'Contact the account team', url: v('accountTeamUrl') },
    reason: ['You got this email because you’re an administrator of ', v('orgName'), '.'],
    footer: 'operational',
  }),
});

export const PLATFORM_NOTICE_EMAILS = [projectCloned, aqlMigration, anyaUsageAlert];
