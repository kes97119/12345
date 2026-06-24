// ApexTrade stock simulator

const STOCK_METADATA = {
  NVDA: { name: 'NVIDIA Corporation', basePrice: 125.40, sector: 'Technology' },
  AAPL: { name: 'Apple Inc.', basePrice: 182.10, sector: 'Technology' },
  TSLA: { name: 'Tesla Inc.', basePrice: 178.60, sector: 'Automotive' },
  MSFT: { name: 'Microsoft Corporation', basePrice: 421.90, sector: 'Technology' },
  AMZN: { name: 'Amazon.com Inc.', basePrice: 184.50, sector: 'Consumer Cyclical' }
};

let stocks = {};
let watchlist = [];
let portfolio = {
  cash: 10000.00,
  holdings: {}
};
let transactions = [];
let activeTicker = 'NVDA';
let activeTimeframe = '1M';
let searchQuery = '';
let activeListTab = 'all';
let tradeType = 'buy';
let mainChartInstance = null;

const netAssetValueEl = document.getElementById('netAssetValue');
const portfolioPLEl = document.getElementById('portfolioPL');
const portfolioPLTextEl = document.getElementById('portfolioPLText');
const plIndicatorEl = document.getElementById('plIndicator');
const cashBalanceEl = document.getElementById('cashBalance');
const stockValueEl = document.getElementById('stockValue');
const barCashEl = document.getElementById('barCash');
const barStockEl = document.getElementById('barStock');
const percentCashEl = document.getElementById('percentCash');
const percentStockEl = document.getElementById('percentStock');

const cashDisplayEl = document.getElementById('cashDisplay');
const cashEditEl = document.getElementById('cashEdit');
const cashInputEl = document.getElementById('cashInput');
const btnEditCash = document.getElementById('btnEditCash');
const btnSaveCash = document.getElementById('btnSaveCash');
const btnCancelCash = document.getElementById('btnCancelCash');

const tabAllStocks = document.getElementById('tabAllStocks');
const tabWatchlist = document.getElementById('tabWatchlist');
const stocksListContainer = document.getElementById('stocksList');
const stockSearchInput = document.getElementById('stockSearchInput');

const activeStockTickerEl = document.getElementById('activeStockTicker');
const activeStockNameEl = document.getElementById('activeStockName');
const activeStockPriceEl = document.getElementById('activeStockPrice');
const activeStockChangeEl = document.getElementById('activeStockChange');
const btnToggleWatchlist = document.getElementById('btnToggleWatchlist');
const watchlistStarIcon = document.getElementById('watchlistStarIcon');
const timeframeSelector = document.getElementById('timeframeSelector');

const selectedTradeStockEl = document.getElementById('selectedTradeStock');
const tradeStockPriceEl = document.getElementById('tradeStockPrice');
const tradeStockOwnedEl = document.getElementById('tradeStockOwned');
const btnDecQty = document.getElementById('btnDecQty');
const btnIncQty = document.getElementById('btnIncQty');
const tradeQtyInput = document.getElementById('tradeQty');
const estOrderCostEl = document.getElementById('estOrderCost');
const btnTradeSubmit = document.getElementById('btnTradeSubmit');
const tradeForm = document.getElementById('tradeForm');
const tabBuy = document.getElementById('tabBuy');
const tabSell = document.getElementById('tabSell');

const ledgerTableBody = document.getElementById('ledgerTableBody');
const newsGrid = document.getElementById('newsGrid');

function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag] || tag));
}

function formatCurrency(val) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
}

function generateHistory(basePrice, pointsCount) {
  const dataPoints = [];
  let currentPrice = basePrice;
  const now = new Date();

  for (let i = pointsCount; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const pct = (Math.random() - 0.495) * 0.04;
    currentPrice = Math.max(1, currentPrice * (1 + pct));
    dataPoints.push({
      date: time.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
      price: currentPrice
    });
  }
  return dataPoints;
}

