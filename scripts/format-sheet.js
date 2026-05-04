require('dotenv').config({ path: '.env.local' });
const { google } = require('googleapis');

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const HEADERS  = ['Name', 'Email', 'Company', 'Role', 'LinkedIn', 'Status', 'Email Sent', 'Notes'];
const COL_WIDTHS = [160, 220, 160, 160, 200, 100, 160, 260]; // pixels

function getAuth() {
  const email = (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '')
    .replace(/^["']|["']$/g, '').replace(/,\s*$/, '').trim();
  const key = (process.env.GOOGLE_PRIVATE_KEY || '')
    .replace(/^["']|["']$/g, '').replace(/\\n/g, '\n');
  return new google.auth.GoogleAuth({
    credentials: { client_email: email, private_key: key },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

async function run() {
  const auth   = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  // Get sheetId (numeric tab ID, not the spreadsheet ID)
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const tab  = meta.data.sheets.find(s => s.properties.title === 'Sheet1');
  const sheetId = tab.properties.sheetId;

  // 1. Write header row
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: 'Sheet1!A1:H1',
    valueInputOption: 'RAW',
    requestBody: { values: [HEADERS] },
  });
  console.log('✓ Headers written');

  const requests = [];

  // 2. Freeze header row
  requests.push({
    updateSheetProperties: {
      properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
      fields: 'gridProperties.frozenRowCount',
    },
  });

  // 3. Header row style — dark navy background, white bold text
  requests.push({
    repeatCell: {
      range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
      cell: {
        userEnteredFormat: {
          backgroundColor: { red: 0.11, green: 0.18, blue: 0.33 },
          textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true, fontSize: 10 },
          verticalAlignment: 'MIDDLE',
          horizontalAlignment: 'LEFT',
        },
      },
      fields: 'userEnteredFormat(backgroundColor,textFormat,verticalAlignment,horizontalAlignment)',
    },
  });

  // 4. Data rows — alternating white / light blue-grey, font size 10
  requests.push({
    repeatCell: {
      range: { sheetId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: 0, endColumnIndex: 8 },
      cell: {
        userEnteredFormat: {
          textFormat: { fontSize: 10 },
          verticalAlignment: 'MIDDLE',
        },
      },
      fields: 'userEnteredFormat(textFormat,verticalAlignment)',
    },
  });

  // 5. Status column (F) — centre-aligned
  requests.push({
    repeatCell: {
      range: { sheetId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: 5, endColumnIndex: 6 },
      cell: { userEnteredFormat: { horizontalAlignment: 'CENTER' } },
      fields: 'userEnteredFormat.horizontalAlignment',
    },
  });

  // 6. Column widths
  COL_WIDTHS.forEach((px, i) => {
    requests.push({
      updateDimensionProperties: {
        range: { sheetId, dimension: 'COLUMNS', startIndex: i, endIndex: i + 1 },
        properties: { pixelSize: px },
        fields: 'pixelSize',
      },
    });
  });

  // 7. Row height for header
  requests.push({
    updateDimensionProperties: {
      range: { sheetId, dimension: 'ROWS', startIndex: 0, endIndex: 1 },
      properties: { pixelSize: 36 },
      fields: 'pixelSize',
    },
  });

  // 8. Row height for data rows
  requests.push({
    updateDimensionProperties: {
      range: { sheetId, dimension: 'ROWS', startIndex: 1, endIndex: 1000 },
      properties: { pixelSize: 28 },
      fields: 'pixelSize',
    },
  });

  // 9. Borders on the whole table area
  requests.push({
    updateBorders: {
      range: { sheetId, startRowIndex: 0, endRowIndex: 1000, startColumnIndex: 0, endColumnIndex: 8 },
      innerHorizontal: { style: 'SOLID', color: { red: 0.85, green: 0.87, blue: 0.90 }, width: 1 },
      innerVertical:   { style: 'SOLID', color: { red: 0.85, green: 0.87, blue: 0.90 }, width: 1 },
    },
  });

  // 10. Conditional formatting — status colours
  const statusFormats = [
    { value: 'sent',   bg: { red: 0.85, green: 0.97, blue: 0.88 } },
    { value: 'failed', bg: { red: 1.00, green: 0.88, blue: 0.87 } },
    { value: 'new',    bg: { red: 0.85, green: 0.91, blue: 1.00 } },
  ];
  statusFormats.forEach(({ value, bg }) => {
    requests.push({
      addConditionalFormatRule: {
        rule: {
          ranges: [{ sheetId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: 5, endColumnIndex: 6 }],
          booleanRule: {
            condition: { type: 'TEXT_EQ', values: [{ userEnteredValue: value }] },
            format: { backgroundColor: bg, textFormat: { bold: true } },
          },
        },
        index: 0,
      },
    });
  });

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: { requests },
  });
  console.log('✓ Formatting applied');
  console.log('Done — open the sheet to see the result.');
}

run().catch(err => { console.error('Error:', err.message); process.exit(1); });
