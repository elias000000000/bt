// app.js — vollständige App-Logik
// Erwartet: Chart.js geladen (deferred in HTML), index.html & styles.css wie geliefert.

(() => {
  'use strict';

  // ---------- Helpers ----------
  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));
  const fmtCHF = v => `CHF ${Number(v || 0).toFixed(2)}`;

  const KEY = 'bp_v1_state';

  // ---------- State (persisted) ----------
  let state = {
    name: '',
    budget: 0,
    transactions: [], // {id, desc, amount, category, date}
    theme: 'standard'
  };

  function loadState() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        state = Object.assign(state, parsed || {});
      }
    } catch (e) {
      console.warn('loadState error', e);
    }
  }
  function saveState() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('saveState error', e);
    }
  }

  // ---------- Element refs ----------
  const refs = {
    greeting: '#greeting',
    monthRange: '#monthRange',
    currentDate: '#currentDate',
    budgetWord: '#budgetWord',
    totalBudget: '#totalBudget',
    saveBudget: '#saveBudget',
    remaining: '#remaining',
    spent: '#spent',
    txDesc: '#txDesc',
    txAmount: '#txAmount',
    txCategory: '#txCategory',
    addTx: '#addTx',
    categoryChart: '#categoryChart',
    percentageChart: '#percentageChart',
    historyList: '#historyList',
    allList: '#allList',
    filterCategory: '#filterCategory',
    searchHistory: '#searchHistory',
    exportCSV: '#exportCSV',
    exportChart: '#exportChart',
    resetHistory: '#resetHistory',
    settingsExportCSV: '#settingsExportCSV',
    settingsExportChart: '#settingsExportChart',
    welcomeModal: '#welcomeModal',
    welcomeName: '#welcomeName',
    welcomeSave: '#welcomeSave',
    userName: '#userName',
    saveName: '#saveName',
    navBtns: '.nav-btn',
    tabs: '.tab',
    themeBtns: '[data-theme-select]',
    themeGrid: '.theme-grid'
  };

  // query helpers
  const $el = k => document.querySelector(refs[k]);
  const $all = k => Array.from(document.querySelectorAll(refs[k]));

  // ---------- Charts ----------
  let categoryChart = null;
  let percentageChart = null;
  function createCharts() {
    // safe guards
    const catCanvas = document.querySelector(refs.categoryChart);
    const pctCanvas = document.querySelector(refs.percentageChart);
    if (!catCanvas || !pctCanvas) return;

    if (categoryChart) categoryChart.destroy();
    if (percentageChart) percentageChart.destroy();

    // create placeholder empty charts; updateCharts will fill
    categoryChart = new Chart(catCanvas.getContext('2d'), {
      type: 'bar',
      data: { labels: [], datasets: [{ label: 'Betrag CHF', data: [], backgroundColor: [] }] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 360 },
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } }
      }
    });

    percentageChart = new Chart(pctCanvas.getContext('2d'), {
      type: 'doughnut',
      data: { labels: [], datasets: [{ data: [], backgroundColor: [] }] },
      options: { responsive: true, maintainAspectRatio: false, animation: { duration: 360 } }
    });
  }

  function updateCharts() {
    if (!categoryChart || !percentageChart) return;
    const sums = {};
    state.transactions.forEach(t => {
      sums[t.category] = (sums[t.category] || 0) + Number(t.amount || 0);
    });
    const labels = Object.keys(sums);
    const values = labels.map(l => sums[l]);
    const palette = labels.map((_, i) => `hsl(${(i * 55) % 360} 78% 58%)`);

    // update categoryChart
    categoryChart.data.labels = labels;
    categoryChart.data.datasets[0].data = values;
    categoryChart.data.datasets[0].backgroundColor = palette;
    categoryChart.update();

    // update percentageChart (doughnut shows values)
    percentageChart.data.labels = labels;
    percentageChart.data.datasets[0].data = values;
    percentageChart.data.datasets[0].backgroundColor = palette;
    percentageChart.update();
  }

  // ---------- UI rendering ----------
  function updateHeader() {
    const name = state.name || '';
    const now = new Date();
    const month = now.toLocaleString('de-CH', { month: 'long' });
    const year = now.getFullYear();
    const dateTime = now.toLocaleString('de-CH', { weekday: 'long', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

    const greetingEl = document.querySelector(refs.greeting);
    const monthRangeEl = document.querySelector(refs.monthRange);
    const currentDateEl = document.querySelector(refs.currentDate);

    if (greetingEl) greetingEl.textContent = name ? `Hallo ${name}` : 'Hallo';
    if (monthRangeEl) {
      // ensure budgetWord gets gradient via CSS variable
      monthRangeEl.innerHTML = `<span id="budgetWord" style="background:var(--accent-gradient);-webkit-background-clip:text;color:transparent;font-weight:900">Budget</span> für ${month} ${year}`;
    }
    if (currentDateEl) currentDateEl.textContent = dateTime;
  }

  function updateSummaryUI() {
    const spent = state.transactions.reduce((s, t) => s + Number(t.amount || 0), 0);
    const remaining = Math.max(0, (Number(state.budget || 0) - spent));
    const spentEl = document.querySelector(refs.spent);
    const remEl = document.querySelector(refs.remaining);
    if (spentEl) spentEl.textContent = fmtCHF(spent);
    if (remEl) remEl.textContent = fmtCHF(remaining);
    // color warning if overspent
    if (remEl) remEl.style.color = (spent > (state.budget || 0)) ? 'var(--accent-contrast)' : '';
  }

  function renderHistory() {
    const historyContainer = document.querySelector(refs.historyList);
    if (!historyContainer) return;
    historyContainer.innerHTML = '';
    // show newest first
    const items = state.transactions.slice().reverse();
    if (!items.length) {
      const el = document.createElement('div'); el.className = 'muted'; el.textContent = 'Keine Einträge.'; historyContainer.appendChild(el);
      return;
    }
    items.forEach(tx => {
      const d = document.createElement('div'); d.className = 'panel';
      d.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
          <div>
            <div style="font-weight:800">${escapeHtml(tx.desc)}</div>
            <div style="font-size:12px;color:rgba(6,22,36,0.45)">${new Date(tx.date).toLocaleString()}</div>
          </div>
          <div style="text-align:right">
            <div style="font-weight:900">${fmtCHF(tx.amount)}</div>
            <div style="margin-top:6px"><button class="btn btn-danger btn-small" data-delete="${tx.id}">Löschen</button></div>
          </div>
        </div>
      `;
      historyContainer.appendChild(d);
    });
  }

  function renderAllList(filterText = '', filterCategory = '') {
    const allList = document.querySelector(refs.allList);
    if (!allList) return;
    allList.innerHTML = '';
    const filtered = state.transactions.filter(t => {
      const matchCategory = !filterCategory || t.category === filterCategory;
      const q = (filterText || '').toLowerCase();
      const matchText = !q || (t.desc || '').toLowerCase().includes(q) || (t.category || '').toLowerCase().includes(q);
      return matchCategory && matchText;
    });
    if (!filtered.length) {
      const el = document.createElement('div'); el.className = 'muted'; el.textContent = 'Keine Einträge.'; allList.appendChild(el);
      return;
    }
    filtered.forEach(t => {
      const it = document.createElement('div'); it.className = 'panel';
      it.innerHTML = `<div style="display:flex;justify-content:space-between"><div>${escapeHtml(t.category)} — ${escapeHtml(t.desc)}</div><div style="font-weight:900">${fmtCHF(t.amount)}</div></div>`;
      allList.appendChild(it);
    });
  }

  function refreshCategoryOptions() {
    const sel = document.querySelector(refs.filterCategory);
    if (!sel) return;
    sel.innerHTML = '<option value="">Alle Kategorien</option>';
    const cats = Array.from(new Set(state.transactions.map(t => t.category))).sort();
    cats.forEach(c => {
      const o = document.createElement('option'); o.value = c; o.textContent = c; sel.appendChild(o);
    });
  }

  // ---------- Utilities ----------
  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[m]));
  }
  function uid(prefix = '') { return prefix + Math.random().toString(36).slice(2, 9); }

  // ---------- CRUD ----------
  function addTransaction(desc, amount, category) {
    const t = { id: uid('t_'), desc: desc || '—', amount: Number(amount), category: category || 'Sonstiges', date: new Date().toISOString() };
    state.transactions.push(t);
    saveState();
    updateSummaryUI();
    renderHistory();
    renderAllList();
    refreshCategoryOptions();
    updateCharts();
  }
  function deleteTransaction(id) {
    state.transactions = state.transactions.filter(t => t.id !== id);
    saveState();
    updateSummaryUI();
    renderHistory();
    renderAllList();
    refreshCategoryOptions();
    updateCharts();
  }

  // ---------- Export ----------
  function exportCSV() {
    if (!state.transactions.length) { alert('Keine Daten zum Exportieren'); return; }
    const rows = [['id','date','category','description','amount']];
    state.transactions.forEach(t => rows.push([t.id, t.date, t.category, t.desc, t.amount]));
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `verlauf_${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  function exportChartPNG() {
    try {
      if (!categoryChart) { alert('Kein Diagramm verfügbar'); return; }
      const url = categoryChart.toBase64Image();
      const a = document.createElement('a'); a.href = url; a.download = `diagramm_${new Date().toISOString().slice(0,10)}.png`; a.click();
    } catch (e) {
      console.warn(e); alert('Diagramm-Export fehlgeschlagen');
    }
  }

  // ---------- Wire UI ----------
  function wireUI() {
    // Budget save
    const saveBudgetBtn = document.querySelector(refs.saveBudget);
    const totalBudgetInput = document.querySelector(refs.totalBudget);
    if (saveBudgetBtn && totalBudgetInput) {
      saveBudgetBtn.addEventListener('click', () => {
        const v = Number(totalBudgetInput.value || 0);
        if (isNaN(v) || v < 0) { alert('Ungültiges Budget'); return; }
        state.budget = v; saveState(); updateSummaryUI();
      });
    }

    // Add tx
    const addBtn = document.querySelector(refs.addTx);
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        const desc = (document.querySelector(refs.txDesc) || {}).value || '—';
        const amount = parseFloat((document.querySelector(refs.txAmount) || {}).value);
        const category = (document.querySelector(refs.txCategory) || {}).value || 'Sonstiges';
        if (!amount || isNaN(amount) || amount <= 0) { alert('Bitte gültigen Betrag eingeben'); return; }
        addTransaction(desc, amount, category);
      });
    }

    // History delete (delegation)
    const historyContainer = document.querySelector(refs.historyList);
    if (historyContainer) {
      historyContainer.addEventListener('click', (e) => {
        const del = e.target.closest('[data-delete]');
        if (del) {
          const id = del.getAttribute('data-delete');
          if (confirm('Eintrag wirklich löschen?')) deleteTransaction(id);
        }
      });
    }

    // Export buttons
    const exportCSVBtn = document.querySelector(refs.exportCSV);
    const exportChartBtn = document.querySelector(refs.exportChart);
    if (exportCSVBtn) exportCSVBtn.addEventListener('click', exportCSV);
    if (exportChartBtn) exportChartBtn.addEventListener('click', exportChartPNG);

    // Settings downloads trigger main exports
    const settingsCSV = document.querySelector(refs.settingsExportCSV);
    const settingsChart = document.querySelector(refs.settingsExportChart);
    if (settingsCSV) settingsCSV.addEventListener('click', exportCSV);
    if (settingsChart) settingsChart.addEventListener('click', exportChartPNG);

    // Reset history
    const resetBtn = document.querySelector(refs.resetHistory);
    if (resetBtn) resetBtn.addEventListener('click', () => {
      if (!confirm('Verlauf wirklich löschen?')) return;
      state.transactions = []; saveState(); updateSummaryUI(); renderHistory(); renderAllList(); refreshCategoryOptions(); updateCharts();
    });

    // Settings name save
    const saveNameBtn = document.querySelector(refs.saveName);
    const userNameInput = document.querySelector(refs.userName);
    if (saveNameBtn && userNameInput) {
      saveNameBtn.addEventListener('click', () => {
        const v = userNameInput.value.trim();
        if (!v) { alert('Bitte Namen eingeben'); return; }
        state.name = v; saveState(); updateHeader();
        alert('Name gespeichert');
      });
    }

    // Welcome modal save
    const welcomeSaveBtn = document.querySelector(refs.welcomeSave);
    const welcomeNameInput = document.querySelector(refs.welcomeName);
    const welcomeModal = document.querySelector(refs.welcomeModal);
    if (welcomeSaveBtn && welcomeNameInput && welcomeModal) {
      welcomeSaveBtn.addEventListener('click', () => {
        const v = welcomeNameInput.value.trim();
        if (!v) { alert('Bitte Namen eingeben'); return; }
        state.name = v; saveState(); updateHeader();
        welcomeModal.setAttribute('aria-hidden', 'true');
      });
    }

    // Tab navigation
    $$(refs.navBtns).forEach(btn => {
      btn.addEventListener('click', () => {
        $$(refs.navBtns).forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tabName = btn.dataset.tab;
        $$(refs.tabs).forEach(t => {
          if (t.id === `tab-${tabName}`) {
            t.style.display = ''; t.classList.add('active'); t.setAttribute('aria-hidden', 'false');
          } else {
            t.style.display = 'none'; t.classList.remove('active'); t.setAttribute('aria-hidden', 'true');
          }
        });
      });
    });

    // Theme buttons
    $$(refs.themeBtns).forEach(b => {
      b.addEventListener('click', () => {
        const theme = b.dataset.themeSelect;
        applyTheme(theme);
      });
    });

    // Theme buttons visual preview (already styled via CSS). Also set active class
    function updateThemeButtonsActive() {
      $$(refs.themeBtns).forEach(b => b.classList.toggle('active', b.dataset.themeSelect === state.theme));
    }

    // search & filter UI
    const searchEl = document.querySelector(refs.searchHistory);
    if (searchEl) {
      searchEl.addEventListener('input', () => {
        renderAllList(searchEl.value.trim(), (document.querySelector(refs.filterCategory) || {}).value);
      });
    }
    const filterEl = document.querySelector(refs.filterCategory);
    if (filterEl) {
      filterEl.addEventListener('change', () => {
        renderAllList((document.querySelector(refs.searchHistory) || {}).value.trim(), filterEl.value);
      });
    }

    // Keyboard enter shortcuts
    ['totalBudget','txAmount','txDesc','userName','welcomeName'].forEach(id => {
      const node = document.getElementById(id);
      if (!node) return;
      node.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (id === 'totalBudget') document.querySelector(refs.saveBudget)?.click();
          else if (id === 'txAmount' || id === 'txDesc') document.querySelector(refs.addTx)?.click();
          else if (id === 'userName') document.querySelector(refs.saveName)?.click();
          else if (id === 'welcomeName') document.querySelector(refs.welcomeSave)?.click();
        }
      });
    });

    // history delete via delegation in allList too
    const allListEl = document.querySelector(refs.allList);
    if (allListEl) {
      allListEl.addEventListener('click', (e) => {
        const del = e.target.closest('[data-delete]');
        if (del) {
          const id = del.dataset.delete;
          if (confirm('Eintrag wirklich löschen?')) deleteTransaction(id);
        }
      });
    }

    // resize chart on window resize
    window.addEventListener('resize', () => {
      try { categoryChart?.resize(); percentageChart?.resize(); } catch (e) {}
    }, { passive: true });

    // Attach delete buttons in history (delegated above)
  }

  // ---------- Small helpers ----------
  function applyTheme(theme) {
    state.theme = theme || 'standard';
    saveState();
    document.documentElement.setAttribute('data-theme', state.theme);
    // ensure header gradient for budget word updates on theme change
    updateHeader();
    // visually mark active theme button if present
    $$(refs.themeBtns).forEach(b => {
      b.classList.toggle('active', b.dataset.themeSelect === state.theme);
    });
  }

  function initialUISetup() {
    // set budget input
    const tb = document.querySelector(refs.totalBudget);
    if (tb) tb.value = state.budget || '';

    // set name fields
    const un = document.querySelector(refs.userName);
    if (un) un.value = state.name || '';

    // apply theme
    document.documentElement.setAttribute('data-theme', state.theme || 'standard');
    $$(refs.themeBtns).forEach(b => b.classList.toggle('active', b.dataset.themeSelect === state.theme));

    // show welcome modal if no name
    const welcomeModal = document.querySelector(refs.welcomeModal);
    if (welcomeModal) {
      if (!state.name) welcomeModal.setAttribute('aria-hidden', 'false');
      else welcomeModal.setAttribute('aria-hidden', 'true');
    }
  }

  // ---------- Init ----------
  function init() {
    loadState();
    // ensure defaults
    state = Object.assign({ name:'', budget:0, transactions:[], theme:'standard' }, state);

    createCharts();
    wireUI();
    initialUISetup();

    updateHeader();
    updateSummaryUI();
    renderHistory();
    renderAllList();
    refreshCategoryOptions();
    updateCharts();
  }

  // run
  init();

  // expose small debug helpers
  window.__budgetApp = {
    state,
    addTransaction,
    deleteTransaction,
    exportCSV,
    exportChartPNG: exportChartPNG,
    updateCharts
  };

})();
