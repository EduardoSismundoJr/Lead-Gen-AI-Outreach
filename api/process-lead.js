const { getAllLeads, updateLeadStatus } = require('../lib/sheets');
const { generateOutreach } = require('../lib/claude');
const { sendEmail } = require('../lib/gmail');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { row } = req.body;
  try {
    const leads = await getAllLeads();
    const lead = leads.find(l => l.row === row);
    if (!lead) return res.status(404).json({ success: false, error: `No lead found at row ${row}` });

    const { subject, body, reasoning } = await generateOutreach(lead);
    await sendEmail({ to: lead.email, subject, body });
    await updateLeadStatus(row, { status: 'sent', emailSent: new Date().toISOString(), notes: reasoning });

    return res.status(200).json({ success: true, lead: lead.email });
  } catch (err) {
    await updateLeadStatus(row, { status: 'failed', notes: err.message }).catch(() => {});
    return res.status(500).json({ success: false, error: err.message });
  }
};
