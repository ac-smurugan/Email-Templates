import { v } from '../../placeholders.ts';
import { uploadRejected, uploadResult } from './factories.ts';

// 42–44 in in-code-email-templates.html: a bulk CSV upload finished, or was turned away.

const PRODUCT_SOURCE =
  'java-utils / ProductFileUploadNotifier; background-jobs / BulkProductCreateJob, BulkProductCreateJobProcessor (in code)';
const SUB_PRODUCT_SOURCE =
  'java-utils / SubproductFileUploadNotifier, BulkSubProductServiceImpl; background-jobs / BulkSubProductCreateJobProcessor (in code)';
const DRAFT_SOURCE = 'java-utils / DraftFindingCSVUploadNotifier (in code)';

const productsPage = { field: 'productsUrl', about: 'The products page in ArmorCode', label: 'View products', path: '/products' };
const subProductsPage = {
  field: 'subProductsUrl',
  about: 'The sub-products page in ArmorCode',
  label: 'View sub-products',
  path: '/products/sub-products',
};
const draftsPage = {
  field: 'draftFindingsUrl',
  about: 'The draft findings page in ArmorCode, where the CSV is uploaded',
  label: 'Open draft findings',
  path: '/findings/drafts',
};

/** 42, create. */
export const productUploadCreated = uploadResult({
  id: 'product-upload-created',
  name: 'Product bulk upload result (create)',
  source: PRODUCT_SOURCE,
  when: 'A bulk product-creation CSV upload has finished processing',
  one: 'product',
  many: 'products',
  verb: 'created',
  page: productsPage,
  sample: { fileName: 'products-q4.csv', totalCount: 50, successCount: 47, failedCount: 3 },
});

/** 42, update. */
export const productUploadUpdated = uploadResult({
  id: 'product-upload-updated',
  name: 'Product bulk upload result (update)',
  source: PRODUCT_SOURCE,
  when: 'A bulk product-update CSV upload has finished processing',
  one: 'product',
  many: 'products',
  verb: 'updated',
  page: productsPage,
  sample: { fileName: 'products-owners.csv', totalCount: 120, successCount: 120, failedCount: 0 },
});

/** 43, create. */
export const subProductUploadCreated = uploadResult({
  id: 'sub-product-upload-created',
  name: 'Sub-product bulk upload result (create)',
  source: SUB_PRODUCT_SOURCE,
  when: 'A bulk sub-product-creation CSV upload has finished processing',
  one: 'sub-product',
  many: 'sub-products',
  verb: 'created',
  page: subProductsPage,
  sample: { fileName: 'sub-products-q4.csv', totalCount: 80, successCount: 76, failedCount: 4 },
});

/** 43, update. */
export const subProductUploadUpdated = uploadResult({
  id: 'sub-product-upload-updated',
  name: 'Sub-product bulk upload result (update)',
  source: SUB_PRODUCT_SOURCE,
  when: 'A bulk sub-product-update CSV upload has finished processing',
  one: 'sub-product',
  many: 'sub-products',
  verb: 'updated',
  page: subProductsPage,
  sample: { fileName: 'sub-products-tags.csv', totalCount: 64, successCount: 61, failedCount: 3 },
});

/** 44, processed. */
export const draftFindingsUploadCreated = uploadResult({
  id: 'draft-findings-upload-created',
  name: 'Draft findings upload result',
  source: DRAFT_SOURCE,
  when: 'A draft-findings CSV upload has finished processing',
  one: 'draft finding',
  many: 'draft findings',
  verb: 'created',
  page: { ...draftsPage, about: 'The draft findings page in ArmorCode', label: 'View draft findings' },
  sample: { fileName: 'pentest-findings.csv', totalCount: 35, successCount: 33, failedCount: 2 },
});

const draftRejected = {
  source: DRAFT_SOURCE,
  subject: [v('fileName'), ': no draft findings created'],
  page: draftsPage,
};

/** 44, rejected: the columns aren't the expected ones. */
export const draftFindingsUploadWrongColumns = uploadRejected({
  ...draftRejected,
  id: 'draft-findings-upload-wrong-columns',
  name: 'Draft findings upload failed (wrong columns)',
  when: 'A draft-findings CSV upload is rejected because its column names are wrong',
  preview: 'A column name in the file isn’t one ArmorCode expects. Check the sample CSV file.',
  title: 'Your draft findings file has the wrong columns',
  lead: 'ArmorCode couldn’t process the file: one or more of its column names isn’t what it expects. No draft findings were created.',
  next: 'Check your file against the sample CSV file for the expected format, then upload it again.',
  fields: { fileName: { about: 'The uploaded file’s name' } },
  sample: { fileName: 'pentest-findings.csv' },
});

/** 44, rejected: too many rows. */
export const draftFindingsUploadTooManyRows = uploadRejected({
  ...draftRejected,
  id: 'draft-findings-upload-too-many-rows',
  name: 'Draft findings upload failed (row limit)',
  when: 'A draft-findings CSV upload is rejected because it has more rows than allowed',
  preview: ['The file has ', v('actualRows'), ' rows; the most allowed is ', v('maxRows'), '.'],
  title: 'Your draft findings file has too many rows',
  lead: [
    'ArmorCode couldn’t process the uploaded ',
    v('fileType'),
    ' file: it has more rows than allowed. No draft findings were created.',
  ],
  blocks: [
    {
      kind: 'details',
      rows: [
        { label: 'Rows in the file', value: v('actualRows') },
        { label: 'Most allowed', value: v('maxRows') },
      ],
    },
  ],
  next: ['Reduce the file to ', v('maxRows'), ' rows or fewer, then upload it again.'],
  fields: {
    fileName: { about: 'The uploaded file’s name' },
    fileType: { about: 'The file’s type (“CSV”)' },
    maxRows: { about: 'The most rows an upload may have, as a number' },
    actualRows: { about: 'How many rows the file has, as a number' },
  },
  sample: { fileName: 'pentest-findings-full.csv', fileType: 'CSV', maxRows: '10,000', actualRows: '12,480' },
});
