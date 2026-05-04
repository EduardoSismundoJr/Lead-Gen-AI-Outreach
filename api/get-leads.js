const { getAllLeads } = require('../lib/sheets');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const leads = await getAllLeads();
    return res.status(200).json({ success: true, leads, count: leads.length });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