function initStocks() {
  Object.keys(STOCK_METADATA).forEach(ticker => {
    const meta = STOCK_METADATA[ticker];
    const historyPoints = generateHistory(meta.basePrice, 250);
    const currentPrice = historyPoints[historyPoints.length - 1].price;
    const startPrice = historyPoints[historyPoints.length - 2].price;
    const change = currentPrice - startPrice;

    stocks[ticker] = {
      ticker,
      name: meta.name,
      price: currentPrice,
      change,
      changePercent: (change / startPrice) * 100,
      prevClose: startPrice,
      history: historyPoints,
      sparkline: historyPoints.slice(-10).map(dp => dp.price)
    };
  });
}

function saveState() {
  localStorage.setItem('apex_trade_state', JSON.stringify({
    portfolio,
    transactions,
    watchlist
  }));
}

function loadState() {
  const saved = localStorage.getItem('apex_trade_state');
  if (!saved) return;

  try {
    const parsed = JSON.parse(saved);
    if (parsed.portfolio) portfolio = parsed.portfolio;
    if (parsed.transactions) transactions = parsed.transactions;
    if (parsed.watchlist) watchlist = parsed.watchlist;
  } catch (e) {
    console.error('State restore failed:', e);
  }
}

function startPriceSimulation() {
  setInterval(() => {
    const tickers = Object.keys(stocks);
    const updateCount = Math.floor(Math.random() * 2) + 1;

    for (let i = 0; i < updateCount; i++) {
      const randomTicker = tickers[Math.floor(Math.random() * tickers.length)];
      const stock = stocks[randomTicker];
      const fluctuation = (Math.random() - 0.5) * 0.016;
      const oldPrice = stock.price;

      stock.price = Math.max(1.00, stock.price * (1 + fluctuation));
      stock.change = stock.price - stock.prevClose;
      stock.changePercent = (stock.change / stock.prevClose) * 100;
      stock.history[stock.history.length - 1].price = stock.price;

      updateStockUIElements(randomTicker, stock.price > oldPrice);
    }

    updatePortfolioMetrics();
  }, 3500);
}

function updateStockUIElements(ticker, isPriceUp) {
  const stockRow = document.querySelector(`.stock-item[data-ticker="${ticker}"]`);
  if (stockRow) {
    const priceEl = stockRow.querySelector('.item-price');
    const changeEl = stockRow.querySelector('.item-change');
    const stock = stocks[ticker];
    const isUp = stock.change >= 0;

    priceEl.textContent = formatCurrency(stock.price);
    changeEl.className = `item-change ${isUp ? 'up' : 'down'}`;
    changeEl.textContent = `${isUp ? '+' : ''}${stock.changePercent.toFixed(2)}%`;
    priceEl.classList.remove('flash-up', 'flash-down');
    void priceEl.offsetWidth;
    priceEl.classList.add(isPriceUp ? 'flash-up' : 'flash-down');
  }

  if (activeTicker === ticker) {
    const stock = stocks[ticker];
    const isUp = stock.change >= 0;

    activeStockPriceEl.textContent = formatCurrency(stock.price);
    activeStockChangeEl.className = `active-change ${isUp ? 'up' : 'down'}`;
    activeStockChangeEl.textContent = `${isUp ? '+' : ''}${formatCurrency(stock.change)} (${isUp ? '+' : ''}${stock.changePercent.toFixed(2)}%)`;
    tradeStockPriceEl.textContent = formatCurrency(stock.price);
    updateEstimatedCost();

    if (mainChartInstance) {
      const activeData = mainChartInstance.data.datasets[0].data;
      if (activeData.length > 0) {
        activeData[activeData.length - 1] = stock.price;
        mainChartInstance.update('none');
      }
    }
  }
}

