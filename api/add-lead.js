const { appendLead } = require('../lib/sheets');
const { validateLead, validateEmail } = require('../lib/validation');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, email, company, role, linkedin } = req.body;

  const result = validateLead({ name, email, company });
  if (!result.valid) return res.status(400).json({ success: false, error: result.error });

  if (!validateEmail(email)) return res.status(400).json({ success: false, error: 'Invalid email format' });

  try {
    await appendLead({ name, email, company, role, linkedin });
    return res.status(200).json({ success: true, message: 'Lead added' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
