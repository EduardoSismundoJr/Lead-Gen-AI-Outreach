function buildOutreachPrompt(lead) {
  const { name, email, company, role, linkedin } = lead;
  return `You are an expert B2B sales copywriter. Generate a personalised cold-outreach email for the following lead.

Lead details:
- Name:     ${name}
- Email:    ${email}
- Company:  ${company}
- Role:     ${role}
- LinkedIn: ${linkedin}

Requirements:
1. The email body must be 3-5 sentences of plain text (no HTML, no markdown).
2. The email must feel human, concise, and relevant to the lead's role and company.
3. Do NOT use filler phrases like "I hope this email finds you well."

Respond with ONLY a valid JSON object using exactly these keys:
{ "subject": "...", "body": "...", "reasoning": "..." }`;
}

module.exports = { buildOutreachPrompt };
