# Start here: ArmorCode email templates

How to start the work in this repo, and the brief to give Claude. Delete this file once the work is underway, or keep it as the project brief.

## 1. Open a session in this repo

1. In the Claude desktop app, click **+ New** in the sidebar.
2. Set the folder to **`~/code/EmailTemplates`** (not `ac-desktop`).
3. Check the Environment panel on the right: it should say `EmailTemplates` and branch **`email`**.
4. Send this as the first message:

   > Read `START_HERE.md` and do what section 3 says.

The `email` branch already exists, cut from `main`, and is clean. Work stays on it. Nothing gets committed or pushed until you say so.

## 2. Background

We're rebuilding the main ArmorCode platform's emails in the visual style of ArmorCode Zero's emails. Zero's email system lives in the separate `ac-desktop` repo. Use it as **read-only reference**: never run commands or change files there.

Decisions already made:

| Decision | Choice |
|---|---|
| Brand color | Zero purple: `#624cf5` (light accent), `#7c6bff` (dark accent), with Zero's full light/dark token set as-is |
| Placeholders | FreeMarker, as the platform's Java backend uses: `${x}`, `<#list>` for repeated rows, `<#if>` for optional parts. Keep the syntax in one module so it's easy to change |
| Scope | The 5 audited emails: Password Reset, Username/Password Invite, Asset Mention, Project Mapping, Daily Digest |
| Git | Branch `email`. Don't commit, don't push, never open or merge a PR |

### References (read-only)

- **Zero's email system:** `/Users/Suresh.M/code/Ac desktop/packages/emails/src/`
  - `layout.ts`: LIGHT/DARK tokens, TONES, RATING_COLORS, the `Email` content model and `Block` kinds, `toHtml`/`toText`, the dark-mode class swap under `@media (prefers-color-scheme:dark)`, the `max-width:620px` phone rule, Outlook (MSO) handling, `pinScheme`
  - `template.ts` (`defineTemplate`, `BASE`), `fields.ts`, `format.ts` (subjects of 78 characters or fewer, `clip`), `escape.ts` (the `markup` tagged template, `safeUrl`)
  - `templates/test.ts` (simplest example); `templates/summary.ts` and `templates/fix-ready.ts` (richer ones)
- **Zero's preview page:** `/Users/Suresh.M/code/Ac desktop/packages/app/src/lab/emails.tsx`. Desktop 640px / Phone 375px frames, Light/Dark toggle, plain text beside it.
- **The audit of today's platform emails:** `/Users/Suresh.M/Documents/Claude/Artifacts/annotated-email-templates-audit/index.html`. Each template's current content, placeholders and numbered issues. The Username/Password Invite is only in the older version, `versions/1791969337847.html`.

### The design system in brief

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
Terms · Privacy · ArmorCode Inc. address
```

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

- **Severity:** Critical `#e5484d`, High `#f2711c`, Moderate `#e2a400`, Minimal `#1f9d55`, Unrated `#a1a7b2`.
- **Type:** system font stack, with Arial for Outlook. Title 21/28, body 15/23, detail 14/21, small 13/20, stat value 22/28.
- **Shape:** 600px max width; radius 14px for the card, 10px for wells, 8px for the button.
- **Rules:** one primary action; subjects of 78 characters or fewer; the footer says why the person got the email; wells instead of borders; colors only from the tokens.
- **Dark mode:** light inline styles plus a `prefers-color-scheme: dark` block that overrides short class names.
- **Phone:** below 620px, less padding and stacked stats.
- **Plain text:** generated from the same content as the HTML, so the two never disagree.

## 3. The task

Build the design system and the 5 templates in this repo.

1. **Port Zero's design system as standalone code**, copied and adapted, never imported from `ac-desktop`. TypeScript run directly by Node (Node 24+ strips types natively), with as few dependencies as possible and pnpm. Suggested layout:
   - `src/tokens.ts`: palettes, tones, severity colors, type scale, spacing, radii
   - `src/escape.ts`: safe HTML building
   - `src/placeholders.ts`: every FreeMarker construct the templates use, in one place
   - `src/layout.ts`: brand row, card, eyebrow, title, the blocks, button, secondary link, footer; HTML and plain text
   - `src/templates/*.ts`: one file per email
   - `src/build.ts` and `src/preview/`
2. **Placeholders, not data.** Templates write FreeMarker placeholders intact and unescaped, in both the HTML and the text version (e.g. `${username}`, `${amcUrl}`), with `<#list>` / `<#if>` where an email repeats rows or has optional parts.
3. **Two footer kinds:**
   - *Transactional* (password reset, invite): no unsubscribe.
   - *Operational* (mention, mapping, digest): says notifications are managed in ArmorCode's settings.
   - Both keep the platform's footer: Terms, Privacy, and the ArmorCode Inc. Palo Alto address from the audit.
4. **Branding:** ArmorCode's name in the brand row, with the logo as a placeholder URL (`${logoUrl}`).
5. **Rebuild the 5 emails** from the audit's content and placeholders, fixing the issues the new layout covers: contrast, the broken `$amcUrl` link, missing branding, vague button labels, phone spacing, and the missing context, expiry and next-step lines the audit flags. Where a fix needs data today's placeholders don't provide, add the placeholder and list it as needing backend data. Never invent values.
6. **Output:**
   - `pnpm build` writes `dist/<id>.html` and `dist/<id>.txt` for each email.
   - `pnpm preview` serves a local page listing the emails, each in a Desktop (640px) / Phone (375px) frame with a Light/Dark toggle and the plain text beside it. In the preview only, placeholders are filled with sample values: John Smith at Example Corp, never real people or tenants.
7. **README.md:** the design rules, how to add a template, the placeholder conventions, and a table per email of its placeholders, marking the new ones the backend must supply.

**Done means:**
- `pnpm build` and `pnpm preview` both work.
- You've looked at each of the 5 emails at Desktop and Phone, in Light and Dark.
- Everything is left uncommitted on `email`.

Then report what was built, the new placeholders the backend must supply, and any audit issue that couldn't be fixed.
