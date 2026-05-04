'use strict';

const path = require('path');

// Load .env.local only in local development (Vercel auto-injects env vars)
if (!process.env.VERCEL) {
  try { require('dotenv').config({ path: path.resolve(__dirname, '..', '.env.local') }); } catch (_) {}
}

const { google } = require('googleapis');

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const SHEET_TAB = process.env.SHEET_NAME || 'Sheet1';

// Column mapping (0-based index)
const COLUMNS = {
  name:      0,
  email:     1,
  company:   2,
  role:      3,
  linkedin:  4,
  status:    5,
  emailSent: 6,
  notes:     7,
};

const EXPECTED_HEADERS = ['Name', 'Email', 'Company', 'Role', 'LinkedIn', 'Status', 'Email Sent', 'Notes'];

/**
 * Returns an authenticated Google Sheets client using Service Account credentials.
 * Supports two modes:
 *   1. GOOGLE_SERVICE_ACCOUNT_KEY_FILE env var pointing to the JSON key file (local dev)
 *   2. GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_PRIVATE_KEY env vars (Vercel / production)
 */
function getSheets() {
  let auth;

  // Prefer the JSON key file if it exists (most reliable for local dev)
  const keyFilePath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE;
  if (keyFilePath) {
    const resolvedPath = path.isAbsolute(keyFilePath)
      ? keyFilePath
      : path.resolve(__dirname, '..', keyFilePath);

    auth = new google.auth.GoogleAuth({
      keyFile: resolvedPath,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
  } else {
    // Fall back to individual env vars
    const clientEmail = (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '')
      .replace(/^﻿/, '')   // strip BOM
      .replace(/^["']|["']$/g, '')
      .replace(/,\s*$/, '')
      .trim();

    const privateKey = (process.env.GOOGLE_PRIVATE_KEY || '')
      .replace(/^﻿/, '')   // strip BOM
      .replace(/^["']|["']$/g, '')
      .replace(/\\n/g, '\n')
      .replace(/\r\n/g, '\n')   // normalise Windows line endings
      .trimEnd();

    if (!clientEmail || !privateKey) {
      throw new Error(
        'Missing Google credentials. Set GOOGLE_SERVICE_ACCOUNT_KEY_FILE or both GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY.'
      );
    }

    auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
  }

  return google.sheets({ version: 'v4', auth });
}

/**
 * Checks if the first row looks like a header row.
 * A row is considered a header if its first cell matches "Name" (case-insensitive).
 */
function isHeaderRow(row) {
  if (!row || row.length === 0) return false;
  const first = (row[0] || '').toString().trim().toLowerCase();
  return first === 'name';
}

/**
 * Ensures the sheet has a header row. If the first row contains data (not headers),
 * inserts a header row above it so existing data is preserved.
 * Also applies professional formatting to the sheet.
 */
async function ensureHeaders() {
  const sheets = getSheets();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_TAB}!A1:H1`,
  });

  const firstRow = (response.data.values || [])[0];

  // If the first row is already a header, skip
  if (firstRow && isHeaderRow(firstRow)) return;

  // Get the sheet's gid (numeric ID)
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: SHEET_ID,
    fields: 'sheets(properties(sheetId,title))',
  });

  const sheetMeta = meta.data.sheets.find(s => s.properties.title === SHEET_TAB);
  if (!sheetMeta) throw new Error(`Sheet tab "${SHEET_TAB}" not found`);

  const sheetId = sheetMeta.properties.sheetId;

  const requests = [];

  // If the sheet has data but no header, insert a row above
  if (firstRow) {
    requests.push({
      insertDimension: {
        range: { sheetId, dimension: 'ROWS', startIndex: 0, endIndex: 1 },
        inheritFromBefore: false,
      },
    });
  }

  // --- Formatting requests ---

  // Header row: bold white text on dark blue (#1a237e) background
  requests.push({
    repeatCell: {
      range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 8 },
      cell: {
        userEnteredFormat: {
          backgroundColor: { red: 0.1, green: 0.14, blue: 0.49 },
          textFormat: { bold: true, fontSize: 11, foregroundColor: { red: 1, green: 1, blue: 1 } },
          horizontalAlignment: 'CENTER',
          verticalAlignment: 'MIDDLE',
          padding: { top: 6, bottom: 6, left: 8, right: 8 },
        },
      },
      fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,padding)',
    },
  });

  // Freeze header row
  requests.push({
    updateSheetProperties: {
      properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
      fields: 'gridProperties.frozenRowCount',
    },
  });

  // Set column widths: Name(180), Email(220), Company(160), Role(140), LinkedIn(240), Status(90), Email Sent(160), Notes(280)
  const widths = [180, 220, 160, 140, 240, 90, 160, 280];
  widths.forEach((w, i) => {
    requests.push({
      updateDimensionProperties: {
        range: { sheetId, dimension: 'COLUMNS', startIndex: i, endIndex: i + 1 },
        properties: { pixelSize: w },
        fields: 'pixelSize',
      },
    });
  });

  // Set header row height
  requests.push({
    updateDimensionProperties: {
      range: { sheetId, dimension: 'ROWS', startIndex: 0, endIndex: 1 },
      properties: { pixelSize: 36 },
      fields: 'pixelSize',
    },
  });

  // Add alternating row banding (light blue/white stripes)
  requests.push({
    addBanding: {
      bandedRange: {
        range: { sheetId, startRowIndex: 0, startColumnIndex: 0, endColumnIndex: 8 },
        rowProperties: {
          headerColor: { red: 0.1, green: 0.14, blue: 0.49 },
          firstBandColor: { red: 1, green: 1, blue: 1 },
          secondBandColor: { red: 0.92, green: 0.94, blue: 0.98 },
        },
      },
    },
  });

  // Execute all formatting in one batch
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: { requests },
  });

  // Write headers into row 1
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_TAB}!A1:H1`,
    valueInputOption: 'RAW',
    requestBody: { values: [EXPECTED_HEADERS] },
  });

  console.log('Header row inserted and sheet formatted.');
}

/**
 * Converts a raw row array into a lead object.
 * @param {Array} row - Array of cell values (A–H).
 * @param {number} rowIndex - 1-based row index in the sheet.
 * @returns {Object} Lead object with all 8 column fields plus `row`.
 */
function rowToLead(row, rowIndex) {
  return {
    name:      row[COLUMNS.name]      || '',
    email:     row[COLUMNS.email]     || '',
    company:   row[COLUMNS.company]   || '',
    role:      row[COLUMNS.role]      || '',
    linkedin:  row[COLUMNS.linkedin]  || '',
    status:    row[COLUMNS.status]    || '',
    emailSent: row[COLUMNS.emailSent] || '',
    notes:     row[COLUMNS.notes]     || '',
    row:       rowIndex,
  };
}

/**
 * Reads all rows from the sheet and returns only leads where Status (col F)
 * is blank or "new" (case-insensitive).
 * @returns {Promise<Array>} Array of lead objects.
 */
async function getNewLeads() {
  await ensureHeaders();
  const sheets = getSheets();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_TAB}!A:H`,
  });

  const rows = response.data.values || [];

  // Skip header row (index 0 in the array = row 1 in the sheet)
  return rows
    .slice(1)
    .map((row, i) => rowToLead(row, i + 2))
    .filter((lead) => {
      const status = lead.status.trim().toLowerCase();
      return status === '' || status === 'new';
    });
}

/**
 * Updates columns F–H (Status, EmailSent, Notes) for a specific row.
 * Missing keys in `data` preserve the existing cell content.
 * @param {number} row - 1-based row index.
 * @param {{ status?: string, emailSent?: string, notes?: string }} data
 */
async function updateLeadStatus(row, data) {
  const sheets = getSheets();

  // Fetch current values for F–H so we can preserve cells not in `data`
  const currentResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_TAB}!F${row}:H${row}`,
  });

  const currentRow = (currentResponse.data.values || [[]])[0] || [];
  const currentStatus    = currentRow[0] || '';
  const currentEmailSent = currentRow[1] || '';
  const currentNotes     = currentRow[2] || '';

  const updatedValues = [
    [
      Object.prototype.hasOwnProperty.call(data, 'status')    ? data.status    : currentStatus,
      Object.prototype.hasOwnProperty.call(data, 'emailSent') ? data.emailSent : currentEmailSent,
      Object.prototype.hasOwnProperty.call(data, 'notes')     ? data.notes     : currentNotes,
    ],
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_TAB}!F${row}:H${row}`,
    valueInputOption: 'RAW',
    requestBody: { values: updatedValues },
  });
}

/**
 * Appends a new lead row to the sheet.
 * Sets Status = "new", EmailSent = "", Notes = "".
 * @param {{ name: string, email: string, company: string, role: string, linkedin: string }} leadData
 */
async function appendLead(leadData) {
  await ensureHeaders();
  const sheets = getSheets();

  const newRow = [
    leadData.name     || '',
    leadData.email    || '',
    leadData.company  || '',
    leadData.role     || '',
    leadData.linkedin || '',
    'new',
    '',
    '',
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_TAB}!A:H`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [newRow] },
  });
}

/**
 * Reads all data rows from the sheet (skips header row).
 * Returns every lead regardless of status.
 * @returns {Promise<Array>} Array of lead objects with all 8 column fields plus `row`.
 */
async function getAllLeads() {
  await ensureHeaders();
  const sheets = getSheets();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_TAB}!A:H`,
  });

  const rows = response.data.values || [];

  // Skip header row (index 0 in the array = row 1 in the sheet)
  return rows
    .slice(1)
    .map((row, i) => rowToLead(row, i + 2));
}

module.exports = {
  getSheets,
  SHEET_ID,
  ensureHeaders,
  getNewLeads,
  updateLeadStatus,
  appendLead,
  getAllLeads,
};
