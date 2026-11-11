// ── AUTH ────────────────────────────────────────────────────

async function doLogin() {
  const email    = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const res  = await fetch('/api/login', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({email, password})
  });
  const data = await res.json();
  if (data.success) {
    window.location.href = '/dashboard';
  } else {
    showMsg('msg', data.error || 'Login failed', 'error');
  }
}

async function doRegister() {
  const payload = {
    name:     document.getElementById('name').value,
    email:    document.getElementById('email').value,
    phone:    document.getElementById('phone').value,
    address:  document.getElementById('address').value,
    password: document.getElementById('password').value
  };
  const res  = await fetch('/api/register', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (res.ok) {
    showMsg('msg', 'Account created! Redirecting...', 'success');
    setTimeout(() => window.location.href = '/login', 1500);
  } else {
    showMsg('msg', data.error || 'Registration failed', 'error');
  }
}

// ── DASHBOARD ────────────────────────────────────────────────

async function loadDashboard() {
  const stats = await fetch('/api/dashboard-stats').then(r => r.json());
  document.getElementById('uname').textContent =
    document.cookie || stats.name || '';
  document.getElementById('total_txns').textContent  = stats.total_txns;
  document.getElementById('total_spent').textContent = '₹' + Number(stats.total_spent).toLocaleString('en-IN');
  document.getElementById('flagged_txns').textContent = stats.flagged_txns;
  document.getElementById('pending_alerts').textContent = stats.pending_alerts;

  const cards = await fetch('/api/my-cards').then(r => r.json());
  const grid  = document.getElementById('cards-grid');
  grid.innerHTML = cards.map(c => `
    <div class="credit-card">
      <div>
        <span class="card-type">${c.card_type}</span>
        <span class="card-status status-${c.status}" style="float:right">${c.status}</span>
      </div>
      <div class="card-num">${maskCard(c.card_number)}</div>
      <div class="card-bottom">
        <span>Limit: ₹${Number(c.credit_limit).toLocaleString('en-IN')}</span>
        <span>Balance: ₹${Number(c.current_balance).toLocaleString('en-IN')}</span>
        <span>Exp: ${c.expiry_date}</span>
      </div>
    </div>`).join('');

  const txns  = await fetch('/api/my-transactions').then(r => r.json());
  const tbody = document.getElementById('recent-body');
  tbody.innerHTML = txns.slice(0,5).map(t => `
    <tr>
      <td>#${t.transaction_id}</td>
      <td>${t.merchant_name}</td>
      <td>₹${Number(t.amount).toLocaleString('en-IN')}</td>
      <td><span class="badge badge-${t.status}">${t.status}</span></td>
      <td>${fmtTime(t.transaction_time)}</td>
    </tr>`).join('');
}

// ── TRANSACTIONS ────────────────────────────────────────────

let allTxns = [];

async function loadTransactions() {
  allTxns = await fetch('/api/my-transactions').then(r => r.json());
  renderTxns(allTxns);
}

function renderTxns(list) {
  document.getElementById('txn-body').innerHTML = list.map(t => `
    <tr>
      <td>#${t.transaction_id}</td>
      <td>${maskCard(t.card_number)} (${t.card_type})</td>
      <td>${t.merchant_name}</td>
      <td>${t.category}</td>
      <td>₹${Number(t.amount).toLocaleString('en-IN')}</td>
      <td>${t.location || '—'}</td>
      <td><span class="badge badge-${t.status}">${t.status}</span></td>
      <td>${fmtTime(t.transaction_time)}</td>
    </tr>`).join('') || '<tr><td colspan="8" style="text-align:center;color:#94a3b8;padding:2rem">No transactions yet</td></tr>';
}

function filterTxns() {
  const status = document.getElementById('filter-status').value;
  const search = document.getElementById('filter-search').value.toLowerCase();
  renderTxns(allTxns.filter(t =>
    (!status || t.status === status) &&
    (!search || t.merchant_name.toLowerCase().includes(search))
  ));
}

// ── NEW TRANSACTION ──────────────────────────────────────────

async function loadFormData() {
  const cards = await fetch('/api/my-cards').then(r => r.json());
  const sel   = document.getElementById('card_id');
  sel.innerHTML = cards.map(c =>
    `<option value="${c.card_id}">${maskCard(c.card_number)} — ${c.card_type} (Limit ₹${Number(c.credit_limit).toLocaleString('en-IN')})</option>`
  ).join('');

  const merchants = await fetch('/api/merchants').then(r => r.json());
  const msel = document.getElementById('merchant_id');
  msel.innerHTML = merchants.map(m =>
    `<option value="${m.merchant_id}">${m.name} (${m.category})</option>`
  ).join('');
}

async function submitTxn() {
  const payload = {
    card_id:     +document.getElementById('card_id').value,
    merchant_id: +document.getElementById('merchant_id').value,
    amount:       +document.getElementById('amount').value,
    location:     document.getElementById('location').value || 'Online',
    ip_address:   '192.168.1.' + Math.floor(Math.random()*255)
  };
  if (!payload.amount || payload.amount <= 0) {
    showMsg('txn-result','Please enter a valid amount','error'); return;
  }
  const res  = await fetch('/api/add-transaction', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (res.ok) {
    const risk = data.risk_score > 0.3 ? ' ⚠ Flagged for fraud review!' : '';
    showMsg('txn-result',
      `Transaction ${data.status.toUpperCase()} (ID: ${data.transaction_id})${risk}`,
      data.status === 'approved' ? 'success' : 'error');
  } else {
    showMsg('txn-result', data.error || 'Failed', 'error');
  }
}

// ── FRAUD ALERTS ─────────────────────────────────────────────

async function loadFraudAlerts() {
  const alerts = await fetch('/api/fraud-alerts').then(r => r.json());
  const tbody  = document.getElementById('fraud-body');
  if (!alerts.length) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#94a3b8;padding:2rem">No fraud alerts</td></tr>';
    return;
  }
  tbody.innerHTML = alerts.map(a => {
    const riskClass = a.risk_score >= 0.7 ? 'risk-high' : a.risk_score >= 0.4 ? 'risk-med' : 'risk-low';
    return `<tr>
      <td>#${a.alert_id}</td>
      <td>${maskCard(a.card_number)}</td>
      <td>${a.merchant_name}</td>
      <td>₹${Number(a.amount).toLocaleString('en-IN')}</td>
      <td class="${riskClass}">${(a.risk_score*100).toFixed(0)}%</td>
      <td>${a.reason || '—'}</td>
      <td><span class="badge badge-${a.alert_status}">${a.alert_status}</span></td>
      <td>
        ${a.alert_status==='pending' ? `
        <button class="btn-small" onclick="resolveAlert(${a.alert_id},'confirmed')">Confirm</button>
        <button class="btn-small btn-danger" onclick="resolveAlert(${a.alert_id},'dismissed')">Dismiss</button>` : '—'}
      </td>
    </tr>`;
  }).join('');
}

async function resolveAlert(id, status) {
  await fetch('/api/resolve-alert/' + id, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({status})
  });
  loadFraudAlerts();
}

// ── HELPERS ──────────────────────────────────────────────────

function maskCard(num) {
  if (!num) return '—';
  return '•••• •••• •••• ' + String(num).slice(-4);
}

function fmtTime(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('en-IN', {
    day:'2-digit', month:'short', year:'numeric',
    hour:'2-digit', minute:'2-digit'
  });
}

function showMsg(id, text, type) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  el.className = 'msg ' + type;
}
