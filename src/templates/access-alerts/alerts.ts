import { present, v } from '../../placeholders.ts';
import { SAMPLE_APP_URL, SAMPLE_BASE } from '../../samples.ts';
import { defineTemplate } from '../../template.ts';
import { when } from '../../layout.ts';

const SOURCE = 'java-utils / AlertServiceImpl (in code)';

/** An alert fired for a product, sub-product or environment. */
export const alertTriggered = defineTemplate({
  id: 'alert-triggered',
  name: 'Alert triggered',
  group: 'Findings & alerts',
  source: SOURCE,
  who: 'People subscribed to the alert',
  when: 'An alert fires and raises a notification for a product, sub-product or environment',
  fields: {
    alertTitle: { about: 'The alert’s title', optional: true },
    alertId: { about: 'The alert’s id' },
    description: { about: 'The alert’s description' },
    accountName: { about: 'The tenant (account)' },
    businessUnitName: { about: 'The organization (business unit)' },
    productName: { about: 'The product', optional: true },
    subProductName: { about: 'The sub-product', optional: true },
    environmentName: { about: 'The environment', optional: true },
    urlLink: { about: 'The alert’s custom link, when it has one', optional: true },
    urlText: { about: 'The custom link’s text', optional: true },
    notificationLink: { about: 'The notification in ArmorCode' },
    alertRef: { about: 'The notification’s reference (“A-123”)' },
  },
  sample: {
    ...SAMPLE_BASE,
    alertTitle: 'New critical findings in Payments',
    alertId: '312',
    description: 'Fires when a scan adds critical findings to a production environment.',
    accountName: 'Example Corp',
    businessUnitName: 'Example Corp Engineering',
    productName: 'Payments',
    subProductName: 'payments-api',
    environmentName: 'Production',
    urlLink: 'https://wiki.example.com/security/runbooks/critical-findings',
    urlText: 'Critical findings runbook',
    notificationLink: `${SAMPLE_APP_URL}/#/notifications/A-123`,
    alertRef: 'A-123',
  },
  build: () => ({
    subject: when(present('alertTitle'), ['Alert: ', v('alertTitle')], 'An ArmorCode alert was triggered'),
    preview: [when(present('alertTitle'), v('alertTitle'), 'An alert'), ' was triggered in ', v('accountName'), '.'],
    eyebrow: 'Alert',
    tone: 'warn',
    title: when(present('alertTitle'), v('alertTitle'), 'An alert was triggered'),
    subtitle: ['Alert ', v('alertId'), ' · notification ', v('alertRef')],
    blocks: [
      { kind: 'quote', label: 'Description', text: v('description') },
      {
        kind: 'details',
        rows: [
          { label: 'Account', value: [v('accountName'), ' · ', v('businessUnitName')] },
          { label: 'Product', value: v('productName'), when: present('productName') },
          { label: 'Sub-product', value: v('subProductName'), when: present('subProductName') },
          { label: 'Environment', value: v('environmentName'), when: present('environmentName') },
        ],
      },
      {
        kind: 'items',
        when: present('urlLink'),
        items: [{ title: when(present('urlText'), v('urlText'), v('urlLink')), url: v('urlLink'), meta: 'Linked from the alert.' }],
      },
    ],
    action: { label: ['View notification ', v('alertRef')], url: v('notificationLink') },
    reason: 'You got this email because you’re subscribed to this alert in ArmorCode.',
    footer: 'operational',
  }),
});

/** An alert tied to a proposed finding action fired. */
export const alertProposeAction = defineTemplate({
  id: 'alert-propose-action',
  name: 'Alert triggered: proposed action',
  group: 'Findings & alerts',
  source: SOURCE,
  who: 'The tenant’s team administrators',
  when: 'An alert tied to a proposed finding action fires',
  fields: {
    alertTitle: { about: 'The alert’s title' },
    status: { about: 'The alert’s status' },
    description: { about: 'The alert’s description' },
    notificationLink: { about: 'The notification in ArmorCode', isNew: true },
  },
  sample: {
    ...SAMPLE_BASE,
    alertTitle: 'Proposed risk acceptance on critical findings',
    status: 'Pending approval',
    description: 'Jane Doe proposed accepting the risk on 3 critical findings in Payments.',
    notificationLink: `${SAMPLE_APP_URL}/#/notifications/A-124`,
  },
  build: () => ({
    subject: ['Alert: ', v('alertTitle')],
    preview: [v('alertTitle'), ' · ', v('status')],
    eyebrow: 'Alert',
    tone: 'warn',
    title: v('alertTitle'),
    blocks: [
      { kind: 'details', rows: [{ label: 'Status', value: { strong: v('status') } }] },
      { kind: 'quote', label: 'Description', text: v('description') },
    ],
    action: { label: 'View notification', url: v('notificationLink') },
    reason: 'You got this email because you’re a team administrator in ArmorCode.',
    footer: 'operational',
  }),
});

/** A notification event (like an alert) with email turned on for its severity. */
export const notification = defineTemplate({
  id: 'notification',
  name: 'Notification',
  group: 'Findings & alerts',
  source: 'java-utils / NotificationEventHandler (in code)',
  who: 'People subscribed to the notification configuration',
  when: 'A notification event fires and email is turned on for its severity',
  fields: {
    notificationTitle: { about: 'The notification’s title' },
    description: { about: 'What happened; any links are written into it' },
    notificationUrl: { about: 'The notification in ArmorCode', isNew: true },
    severity: { about: 'The notification’s severity: Critical, High, Medium or Low', optional: true, isNew: true },
  },
  sample: {
    ...SAMPLE_BASE,
    notificationTitle: 'SLA breached on 4 high findings in Payments',
    description: '4 high findings in Payments passed their 30-day SLA today. The oldest has been open for 41 days.',
    notificationUrl: `${SAMPLE_APP_URL}/#/notifications/N-2048`,
    severity: 'High',
  },
  build: () => ({
    subject: v('notificationTitle'),
    preview: v('description'),
    eyebrow: 'Notification',
    tone: 'accent',
    title: v('notificationTitle'),
    subtitle: when(present('severity'), [{ ratingOf: 'severity' }, ' ', v('severity'), ' severity']),
    blocks: [{ kind: 'text', text: v('description') }],
    action: { label: 'View in ArmorCode', url: v('notificationUrl') },
    reason: 'You got this email because you’re subscribed to these notifications in ArmorCode.',
    footer: 'operational',
  }),
});
