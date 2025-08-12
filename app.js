// app.js - vollständige Version mit Themes, Modal, Charts, Exporten, Tabs
document.addEventListener('DOMContentLoaded', () => {
  // --- Elements ---
  const greetingEl = document.getElementById('greeting');
  const monthRangeEl = document.getElementById('monthRange');
  const currentDateEl = document.getElementById('currentDate');

  const totalBudgetInput = document.getElementById('totalBudget');
  const saveBudgetBtn = document.getElementById('saveBudget');
  const remainingEl = document.getElementById('remaining');
  const spentEl = document.getElementById('spent');

  const txDesc = document.getElementById('txDesc');
  const txAmount = document.getElementById('txAmount');
  const txCategory = document.getElementById('txCategory');
  const addTxBtn = document.getElementById('addTx');

  const historyList = document.getElementById('historyList');
  const allList = document.getElementById('allList');
  const filterCategory = document.getElementById('filterCategory');
  const searchHistory = document.getElementById('searchHistory');

  const exportCSVBtn = document.getElementById('exportCSV');
  const exportChartBtn = document.getElementById('exportChart');
  const resetHistoryBtn = document.getElementById('resetHistory');

  const settingsExportCSV = document.getElementById('settingsExportCSV');
  const settingsExportChart = document.getElementById('settingsExportChart');

  const welcomeModal = document.getElementById('welcomeModal');
  const welcomeNameInput = document.getElementById('welcomeName');
  const welcomeSaveBtn = document.getElementById('welcomeSave');

  const userNameInput = document.getElementById('userName');
  const saveNameBtn = document.getElementById('saveName');

  // charts
  const categoryCanvas = document.getElementById('categoryChart');
  const percentageCanvas = document.getElementById('percentageChart');

  // tabs
  const navBtns = document.querySelectorAll('.nav-btn');
  const tabs = document.querySelectorAll('.tab');

  // theme buttons
  const themeBtns = document.querySelectorAll('[data-theme-select]');

  // data
  let budget = parseFloat(localStorage.getItem('budget')) || 0;
  let transactions = JSON.parse(localStorage.getItem('transactions') || '[]');

  // Chart instances
  let categoryChart = null;
  let percentageChart = null;

  // ---------- Header / Live date ----------
  function updateHeader() {
    const name = localStorage.getItem('userName') || '';
    const now = new Date();
    const month = now.toLocaleString('de-DE', { month: 'long' });
    const year = now.getFullYear();
    greetingEl.textContent = `Hallo ${name || ''}`;
    monthRangeEl.textContent = `Budget für ${month} ${year}`;
    currentDateEl.textContent = now.toLocaleString('de-DE', { dateStyle:'full', timeStyle:'short' });
  }
  setInterval(updateHeader, 1000);
  updateHeader();

  // ---------- Modal welcome ----------
  function openWelcomeIfNeeded() {
    if (!localStorage.getItem('userName')) {
      welcomeModal.setAttribute('aria-hidden', 'false');
    } else {
      welcomeModal.setAttribute('aria-hidden', 'true');
    }
  }
  openWelcomeIfNeeded();

  welcomeSaveBtn.addEventListener('click', () => {
    const v = welcomeNameInput.value.trim();
    if (!v) return;
    localStorage.setItem('userName', v);
    welcomeModal.setAttribute('aria-hidden', 'true');
    updateHeader();
  });

  // ---------- Theme handling ----------
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    // visual active state on theme buttons
    themeBtns.forEach(b => {
      if (b.getAttribute('data-theme-select') === theme) b.classList.add('active');
      else b.classList.remove('active');
    });
  }
  // wire theme buttons
  themeBtns.forEach(b => {
    b.addEventListener('click', () => applyTheme(b.getAttribute('data-theme-select')));
  });
  // initial theme
  const savedTheme = localStorage.getItem('theme') || 'standard';
  applyTheme(savedTheme);

  // ---------- Storage helpers ----------
  function saveData() {
    localStorage.setItem('budget', budget);
    localStorage.setItem('transactions', JSON.stringify(transactions));
  }

  // ---------- Summary ----------
  function updateSummary() {
    const spent = transactions.reduce((s, t) => s + Number(t.amount || 0), 0);
    spentEl.textContent = `CHF ${spent.toFixed(2)}`;
    remainingEl.textContent = `CHF ${(Math.max(0, (budget || 0) - spent)).toFixed(2)}`;
  }

  // ---------- History render ----------
  function renderHistory() {
    // main history tab
    historyList.innerHTML = '';
    const filtered = transactions.slice().reverse();
    if (!filtered.length) {
      const e = document.createElement('div'); e.className='muted'; e.textContent='Keine Einträge.'; historyList.appendChild(e);
    } else {
      filtered.forEach(t => {
        const item = document.createElement('div');
        item.className = 'panel';
        item.textContent = `${t.category} — ${t.desc} — CHF ${Number(t.amount).toFixed(2)}`;
        historyList.appendChild(item);
      });
    }

    // allList (Auflistung)
    if (allList) {
      allList.innerHTML = '';
      transactions.forEach(t => {
        const it = document.createElement('div'); it.className='panel';
        it.textContent = `${t.category} — ${t.desc} — CHF ${Number(t.amount).toFixed(2)}`;
        allList.appendChild(it);
      });
    }
  }

  // ---------- Categories list for filter ----------
  function refreshCategories() {
    const cats = Array.from(new Set(transactions.map(t => t.category)));
    filterCategory.innerHTML = '<option value="">Alle Kategorien</option>';
    cats.forEach(c => {
      const opt = document.createElement('option'); opt.value = c; opt.textContent = c;
      filterCategory.appendChild(opt);
    });
    // also ensure txCategory contains at least defaults (simple)
    if (txCategory && txCategory.children.length === 0) {
      const defaults = ['Handyabo','Fonds','Eltern','Verpflegung','Frisör','Sparen','Geschenke','Sonstiges'];
      defaults.forEach(d => { const o = document.createElement('option'); o.value=o.textContent=d; txCategory.appendChild(o); });
    }
  }

  // ---------- Charts ----------
  function createOrUpdateCharts() {
    const sums = {};
    transactions.forEach(t => { sums[t.category] = (sums[t.category]||0) + Number(t.amount||0); });
    const labels = Object.keys(sums);
    const values = labels.map(l => sums[l]);

    const palette = labels.map((_,i) => `hsl(${(i*60)%360} 80% 55%)`);

    // category bar
    if (categoryChart) categoryChart.destroy();
    categoryChart = new Chart(categoryCanvas, {
      type:'bar',
      data:{ labels, datasets:[{ label:'Betrag CHF', data:values, backgroundColor: palette }] },
      options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}} }
    });

    // percentage doughnut
    if (percentageChart) percentageChart.destroy();
    percentageChart = new Chart(percentageCanvas, {
      type:'doughnut',
      data:{ labels, datasets:[{ data: values, backgroundColor: palette }] },
      options:{ responsive:true, maintainAspectRatio:false }
    });
  }

  // ---------- Add / Delete transaction ----------
  addTxBtn.addEventListener('click', () => {
    const desc = (txDesc && txDesc.value.trim()) || '—';
    const amount = parseFloat(txAmount && txAmount.value);
    const category = txCategory && txCategory.value;
    if (!amount || isNaN(amount)) { alert('Bitte gültigen Betrag eingeben'); return; }
    transactions.push({ desc, amount, category, date: new Date().toISOString() });
    saveData(); updateSummary(); renderHistory(); refreshCategories(); createOrUpdateCharts();
    if (txDesc) txDesc.value=''; if (txAmount) txAmount.value='';
  });

  // ---------- Save budget ----------
  saveBudgetBtn.addEventListener('click', () => {
    const v = parseFloat(totalBudgetInput.value) || 0;
    budget = v;
    saveData(); updateSummary();
  });

  // ---------- CSV Export ----------
  function exportCSV() {
    if (!transactions.length) { alert('Keine Daten zum Exportieren'); return; }
    const rows = [['Kategorie','Beschreibung','Betrag','Datum']];
    transactions.forEach(t => rows.push([t.category, t.desc, t.amount, t.date || '']));
    const csv = rows.map(r => r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type:'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download = `verlauf_${(new Date()).toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }
  exportCSVBtn && exportCSVBtn.addEventListener('click', exportCSV);

  // ---------- Chart PNG Export ----------
  function exportChartPNG() {
    try {
      const url = categoryCanvas.toDataURL('image/png');
      const a = document.createElement('a'); a.href=url; a.download = `diagramm_${(new Date()).toISOString().slice(0,10)}.png`; a.click();
    } catch(e) { console.warn(e); alert('Diagramm-Export fehlgeschlagen'); }
  }
  exportChartBtn && exportChartBtn.addEventListener('click', exportChartPNG);

  // Settings downloads -> trigger main exports
  settingsExportCSV && settingsExportCSV.addEventListener('click', () => exportCSV());
  settingsExportChart && settingsExportChart.addEventListener('click', () => exportChartPNG());

  // ---------- Reset history ----------
  resetHistoryBtn && resetHistoryBtn.addEventListener('click', () => {
    if (!confirm('Verlauf wirklich löschen?')) return;
    transactions = []; saveData(); updateSummary(); renderHistory(); refreshCategories(); createOrUpdateCharts();
  });

  // ---------- Tab switching ----------
  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      navBtns.forEach(b => { b.classList.remove('active'); b.setAttribute('aria-selected','false'); });
      btn.classList.add('active'); btn.setAttribute('aria-selected','true');
      const tabName = btn.getAttribute('data-tab');
      tabs.forEach(tab => {
        const should = tab.id === `tab-${tabName}`;
        tab.style.display = should ? 'block' : 'none';
        if (should) tab.classList.add('active'); else tab.classList.remove('active');
      });
    });
  });

  // ---------- Name save in settings ----------
  saveNameBtn && saveNameBtn.addEventListener('click', () => {
    const v = userNameInput.value.trim();
    if (!v) return;
    localStorage.setItem('userName', v); updateHeader(); openWelcomeIfNeeded();
    alert('Name gespeichert');
  });

  // ---------- Search & Filters ----------
  searchHistory && searchHistory.addEventListener('input', () => {
    const q = searchHistory.value.trim().toLowerCase();
    const list = document.getElementById('allList');
    if (!list) return;
    list.innerHTML = '';
    transactions.filter(t => !q || (t.desc||'').toLowerCase().includes(q) || (t.category||'').toLowerCase().includes(q))
      .forEach(t => {
        const it = document.createElement('div'); it.className='panel';
        it.textContent = `${t.category} — ${t.desc} — CHF ${Number(t.amount).toFixed(2)}`;
        list.appendChild(it);
      });
  });

  filterCategory && filterCategory.addEventListener('change', () => {
    const val = filterCategory.value;
    const list = document.getElementById('allList'); if (!list) return;
    list.innerHTML = '';
    transactions.filter(t => !val || t.category === val).forEach(t => {
      const it = document.createElement('div'); it.className='panel';
      it.textContent = `${t.category} — ${t.desc} — CHF ${Number(t.amount).toFixed(2)}`;
      list.appendChild(it);
    });
  });

  // ---------- Restore UI state ----------
  function initFromStorage() {
    totalBudgetInput.value = budget || '';
    if (userNameInput) userNameInput.value = localStorage.getItem('userName') || '';
    refreshCategories(); updateSummary(); renderHistory(); createOrUpdateCharts();
  }

  initFromStorage();
});