function renderStockList() {
  stocksListContainer.innerHTML = '';

  const filteredTickers = Object.keys(stocks).filter(ticker => {
    const stock = stocks[ticker];
    if (activeListTab === 'watchlist' && !watchlist.includes(ticker)) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return ticker.toLowerCase().includes(q) || stock.name.toLowerCase().includes(q);
    }

    return true;
  });

  if (filteredTickers.length === 0) {
    stocksListContainer.innerHTML = '<div style="text-align:center;color:var(--text-dim);padding:24px;font-size:13px;">표시할 종목이 없습니다.</div>';
    return;
  }

  filteredTickers.forEach(ticker => {
    const stock = stocks[ticker];
    const item = document.createElement('div');
    const isUp = stock.change >= 0;

    item.className = `stock-item ${activeTicker === ticker ? 'active' : ''}`;
    item.dataset.ticker = ticker;
    item.innerHTML = `
      <div class="stock-item-left">
        <div class="stock-ticker-row">
          <span class="item-ticker">${ticker}</span>
          <span class="item-name">${escapeHTML(stock.name)}</span>
        </div>
      </div>
      <div class="stock-item-right">
        <span class="item-price">${formatCurrency(stock.price)}</span>
        <span class="item-change ${isUp ? 'up' : 'down'}">${isUp ? '+' : ''}${stock.changePercent.toFixed(2)}%</span>
      </div>
    `;
    item.addEventListener('click', () => setActiveStock(ticker));
    stocksListContainer.appendChild(item);
  });
}

function setActiveStock(ticker) {
  activeTicker = ticker;
  const stock = stocks[ticker];

  document.querySelectorAll('.stock-item').forEach(el => {
    el.classList.toggle('active', el.dataset.ticker === ticker);
  });

  activeStockTickerEl.textContent = ticker;
  activeStockNameEl.textContent = stock.name;
  activeStockPriceEl.textContent = formatCurrency(stock.price);

  const isUp = stock.change >= 0;
  activeStockChangeEl.className = `active-change ${isUp ? 'up' : 'down'}`;
  activeStockChangeEl.textContent = `${isUp ? '+' : ''}${formatCurrency(stock.change)} (${isUp ? '+' : ''}${stock.changePercent.toFixed(2)}%)`;

  if (watchlist.includes(ticker)) {
    btnToggleWatchlist.classList.add('watchlist-active');
    watchlistStarIcon.setAttribute('data-lucide', 'star-off');
  } else {
    btnToggleWatchlist.classList.remove('watchlist-active');
    watchlistStarIcon.setAttribute('data-lucide', 'star');
  }

  selectedTradeStockEl.textContent = `${ticker} (${stock.name})`;
  tradeStockPriceEl.textContent = formatCurrency(stock.price);
  tradeStockOwnedEl.textContent = `${getOwnedQty(ticker)} 주`;
  tradeQtyInput.value = 1;

  updateEstimatedCost();
  renderChart();
  renderMockNews();
  lucide.createIcons();
}

function renderChart() {
  const ctx = document.getElementById('stockMainChart').getContext('2d');
  const stock = stocks[activeTicker];
  const ranges = { '1D': 24, '1W': 7, '1M': 30, '1Y': 250 };
  const dataset = stock.history.slice(-ranges[activeTimeframe]);
  const labels = dataset.map(d => d.date);
  const prices = dataset.map(d => d.price);
  const firstVal = prices[0];
  const lastVal = prices[prices.length - 1];
  const isUp = lastVal >= firstVal;
  const themeColor = isUp ? 'rgb(16, 185, 129)' : 'rgb(244, 63, 94)';
  const themeColorLight = isUp ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)';

  if (mainChartInstance) mainChartInstance.destroy();

  const gradient = ctx.createLinearGradient(0, 0, 0, 300);
  gradient.addColorStop(0, themeColorLight);
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

  mainChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: '주가 (USD)',
        data: prices,
        borderColor: themeColor,
        borderWidth: 2,
        pointRadius: activeTimeframe === '1Y' ? 0 : 2,
        pointHoverRadius: 6,
        fill: true,
        backgroundColor: gradient,
        tension: 0.15
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          mode: 'index',
          intersect: false,
          backgroundColor: 'rgba(22, 28, 45, 0.95)',
          titleColor: '#fff',
          bodyColor: '#e2e8f0',
          borderColor: 'rgba(255,255,255,0.08)',
          borderWidth: 1,
          callbacks: {
            label: context => ` 주가: $${context.raw.toFixed(2)}`
          }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 10 } } },
        y: { grid: { color: 'rgba(255, 255, 255, 0.03)' }, ticks: { color: '#64748b', font: { size: 10 } } }
      }
    }
  });
}

