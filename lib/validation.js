function validateLead(lead) {
  for (const field of ['name', 'email', 'company']) {
    if (!lead[field]) {
      return { valid: false, error: `Missing required field: ${field}` };
    }
  }
  return { valid: true };
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

module.exports = { validateLead, validateEmail };
