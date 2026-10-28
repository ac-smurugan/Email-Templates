import type { PdfReport } from './index.ts';
import { card, cover, details, page, setRatingColor, statRow, trend } from './layout.ts';
import { DIGEST_FIELDS, SAMPLE_DIGEST, TEAM_NAME, count } from './shared.ts';
import { LIGHT, RADIUS } from '../tokens.ts';

/** Today's label settings, risk score mode and tag styles, set before anything prints. */
const prelude = `${TEAM_NAME}#if($GLOBAL_SETTINGS.containsKey("productName"))
#set($productName = $GLOBAL_SETTINGS.get("productName"))
#else
#set($productName = "Product")
#end
#if($GLOBAL_SETTINGS.containsKey("subProductName"))
#set($subProductName = $GLOBAL_SETTINGS.get("subProductName"))
#else
#set($subProductName = "SubProduct")
#end
#if($inverseScoreEnabled == true || $inverseScoreEnabled == "true")
#set($inverse = true)
#else
#set($inverse = false)
#end
#if ($FEATURE_FLAGS.RISK_SCORE_3_0 == true || $FEATURE_FLAGS.RISK_SCORE_3_0 == "true")
#set($tagStyles = $RISK_SCORE_TAG_STYLES)
#else
#set($tagStyles = $SEVERITY_TAG_STYLES)
#end
`;

/**
 * A risk score with its rating as a dot in the design system's colors. A rating the design system
 * doesn't know keeps today's look: the backend's tag style for it, from `$tagStyles`.
 */
const score = (item: string, scoreText: string) => `${setRatingColor('acDot', `${item}.riskSeverity`)}#if($acDot != '')
<span class="dot" style="background-color:$acDot"></span>
#end
<span class="score" style="#if($acDot == '')$!tagStyles.get($${item}.riskSeverity.toUpperCase())#end">
${scoreText}</span>
${trend(`$${item}.riskTrend`)}`;

const productScore = `#if ($product.riskScore == "N/A")
N/A
#elseif ($FEATURE_FLAGS.RISK_SCORE_3_0 == true || $FEATURE_FLAGS.RISK_SCORE_3_0 == "true")
$product.riskScore
#else
$product.riskScore/100
#end
`;

const subProductScore = `#if($isRiskScoreEnabled == false || $isRiskScoreEnabled == "false")
-
#elseif($subProduct.riskScore == "N/A")
N/A
#elseif ($FEATURE_FLAGS.RISK_SCORE_3_0 == true || $FEATURE_FLAGS.RISK_SCORE_3_0 == "true")
$subProduct.riskScore
#else
$subProduct.riskScore/100
#end
`;

const subProduct = `#foreach ($subProduct in $product.subProducts)
<div class="well gap">
<table width="100%"><tr>
<td><p class="stat-label">$subProductName</p><p class="heading">$subProduct.subProductName</p></td>
<td width="150" class="right"><p class="stat-label">#if($GLOBAL_SETTINGS.containsKey("riskScoreName"))$GLOBAL_SETTINGS.get("riskScoreName")#{else}Risk Score#end</p>
<p>${score('subProduct', subProductScore)}</p></td>
</tr></table>
#if($GLOBAL_SETTINGS.containsKey("openName"))
#set($openName = $GLOBAL_SETTINGS.get("openName"))
#else
#set($openName = "Open")
#end
#set($criticalOpenHref = "{$subProduct.criticalHref}")
#set($findingsOverdueHref = "{$subProduct.overDueHref}")
#set($findingsNext7DaysHref = "{$subProduct.nextWeekDueHref}")
#set($ticketsOverdueHref = "{$subProduct.ticketsOverdueHref}")
#set($ticketsNext7DaysHref = "{$subProduct.ticketsNext7DaysHref}")
<div class="gap">${statRow(
  [
    ['Critical $openName Findings', count('$subProduct.criticalOpen', 'criticalOpenHref', 'findings')],
    ['Findings Overdue', count('$subProduct.overDueCount', 'findingsOverdueHref', 'findings')],
    ['Findings Due Within 7 Days', count('$subProduct.nextWeekDueCount', 'findingsNext7DaysHref', 'findings')],
    ['Tickets Overdue', count('$subProduct.ticketsOverdue', 'ticketsOverdueHref', 'ticketListing')],
    ['Tickets Due Within 7 Days', count('$subProduct.ticketsNext7Days', 'ticketsNext7DaysHref', 'ticketListing')],
  ],
  true,
)}</div>
</div>
#end
#if($product.subProducts.size() == 0)
<div class="well gap empty">No $subProductName</div>
#end
`;

const products = `#foreach ($product in $WEEKLY_DIGEST.products)
${card(
  '',
  `<table width="100%"><tr>