function getOwnedQty(ticker) {
  return portfolio.holdings[ticker] ? portfolio.holdings[ticker].qty : 0;
}

function updatePortfolioMetrics() {
  let totalStockVal = 0;

  Object.keys(portfolio.holdings).forEach(ticker => {
    if (!stocks[ticker]) return;
    totalStockVal += portfolio.holdings[ticker].qty * stocks[ticker].price;
  });

  const cash = portfolio.cash;
  const nav = cash + totalStockVal;
  const initialAsset = 10000.00;
  const plAmount = nav - initialAsset;
  const plPct = (plAmount / initialAsset) * 100;

  netAssetValueEl.textContent = formatCurrency(nav);
  cashBalanceEl.textContent = formatCurrency(cash);
  stockValueEl.textContent = formatCurrency(totalStockVal);

  if (plAmount > 0) {
    portfolioPLEl.className = 'portfolio-pl up';
    plIndicatorEl.innerHTML = '<i data-lucide="arrow-up-right"></i>';
    portfolioPLTextEl.textContent = `+${formatCurrency(plAmount)} (+${plPct.toFixed(2)}%)`;
  } else if (plAmount < 0) {
    portfolioPLEl.className = 'portfolio-pl down';
    plIndicatorEl.innerHTML = '<i data-lucide="arrow-down-right"></i>';
    portfolioPLTextEl.textContent = `${formatCurrency(plAmount)} (${plPct.toFixed(2)}%)`;
  } else {
    portfolioPLEl.className = 'portfolio-pl neutral';
    plIndicatorEl.innerHTML = '';
    portfolioPLTextEl.textContent = '$0.00 (0.00%)';
  }

  const cashPct = nav === 0 ? 100 : (cash / nav) * 100;
  const stockPct = nav === 0 ? 0 : (totalStockVal / nav) * 100;

  barCashEl.style.width = `${cashPct}%`;
  barStockEl.style.width = `${stockPct}%`;
  percentCashEl.textContent = `${Math.round(cashPct)}%`;
  percentStockEl.textContent = `${Math.round(stockPct)}%`;
  tradeStockOwnedEl.textContent = `${getOwnedQty(activeTicker)} 주`;

  lucide.createIcons();
}

function updateEstimatedCost() {
  const qty = parseInt(tradeQtyInput.value, 10) || 0;
  estOrderCostEl.textContent = formatCurrency(qty * stocks[activeTicker].price);
}

function executeTrade(e) {
  e.preventDefault();

  const qty = parseInt(tradeQtyInput.value, 10) || 0;
  if (qty <= 0) return;

  const stock = stocks[activeTicker];
  const price = stock.price;
  const cost = qty * price;

  if (tradeType === 'buy') {
    if (portfolio.cash < cost) {
      alert('예수금이 부족해서 매수할 수 없습니다.');
      return;
    }

    portfolio.cash -= cost;
    if (!portfolio.holdings[activeTicker]) {
      portfolio.holdings[activeTicker] = { qty: 0, avgPrice: 0 };
    }

    const current = portfolio.holdings[activeTicker];
    const totalQty = current.qty + qty;
    const totalCost = (current.qty * current.avgPrice) + cost;
    current.qty = totalQty;
    current.avgPrice = totalCost / totalQty;
  } else {
    const current = portfolio.holdings[activeTicker];
    if (!current || current.qty < qty) {
      alert('보유 수량보다 많이 매도할 수 없습니다.');
      return;
    }

    portfolio.cash += cost;
    current.qty -= qty;
    if (current.qty === 0) delete portfolio.holdings[activeTicker];
  }

  transactions.unshift({
    id: Date.now().toString(),
    timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    ticker: activeTicker,
    type: tradeType,
    qty,
    price,
    total: cost
  });

  saveState();
  updatePortfolioMetrics();
  renderLedger();
  tradeQtyInput.value = 1;
  updateEstimatedCost();
}

