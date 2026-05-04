function showStatus(message, type) {
  const el = document.getElementById('status-msg');
  el.textContent = message;
  el.className = `status-msg ${type}`;
  if (type !== 'loading') setTimeout(() => { el.className = 'status-msg hidden'; }, 4000);
}

function statusBadge(status) {
  const s = (status || '').toLowerCase();
  const cls = { sent: 'badge-sent', failed: 'badge-failed', new: 'badge-new' }[s] || 'badge-empty';
  return `<span class="badge ${cls}">${status || '—'}</span>`;
}

async function loadLeads() {
  showStatus('Loading leads…', 'loading');
  try {
    const res = await fetch('/api/get-leads');
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    renderTable(data.leads);
    showStatus(`${data.count} lead(s) loaded.`, 'success');
  } catch (err) {
    showStatus(`Failed to load leads: ${err.message}`, 'error');
  }
}

function renderTable(leads) {
  const tbody = document.querySelector('#leads-table tbody');
  if (!leads.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#9ca3af">No leads yet.</td></tr>';
    return;
  }
  tbody.innerHTML = leads.map(l => `
    <tr>
      <td>${esc(l.name)}</td>
      <td>${esc(l.email)}</td>
      <td>${esc(l.company)}</td>
      <td>${esc(l.role)}</td>
      <td>${statusBadge(l.status)}</td>
      <td>${esc(l.emailSent)}</td>
      <td class="actions">
        <button class="btn btn-primary btn-sm" onclick="processLead(${l.row})">Process</button>
        <button class="btn btn-danger btn-sm" onclick="retryLead(${l.row})">Retry</button>
      </td>
    </tr>`).join('');
}

function esc(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

async function processLead(row) {
  showStatus(`Processing row ${row}…`, 'loading');
  try {
    const res = await fetch('/api/process-lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ row }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    showStatus(`Email sent to ${data.lead}.`, 'success');
    await loadLeads();
  } catch (err) {
    showStatus(`Process failed: ${err.message}`, 'error');
    await loadLeads();
  }
}

async function retryLead(row) {
  showStatus(`Retrying row ${row}…`, 'loading');
  try {
    const res = await fetch('/api/retry-lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ row }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    showStatus(data.message, 'success');
    await loadLeads();
  } catch (err) {
    showStatus(`Retry failed: ${err.message}`, 'error');
    await loadLeads();
  }
}

async function addLead(event) {
  event.preventDefault();
  const form = event.target;
  const payload = {
    name:     form.name.value.trim(),
    email:    form.email.value.trim(),
    company:  form.company.value.trim(),
    role:     form.role.value.trim(),
    linkedin: form.linkedin.value.trim(),
  };
  showStatus('Adding lead…', 'loading');
  try {
    const res = await fetch('/api/add-lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    showStatus(data.message, 'success');
    form.reset();
    await loadLeads();
  } catch (err) {
    showStatus(`Add failed: ${err.message}`, 'error');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadLeads();
  document.getElementById('add-lead-form').addEventListener('submit', addLead);
  document.getElementById('refresh-btn').addEventListener('click', loadLeads);
});
