const Anthropic = require('@anthropic-ai/sdk');
const { buildOutreachPrompt } = require('./prompts.js');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function generateOutreach(lead) {
  const RETRIES = 3;
  const DELAY_MS = 1000;
  let lastError;

  try {
    for (let attempt = 1; attempt <= RETRIES; attempt++) {
      try {
        console.log(`Claude API attempt ${attempt} of ${RETRIES}...`);
        const message = await client.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 1024,
          messages: [{ role: 'user', content: buildOutreachPrompt(lead) }],
        });

        const rawText = message.content[0].text;
        const stripped = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
        const parsed = JSON.parse(stripped);

        const required = ['subject', 'body', 'reasoning'];
        const missing = required.filter(k => !(k in parsed));
        if (missing.length > 0) {
          throw new Error(`Claude response missing required keys: ${missing.join(', ')}`);
        }

        return parsed;
      } catch (err) {
        lastError = err;
        if (attempt < RETRIES) {
          await new Promise(r => setTimeout(r, DELAY_MS));
        }
      }
    }
    throw new Error(`Claude API failed after ${RETRIES} attempts: ${lastError.message}`);
  } catch (err) {
    throw err;
  }
}

module.exports = { generateOutreach };