function saveCashInput() {
  const val = parseFloat(cashInputEl.value);
  if (Number.isNaN(val) || val < 0) {
    alert('올바른 예수금 금액을 입력해 주세요. 0 이상의 숫자만 가능합니다.');
    return;
  }

  portfolio.cash = val;
  saveState();
  updatePortfolioMetrics();
  cashEditEl.classList.add('hidden');
  cashDisplayEl.classList.remove('hidden');
}

function renderLedger() {
  ledgerTableBody.innerHTML = '';

  if (transactions.length === 0) {
    ledgerTableBody.innerHTML = '<tr class="ledger-empty"><td colspan="6">체결된 거래 내역이 없습니다.</td></tr>';
    return;
  }

  transactions.slice(0, 10).forEach(tx => {
    const row = document.createElement('tr');
    row.className = tx.type === 'buy' ? 'buy' : 'sell';
    row.innerHTML = `
      <td>${tx.timestamp}</td>
      <td style="font-weight:700;">${tx.ticker}</td>
      <td class="type">${tx.type === 'buy' ? '매수' : '매도'}</td>
      <td>${tx.qty}</td>
      <td>${formatCurrency(tx.price)}</td>
      <td style="font-weight:600;">${formatCurrency(tx.total)}</td>
    `;
    ledgerTableBody.appendChild(row);
  });
}

function renderMockNews() {
  const newsTemplates = [
    { ticker: 'NVDA', headline: 'NVIDIA, 차세대 AI 가속기 수요 확대 기대감에 강세', source: 'TechPulse', time: '30분 전' },
    { ticker: 'AAPL', headline: 'Apple, 신규 AI 기능 통합 발표 이후 투자 심리 개선', source: 'GlobalMarkets', time: '1시간 전' },
    { ticker: 'TSLA', headline: 'Tesla, 생산 효율 개선과 신차 기대감으로 변동성 확대', source: 'AutoTrends', time: '2시간 전' },
    { ticker: 'MSFT', headline: 'Microsoft, 클라우드와 AI 인프라 투자 확대 전망', source: 'WallStreet Log', time: '4시간 전' },
    { ticker: 'AMZN', headline: 'Amazon, 물류 자동화 도입으로 운영 효율 개선 기대', source: 'LogisticNews', time: '5시간 전' }
  ];

  newsGrid.innerHTML = '';

  const selected = newsTemplates.filter(n => n.ticker === activeTicker);
  const remaining = newsTemplates.filter(n => n.ticker !== activeTicker);
  selected.concat(remaining).slice(0, 3).forEach(news => {
    const card = document.createElement('div');
    card.className = 'news-card';
    card.innerHTML = `
      <span class="ticker-tag">${news.ticker}</span>
      <h4>${news.headline}</h4>
      <div class="news-meta">
        <span>${news.source}</span>
        <span>${news.time}</span>
      </div>
    `;
    newsGrid.appendChild(card);
  });
}