<td><p class="heading">$product.productName <span class="muted">($product.subProducts.size())</span></p></td>
<td width="150" class="right">${score('product', productScore)}</td>
</tr></table>
${subProduct}`,
  { flow: true },
)}#end
`;

const html = page({
  report: 'Weekly Digest',
  prelude,
  body: `<div id="$reportDate">
${cover({
  eyebrow: 'Weekly Digest',
  title: '$organizationName Weekly Digest',
  facts: details([
    ['Account', '$accountName'],
    ['Organization', '$businessUnitName'],
    ['$teamName', '$teams'],
    ['Report Date', '$reportDate'],
  ]),
})}${products}</div>`,
});

/** A tag style as the backend might send one, for a rating the design system has no color for. */
const TAG = `background-color:${LIGHT.well};color:${LIGHT.fg};border-radius:${RADIUS.button / 2}px;padding:0 6px`;
const TAG_STYLES = new Map([
  ['CRITICAL', TAG],
  ['HIGH', TAG],
  ['MEDIUM', TAG],
  ['LOW', TAG],
  ['ELEVATED', TAG],
]);

const sub = (
  subProductName: string,
  riskScore: number | string,
  riskSeverity: string,
  riskTrend: string,
  [criticalOpen, overDueCount, nextWeekDueCount, ticketsOverdue, ticketsNext7Days]: number[],
) => ({
  subProductName,
  riskScore,
  riskSeverity,
  riskTrend,
  criticalOpen: criticalOpen!,
  criticalHref: '"severity":["Critical"],"status":["Open"]',
  overDueCount: overDueCount!,
  overDueHref: '"slaStatus":["BREACHED"]',
  nextWeekDueCount: nextWeekDueCount!,
  nextWeekDueHref: '"slaStatus":["DUE_IN_7_DAYS"]',
  ticketsOverdue: ticketsOverdue!,
  ticketsOverdueHref: '"ticketSla":["BREACHED"]',
  ticketsNext7Days: ticketsNext7Days!,
  ticketsNext7DaysHref: '"ticketSla":["DUE_IN_7_DAYS"]',
});

export const weeklyDigest: PdfReport = {
  id: 'weekly-digest',
  name: 'Weekly Digest',
  source: 'java-utils / NotificationReportServiceImpl: digest-templates/weekly-digest.html',
  when: 'Every week, attached to the scheduled weekly digest email',
  fields: {
    ...DIGEST_FIELDS,
    WEEKLY_DIGEST: {
      about:
        'products: each with productName, riskScore ("N/A" or a number), riskSeverity, riskTrend ("1" up, "-1" down) and subProducts (subProductName, riskScore, riskSeverity, riskTrend, criticalOpen, overDueCount, nextWeekDueCount, ticketsOverdue, ticketsNext7Days, and a …Href filter for each count)',
    },
    FEATURE_FLAGS: { about: 'RISK_SCORE_3_0: scores without “/100”, and RISK_SCORE_TAG_STYLES' },
    inverseScoreEnabled: { about: 'Sets $inverse, as today (which nothing reads yet)' },
    isRiskScoreEnabled: { about: 'Off: a sub-product’s score shows as “-”' },
    RISK_SCORE_TAG_STYLES: { about: 'Rating → inline CSS. Now only for a rating the design system has no color for' },
    SEVERITY_TAG_STYLES: { about: 'Rating → inline CSS, without risk score 3.0. Now only for a rating the design system has no color for' },
  },
  sample: {
    ...SAMPLE_DIGEST,
    fileName: 'Example Corp Weekly Digest 2026-10-28',
    FEATURE_FLAGS: { RISK_SCORE_3_0: false },
    inverseScoreEnabled: false,
    isRiskScoreEnabled: true,
    RISK_SCORE_TAG_STYLES: TAG_STYLES,
    SEVERITY_TAG_STYLES: TAG_STYLES,
    WEEKLY_DIGEST: {
      products: [
        {
          productName: 'Payments Platform',
          riskScore: 82,
          riskSeverity: 'Critical',
          riskTrend: '1',
          subProducts: [
            sub('payments-api', 88, 'Critical', '1', [6, 14, 5, 3, 2]),
            sub('billing-service', 64, 'High', '-1', [2, 0, 3, 0, 1]),
            sub('invoice-worker', 41, 'Medium', '0', [0, 3, 0, 0, 0]),
          ],
        },
        {
          productName: 'Customer Portal',
          riskScore: 35,
          riskSeverity: 'Low',
          riskTrend: '-1',
          subProducts: [
            sub('checkout-web', 'N/A', 'Elevated', '0', [0, 1, 2, 0, 1]),
            sub('account-settings', 12, 'Low', '0', [0, 0, 0, 0, 0]),
          ],
        },
        { productName: 'Internal Tools', riskScore: 'N/A', riskSeverity: 'Info', riskTrend: '0', subProducts: [] },
      ],
    },
  },
  html,
};
