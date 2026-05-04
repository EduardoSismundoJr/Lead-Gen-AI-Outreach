require('dotenv').config({ path: '.env.local' });
const Anthropic = require('@anthropic-ai/sdk');
const { google } = require('googleapis');

let passed = 0;
let failed = 0;

function report(name, ok, detail) {
  if (ok) {
    console.log(`  PASS  ${name}`);
    passed++;
  } else {
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

// ── 1. Anthropic API ──────────────────────────────────────────────────────────
async function testAnthropic() {
  console.log('\n[1] Anthropic API');
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 16,
      messages: [{ role: 'user', content: 'Reply with the word PONG only.' }],
    });
    const text = msg.content[0]?.text || '';
    report('API key valid + reachable', true);
    report('Response contains text', text.length > 0, `got: "${text.trim()}"`);
  } catch (err) {
    report('API key valid + reachable', false, err.message);
    report('Response contains text', false, 'skipped');
  }
}

// ── 2. Google Sheets ──────────────────────────────────────────────────────────
async function testSheets() {
  console.log('\n[2] Google Sheets');
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.replace(/,$/, '').replace(/^"|"$/g, '');
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/^"|"$/g, '').replace(/\\n/g, '\n');

  let sheets;
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: { client_email: email, private_key: privateKey },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    sheets = google.sheets({ version: 'v4', auth });
    report('Service account auth', true);
  } catch (err) {
    report('Service account auth', false, err.message);
    report('Read sheet', false, 'skipped');
    report('Write & delete test row', false, 'skipped');
    return;
  }

  // Read
  let readOk = false;
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Sheet1!A1:H1',
    });
    readOk = Array.isArray(res.data.values) || res.data.values === null || res.data.values === undefined;
    report('Read sheet', true, `row 1: ${JSON.stringify(res.data.values?.[0] ?? [])}`);
  } catch (err) {
    report('Read sheet', false, err.message);
  }

  // Write then delete
  try {
    const testRow = [['__integration_test__', 'test@example.com', 'TestCo', 'Tester', '', 'new', '', '']];
    const append = await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: 'Sheet1!A:H',
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: testRow },
    });

    // Parse the updated range to get the row number we just wrote
    const updatedRange = append.data.updates?.updatedRange || '';
    const rowMatch = updatedRange.match(/(\d+)$/);
    const rowNum = rowMatch ? parseInt(rowMatch[1]) : null;

    if (rowNum) {
      await sheets.spreadsheets.values.clear({
        spreadsheetId: sheetId,
        range: `Sheet1!A${rowNum}:H${rowNum}`,
      });
    }

    report('Write & delete test row', true, rowNum ? `wrote row ${rowNum}, cleaned up` : 'wrote row, cleanup skipped');
  } catch (err) {
    report('Write & delete test row', false, err.message);
  }
}

// ── 3. Gmail OAuth2 ───────────────────────────────────────────────────────────
async function testGmail() {
  console.log('\n[3] Gmail OAuth2');
  try {
    const auth = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET
    );
    auth.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
    report('OAuth2 client created', true);

    try {
      const { token } = await auth.getAccessToken();
      report('Refresh token → access token', !!token, token ? 'token obtained' : 'empty token');

      try {
        // gmail.send scope doesn't allow getProfile — verify by attempting a send
        // with a deliberately malformed message; a 400 (not 401/403) confirms auth is valid
        const gmail = google.gmail({ version: 'v1', auth });
        await gmail.users.messages.send({ userId: 'me', requestBody: { raw: '' } });
        report('Gmail API reachable', true);
      } catch (err) {
        const authOk = err.code !== 401 && err.code !== 403 && !err.message.includes('Insufficient');
        report('Gmail API reachable (send scope)', authOk,
          authOk ? `auth valid, API rejected empty message as expected (${err.message})` : err.message);
      }
    } catch (err) {
      report('Refresh token → access token', false, err.message);
      report('Gmail API reachable', false, 'skipped');
    }
  } catch (err) {
    report('OAuth2 client created', false, err.message);
    report('Refresh token → access token', false, 'skipped');
    report('Gmail API reachable', false, 'skipped');
  }
}

// ── Runner ────────────────────────────────────────────────────────────────────
async function run() {
  console.log('Integration Tests');
  console.log('=================');
  await testAnthropic();
  await testSheets();
  await testGmail();
  console.log(`\n=================`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

run().catch(err => {
  console.error('\nUnexpected error:', err.message);
  process.exit(1);
});
