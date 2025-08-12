document.addEventListener('DOMContentLoaded', () => {
  // ========================
  // Neuer Header-Bereich
  // ========================
  const greetingEl = document.getElementById('greeting');
  const monthRangeEl = document.getElementById('monthRange');
  const currentDateEl = document.getElementById('currentDate');
  const userNameInput = document.getElementById('userName');

  function updateHeader() {
    const name = localStorage.getItem('userName') || '';
    const now = new Date();
    const month = now.toLocaleString('de-DE', { month: 'long' });
    const year = now.getFullYear();
    const dateTime = now.toLocaleString('de-DE', { dateStyle: 'full', timeStyle: 'short' });

    greetingEl.textContent = `Hallo ${name || ''}`;
    monthRangeEl.textContent = `Budget für ${month} ${year}`;
    currentDateEl.textContent = dateTime;
  }

  setInterval(updateHeader, 1000);
  updateHeader();

  document.getElementById('saveName').addEventListener('click', () => {
    const name = userNameInput.value.trim();
    if (name) {
      localStorage.setItem('userName', name);
      updateHeader();
    }
  });

  // ========================
  // Ursprüngliche Variablen
  // ========================
  const totalBudgetInput = document.getElementById('totalBudget');
  const saveBudgetBtn = document.getElementById('saveBudget');
  const remainingEl = document.getElementById('remaining');
  const spentEl = document.getElementById('spent');
  const txDesc = document.getElementById('txDesc');
  const txAmount = document.getElementById('txAmount');
  const txCategory = document.getElementById('txCategory');
  const addTxBtn = document.getElementById('addTx');
  const historyList = document.getElementById('historyList');
  const filterCategory = document.getElementById('filterCategory');
  const searchHistory = document.getElementById('searchHistory');
  const exportCSVBtn = document.getElementById('exportCSV');
  const resetHistoryBtn = document.getElementById('resetHistory');
  const exportChartBtn = document.getElementById('exportChart');
  const percentageChartCanvas = document.getElementById('percentageChart');
  const categoryChartCanvas = document.getElementById('categoryChart');

  let budget = parseFloat(localStorage.getItem('budget')) || 0;
  let transactions = JSON.parse(localStorage.getItem('transactions')) || [];

  // ========================
  // Funktionen
  // ========================
  function updateSummary() {
    const spent = transactions.reduce((sum, t) => sum + t.amount, 0);
    spentEl.textContent = `CHF ${spent.toFixed(2)}`;
    remainingEl.textContent = `CHF ${(budget - spent).toFixed(2)}`;
  }

  function saveData() {
    localStorage.setItem('budget', budget);
    localStorage.setItem('transactions', JSON.stringify(transactions));
  }

  function renderHistory() {
    historyList.innerHTML = '';
    transactions
      .filter(t =>
        (!filterCategory.value || t.category === filterCategory.value) &&
        (!searchHistory.value || t.desc.toLowerCase().includes(searchHistory.value.toLowerCase()))
      )
      .forEach(t => {
        const item = document.createElement('div');
        item.className = 'panel';
        item.textContent = `${t.category} - ${t.desc} - CHF ${t.amount.toFixed(2)}`;
        historyList.appendChild(item);
      });
  }

  function renderCategories() {
    filterCategory.innerHTML = '<option value="">Alle Kategorien</option>';
    const categories = [...new Set(transactions.map(t => t.category))];
    categories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      filterCategory.appendChild(opt);
    });
  }

  // ========================
  // Chart.js Diagramme
  // ========================
  let categoryChart, percentageChart;

  function updateCharts() {
    const categorySums = {};
    transactions.forEach(t => {
      categorySums[t.category] = (categorySums[t.category] || 0) + t.amount;
    });

    const labels = Object.keys(categorySums);
    const data = Object.values(categorySums);
    const colors = labels.map((_, i) => `hsl(${i * 50}, 70%, 60%)`);

    if (categoryChart) categoryChart.destroy();
    categoryChart = new Chart(categoryChartCanvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [{ label: 'CHF', data, backgroundColor: colors }]
      },
      options: { responsive: true, plugins: { legend: { display: false } } }
    });

    if (percentageChart) percentageChart.destroy();
    percentageChart = new Chart(percentageChartCanvas, {
      type: 'pie',
      data: {
        labels,
        datasets: [{ data, backgroundColor: colors }]
      },
      options: { responsive: true }
    });
  }

  // ========================
  // Event-Listener
  // ========================
  saveBudgetBtn.addEventListener('click', () => {
    budget = parseFloat(totalBudgetInput.value) || 0;
    saveData();
    updateSummary();
  });

  addTxBtn.addEventListener('click', () => {
    const desc = txDesc.value.trim();
    const amount = parseFloat(txAmount.value);
    const category = txCategory.value;
    if (!desc || isNaN(amount)) return;
    transactions.push({ desc, amount, category });
    saveData();
    updateSummary();
    renderHistory();
    renderCategories();
    updateCharts();
    txDesc.value = '';
    txAmount.value = '';
  });

  filterCategory.addEventListener('change', renderHistory);
  searchHistory.addEventListener('input', renderHistory);

  exportCSVBtn.addEventListener('click', () => {
    let csv = 'Kategorie,Beschreibung,Betrag\n';
    transactions.forEach(t => {
      csv += `${t.category},${t.desc},${t.amount}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'verlauf.csv';
    a.click();
    URL.revokeObjectURL(url);
  });

  resetHistoryBtn.addEventListener('click', () => {
    if (confirm('Verlauf wirklich löschen?')) {
      transactions = [];
      saveData();
      updateSummary();
      renderHistory();
      renderCategories();
      updateCharts();
    }
  });

  exportChartBtn.addEventListener('click', () => {
    const url = categoryChartCanvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = 'diagramm.png';
    a.click();
  });

  // ========================
  // Initialisierung
  // ========================
  updateSummary();
  renderHistory();
  renderCategories();
  updateCharts();
});
