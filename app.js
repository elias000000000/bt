document.addEventListener('DOMContentLoaded', () => {
  const greetingEl = document.getElementById('greeting');
  const monthRangeEl = document.getElementById('monthRange');
  const currentDateEl = document.getElementById('currentDate');
  const welcomeModal = document.getElementById('welcomeModal');
  const welcomeNameInput = document.getElementById('welcomeName');

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

  // Willkommens-Popup anzeigen, wenn kein Name gespeichert ist
  if (!localStorage.getItem('userName')) {
    welcomeModal.classList.add('active');
  }

  document.getElementById('welcomeSave').addEventListener('click', () => {
    const name = welcomeNameInput.value.trim();
    if (name) {
      localStorage.setItem('userName', name);
      welcomeModal.classList.remove('active');
      updateHeader();
    }
  });

  document.getElementById('saveName').addEventListener('click', () => {
    const name = document.getElementById('userName').value.trim();
    if (name) {
      localStorage.setItem('userName', name);
      updateHeader();
    }
  });

  let budget = parseFloat(localStorage.getItem('budget')) || 0;
  let transactions = JSON.parse(localStorage.getItem('transactions')) || [];

  const remainingEl = document.getElementById('remaining');
  const spentEl = document.getElementById('spent');

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
    const historyList = document.getElementById('historyList');
    historyList.innerHTML = '';
    transactions.forEach(t => {
      const item = document.createElement('div');
      item.className = 'panel';
      item.textContent = `${t.category} - ${t.desc} - CHF ${t.amount.toFixed(2)}`;
      historyList.appendChild(item);
    });
  }

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
    categoryChart = new Chart(document.getElementById('categoryChart'), {
      type: 'bar',
      data: { labels, datasets: [{ label: 'CHF', data, backgroundColor: colors }] },
      options: { responsive: true, plugins: { legend: { display: false } } }
    });

    if (percentageChart) percentageChart.destroy();
    percentageChart = new Chart(document.getElementById('percentageChart'), {
      type: 'pie',
      data: { labels, datasets: [{ data, backgroundColor: colors }] },
      options: { responsive: true }
    });
  }

  // Event Listener für Budget speichern
  document.getElementById('saveBudget').addEventListener('click', () => {
    budget = parseFloat(document.getElementById('totalBudget').value) || 0;
    saveData();
    updateSummary();
  });

  // Transaktion hinzufügen
  document.getElementById('addTx').addEventListener('click', () => {
    const desc = document.getElementById('txDesc').value.trim();
    const amount = parseFloat(document.getElementById('txAmount').value);
    const category = document.getElementById('txCategory').value;
    if (!desc || isNaN(amount)) return;
    transactions.push({ desc, amount, category });
    saveData();
    updateSummary();
    renderHistory();
    updateCharts();
    document.getElementById('txDesc').value = '';
    document.getElementById('txAmount').value = '';
  });

  // CSV Export
  document.getElementById('exportCSV').addEventListener('click', () => {
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

  // Diagramm Export
  document.getElementById('exportChart').addEventListener('click', () => {
    const url = document.getElementById('categoryChart').toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = 'diagramm.png';
    a.click();
  });

  // Downloads auch in den Einstellungen
  document.getElementById('settingsExportCSV').addEventListener('click', () => {
    document.getElementById('exportCSV').click();
  });

  document.getElementById('settingsExportChart').addEventListener('click', () => {
    document.getElementById('exportChart').click();
  });

  // Theme-Wechsel
  document.querySelectorAll('[data-theme-select]').forEach(btn => {
    btn.addEventListener('click', () => {
      const theme = btn.getAttribute('data-theme-select');
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('theme', theme);
    });
  });
  const savedTheme = localStorage.getItem('theme') || 'standard';
  document.documentElement.setAttribute('data-theme', savedTheme);

  // Tab Navigation
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tabName = btn.getAttribute('data-tab');
      document.querySelectorAll('.tab').forEach(tab => {
        tab.style.display = tab.id === `tab-${tabName}` ? 'block' : 'none';
      });
    });
  });

  updateSummary();
  renderHistory();
  updateCharts();
});