function setupEventListeners() {
  stockSearchInput.addEventListener('input', e => {
    searchQuery = e.target.value.trim();
    renderStockList();
  });

  tabAllStocks.addEventListener('click', () => {
    activeListTab = 'all';
    tabAllStocks.classList.add('active');
    tabWatchlist.classList.remove('active');
    renderStockList();
  });

  tabWatchlist.addEventListener('click', () => {
    activeListTab = 'watchlist';
    tabWatchlist.classList.add('active');
    tabAllStocks.classList.remove('active');
    renderStockList();
  });

  timeframeSelector.addEventListener('click', e => {
    const btn = e.target.closest('.time-btn');
    if (!btn) return;

    document.querySelectorAll('#timeframeSelector .time-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeTimeframe = btn.dataset.timeframe;
    renderChart();
  });

  btnToggleWatchlist.addEventListener('click', () => {
    const idx = watchlist.indexOf(activeTicker);
    if (idx > -1) {
      watchlist.splice(idx, 1);
      btnToggleWatchlist.classList.remove('watchlist-active');
      watchlistStarIcon.setAttribute('data-lucide', 'star');
    } else {
      watchlist.push(activeTicker);
      btnToggleWatchlist.classList.add('watchlist-active');
      watchlistStarIcon.setAttribute('data-lucide', 'star-off');
    }

    saveState();
    renderStockList();
    lucide.createIcons();
  });

  tabBuy.addEventListener('click', () => {
    tradeType = 'buy';
    tabBuy.classList.add('active');
    tabSell.classList.remove('active');
    btnTradeSubmit.className = 'btn btn-trade-submit btn-buy';
    btnTradeSubmit.textContent = '매수하기';
  });

  tabSell.addEventListener('click', () => {
    tradeType = 'sell';
    tabSell.classList.add('active');
    tabBuy.classList.remove('active');
    btnTradeSubmit.className = 'btn btn-trade-submit btn-sell';
    btnTradeSubmit.textContent = '매도하기';
  });

  btnDecQty.addEventListener('click', () => {
    const val = parseInt(tradeQtyInput.value, 10) || 1;
    if (val > 1) {
      tradeQtyInput.value = val - 1;
      updateEstimatedCost();
    }
  });

  btnIncQty.addEventListener('click', () => {
    const val = parseInt(tradeQtyInput.value, 10) || 0;
    tradeQtyInput.value = val + 1;
    updateEstimatedCost();
  });

  tradeQtyInput.addEventListener('input', () => {
    const val = parseInt(tradeQtyInput.value, 10);
    if (Number.isNaN(val) || val <= 0) tradeQtyInput.value = 1;
    updateEstimatedCost();
  });

  tradeForm.addEventListener('submit', executeTrade);

  btnEditCash.addEventListener('click', () => {
    cashDisplayEl.classList.add('hidden');
    cashEditEl.classList.remove('hidden');
    cashInputEl.value = portfolio.cash.toFixed(2);
    cashInputEl.focus();
    cashInputEl.select();
  });

  btnCancelCash.addEventListener('click', () => {
    cashEditEl.classList.add('hidden');
    cashDisplayEl.classList.remove('hidden');
  });

  btnSaveCash.addEventListener('click', saveCashInput);
  cashInputEl.addEventListener('keydown', e => {
    if (e.key === 'Enter') saveCashInput();
    if (e.key === 'Escape') {
      cashEditEl.classList.add('hidden');
      cashDisplayEl.classList.remove('hidden');
    }
  });
}

function startClock() {
  const clockEl = document.getElementById('marketTime');
  const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

  function tick() {
    const now = new Date();
    const dateText = `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일`;
    const timeText = now.toLocaleTimeString('ko-KR', { hour12: false });
    clockEl.textContent = `${dateText} (${dayNames[now.getDay()]}) ${timeText}`;
  }

  tick();
  setInterval(tick, 1000);
}

function render() {
  loadState();
  initStocks();
  startClock();
  setupEventListeners();
  renderStockList();
  setActiveStock('NVDA');
  updatePortfolioMetrics();
  renderLedger();
  startPriceSimulation();
}

render();
