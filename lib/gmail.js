const { google } = require('googleapis');

function getGmailClient() {
  const auth = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET
  );
  auth.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
  return google.gmail({ version: 'v1', auth });
}

function buildMimeMessage({ to, subject, body }) {
  const from = process.env.GMAIL_FROM_EMAIL;
  const mime = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset=utf-8',
    '',
    body,
  ].join('\r\n');
  return Buffer.from(mime).toString('base64url');
}

async function sendEmail({ to, subject, body }) {
  for (const field of ['to', 'subject', 'body']) {
    if (!{ to, subject, body }[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
  try {
    const gmail = getGmailClient();
    const raw = buildMimeMessage({ to, subject, body });
    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw },
    });
    return response.data;
  } catch (err) {
    throw new Error(`Gmail send failed: ${err.message}`);
  }
}

module.exports = { getGmailClient, buildMimeMessage, sendEmail };
