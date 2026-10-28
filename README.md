# ArmorCode email templates

ArmorCode's customer emails and PDF reports, rebuilt in one design system: the look of ArmorCode Zero's emails, in Zero's purple. Each template is written once, as content. The HTML and the plain text are both rendered from that content, so the two always say the same thing. The output keeps its **Velocity** placeholders, ready for the platform's Java backend to fill.

```bash
pnpm build
```

```bash
pnpm preview
```

- `pnpm build` writes `dist/<id>.html` and `dist/<id>.txt` for every email, `dist/pdf/<id>.html` for every PDF report, and `dist/emails.json` (each email's subject, preview line and placeholders). It also checks every template (see [Checks](#checks)) and regenerates the placeholder tables at the end of this README.
- `pnpm build` also writes `site/`, the preview as a static site that Cloudflare serves (see `wrangler.jsonc`). `site/` is committed, so Cloudflare needs no build step: after changing a template, run `pnpm build` and commit `site/` with it.
- `pnpm preview` serves http://localhost:4300. It lists every email in a Desktop (640px) or Phone (375px) frame, Light or Dark, with its plain text beside it, and every PDF report at A4 width. Only the preview fills placeholders, with sample values (John Smith at Example Corp). It restarts when a file in `src/` changes.

You need Node 24 or later, which runs the TypeScript directly. There are no dependencies.

## Layout

| Path | What's there |
|---|---|
| `src/tokens.ts` | Colors (light and dark), status tones, severity colors, type scale, spacing, radii, the subject limit |
| `src/escape.ts` | Safe HTML building: the `markup` tag escapes text, and `safeUrl` checks links |
| `src/placeholders.ts` | **Every Velocity construct the emails use.** Change the syntax here and nowhere else |
| `src/layout.ts` | The content model (`Email`, `Block`, `Rich`) and its two renderers, `toHtml` and `toText` |
| `src/template.ts` | `defineTemplate`, the shared fields, the email groups |
| `src/templates/` | One file per email, or per family of emails. `index.ts` lists them all |
| `src/pdf/` | The PDF reports: their print layout and one file each |
| `src/build.ts`, `src/check.ts`, `src/readme.ts` | The build and its checks, a check for one module, and this README's tables |
| `src/preview/` | The preview server and page, and `fill.ts`, which fills Velocity with the sample values |

## The design

Every email has the same shape:

```
[logo] ArmorCode                         brand row, outside the card
┌────────────────────────────────────┐
│ ● Eyebrow (status dot + 1–2 words) │   tone: accent | ok | warn | danger
│ Title (21px semibold)              │
│ Subtitle (optional, 13px muted)    │
│ blocks…                            │   text, quote, details, list, items, stats, risk, table
│ [ One primary button ]             │
│ Secondary link (optional)          │
└────────────────────────────────────┘
Why you got this email                   footer, outside the card
Notification settings (operational)
Terms · Privacy · ArmorCode Inc. address
```

Rules:

- **One primary action.** One button per email. Anything else is a quieter secondary link.
- **Subjects of 78 characters or fewer**, in sentence case, with no trailing period. The build checks the length with each email's sample values.
- **The footer says why the person got the email.** Every email has a `reason`.
- **Wells instead of borders.** Details, quotes and lists sit on the `well` background. Tables use one hairline between rows.
- **Colors only from the tokens.** Severity is a colored dot beside its name, never color alone.
- **Two kinds of footer.**
  - *Transactional* emails answer the person's own account or action (password reset, invite, exports, uploads). They have no notification settings link.
  - *Operational* emails are everything else. They say notifications are managed in ArmorCode's settings and link there.
  - Both kinds keep the platform's footer: Terms, Privacy and the Palo Alto address.
- **Dark mode.** The light colors are inline styles. A `prefers-color-scheme: dark` block overrides them through short class names (`zc`, `zk`, `zw`, `zf`, `zm`, `za`, `zb`, …). Clients that ignore the block show the light version, which reads fine everywhere.
- **Phone.** Below 620px the padding shrinks and stat rows stack.
- **Outlook.** Table layout, Arial instead of the system font stack, and a fixed 600px wrapper in MSO conditionals.
- **Plain text** is rendered from the same content as the HTML.

| Token | Light | Dark |
|---|---|---|
| canvas | `#ebeef3` | `#0a0b0e` |
| card | `#ffffff` | `#101216` |
| well | `#f4f5f6` | `#1c1e22` |
| fg | `#15181e` | `#eceef2` |
| muted | `#676a71` | `#9ea1a8` |
| line | `#ecedef` | `#212326` |
| accent | `#624cf5` | `#7c6bff` |
| link | `#4a35d6` | `#b3a9ff` |
| better / worse | `#157a41` / `#c4252b` | `#6fe0a2` / `#ff8a8f` |

Severity colors: Critical `#e5484d`, High `#f2711c`, Moderate/Medium `#e2a400`, Minimal/Low `#1f9d55`, Unrated `#a1a7b2`.

## Placeholders

The templates are **Velocity**, like today's template files in authserver and java-utils.

| In a template | Written as | Meaning |
|---|---|---|
| `v('username')` | `$!{username}` | A value. The quiet form `$!{}` prints nothing when the value is missing, instead of the raw reference |
| `v('finding.id')` | `$!{finding.id}` | A field of a value, or of the current loop item |
| `size('findings')` | `$!{findings.size()}` | A list's length |
| `present('x')` | `#if($x)` | The value is there: not null, not false, not empty |
| `above('n', 0)`, `equals('n', 1)`, `is('s', 'High')` | `#if($n && $n > 0)`, `#if($n == 1)`, `#if($s == "High")` | Comparisons |
| `when(cond, a, b)` | `#if(…)a#{else}b#{end}` | Inline conditional text |
| `when: cond` on a block or row | `#if(…)…#{end}` around it | An optional part |
| `each: loop('findings', 'finding')` | `#foreach($finding in $findings)…#{end}` | Repeated rows |
| `plain('runbook.name', 'Runbook')` | `${runbook.name:-Runbook}` | The background-jobs emails only. They're filled by plain `${name}` substitution, not Velocity, so they have no conditions or loops |

Conventions:

- **Names.** Today's names are kept wherever the email has one (`${username}`, `${amcUrl}`, `${assetUrl}`). In-code emails have no template today, so their placeholders are named after the values the code fills in (`{{assignerName}}` → `assignerName`). Those count as **Today**, because the backend already has the value; the code needs to pass it in under that name.
- **Links** are built the way today's emails build them, from fixed text and placeholders together: `url: [v('armorcodeServerUrl'), '/#/findings/', v('tenant'), '/', v('findingId')]`. A new URL placeholder is added only where today's email has no link and no route the template could build one from.
- **New placeholders** are values today's email doesn't carry, added to fix something: a link for a button that had none, the expiry the audit asked for, context like the inviter's name. Most are optional: the email works without them, and the part that uses them disappears. The tables below mark each one **New**.
- **Whitespace.** The plain text puts each `#if` and `#foreach` on a line of its own. Velocity 2.x removes such lines whole, which is its default (`space.gobbling = lines`). On Velocity 1.7 the plain text would keep some blank lines.
- **Escaping.** Velocity doesn't HTML-escape the values it fills in, and neither did today's templates. Names, comments and notes that people write can hold `<` and `&`. Set `ESCAPE_HTML` in `src/placeholders.ts` to `true` to write `$!esc.html($x)` in the HTML instead. The backend's Velocity context must then provide the EscapeTool as `esc`.

## Adding an email

1. Create `src/templates/<id>.ts`, or a file in the group's folder:

   ```ts
   export const myEmail = defineTemplate({
     id: 'my-email', name: 'My email', group: 'Findings & alerts',
     source: 'java-utils / SomeServiceImpl (in code)',
     who: 'Who gets it', when: 'When it is sent',
     fields: { thingName: { about: 'What it holds' }, thingUrl: { about: '…', isNew: true } },
     sample: { ...SAMPLE_BASE, thingName: 'example', thingUrl: `${SAMPLE_APP_URL}/things/1` },
     build: () => ({
       subject: [v('thingName'), ' changed'], preview: '…', eyebrow: 'Update', tone: 'accent',
       title: '…', blocks: [{ kind: 'text', text: '…' }],
       action: { label: 'View the thing', url: v('thingUrl') },
       reason: 'You got this email because …', footer: 'operational',
     }),
   });
   ```

2. Add it to `src/templates/index.ts`, or to its group's `index.ts`.
3. Run `node src/check.ts src/templates/<file>.ts --text` until it reports no problems, then look at it in `pnpm preview` at both widths and in both schemes.

## Checks

The build fails when an email:

- uses a placeholder its `fields` doesn't list, or lists one it doesn't use
- has no sample value for a required placeholder
- leaves Velocity unfilled, or uses Velocity the preview can't fill
- has a subject longer than 78 characters with its sample values
- is a background-jobs email (plain substitution) but uses `#if`, `#foreach` or `$!`

## Emails and their placeholders

<!-- placeholders:start (generated by src/readme.ts; edit the templates, not this) -->

68 emails and 4 PDF reports. 54 emails use at least one **New** placeholder: a value the backend has to start supplying.

### Account & access

#### Password reset (`password-reset`)

- **Subject:** Your ArmorCode password was reset

- **Who / when:** The person whose password was reset; Their ArmorCode password is reset

- **Today:** authserver, java-utils / UserServiceImpl · template/email/password-reset.html

- **Kind:** transactional



| Placeholder | Backend | Use | What it holds |
|---|---|---|---|
| `amcLogoUrl` | Today | Required | The ArmorCode mark (the circles, without the white wordmark, which vanishes on light backgrounds): host assets/armorcode-mark@2x.png, shown 28px high |
| `username` | Today | Required | Their ArmorCode user name |
| `newPassword` | Today | Required | The new password |
| `amcUrl` | Today | Required | The ArmorCode sign-in page |
| `passwordExpiresAt` | **New** | Optional | When the new password stops working, as text (“October 15, 2026 at 12:00 AM UTC”) |
| `mustChangePassword` | **New** | Optional | true when they must choose their own password at sign-in |
| `supportEmail` | **New** | Optional | Who to contact when sign-in fails, if not their administrator |

#### Username and password invite (`invite`)

- **Subject:** You’re invited to ArmorCode

- **Who / when:** Someone invited to ArmorCode with a user name and password; An administrator adds them to ArmorCode

- **Today:** authserver, java-utils / UserRegistrationServiceImpl · template/email/username-password-invite.html

- **Kind:** transactional



| Placeholder | Backend | Use | What it holds |
|---|---|---|---|
| `amcLogoUrl` | Today | Required | The ArmorCode mark (the circles, without the white wordmark, which vanishes on light backgrounds): host assets/armorcode-mark@2x.png, shown 28px high |
| `username` | Today | Required | Their ArmorCode user name |
| `password` | Today | Required | Their first password |
| `amcUrl` | Today | Required | The ArmorCode sign-in page |
| `inviterName` | **New** | Optional | Who invited them (“John Smith”) |
| `organizationName` | **New** | Optional | The organization they’re joining (“Example Corp”) |
| `roleName` | **New** | Optional | The role they’re given (“Security Analyst”) |
| `passwordExpiresAt` | **New** | Optional | When the first password stops working, as text |
| `mustChangePassword` | **New** | Optional | true when they must choose their own password at sign-in |
| `supportEmail` | **New** | Optional | Who to contact when sign-in fails, if not their administrator |

#### Access request after a failed sign-in (`login-request`)

- **Subject:** Access request from $!{requesterEmail}

- **Who / when:** Every administrator of the tenant; Someone without access tries to sign in, which raises an access request for the tenant

- **Today:** background-jobs / FailedLoginAccessRequestEventHandler (in code)

- **Kind:** operational



| Placeholder | Backend | Use | What it holds |
|---|---|---|---|
| `amcLogoUrl` | Today | Required | The ArmorCode mark (the circles, without the white wordmark, which vanishes on light backgrounds): host assets/armorcode-mark@2x.png, shown 28px high |
| `notificationSettingsUrl` | **New** | Required | ArmorCode’s notification settings page |
| `requesterEmail` | Today | Required | The email address they tried to sign in with |
| `accessRequestsUrl` | **New** | Required | Where administrators see access requests and manage users in ArmorCode |
| `tenantName` | **New** | Optional | The tenant (account) they asked to join (“Example Corp”) |
| `attemptedAt` | **New** | Optional | When they tried to sign in, as text (“October 28, 2026 at 9:14 AM UTC”) |

### Findings & alerts

#### Asset mention (`asset-mention`)

- **Subject:** $!{whoMentioned} mentioned you on $!{assetName}

- **Who / when:** The person mentioned; Someone mentions them in a comment on an asset

- **Today:** authserver, java-utils / AssetUpdateServiceImpl · template/email/asset-user-mention-notification-email.html

- **Kind:** operational



| Placeholder | Backend | Use | What it holds |
|---|---|---|---|
| `amcLogoUrl` | **New** | Required | The ArmorCode logo (this email had `${logoUrl}` at the bottom; the brand row uses `amcLogoUrl` like the others) |
| `notificationSettingsUrl` | **New** | Required | ArmorCode’s notification settings page |
| `whoMentioned` | Today | Required | Who mentioned them (“Jane Doe”) |
| `assetName` | Today | Required | The asset’s name |
| `assetUrl` | Today | Required | The asset in ArmorCode |
| `assetType` | **New** | Optional | The asset’s type (“Repository”, “Host”) |
| `mentionText` | **New** | Optional | What they wrote, as plain text |
| `mentionedAt` | **New** | Optional | When, as text (“October 14, 2026 at 3:42 PM UTC”) |
| `assetRiskRating` | **New** | Optional | The asset’s risk: Critical, High, Medium or Low |
| `assetOwner` | **New** | Optional | Who owns the asset |
| `assetTeam` | **New** | Optional | The team the asset belongs to |
| `openFindings` | **New** | Optional | How many open findings the asset has, as a number |

#### Finding assigned to you (`finding-assigned`)

- **Subject:** $!{assignerName} assigned you finding $!{findingId}

- **Who / when:** The person the finding was assigned to; Someone changes a finding’s owner to them

- **Today:** java-utils / EmailService.sendOwnerChangedEmail (in code)

- **Kind:** operational



| Placeholder | Backend | Use | What it holds |
|---|---|---|---|
| `amcLogoUrl` | Today | Required | The ArmorCode mark (the circles, without the white wordmark, which vanishes on light backgrounds): host assets/armorcode-mark@2x.png, shown 28px high |
| `notificationSettingsUrl` | **New** | Required | ArmorCode’s notification settings page |
| `armorcodeServerUrl` | Today | Required | ArmorCode’s address (“https://acme.armorcode.com”) |
| `tenant` | Today | Required | The tenant, as in finding links |
| `businessUnitId` | Today | Required | The business unit’s id, as in finding links |
| `assignerName` | Today | Required | Who assigned it (“Jane Doe”) |
| `findingId` | Today | Required | The finding’s id |
| `findingTitle` | **New** | Optional | The finding’s title |
| `findingSeverity` | **New** | Optional | The finding’s severity: Critical, High, Medium or Low |

#### Findings assigned to you (`finding-assigned-many`)

- **Subject:** $!{assignerName} assigned $!{findingCount} findings to you

- **Who / when:** The person the findings were assigned to; Someone changes the owner of several findings to them (for example through a proposed update)

- **Today:** java-utils / EmailService.sendOwnerChangedEmail (in code)

- **Kind:** operational



| Placeholder | Backend | Use | What it holds |
|---|---|---|---|
| `amcLogoUrl` | Today | Required | The ArmorCode mark (the circles, without the white wordmark, which vanishes on light backgrounds): host assets/armorcode-mark@2x.png, shown 28px high |
| `notificationSettingsUrl` | **New** | Required | ArmorCode’s notification settings page |
| `armorcodeServerUrl` | Today | Required | ArmorCode’s address (“https://acme.armorcode.com”) |
| `tenant` | Today | Required | The tenant, as in finding links |
| `businessUnitId` | Today | Required | The business unit’s id, as in finding links |
| `assignerName` | Today | Required | Who assigned them (“Jane Doe”) |
| `findingCount` | Today | Required | How many findings, as a number |
| `findings` | Today | Required | The findings, each with id (today’s {{findingId}}) |
| `findingIds` | **New** | Required | The findings’ ids, comma-separated (“48213,48214”), for the button’s filtered findings page, as the bulk email’s {{findingIds}} |

#### Findings assigned to you in bulk (`finding-assigned-bulk`)

- **Subject:** $!{assignerName} assigned findings to you

- **Who / when:** The person the findings were assigned to; A bulk owner change assigns many findings to them at once

- **Today:** java-utils / EmailService.sendBulkOwnerChangedEmail (in code)

- **Kind:** operational



| Placeholder | Backend | Use | What it holds |
|---|---|---|---|
| `amcLogoUrl` | Today | Required | The ArmorCode mark (the circles, without the white wordmark, which vanishes on light backgrounds): host assets/armorcode-mark@2x.png, shown 28px high |
| `notificationSettingsUrl` | **New** | Required | ArmorCode’s notification settings page |
| `armorcodeServerUrl` | Today | Required | ArmorCode’s address (“https://acme.armorcode.com”) |
| `tenant` | Today | Required | The tenant, as in finding links |
| `businessUnitId` | Today | Required | The business unit’s id, as in finding links |
| `assignerName` | Today | Required | Who assigned them (“Jane Doe”) |
| `findings` | Today | Required | The first 5 findings, as today, each with id (today’s {{findingId}}) |
| `pages` | Today | Required | Every finding, 100 per page, as today: each with pageStart, pageEnd and findingIds (that page’s ids, comma-separated, for the filtered findings page) |
| `findingsUrl` | **New** | Required | The findings page in ArmorCode, filtered to the findings they own (today’s email has no such link) |
| `findingCount` | **New** | Optional | How many findings were assigned, as a number |

#### Finding update needs your approval (`proposal-needs-approval`)

- **Subject:** Review $!{proposerName}’s proposal on finding $!{firstFindingId}#if($moreCount && $moreCount > 0) and $!{moreCount} more#{end}

- **Who / when:** The security owners or finding owners who must act on the proposal; Someone proposes a change to one or more findings that needs approval

- **Today:** java-utils / AbstractProposeFindingUpdateService (in code)

- **Kind:** operational



| Placeholder | Backend | Use | What it holds |
|---|---|---|---|
| `amcLogoUrl` | Today | Required | The ArmorCode mark (the circles, without the white wordmark, which vanishes on light backgrounds): host assets/armorcode-mark@2x.png, shown 28px high |
| `notificationSettingsUrl` | **New** | Required | ArmorCode’s notification settings page |
| `firstFindingId` | Today | Required | The first finding’s id, for the subject |
| `moreCount` | Today | Optional | How many findings besides the first, as a number (the N in today’s “And N More”); 0 or empty for one |
| `findings` | Today | Required | The findings, up to 100, as today’s table rows: each with id, title (cut to 150 characters), productName, subProductName, environmentName, and proposedAction |
| `serverUrl` | Today | Required | ArmorCode’s address (“https://acme.armorcode.com”) |
| `tenant` | Today | Required | The tenant, as in finding links |
| `businessUnitId` | Today | Required | The business unit’s id, as in finding links |
| `productLabel` | Today | Required | What the tenant calls a product (“Product”, “Application”) |
| `subProductLabel` | Today | Required | What the tenant calls a sub-product (“Sub-product”, “Component”) |
| `remainingCount` | Today | Optional | How many findings past the first 100 aren’t listed, as a number |
| `downloadLink` | Today | Optional | The full list as a CSV, when there are more than 100 findings |
| `proposerName` | Today | Required | Who proposed the change (“Jane Doe”) |
| `proposeStatusLabel` | Today | Required | What they proposed (“False positive”, “Accept risk”) |
| `notes` | Today | Optional | The note they wrote with the proposal |
| `reviewUrl` | **New** | Required | Where they approve or reject proposals in ArmorCode (Findings Under Review) |

#### Finding proposal approved or rejected (`proposal-decided`)

- **Subject:** Your proposal on finding $!{firstFindingId}#if($moreCount && $moreCount > 0) and $!{moreCount} more#{end} was #if($decision == "Approved")approved#elseif($decision == "Rejected")rejected#{else}$!{decision}#{end}

- **Who / when:** The person who proposed the change; A security owner approves or rejects their proposed change to findings

- **Today:** java-utils / AbstractProposeFindingUpdateService (in code)

- **Kind:** operational



| Placeholder | Backend | Use | What it holds |
|---|---|---|---|
| `amcLogoUrl` | Today | Required | The ArmorCode mark (the circles, without the white wordmark, which vanishes on light backgrounds): host assets/armorcode-mark@2x.png, shown 28px high |
| `notificationSettingsUrl` | **New** | Required | ArmorCode’s notification settings page |
| `firstFindingId` | Today | Required | The first finding’s id, for the subject |
| `moreCount` | Today | Optional | How many findings besides the first, as a number (the N in today’s “And N More”); 0 or empty for one |
| `findings` | Today | Required | The findings, up to 100, as today’s table rows: each with id, title (cut to 150 characters), productName, subProductName, environmentName, and proposedAction |
| `serverUrl` | Today | Required | ArmorCode’s address (“https://acme.armorcode.com”) |
| `tenant` | Today | Required | The tenant, as in finding links |
| `businessUnitId` | Today | Required | The business unit’s id, as in finding links |
| `productLabel` | Today | Required | What the tenant calls a product (“Product”, “Application”) |
| `subProductLabel` | Today | Required | What the tenant calls a sub-product (“Sub-product”, “Component”) |
| `remainingCount` | Today | Optional | How many findings past the first 100 aren’t listed, as a number |
| `downloadLink` | Today | Optional | The full list as a CSV, when there are more than 100 findings |
| `decision` | Today | Required | Approved or Rejected |
| `actorName` | Today | Required | Who approved or rejected it (“John Smith”) |
| `notes` | Today | Optional | The note they wrote with their decision |
| `findingIds` | **New** | Required | The listed findings’ ids, comma-separated (“48213,48214”), for the button’s filtered findings page, as the bulk owner-change email’s {{findingIds}} |

#### Alert triggered (`alert-triggered`)

- **Subject:** #if($alertTitle)Alert: $!{alertTitle}#{else}An ArmorCode alert was triggered#{end}

- **Who / when:** People subscribed to the alert; An alert fires and raises a notification for a product, sub-product or environment

- **Today:** java-utils / AlertServiceImpl (in code)

- **Kind:** operational



| Placeholder | Backend | Use | What it holds |
|---|---|---|---|
| `amcLogoUrl` | Today | Required | The ArmorCode mark (the circles, without the white wordmark, which vanishes on light backgrounds): host assets/armorcode-mark@2x.png, shown 28px high |
| `notificationSettingsUrl` | **New** | Required | ArmorCode’s notification settings page |
| `alertTitle` | Today | Optional | The alert’s title |
| `alertId` | Today | Required | The alert’s id |
| `description` | Today | Required | The alert’s description |
| `accountName` | Today | Required | The tenant (account) |
| `businessUnitName` | Today | Required | The organization (business unit) |
| `productName` | Today | Optional | The product |
| `subProductName` | Today | Optional | The sub-product |
| `environmentName` | Today | Optional | The environment |
| `urlLink` | Today | Optional | The alert’s custom link, when it has one |
| `urlText` | Today | Optional | The custom link’s text |
| `notificationLink` | Today | Required | The notification in ArmorCode |
| `alertRef` | Today | Required | The notification’s reference (“A-123”) |

#### Alert triggered: proposed action (`alert-propose-action`)

- **Subject:** Alert: $!{alertTitle}

- **Who / when:** The tenant’s team administrators; An alert tied to a proposed finding action fires

- **Today:** java-utils / AlertServiceImpl (in code)

- **Kind:** operational



| Placeholder | Backend | Use | What it holds |
|---|---|---|---|
| `amcLogoUrl` | Today | Required | The ArmorCode mark (the circles, without the white wordmark, which vanishes on light backgrounds): host assets/armorcode-mark@2x.png, shown 28px high |
| `notificationSettingsUrl` | **New** | Required | ArmorCode’s notification settings page |
| `alertTitle` | Today | Required | The alert’s title |
| `status` | Today | Required | The alert’s status |
| `description` | Today | Required | The alert’s description |
| `notificationLink` | **New** | Required | The notification in ArmorCode |

#### CISA KEV vulnerabilities found (`cisa-kev-found`)

- **Subject:** Action needed: findings match the latest CISA KEV release in $!{tenantName}

- **Who / when:** Every account-level (tenant) user; ArmorCode processes a new CISA KEV release and findings in the tenant match it

- **Today:** java-utils / CISAKEVEventProcessor (in code)

- **Kind:** operational



| Placeholder | Backend | Use | What it holds |
|---|---|---|---|
| `amcLogoUrl` | Today | Required | The ArmorCode mark (the circles, without the white wordmark, which vanishes on light backgrounds): host assets/armorcode-mark@2x.png, shown 28px high |
| `notificationSettingsUrl` | **New** | Required | ArmorCode’s notification settings page |
| `tenantName` | Today | Required | The tenant (environment) checked (“Example Corp”) |
| `cves` | Today | Required | The CVEs in CISA’s latest release, as today: each with cveId and dueDate |
| `unresolvedBusinessUnits` | Today | Optional | Business units with unresolved matching findings: each with businessUnitName and cveFindingFilterLink, as today |
| `resolvedBusinessUnits` | Today | Optional | Business units with resolved matching findings: each with businessUnitName and cveFindingFilterLink, as today |
| `armorcodeServerUrl` | **New** | Required | ArmorCode’s address (“https://acme.armorcode.com”), as other emails have it; the button opens its findings page, where the CVE filter finds these |

#### CISA KEV vulnerabilities: none found (`cisa-kev-none`)

- **Subject:** No findings match the latest CISA KEV release in $!{tenantName}

- **Who / when:** Every account-level (tenant) user; ArmorCode processes a new CISA KEV release and no findings in the tenant match it

- **Today:** java-utils / CISAKEVEventProcessor (in code)

- **Kind:** operational



| Placeholder | Backend | Use | What it holds |
|---|---|---|---|
| `amcLogoUrl` | Today | Required | The ArmorCode mark (the circles, without the white wordmark, which vanishes on light backgrounds): host assets/armorcode-mark@2x.png, shown 28px high |
| `notificationSettingsUrl` | **New** | Required | ArmorCode’s notification settings page |
| `tenantName` | Today | Required | The tenant (environment) checked (“Example Corp”) |
| `cves` | Today | Required | The CVEs in CISA’s latest release, as today: each with cveId and dueDate |

#### Notification (`notification`)

- **Subject:** $!{notificationTitle}

- **Who / when:** People subscribed to the notification configuration; A notification event fires and email is turned on for its severity

- **Today:** java-utils / NotificationEventHandler (in code)

- **Kind:** operational



| Placeholder | Backend | Use | What it holds |
|---|---|---|---|
| `amcLogoUrl` | Today | Required | The ArmorCode mark (the circles, without the white wordmark, which vanishes on light backgrounds): host assets/armorcode-mark@2x.png, shown 28px high |
| `notificationSettingsUrl` | **New** | Required | ArmorCode’s notification settings page |
| `notificationTitle` | Today | Required | The notification’s title |
| `description` | Today | Required | What happened; any links are written into it |
| `notificationUrl` | **New** | Required | The notification in ArmorCode |
| `severity` | **New** | Optional | The notification’s severity: Critical, High, Medium or Low |

### Reports & sharing

#### Scheduled dashboard report (`dashboard-report`)

- **Subject:** Scheduled dashboard report: $!{dashboardName}

- **Who / when:** The report’s recipients: its email list plus anyone resolved from its responsibility-based recipients; A dashboard report runs on its schedule (daily, weekly or monthly) and has no custom email message

- **Today:** java-utils / DashboardEmailSender (in code)

- **Kind:** operational



| Placeholder | Backend | Use | What it holds |
|---|---|---|---|
| `amcLogoUrl` | Today | Required | The ArmorCode mark (the circles, without the white wordmark, which vanishes on light backgrounds): host assets/armorcode-mark@2x.png, shown 28px high |
| `notificationSettingsUrl` | **New** | Required | ArmorCode’s notification settings page |
| `dashboardName` | Today | Required | The dashboard’s name |
| `dashboardUrl` | Today | Required | The live dashboard in ArmorCode (today’s “View Full Dashboard on ArmorCode Platform” link) |

#### Scheduled dashboard report (custom message) (`dashboard-report-custom`)

- **Subject:** #if($customEmailSubject)$!{customEmailSubject}#{else}Scheduled dashboard report: $!{dashboardName}#{end}

- **Who / when:** The report’s recipients: its email list plus anyone resolved from its responsibility-based recipients; A dashboard report runs on its schedule and its owner set a custom email subject or message

- **Today:** java-utils / DashboardEmailSender (in code)

- **Kind:** operational



| Placeholder | Backend | Use | What it holds |
|---|---|---|---|
| `amcLogoUrl` | Today | Required | The ArmorCode mark (the circles, without the white wordmark, which vanishes on light backgrounds): host assets/armorcode-mark@2x.png, shown 28px high |
| `notificationSettingsUrl` | **New** | Required | ArmorCode’s notification settings page |
| `dashboardName` | Today | Required | The dashboard’s name |
| `dashboardUrl` | Today | Required | The live dashboard in ArmorCode (today’s “View Full Dashboard on ArmorCode Platform” link) |
| `customEmailSubject` | Today | Optional | The subject the report’s owner wrote; the default subject when empty |
| `customEmailBody` | Today | Optional | The message the report’s owner wrote. Rendered from markdown today: give it as already-rendered HTML |

#### Custom dashboard shared (`dashboard-shared`)

- **Subject:** $!{sharerDisplayName} shared a custom dashboard with you

- **Who / when:** The newly added users, or the shared teams’ email aliases; Someone shares a custom dashboard with new users or teams

- **Today:** java-utils / CustomDashboardServiceImpl (in code)

- **Kind:** operational



| Placeholder | Backend | Use | What it holds |
|---|---|---|---|
| `amcLogoUrl` | Today | Required | The ArmorCode mark (the circles, without the white wordmark, which vanishes on light backgrounds): host assets/armorcode-mark@2x.png, shown 28px high |
| `notificationSettingsUrl` | **New** | Required | ArmorCode’s notification settings page |
| `sharerDisplayName` | Today | Required | Who shared it (“Jane Doe”) |
| `businessUnitName` | Today | Required | The organization (business unit) |
| `dashboardName` | Today | Required | The dashboard’s name |
| `dashboardUrl` | Today | Required | The dashboard in ArmorCode (today’s “Click here to access dashboard” link) |

#### Compliance assessments report ready (`compliance-assessments`)

- **Subject:** Your compliance assessments report is ready

- **Who / when:** The people set up to receive the report; A compliance assessments report finishes generating

- **Today:** background-jobs / ReportsApplicationEventHandler (in code)

- **Kind:** operational



| Placeholder | Backend | Use | What it holds |
|---|---|---|---|
| `amcLogoUrl` | Today | Required | The ArmorCode mark (the circles, without the white wordmark, which vanishes on light backgrounds): host assets/armorcode-mark@2x.png, shown 28px high |
| `notificationSettingsUrl` | **New** | Required | ArmorCode’s notification settings page |
| `assessmentsUrl` | Today | Required | The report in ArmorCode (today’s “click here for Assessments” link) |

#### Saved findings view report (CSV attached) (`saved-view-report`)

- **Subject:** #if($customEmailSubject)$!{customEmailSubject}#{else}Findings view report: $!{savedSearchName}#{end}

- **Who / when:** The people the view is shared with, or the scheduled report’s recipients; A saved findings view is shared or its schedule runs, and the results are small enough to attach as a CSV

- **Today:** java-utils / SavedSearchServiceImpl, EmailService.sendSearchReportShareEmail (in code)

- **Kind:** operational



| Placeholder | Backend | Use | What it holds |
|---|---|---|---|
| `amcLogoUrl` | Today | Required | The ArmorCode mark (the circles, without the white wordmark, which vanishes on light backgrounds): host assets/armorcode-mark@2x.png, shown 28px high |
| `notificationSettingsUrl` | **New** | Required | ArmorCode’s notification settings page |
| `savedSearchName` | Today | Required | The saved findings view’s name |
| `viewUrl` | Today | Required | The view in ArmorCode (today’s “clicking this link” link) |
| `customEmailSubject` | Today | Optional | The subject the tenant configured for these reports; the default subject when empty |
| `customMessage` | Today | Optional | The message configured for the report, when there is one. Rendered from markdown today: give it as already-rendered HTML |
| `findings` | **New** | Required | Up to 10 findings matching the view, each with `id` (today’s findingId) and `summary` (new: the values of the selected export columns, joined with “ · ”). Today each value has a column of its own |
| `columnNames` | **New** | Optional | The selected export columns, joined with “, ” (today they are the table’s column headers) |

#### Saved findings view report (download link) (`saved-view-report-link`)

- **Subject:** #if($customEmailSubject)$!{customEmailSubject}#{else}Findings view report: $!{savedSearchName}#{end}

- **Who / when:** The people the view is shared with, or the scheduled report’s recipients; A saved findings view is shared or its schedule runs, and the results are too large to attach

- **Today:** java-utils / SavedSearchServiceImpl, EmailService.sendSearchReportShareEmail (in code)

- **Kind:** operational



| Placeholder | Backend | Use | What it holds |
|---|---|---|---|
| `amcLogoUrl` | Today | Required | The ArmorCode mark (the circles, without the white wordmark, which vanishes on light backgrounds): host assets/armorcode-mark@2x.png, shown 28px high |
| `notificationSettingsUrl` | **New** | Required | ArmorCode’s notification settings page |
| `savedSearchName` | Today | Required | The saved findings view’s name |
| `viewUrl` | Today | Required | The view in ArmorCode (today’s “clicking this link” link) |
| `customEmailSubject` | Today | Optional | The subject the tenant configured for these reports; the default subject when empty |
| `customMessage` | Today | Optional | The message configured for the report, when there is one. Rendered from markdown today: give it as already-rendered HTML |
| `findings` | **New** | Required | Up to 10 findings matching the view, each with `id` (today’s findingId) and `summary` (new: the values of the selected export columns, joined with “ · ”). Today each value has a column of its own |
| `columnNames` | **New** | Optional | The selected export columns, joined with “, ” (today they are the table’s column headers) |
| `downloadUrl` | Today | Required | The full CSV to download; the link expires (today’s “download the file using this link” link) |
| `expirationTimeInHours` | Today | Required | How many hours the download link works, as a number |

#### Saved search shared (`saved-search-shared`)

- **Subject:** $!{sharerDisplayName} shared a saved search with you

- **Who / when:** The newly added users, or the shared teams’ email aliases; Someone shares a saved findings or tickets search with new users or teams

- **Today:** java-utils / SavedSearchServiceImpl (in code)

- **Kind:** operational



| Placeholder | Backend | Use | What it holds |
|---|---|---|---|
| `amcLogoUrl` | Today | Required | The ArmorCode mark (the circles, without the white wordmark, which vanishes on light backgrounds): host assets/armorcode-mark@2x.png, shown 28px high |
| `notificationSettingsUrl` | **New** | Required | ArmorCode’s notification settings page |
| `sharerDisplayName` | Today | Required | Who shared it (“Jane Doe”) |
| `businessUnitName` | Today | Required | The organization (business unit) |
| `savedSearchName` | Today | Required | The saved search’s name |
| `savedSearchUrl` | Today | Required | The saved search in ArmorCode (today’s “Click here to access saved search” link) |

#### Scheduled report (and daily or weekly digest) (`scheduled-report`)

- **Subject:** $!{reportName} for $!{reportDate}

- **Who / when:** The report’s recipient email list; A scheduled notification report runs, including the daily and weekly digests

- **Today:** java-utils / NotificationReportServiceImpl (in code)

- **Kind:** operational



| Placeholder | Backend | Use | What it holds |
|---|---|---|---|
| `amcLogoUrl` | Today | Required | The ArmorCode mark (the circles, without the white wordmark, which vanishes on light backgrounds): host assets/armorcode-mark@2x.png, shown 28px high |
| `notificationSettingsUrl` | **New** | Required | ArmorCode’s notification settings page |
| `reportName` | Today | Required | The report’s name |
| `reportDate` | Today | Required | The day it ran, as MM-dd-yyyy (today’s {{MM-dd-yyyy}}) |
| `reportDescription` | Today | Optional | The report’s description and filter summary, as the HTML the backend builds today |
| `widgets` | Today | Required | The report’s widgets, in layout order, each with `name` (today’s widgetName) |
| `resourcesUrl` | Today | Required | The help page about the report’s widgets (today’s “resources” link) |
| `unsubscribeUrl` | Today | Required | Where they edit or end this subscription (today’s “You may edit this subscription here” link) |
| `tenantFooterMessage` | Today | Optional | The tenant’s footer message, as plain text |
| `reportUrl` | **New** | Required | The report’s widgets in ArmorCode, for the button (today the widgets are drawn in the email) |
| `pdfAttached` | **New** | Optional | true when the report’s PDF is attached: when the body is large, and always for the daily and weekly digests |

#### Saved ticket search report (`ticket-search-report`)

- **Subject:** #if($frequency)$!{frequency} ticket search report: #{else}Ticket search report: #{end}$!{savedSearchName}

- **Who / when:** The people the search is shared with, or the scheduled report’s recipients; A saved ticket search is shared or its schedule runs

- **Today:** java-utils / SavedSearchServiceImpl, EmailService.sendTicketSearchReportShareEmail (in code)

- **Kind:** operational



| Placeholder | Backend | Use | What it holds |
|---|---|---|---|
| `amcLogoUrl` | Today | Required | The ArmorCode mark (the circles, without the white wordmark, which vanishes on light backgrounds): host assets/armorcode-mark@2x.png, shown 28px high |
| `notificationSettingsUrl` | **New** | Required | ArmorCode’s notification settings page |
| `frequency` | Today | Optional | How often the report runs: “Daily”, “Weekly” or “Monthly” (today’s {{Daily\|Weekly\|Monthly}}) |
| `savedSearchName` | Today | Required | The saved ticket search’s name |
| `ticketsUrl` | Today | Required | The ticket listing in ArmorCode (today’s “here” link) |
| `noTicketsFound` | **New** | Optional | true when no tickets match the search, so no CSV is attached (today the backend picks the “No Tickets found” text) |

#### Search result shared (`search-result-shared`)

- **Subject:** $!{sharerName} shared a search result with you

- **Who / when:** The person the search result is shared with; Someone shares a search result with them, optionally with a note

- **Today:** java-utils / EmailService.sendSearchShareEmail (in code)

- **Kind:** operational



| Placeholder | Backend | Use | What it holds |
|---|---|---|---|
| `amcLogoUrl` | Today | Required | The ArmorCode mark (the circles, without the white wordmark, which vanishes on light backgrounds): host assets/armorcode-mark@2x.png, shown 28px high |
| `notificationSettingsUrl` | **New** | Required | ArmorCode’s notification settings page |
| `sharerName` | Today | Required | Who shared it (“Jane Doe”) |
| `note` | Today | Optional | The note they added, as plain text |
| `searchResultUrl` | Today | Required | The search results in ArmorCode (today’s “Click here to view the search results” link) |

### Exports

#### Findings CSV ready (`findings-csv-ready`)

- **Subject:** Your findings CSV is ready to download

- **Who / when:** The person who requested the export; A findings CSV export someone requested has finished

- **Today:** java-utils / FindingDownloadServiceImpl (in code)

- **Kind:** transactional



| Placeholder | Backend | Use | What it holds |
|---|---|---|---|
| `amcLogoUrl` | Today | Required | The ArmorCode mark (the circles, without the white wordmark, which vanishes on light backgrounds): host assets/armorcode-mark@2x.png, shown 28px high |
| `downloadLink` | Today | Required | The file to download; the link stops working after a while |
| `expiryInHours` | Today | Required | How many hours the download link works, as a number (“24”) |

#### Advanced Search export ready (`advanced-search-export-ready`)

- **Subject:** Your Advanced Search CSV export is ready to download

- **Who / when:** The person who requested the export; A CSV export from the Advanced Search Result widget has finished

- **Today:** java-utils / AdvancedSearchExportOrchestrationServiceImpl (in code)

- **Kind:** transactional



| Placeholder | Backend | Use | What it holds |
|---|---|---|---|
| `amcLogoUrl` | Today | Required | The ArmorCode mark (the circles, without the white wordmark, which vanishes on light backgrounds): host assets/armorcode-mark@2x.png, shown 28px high |
| `downloadLink` | Today | Required | The file to download; the link stops working after a while |

#### Advanced Search export failed (`advanced-search-export-failed`)

- **Subject:** Your Advanced Search CSV export failed

- **Who / when:** The person who requested the export; A CSV export from the Advanced Search Result widget fails

- **Today:** java-utils / AdvancedSearchExportOrchestrationServiceImpl (in code)

- **Kind:** transactional



| Placeholder | Backend | Use | What it holds |
|---|---|---|---|
| `amcLogoUrl` | Today | Required | The ArmorCode mark (the circles, without the white wordmark, which vanishes on light backgrounds): host assets/armorcode-mark@2x.png, shown 28px high |
| `exportPageUrl` | **New** | Required | Where to export again in ArmorCode: the Advanced Search Result widget (today's email has no link) |

#### Asset data CSV ready (`asset-csv-ready`)

- **Subject:** Your asset data CSV is ready to download

- **Who / when:** The person who requested the export; An asset-data CSV export someone requested has finished

- **Today:** java-utils / AssetDownloadServiceImpl (in code)

- **Kind:** transactional



| Placeholder | Backend | Use | What it holds |
|---|---|---|---|
| `amcLogoUrl` | Today | Required | The ArmorCode mark (the circles, without the white wordmark, which vanishes on light backgrounds): host assets/armorcode-mark@2x.png, shown 28px high |
| `downloadLink` | Today | Required | The file to download; the link stops working after a while |
| `expiryInHours` | Today | Required | How many hours the download link works, as a number (“24”) |

#### Tickets CSV ready (`tickets-csv-ready`)

- **Subject:** Your tickets CSV is ready to download

- **Who / when:** The person who requested the export; A tickets CSV export someone requested has finished

- **Today:** java-utils / TicketServiceImpl (in code)

- **Kind:** transactional



| Placeholder | Backend | Use | What it holds |
|---|---|---|---|
| `amcLogoUrl` | Today | Required | The ArmorCode mark (the circles, without the white wordmark, which vanishes on light backgrounds): host assets/armorcode-mark@2x.png, shown 28px high |
| `downloadLink` | Today | Required | The file to download; the link stops working after a while |

#### SBOM ready (`sbom-ready`)

- **Subject:** The SBOM for $!{applicationName} is ready to download

- **Who / when:** The person who requested the export; An SBOM export for one application has finished

- **Today:** java-utils / SBOMExportServiceImpl (in code)

- **Kind:** transactional



| Placeholder | Backend | Use | What it holds |
|---|---|---|---|
| `amcLogoUrl` | Today | Required | The ArmorCode mark (the circles, without the white wordmark, which vanishes on light backgrounds): host assets/armorcode-mark@2x.png, shown 28px high |
| `applicationName` | Today | Required | The application the SBOM is for |
| `downloadLink` | Today | Required | The file to download; the link stops working after a while |
| `expiryInHours` | Today | Required | How many hours the download link works, as a number (“24”) |

#### Composite SBOM ready (`composite-sbom-ready`)

- **Subject:** The composite SBOM for $!{rootName} is ready to download

- **Who / when:** The person who requested the export; A composite SBOM export has finished

- **Today:** java-utils / SBOMExportServiceImpl (in code)

- **Kind:** transactional



| Placeholder | Backend | Use | What it holds |
|---|---|---|---|
| `amcLogoUrl` | Today | Required | The ArmorCode mark (the circles, without the white wordmark, which vanishes on light backgrounds): host assets/armorcode-mark@2x.png, shown 28px high |
| `rootName` | Today | Required | What the composite SBOM is rooted at (its top-level product or application) |
| `downloadLink` | Today | Required | The file to download; the link stops working after a while |
| `expiryInHours` | Today | Required | How many hours the download link works, as a number (“24”) |

#### Discovered security tools CSV ready (`discovered-tools-csv-ready`)

- **Subject:** Your discovered security tools CSV is ready to download

- **Who / when:** The person who requested the export; A CSV of discovered security tools someone requested has finished

- **Today:** java-utils / ToolDiscoveryServiceImpl (in code)

- **Kind:** transactional



| Placeholder | Backend | Use | What it holds |
|---|---|---|---|
| `amcLogoUrl` | Today | Required | The ArmorCode mark (the circles, without the white wordmark, which vanishes on light backgrounds): host assets/armorcode-mark@2x.png, shown 28px high |
| `downloadLink` | Today | Required | The file to download; the link stops working after a while |
| `expiryInHours` | Today | Required | How many hours the download link works, as a number (“24”) |

#### Engagement report ready (`engagement-report-ready`)

- **Subject:** Your engagement report is ready to download

- **Who / when:** The person who requested the report; An engagement report someone requested has finished generating

- **Today:** java-utils / EngagementReportJob (in code)

- **Kind:** transactional



| Placeholder | Backend | Use | What it holds |
|---|---|---|---|
| `amcLogoUrl` | Today | Required | The ArmorCode mark (the circles, without the white wordmark, which vanishes on light backgrounds): host assets/armorcode-mark@2x.png, shown 28px high |
| `downloadLink` | Today | Required | The file to download; the link stops working after a while |
| `expiryInHours` | Today | Required | How many hours the download link works, as a number (“24”) |

#### Products CSV ready (`products-csv-ready`)

- **Subject:** Your products CSV is ready to download

- **Who / when:** The person who requested the export; A products CSV export someone requested has finished

- **Today:** java-utils / BulkProductServiceImpl (in code)

- **Kind:** transactional



| Placeholder | Backend | Use | What it holds |
|---|---|---|---|
| `amcLogoUrl` | Today | Required | The ArmorCode mark (the circles, without the white wordmark, which vanishes on light backgrounds): host assets/armorcode-mark@2x.png, shown 28px high |
| `downloadLink` | Today | Required | The file to download; the link stops working after a while |

#### Sub-products CSV ready (`sub-products-csv-ready`)

- **Subject:** Your sub-products CSV is ready to download

- **Who / when:** The person who requested the export; A sub-products CSV export someone requested has finished

- **Today:** java-utils / BulkSubProductServiceImpl (in code)

- **Kind:** transactional



| Placeholder | Backend | Use | What it holds |
|---|---|---|---|
| `amcLogoUrl` | Today | Required | The ArmorCode mark (the circles, without the white wordmark, which vanishes on light backgrounds): host assets/armorcode-mark@2x.png, shown 28px high |
| `downloadLink` | Today | Required | The file to download; the link stops working after a while |

#### Audit log export ready (`audit-log-export-ready`)

- **Subject:** Your audit log export is ready to download

- **Who / when:** The person who requested the export; An audit log export someone requested has finished

- **Today:** background-jobs / AuditLogExportJobProcessor (in code)

- **Kind:** transactional



| Placeholder | Backend | Use | What it holds |
|---|---|---|---|
| `amcLogoUrl` | Today | Required | The ArmorCode mark (the circles, without the white wordmark, which vanishes on light backgrounds): host assets/armorcode-mark@2x.png, shown 28px high |
| `downloadLink` | Today | Required | The file to download; the link stops working after a while |
| `expiryInHours` | Today | Required | How many hours the download link works, as a number (“24”) |

#### Audit log export failed (too large) (`audit-log-export-too-large`)

- **Subject:** Your audit log export failed: it’s over the size limit

- **Who / when:** The person who requested the export; An audit log export fails because the download would exceed the size limit

- **Today:** background-jobs / AuditLogExportJobProcessor (in code)

- **Kind:** transactional



| Placeholder | Backend | Use | What it holds |
|---|---|---|---|
| `amcLogoUrl` | Today | Required | The ArmorCode mark (the circles, without the white wordmark, which vanishes on light backgrounds): host assets/armorcode-mark@2x.png, shown 28px high |
| `errorMessage` | Today | Required | The error the export stopped with, as the backend reports it (technical) |
| `exportPageUrl` | **New** | Required | Where to export again in ArmorCode: the audit log page (today's email has no link) |

#### Audit log export failed (`audit-log-export-failed`)

- **Subject:** Your audit log export failed

- **Who / when:** The person who requested the export; An audit log export fails with an unexpected error

- **Today:** background-jobs / AuditLogExportJobProcessor (in code)

- **Kind:** transactional



| Placeholder | Backend | Use | What it holds |
|---|---|---|---|
| `amcLogoUrl` | Today | Required | The ArmorCode mark (the circles, without the white wordmark, which vanishes on light backgrounds): host assets/armorcode-mark@2x.png, shown 28px high |
| `exportPageUrl` | **New** | Required | Where to export again in ArmorCode: the audit log page (today's email has no link) |

#### Audit log CSV export failed (`audit-log-csv-export-failed`)

- **Subject:** Your audit log CSV export failed

- **Who / when:** The person who requested the export; An audit log CSV export fails to process

- **Today:** java-utils / AuditLogCsvExportServiceImpl (in code)

- **Kind:** transactional



| Placeholder | Backend | Use | What it holds |
|---|---|---|---|
| `amcLogoUrl` | Today | Required | The ArmorCode mark (the circles, without the white wordmark, which vanishes on light backgrounds): host assets/armorcode-mark@2x.png, shown 28px high |
| `exportPageUrl` | **New** | Required | Where to export again in ArmorCode: the audit log page (today's email has no link) |

#### AI inventory export ready (`ai-inventory-export-ready`)

- **Subject:** Your AI inventory CSV export is ready to download

- **Who / when:** The person who requested the export; An AI inventory CSV export (summary or detailed) someone requested has finished

- **Today:** background-jobs / AiInventoryExportJFCJob (in code)

- **Kind:** transactional



| Placeholder | Backend | Use | What it holds |
|---|---|---|---|
| `amcLogoUrl` | Today | Required | The ArmorCode mark (the circles, without the white wordmark, which vanishes on light backgrounds): host assets/armorcode-mark@2x.png, shown 28px high |
| `exportType` | Today | Required | Which export: “Summary” or “Detailed” |
| `downloadLink` | Today | Required | The file to download; the link stops working after a while |
| `expiryInHours` | Today | Required | How many hours the download link works, as a number (“24”) |

#### AI inventory export failed (`ai-inventory-export-failed`)

- **Subject:** Your AI inventory CSV export failed

- **Who / when:** The person who requested the export; An AI inventory CSV export fails

- **Today:** background-jobs / AiInventoryExportJFCJob (in code)

- **Kind:** transactional



| Placeholder | Backend | Use | What it holds |
|---|---|---|---|
| `amcLogoUrl` | Today | Required | The ArmorCode mark (the circles, without the white wordmark, which vanishes on light backgrounds): host assets/armorcode-mark@2x.png, shown 28px high |
| `exportPageUrl` | **New** | Required | Where to export again in ArmorCode: the AI inventory page (today's email has no link) |

#### Component export ready (`component-export-ready`)

- **Subject:** Your component CSV export is ready to download

- **Who / when:** The person who requested the export; A component CSV export someone requested has finished

- **Today:** background-jobs / ComponentExportJob (in code)

- **Kind:** transactional



| Placeholder | Backend | Use | What it holds |
|---|---|---|---|
| `amcLogoUrl` | Today | Required | The ArmorCode mark (the circles, without the white wordmark, which vanishes on light backgrounds): host assets/armorcode-mark@2x.png, shown 28px high |
| `downloadLink` | Today | Required | The file to download |

#### Component export failed (`component-export-failed`)

- **Subject:** Your component CSV export failed

- **Who / when:** The person who requested the export; A component CSV export fails

- **Today:** background-jobs / ComponentExportJob (in code)

- **Kind:** transactional



| Placeholder | Backend | Use | What it holds |
|---|---|---|---|
| `amcLogoUrl` | Today | Required | The ArmorCode mark (the circles, without the white wordmark, which vanishes on light backgrounds): host assets/armorcode-mark@2x.png, shown 28px high |
| `exportPageUrl` | **New** | Required | Where to export again in ArmorCode: the components page (today's email has no link) |

#### Findings under review export ready (`findings-under-review-export-ready`)

- **Subject:** Your findings under review export is ready to download

- **Who / when:** The person who requested the export; A Findings Under Review export someone requested has finished

- **Today:** background-jobs / FindingUnderReviewExportJob (in code)

- **Kind:** transactional



| Placeholder | Backend | Use | What it holds |
|---|---|---|---|
| `amcLogoUrl` | Today | Required | The ArmorCode mark (the circles, without the white wordmark, which vanishes on light backgrounds): host assets/armorcode-mark@2x.png, shown 28px high |
| `downloadLink` | Today | Required | The file to download; the link stops working after a while |
| `expiryInHours` | Today | Required | How many hours the download link works, as a number (“24”) |

#### Findings under review export failed (`findings-under-review-export-failed`)

- **Subject:** Your findings under review export failed

- **Who / when:** The person who requested the export; A Findings Under Review export fails to process

- **Today:** background-jobs / FindingUnderReviewExportJob (in code)

- **Kind:** transactional



| Placeholder | Backend | Use | What it holds |
|---|---|---|---|
| `amcLogoUrl` | Today | Required | The ArmorCode mark (the circles, without the white wordmark, which vanishes on light backgrounds): host assets/armorcode-mark@2x.png, shown 28px high |
| `exportPageUrl` | **New** | Required | Where to export again in ArmorCode: the Findings Under Review page (today's email has no link) |

### Uploads

#### Product bulk upload result (create) (`product-upload-created`)

- **Subject:** $!{fileName}: $!{successCount} of $!{totalCount} products created

- **Who / when:** The person who uploaded the file; A bulk product-creation CSV upload has finished processing

- **Today:** java-utils / ProductFileUploadNotifier; background-jobs / BulkProductCreateJob, BulkProductCreateJobProcessor (in code)

- **Kind:** transactional



| Placeholder | Backend | Use | What it holds |
|---|---|---|---|
| `amcLogoUrl` | Today | Required | The ArmorCode mark (the circles, without the white wordmark, which vanishes on light backgrounds): host assets/armorcode-mark@2x.png, shown 28px high |
| `fileName` | Today | Required | The uploaded file’s name |
| `totalCount` | Today | Required | How many products the file had, as a number |
| `successCount` | Today | Required | How many were created, as a number |
| `failedCount` | Today | Required | How many failed to create, as a number |
| `productsUrl` | **New** | Required | The products page in ArmorCode (today's email has no link) |

#### Product bulk upload result (update) (`product-upload-updated`)

- **Subject:** $!{fileName}: $!{successCount} of $!{totalCount} products updated

- **Who / when:** The person who uploaded the file; A bulk product-update CSV upload has finished processing

- **Today:** java-utils / ProductFileUploadNotifier; background-jobs / BulkProductCreateJob, BulkProductCreateJobProcessor (in code)

- **Kind:** transactional



| Placeholder | Backend | Use | What it holds |
|---|---|---|---|
| `amcLogoUrl` | Today | Required | The ArmorCode mark (the circles, without the white wordmark, which vanishes on light backgrounds): host assets/armorcode-mark@2x.png, shown 28px high |
| `fileName` | Today | Required | The uploaded file’s name |
| `totalCount` | Today | Required | How many products the file had, as a number |
| `successCount` | Today | Required | How many were updated, as a number |
| `failedCount` | Today | Required | How many failed to update, as a number |
| `productsUrl` | **New** | Required | The products page in ArmorCode (today's email has no link) |

#### Sub-product bulk upload result (create) (`sub-product-upload-created`)

- **Subject:** $!{fileName}: $!{successCount} of $!{totalCount} sub-products created

- **Who / when:** The person who uploaded the file; A bulk sub-product-creation CSV upload has finished processing

- **Today:** java-utils / SubproductFileUploadNotifier, BulkSubProductServiceImpl; background-jobs / BulkSubProductCreateJobProcessor (in code)

- **Kind:** transactional



| Placeholder | Backend | Use | What it holds |
|---|---|---|---|
| `amcLogoUrl` | Today | Required | The ArmorCode mark (the circles, without the white wordmark, which vanishes on light backgrounds): host assets/armorcode-mark@2x.png, shown 28px high |
| `fileName` | Today | Required | The uploaded file’s name |
| `totalCount` | Today | Required | How many sub-products the file had, as a number |
| `successCount` | Today | Required | How many were created, as a number |
| `failedCount` | Today | Required | How many failed to create, as a number |
| `subProductsUrl` | **New** | Required | The sub-products page in ArmorCode (today's email has no link) |

#### Sub-product bulk upload result (update) (`sub-product-upload-updated`)

- **Subject:** $!{fileName}: $!{successCount} of $!{totalCount} sub-products updated

- **Who / when:** The person who uploaded the file; A bulk sub-product-update CSV upload has finished processing

- **Today:** java-utils / SubproductFileUploadNotifier, BulkSubProductServiceImpl; background-jobs / BulkSubProductCreateJobProcessor (in code)

- **Kind:** transactional



| Placeholder | Backend | Use | What it holds |
|---|---|---|---|
| `amcLogoUrl` | Today | Required | The ArmorCode mark (the circles, without the white wordmark, which vanishes on light backgrounds): host assets/armorcode-mark@2x.png, shown 28px high |
| `fileName` | Today | Required | The uploaded file’s name |
| `totalCount` | Today | Required | How many sub-products the file had, as a number |
| `successCount` | Today | Required | How many were updated, as a number |
| `failedCount` | Today | Required | How many failed to update, as a number |
| `subProductsUrl` | **New** | Required | The sub-products page in ArmorCode (today's email has no link) |

#### Draft findings upload result (`draft-findings-upload-created`)

- **Subject:** $!{fileName}: $!{successCount} of $!{totalCount} draft findings created

- **Who / when:** The person who uploaded the file; A draft-findings CSV upload has finished processing

- **Today:** java-utils / DraftFindingCSVUploadNotifier (in code)

- **Kind:** transactional



| Placeholder | Backend | Use | What it holds |
|---|---|---|---|
| `amcLogoUrl` | Today | Required | The ArmorCode mark (the circles, without the white wordmark, which vanishes on light backgrounds): host assets/armorcode-mark@2x.png, shown 28px high |
| `fileName` | Today | Required | The uploaded file’s name |
| `totalCount` | Today | Required | How many draft findings the file had, as a number |
| `successCount` | Today | Required | How many were created, as a number |
| `failedCount` | Today | Required | How many failed to create, as a number |
| `draftFindingsUrl` | **New** | Required | The draft findings page in ArmorCode (today's email has no link) |

#### Draft findings upload failed (wrong columns) (`draft-findings-upload-wrong-columns`)

- **Subject:** $!{fileName}: no draft findings created

- **Who / when:** The person who uploaded the file; A draft-findings CSV upload is rejected because its column names are wrong

- **Today:** java-utils / DraftFindingCSVUploadNotifier (in code)

- **Kind:** transactional



| Placeholder | Backend | Use | What it holds |
|---|---|---|---|
| `amcLogoUrl` | Today | Required | The ArmorCode mark (the circles, without the white wordmark, which vanishes on light backgrounds): host assets/armorcode-mark@2x.png, shown 28px high |
| `fileName` | Today | Required | The uploaded file’s name |
| `draftFindingsUrl` | **New** | Required | The draft findings page in ArmorCode, where the CSV is uploaded (today's email has no link) |

#### Draft findings upload failed (row limit) (`draft-findings-upload-too-many-rows`)

- **Subject:** $!{fileName}: no draft findings created

- **Who / when:** The person who uploaded the file; A draft-findings CSV upload is rejected because it has more rows than allowed

- **Today:** java-utils / DraftFindingCSVUploadNotifier (in code)

- **Kind:** transactional



| Placeholder | Backend | Use | What it holds |
|---|---|---|---|
| `amcLogoUrl` | Today | Required | The ArmorCode mark (the circles, without the white wordmark, which vanishes on light backgrounds): host assets/armorcode-mark@2x.png, shown 28px high |
| `fileName` | Today | Required | The uploaded file’s name |
| `fileType` | Today | Required | The file’s type (“CSV”) |
| `maxRows` | Today | Required | The most rows an upload may have, as a number |
| `actualRows` | Today | Required | How many rows the file has, as a number |
| `draftFindingsUrl` | **New** | Required | The draft findings page in ArmorCode, where the CSV is uploaded (today's email has no link) |

### Risk register

#### Risk register submitted for review (`risk-register-submitted`)

- **Subject:** $!{riskRegisterCustomTitle}: $!{name} needs your review

- **Who / when:** The next approver in the workflow; A risk register entry is submitted and routed to an approver for acceptance

- **Today:** java-utils / RiskRegisterNotificationService (in code)

- **Kind:** operational



| Placeholder | Backend | Use | What it holds |
|---|---|---|---|
| `amcLogoUrl` | Today | Required | The ArmorCode mark (the circles, without the white wordmark, which vanishes on light backgrounds): host assets/armorcode-mark@2x.png, shown 28px high |
| `notificationSettingsUrl` | **New** | Required | ArmorCode’s notification settings page |
| `riskRegisterCustomTitle` | Today | Required | What the tenant calls a risk register entry (“Risk register”, “Exception”) |
| `name` | Today | Required | The entry’s name |
| `riskRegisterUrl` | **New** | Required | The entry in ArmorCode (today’s email links the name; the link gets its own placeholder here) |
| `submittedBy` | Today | Required | Who submitted it (“John Smith”) |

#### Risk register approved (`risk-register-approved`)

- **Subject:** $!{riskRegisterCustomTitle}: $!{name} $!{action} by $!{reviewer}

- **Who / when:** The submitter and the other people in the review workflow; An approver approves a risk register entry

- **Today:** java-utils / RiskRegisterNotificationService (in code)

- **Kind:** operational



| Placeholder | Backend | Use | What it holds |
|---|---|---|---|
| `amcLogoUrl` | Today | Required | The ArmorCode mark (the circles, without the white wordmark, which vanishes on light backgrounds): host assets/armorcode-mark@2x.png, shown 28px high |
| `notificationSettingsUrl` | **New** | Required | ArmorCode’s notification settings page |
| `riskRegisterCustomTitle` | Today | Required | What the tenant calls a risk register entry (“Risk register”, “Exception”) |
| `name` | Today | Required | The entry’s name |
| `riskRegisterUrl` | **New** | Required | The entry in ArmorCode (today’s email links the name; the link gets its own placeholder here) |
| `action` | Today | Required | What the reviewer did, as a past-tense word (“approved”) |
| `reviewer` | Today | Required | Who reviewed it (“Jane Doe”) |

#### Risk register rejected (`risk-register-rejected`)

- **Subject:** $!{riskRegisterCustomTitle}: $!{name} $!{action} by $!{reviewer}

- **Who / when:** The submitter and the other people in the review workflow; An approver rejects a risk register entry

- **Today:** java-utils / RiskRegisterNotificationService (in code)

- **Kind:** operational



| Placeholder | Backend | Use | What it holds |
|---|---|---|---|
| `amcLogoUrl` | Today | Required | The ArmorCode mark (the circles, without the white wordmark, which vanishes on light backgrounds): host assets/armorcode-mark@2x.png, shown 28px high |
| `notificationSettingsUrl` | **New** | Required | ArmorCode’s notification settings page |
| `riskRegisterCustomTitle` | Today | Required | What the tenant calls a risk register entry (“Risk register”, “Exception”) |
| `name` | Today | Required | The entry’s name |
| `riskRegisterUrl` | **New** | Required | The entry in ArmorCode (today’s email links the name; the link gets its own placeholder here) |
| `action` | Today | Required | What the reviewer did, as a past-tense word (“rejected”) |
| `reviewer` | Today | Required | Who reviewed it (“Jane Doe”) |

#### Risk register completed by all reviewers (`risk-register-completed`)

- **Subject:** $!{riskRegisterCustomTitle}: $!{name} $!{action} by all reviewers

- **Who / when:** The people in the review workflow and the configured report recipients; The last reviewer acts, completing the workflow for all reviewers; a PDF report is generated

- **Today:** java-utils / RiskRegisterNotificationService (in code)

- **Kind:** operational



| Placeholder | Backend | Use | What it holds |
|---|---|---|---|
| `amcLogoUrl` | Today | Required | The ArmorCode mark (the circles, without the white wordmark, which vanishes on light backgrounds): host assets/armorcode-mark@2x.png, shown 28px high |
| `notificationSettingsUrl` | **New** | Required | ArmorCode’s notification settings page |
| `riskRegisterCustomTitle` | Today | Required | What the tenant calls a risk register entry (“Risk register”, “Exception”) |
| `name` | Today | Required | The entry’s name |
| `riskRegisterUrl` | **New** | Required | The entry in ArmorCode (today’s email links the name; the link gets its own placeholder here) |
| `pdfReportUrl` | **New** | Required | The time-limited PDF report download link (today’s email links it; it gets its own placeholder here) |
| `pdfReportExpiryInHours` | Today | Required | How many hours the download link works for, as a number |
| `action` | Today | Required | What the reviewers did, as a past-tense word (“approved”) |
| `reviewer` | Today | Required | The last reviewer (“Jane Doe”) |

#### Risk register expiring (`risk-register-expiring`)

- **Subject:** $!{riskRegisterCustomTitle}: $!{name} expires in #if($reportExpiryInDays == 1)1 day#{else}$!{reportExpiryInDays} days#{end}

- **Who / when:** The entry’s owner and the people involved in it; An approved risk register entry is approaching its end date

- **Today:** java-utils / RiskRegisterExtensionServiceImpl (in code)

- **Kind:** operational



| Placeholder | Backend | Use | What it holds |
|---|---|---|---|
| `amcLogoUrl` | Today | Required | The ArmorCode mark (the circles, without the white wordmark, which vanishes on light backgrounds): host assets/armorcode-mark@2x.png, shown 28px high |
| `notificationSettingsUrl` | **New** | Required | ArmorCode’s notification settings page |
| `riskRegisterCustomTitle` | Today | Required | What the tenant calls a risk register entry (“Risk register”, “Exception”) |
| `name` | Today | Required | The entry’s name |
| `riskRegisterUrl` | **New** | Required | The entry in ArmorCode (today’s email links the name; the link gets its own placeholder here) |
| `creator` | Today | Required | Who created it (“John Smith”) |
| `finalApprovalDate` | Today | Required | When it was finally approved, as text |
| `reportExpiryInDays` | Today | Required | Days until it expires, as a number |
| `endDate` | Today | Required | When it expires, as text |

#### Risk register comment (`risk-register-comment`)

- **Subject:** $!{userName} commented on $!{riskRegisterCustomTitle}: $!{name}

- **Who / when:** The entry’s participants and watchers; Someone comments on a risk register entry

- **Today:** java-utils / RiskRegisterCommentAddedEventHandler (in code)

- **Kind:** operational



| Placeholder | Backend | Use | What it holds |
|---|---|---|---|
| `amcLogoUrl` | Today | Required | The ArmorCode mark (the circles, without the white wordmark, which vanishes on light backgrounds): host assets/armorcode-mark@2x.png, shown 28px high |
| `notificationSettingsUrl` | **New** | Required | ArmorCode’s notification settings page |
| `riskRegisterCustomTitle` | Today | Required | What the tenant calls a risk register entry (“Risk register”, “Exception”) |
| `name` | Today | Required | The entry’s name |
| `riskRegisterUrl` | **New** | Required | The entry in ArmorCode (today’s email links the name; the link gets its own placeholder here) |
| `userName` | Today | Required | Who commented (“Jane Doe”) |
| `comment` | Today | Required | The comment, as plain text |

#### Risk register report ready (`risk-register-report-ready`)

- **Subject:** Your $!{riskRegisterCustomTitle} report is ready to download

- **Who / when:** The report’s configured recipients; A requested risk register PDF report has finished generating

- **Today:** java-utils / RiskRegisterReportJob, RiskRegisterEmailSender (in code)

- **Kind:** operational



| Placeholder | Backend | Use | What it holds |
|---|---|---|---|
| `amcLogoUrl` | Today | Required | The ArmorCode mark (the circles, without the white wordmark, which vanishes on light backgrounds): host assets/armorcode-mark@2x.png, shown 28px high |
| `notificationSettingsUrl` | **New** | Required | ArmorCode’s notification settings page |
| `riskRegisterCustomTitle` | Today | Required | What the tenant calls a risk register entry (“Risk register”, “Exception”) |
| `pdfReportUrl` | **New** | Required | The time-limited PDF report download link (today’s email links it; it gets its own placeholder here) |
| `pdfReportExpiryInHours` | Today | Required | How many hours the download link works for, as a number |

### Tools & runbooks

#### Security tool mapping note (`tool-mapping-note`)

- **Subject:** $!{whoMentioned} mentioned you in a security tool mapping note

- **Who / when:** The person mentioned; Someone mentions them in a note on a security tool’s mapping

- **Today:** authserver, java-utils / ToolConfigurationNotesServiceImpl · template/email/security-tool-mapping-note-notification.html

- **Kind:** operational



| Placeholder | Backend | Use | What it holds |
|---|---|---|---|
| `amcLogoUrl` | **New** | Required | The ArmorCode logo (this email had `${logoUrl}` at the bottom; the brand row uses `amcLogoUrl` like the others) |
| `notificationSettingsUrl` | **New** | Required | ArmorCode’s notification settings page |
| `whoMentioned` | Today | Required | Who mentioned them (“Jane Doe”) |
| `toolConfigurationNote` | Today | Required | The note, as plain text |
| `toolConfigurationNoteUrl` | Today | Required | The note in ArmorCode |
| `toolName` | **New** | Optional | The security tool (“Snyk”) |
| `toolConfigurationName` | **New** | Optional | The tool configuration the note is on |

#### Project mapping (`project-mapping`)

- **Subject:** Action needed: set up a new $!{toolName} project in ArmorCode

- **Who / when:** The people who manage the tool’s configuration; ArmorCode finds a new project in a connected security tool

- **Today:** java-utils / EmailService.sendProjectMappingEmail; background-jobs / ToolFetchProjectJob, ToolNewProjectsScanJobProcessorImpl · template/email/project-mapping.html

- **Kind:** operational



| Placeholder | Backend | Use | What it holds |
|---|---|---|---|
| `amcLogoUrl` | Today | Required | The ArmorCode mark (the circles, without the white wordmark, which vanishes on light backgrounds): host assets/armorcode-mark@2x.png, shown 28px high |
| `notificationSettingsUrl` | **New** | Required | ArmorCode’s notification settings page |
| `tenant` | Today | Required | The tenant (account) |
| `businessUnitName` | Today | Required | The organization (business unit) |
| `toolName` | Today | Required | The security tool (“GitHub”, “Snyk”) |
| `project` | Today | Required | The tool configuration’s name |
| `toolUrl` | Today | Required | Where the project is configured in ArmorCode |

#### Runbook findings (default) (`runbook-findings`)

- **Subject:** ${runbook.name:-Runbook}: findings

- **Who / when:** The runbook’s email recipients; A runbook’s Send Email step runs and the runbook has no email body of its own

- **Today:** background-jobs / RunbookEmailNotificationJfcJob · emails/defaultEmail.html

- **Kind:** operational, filled by plain `${name}` substitution (no Velocity)



| Placeholder | Backend | Use | What it holds |
|---|---|---|---|
| `amcLogoUrl` | Today | Required | The ArmorCode mark (the circles, without the white wordmark, which vanishes on light backgrounds): host assets/armorcode-mark@2x.png, shown 28px high |
| `notificationSettingsUrl` | **New** | Required | ArmorCode’s notification settings page |
| `runbook.name` | Today | Required | The runbook’s name; “Runbook” when it has none |
| `urls` | Today | Required | The links to the results, as HTML the backend builds (one link per line) |
| `armorcodeServerUrl` | **New** | Required | ArmorCode’s address, for the button (the email had no button) |

#### Runbook findings with report (default) (`runbook-findings-report`)

- **Subject:** ${runbook.name:-Runbook}: findings report

- **Who / when:** The runbook’s email recipients; A runbook’s export step finishes and the runbook has no email body of its own

- **Today:** background-jobs / CSVFileHelper, CSVFileExecutor, ExportEmailHelper · emails/defaultEmail2.html

- **Kind:** operational, filled by plain `${name}` substitution (no Velocity)



| Placeholder | Backend | Use | What it holds |
|---|---|---|---|
| `amcLogoUrl` | Today | Required | The ArmorCode mark (the circles, without the white wordmark, which vanishes on light backgrounds): host assets/armorcode-mark@2x.png, shown 28px high |
| `notificationSettingsUrl` | **New** | Required | ArmorCode’s notification settings page |
| `runbook.name` | Today | Required | The runbook’s name; “Runbook” when it has none |
| `urls` | Today | Required | The links to the results, as HTML the backend builds (one link per line) |
| `downloadReportUrl` | **New** | Required | The report to download. Today’s template prints the word “downloadReportUrl” instead of a link |

#### Scheduled ticket search (default) (`runbook-tickets`)

- **Subject:** ${runbook.name:-Runbook}: scheduled ticket search report

- **Who / when:** The runbook’s email recipients; A runbook’s scheduled ticket search runs and the runbook has no email body of its own

- **Today:** background-jobs / RunbookEmailNotificationJfcJob · emails/defaultEmailTicket.html

- **Kind:** operational, filled by plain `${name}` substitution (no Velocity)



| Placeholder | Backend | Use | What it holds |
|---|---|---|---|
| `amcLogoUrl` | Today | Required | The ArmorCode mark (the circles, without the white wordmark, which vanishes on light backgrounds): host assets/armorcode-mark@2x.png, shown 28px high |
| `notificationSettingsUrl` | **New** | Required | ArmorCode’s notification settings page |
| `runbook.name` | Today | Required | The runbook’s name; “Runbook” when it has none |
| `urls` | Today | Required | The links to the results, as HTML the backend builds (one link per line) |
| `armorcodeServerUrl` | **New** | Required | ArmorCode’s address, for the button (the email had no button) |

#### Runbook export report (fallback) (`runbook-report-fallback`)

- **Subject:** ${runbookLabel} report

- **Who / when:** The configured recipients: assignee, team, owner, security owner or finding-tag group; A runbook or pipeline export report is sent, but its HTML email template couldn’t be read

- **Today:** background-jobs / CSVFileHelper, CSVFileExecutor, ExportEmailHelper (in-code fallback)

- **Kind:** operational, filled by plain `${name}` substitution (no Velocity)



| Placeholder | Backend | Use | What it holds |
|---|---|---|---|
| `amcLogoUrl` | Today | Required | The ArmorCode mark (the circles, without the white wordmark, which vanishes on light backgrounds): host assets/armorcode-mark@2x.png, shown 28px high |
| `notificationSettingsUrl` | **New** | Required | ArmorCode’s notification settings page |
| `runbookLabel` | Today | Required | The runbook’s or pipeline’s name |
| `armorcodeServerUrl` | **New** | Required | ArmorCode’s address, for the button (the email had no link) |

### Platform notices

#### Project cloning completed (`project-cloned`)

- **Subject:** Cloning finished for $!{projectFieldName}: $!{projectName}

- **Who / when:** The person who started the clone; A project cloning process finishes successfully

- **Today:** java-utils / project cloning (in code; the class isn’t named in the inventory)

- **Kind:** operational



| Placeholder | Backend | Use | What it holds |
|---|---|---|---|
| `amcLogoUrl` | Today | Required | The ArmorCode mark (the circles, without the white wordmark, which vanishes on light backgrounds): host assets/armorcode-mark@2x.png, shown 28px high |
| `notificationSettingsUrl` | **New** | Required | ArmorCode’s notification settings page |
| `projectFieldName` | Today | Required | What the tenant calls a project (“Product”, “Application”) |
| `projectName` | Today | Required | The project that was cloned |
| `clonedProjectName` | Today | Required | The new copy’s name |
| `projectUrl` | Today | Required | The new copy in ArmorCode |

#### AQL migration notice (`aql-migration`)

- **Subject:** AQL $!{operation} $!{shortMigrationId}: $!{status} (#if($mode == "dry")dry run#{else}live run#{end})

- **Who / when:** The migration run’s configured notification recipients; An AQL query and filter migration, or its rollback, finishes a run

- **Today:** java-utils / AqlMigrationNotifier (in code)

- **Kind:** operational



| Placeholder | Backend | Use | What it holds |
|---|---|---|---|
| `amcLogoUrl` | Today | Required | The ArmorCode mark (the circles, without the white wordmark, which vanishes on light backgrounds): host assets/armorcode-mark@2x.png, shown 28px high |
| `notificationSettingsUrl` | **New** | Required | ArmorCode’s notification settings page |
| `operation` | Today | Required | “Migration” or “Rollback” |
| `shortMigrationId` | Today | Required | The run’s short ID, for the subject |
| `migrationId` | Today | Required | The run’s full ID |
| `status` | Today | Required | SUCCESS, PARTIAL_FAILURE, ERROR or NO_TENANTS |
| `mode` | Today | Required | “dry” or “live” |
| `forced` | Today | Optional | true when the run was forced (today’s email adds “\| FORCE”; the source doc gives the flag no name, so this one is a guess) |
| `durationMs` | Today | Required | How long the run took, in milliseconds |
| `sources` | Today | Required | One summary line per source, as text (today’s `sourceSummary`); each item is the line itself |
| `downloadUrls` | Today | Optional | Report download links, one URL per item; empty when there are none |
| `amcUrl` | **New** | Required | ArmorCode, for the button (today’s email has no link) |

#### Anya usage alert (`anya-usage-alert`)

- **Subject:** Anya usage: $!{orgName} has reached $!{thresholdPercent}% of its monthly allowance

- **Who / when:** The organization’s administrators; An organization’s monthly automated Anya action usage crosses a configured threshold

- **Today:** java-utils / AnyaMeterNotificationService (in code)

- **Kind:** operational



| Placeholder | Backend | Use | What it holds |
|---|---|---|---|
| `amcLogoUrl` | Today | Required | The ArmorCode mark (the circles, without the white wordmark, which vanishes on light backgrounds): host assets/armorcode-mark@2x.png, shown 28px high |
| `notificationSettingsUrl` | **New** | Required | ArmorCode’s notification settings page |
| `orgName` | Today | Required | The organization |
| `thresholdPercent` | Today | Required | The threshold crossed, as a number (“80”) |
| `displayMonth` | Today | Required | The month, as text (“October 2026”) |
| `accountTeamUrl` | **New** | Required | How to reach the ArmorCode account team: a mailto: link or a contact page (today’s email names the team but has no link) |

### PDF reports

#### Daily Digest (`daily-digest`)

- **Today:** java-utils / NotificationReportServiceImpl: digest-templates/daily-digest.html

- **When:** Every day, attached to the scheduled daily digest email



| Placeholder | Backend | Use | What it holds |
|---|---|---|---|
| `fileName` | Today | Required | The PDF’s file name, as its <title> |
| `armorcodeLogo` | Today | Required | The ArmorCode logo, in the brand row of every page; shown 22px high on a light background, so it must be a mark that reads on light (today’s sat on a dark header image) |
| `armorcodeServerUrl` | Today | Required | The app’s base URL, for links into ArmorCode |
| `GLOBAL_SETTINGS` | Today | Required | The tenant’s custom labels (a map): teamName, productName, riskScoreName, severityName, criticalName, … |
| `organizationName` | Today | Required | The organization, in the title |
| `accountName` | Today | Required | Account, in the facts |
| `businessUnitName` | Today | Required | Organization (business unit), in the facts |
| `teams` | Today | Required | The teams the digest covers, under the tenant’s team label |
| `reportDate` | Today | Required | The report’s date, in the facts (and, as today, the content’s id) |
| `URLEncoder` | Today | Required | Java’s URLEncoder, for the filter in each link |
| `DAILY_DIGEST` | Today | Required | The digest: findingsOverdue, findingsNext7Days, ticketsOverdue, ticketsNext7Days and their …Href filters; top5FindingsList (id, title, severity.value, source) with formattedData[id].slaDueDate and topFindingsViewMoreLink; top5tickets (ticketId, title, severity, date, url) |
| `SEVERITY_COLORS` | Today | Required | Severity (upper case) → color. Now the fallback for severities the design system has no color for |
| `tenant` | Today | Required | Tenant id, in finding links |
| `businessUnit` | Today | Required | Business unit id, in finding links |
| `ELLIPSIS_STYLE` | Today | Required | Inline CSS for a ticket title cell, as today |
| `userEmail` | Today | Required | The recipient’s email, for the “Show more” tickets filter (assignee) |

#### Weekly Digest (`weekly-digest`)

- **Today:** java-utils / NotificationReportServiceImpl: digest-templates/weekly-digest.html

- **When:** Every week, attached to the scheduled weekly digest email



| Placeholder | Backend | Use | What it holds |
|---|---|---|---|
| `fileName` | Today | Required | The PDF’s file name, as its <title> |
| `armorcodeLogo` | Today | Required | The ArmorCode logo, in the brand row of every page; shown 22px high on a light background, so it must be a mark that reads on light (today’s sat on a dark header image) |
| `armorcodeServerUrl` | Today | Required | The app’s base URL, for links into ArmorCode |
| `GLOBAL_SETTINGS` | Today | Required | The tenant’s custom labels (a map): teamName, productName, riskScoreName, severityName, criticalName, … |
| `organizationName` | Today | Required | The organization, in the title |
| `accountName` | Today | Required | Account, in the facts |
| `businessUnitName` | Today | Required | Organization (business unit), in the facts |
| `teams` | Today | Required | The teams the digest covers, under the tenant’s team label |
| `reportDate` | Today | Required | The report’s date, in the facts (and, as today, the content’s id) |
| `URLEncoder` | Today | Required | Java’s URLEncoder, for the filter in each link |
| `WEEKLY_DIGEST` | Today | Required | products: each with productName, riskScore ("N/A" or a number), riskSeverity, riskTrend ("1" up, "-1" down) and subProducts (subProductName, riskScore, riskSeverity, riskTrend, criticalOpen, overDueCount, nextWeekDueCount, ticketsOverdue, ticketsNext7Days, and a …Href filter for each count) |
| `FEATURE_FLAGS` | Today | Required | RISK_SCORE_3_0: scores without “/100”, and RISK_SCORE_TAG_STYLES |
| `inverseScoreEnabled` | Today | Required | Sets $inverse, as today (which nothing reads yet) |
| `isRiskScoreEnabled` | Today | Required | Off: a sub-product’s score shows as “-” |
| `RISK_SCORE_TAG_STYLES` | Today | Required | Rating → inline CSS. Now only for a rating the design system has no color for |
| `SEVERITY_TAG_STYLES` | Today | Required | Rating → inline CSS, without risk score 3.0. Now only for a rating the design system has no color for |

#### Project Report (`project-report`)

- **Today:** java-utils / ProjectServiceImpl: project-templates/project-report.html

- **When:** On demand, from a project: downloaded or emailed



| Placeholder | Backend | Use | What it holds |
|---|---|---|---|
| `fileName` | Today | Required | The PDF’s file name, as its <title> |
| `armorcodeLogo` | Today | Required | The ArmorCode logo, in the brand row of every page; shown 22px high on a light background, so it must be a mark that reads on light (today’s sat on a dark header image) |
| `armorcodeServerUrl` | Today | Required | The app’s base URL, for links into ArmorCode |
| `GLOBAL_SETTINGS` | Today | Required | The tenant’s custom labels (a map): teamName, productName, riskScoreName, severityName, criticalName, … |
| `footer` | Today | Required | The footer line on every page (above ArmorCode’s address now) |
| `projectName` | Today | Required | The project’s name (or the tenant’s label for projects), in headings |
| `projectDescription` | Today | Required | The project’s details, as HTML |
| `ProjectDetailsH1s` | Today | Required | The headings in the project’s details, for the contents (each links to #h1<n>) |
| `FINDINGS_LIST` | Today | Required | data: the findings (dfId, dfTitle, cveBaseScore, armorcodeSeverity, action, armorcodeCategory, armorcodeTicketIds, armorcodeTicketUrls); formattedData[dfId]: vulnerabilityInfo and toolInfo maps, cvssVector, description, stepsToReproduce, mitigation, impact, components; cvssData[dfId]: AV, AC, PR, UI, S, C, I, A |
| `NotificationReportUtils` | Today | Required | The backend helper whose sanitizeHtmlTags() strips tags from titles |
| `tenant` | Today | Required | Tenant id, in finding links |
| `businessUnit` | Today | Required | Business unit id, in finding links |
| `additionalDocumentsImages` | Today | Required | Attached images (url, fileName), shown inline |
| `additionalDocumentsNonImages` | Today | Required | Other attachments (url, fileName), as links |

#### Risk Register Report (`risk-register-report`)

- **Today:** java-utils / RiskRegisterReportBuilderImpl; background-jobs / RiskRegisterPdfReportJobProcessorImpl: project-templates/risk-register-report.html

- **When:** On demand or from a workflow, for a risk register entry (an exception, or a project): emailed as a download link



| Placeholder | Backend | Use | What it holds |
|---|---|---|---|
| `fileName` | Today | Required | The PDF’s file name, as its <title> |
| `armorcodeLogo` | Today | Required | The ArmorCode logo, in the brand row of every page; shown 22px high on a light background, so it must be a mark that reads on light (today’s sat on a dark header image) |
| `armorcodeServerUrl` | Today | Required | The app’s base URL, for links into ArmorCode |
| `GLOBAL_SETTINGS` | Today | Required | The tenant’s custom labels (a map): teamName, productName, riskScoreName, severityName, criticalName, … |
| `footer` | Today | Required | The footer line on every page (above ArmorCode’s address now) |
| `projectName` | Today | Required | The project’s name (or the tenant’s label for projects), in headings |
| `projectDescription` | Today | Required | The project’s details, as HTML |
| `ProjectDetailsH1s` | Today | Required | The headings in the project’s details, for the contents (each links to #h1<n>) |
| `FINDINGS_LIST` | Today | Required | data: the findings (dfId, dfTitle, cveBaseScore, armorcodeSeverity, action, armorcodeCategory, armorcodeTicketIds, armorcodeTicketUrls); formattedData[dfId]: vulnerabilityInfo and toolInfo maps, cvssVector, description, stepsToReproduce, mitigation, impact, components; cvssData[dfId]: AV, AC, PR, UI, S, C, I, A |
| `NotificationReportUtils` | Today | Required | The backend helper whose sanitizeHtmlTags() strips tags from titles |
| `tenant` | Today | Required | Tenant id, in finding links |
| `businessUnit` | Today | Required | Business unit id, in finding links |
| `additionalDocumentsImages` | Today | Required | Attached images (url, fileName), shown inline |
| `additionalDocumentsNonImages` | Today | Required | Other attachments (url, fileName), as links |
| `riskRegisterOrProjectName` | Today | Required | The risk register entry’s or project’s name, as the title |
| `exceptionType` | Today | Optional | Set for an exception: shows its request facts and the approval summary in the contents |
| `submittedBy` | Today | Optional | Who requested the exception |
| `submittedOn` | Today | Optional | When it was requested |
| `approvedOn` | Today | Optional | When it was approved |
| `startDate` | Today | Optional | When the exception starts |
| `endDate` | Today | Optional | When it ends |
| `status` | Today | Optional | The exception’s status |
| `exceptionHistoryPresent` | Today | Optional | Shows the approval summary |
| `approvals` | Today | Optional | The approval history: approverName, status, createdAt, notes |
| `isProjectReportEnabled` | Today | Optional | Shows the project report section |
| `projectReport` | Today | Optional | The project report, as HTML |

<!-- placeholders:end -->
