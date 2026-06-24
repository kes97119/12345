// Premium Stock Simulator Engine & Logic

// Mock Stock Metadata & Base configuration
const STOCK_METADATA = {
  NVDA: { name: 'NVIDIA Corporation', basePrice: 125.40, sector: 'Technology' },
  AAPL: { name: 'Apple Inc.', basePrice: 182.10, sector: 'Technology' },
  TSLA: { name: 'Tesla Inc.', basePrice: 178.60, sector: 'Automotive' },
  MSFT: { name: 'Microsoft Corporation', basePrice: 421.90, sector: 'Technology' },
  AMZN: { name: 'Amazon.com Inc.', basePrice: 184.50, sector: 'Consumer Cyclical' }
};

// State Variables
let stocks = {};
let watchlist = [];
let portfolio = {
  cash: 10000.00,
  holdings: {} // { TICKER: { qty: 0, avgPrice: 0 } }
};
let transactions = [];
let activeTicker = 'NVDA';
let activeTimeframe = '1M';
let searchQuery = '';
let activeListTab = 'all'; // 'all' | 'watchlist'
let tradeType = 'buy'; // 'buy' | 'sell'

// Chart.js instance pointer
let mainChartInstance = null;

// DOM Elements
const netAssetValueEl = document.getElementById('netAssetValue');
const portfolioPLEl = document.getElementById('portfolioPL');
const portfolioPLTextEl = document.getElementById('portfolioPLText');
const cashBalanceEl = document.getElementById('cashBalance');
const stockValueEl = document.getElementById('stockValue');
const barCashEl = document.getElementById('barCash');
const barStockEl = document.getElementById('barStock');
const percentCashEl = document.getElementById('percentCash');
const percentStockEl = document.getElementById('percentStock');

// Cash editing elements
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

// --- Helper Functions ---

// Escape HTML utility to prevent XSS
function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

// Format Currency
function formatCurrency(val) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
}

// Generate Historical Chart Data via Random Walk
function generateHistory(basePrice, pointsCount) {
  let dataPoints = [];
  let currentPrice = basePrice;
  const now = new Date();

  for (let i = pointsCount; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    // Random fluctuation percentage (-3% to +3%)
    const pct = (Math.random() - 0.495) * 0.04;
    currentPrice = Math.max(1, currentPrice * (1 + pct));
    dataPoints.push({
      date: time.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
      price: currentPrice
    });
  }
  return dataPoints;
}

// Initialize Stock Engine State
function initStocks() {
  const pointsCountMap = { '1D': 24, '1W': 7, '1M': 30, '1Y': 250 };
  
  Object.keys(STOCK_METADATA).forEach(ticker => {
    const meta = STOCK_METADATA[ticker];
    
    // Generate long-term history
    const historyPoints = generateHistory(meta.basePrice, 250); // 250 days
    const currentPrice = historyPoints[historyPoints.length - 1].price;
    const startPrice = historyPoints[historyPoints.length - 2].price; // 24h ago
    
    const change = currentPrice - startPrice;
    const changePercent = (change / startPrice) * 100;
    
    stocks[ticker] = {
      ticker,
      name: meta.name,
      price: currentPrice,
      change,
      changePercent,
      prevClose: startPrice,
      history: historyPoints, // Full historical array
      sparkline: historyPoints.slice(-10).map(dp => dp.price)
    };
  });
}

// LocalStorage Synchronization
function saveState() {
  const state = {
    portfolio,
    transactions,
    watchlist
  };
  localStorage.setItem('apex_trade_state', JSON.stringify(state));
}

function loadState() {
  const saved = localStorage.getItem('apex_trade_state');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed.portfolio) portfolio = parsed.portfolio;
      if (parsed.transactions) transactions = parsed.transactions;
      if (parsed.watchlist) watchlist = parsed.watchlist;
    } catch (e) {
      console.error('State restore failed:', e);
    }
  }
}

// Real-time Stock Engine Tick updates (Random Walk every 3 seconds)
function startPriceSimulation() {
  setInterval(() => {
    const tickers = Object.keys(stocks);
    // Randomly update 1 or 2 tickers per tick
    const updateCount = Math.floor(Math.random() * 2) + 1;
    
    for (let i = 0; i < updateCount; i++) {
      const randomTicker = tickers[Math.floor(Math.random() * tickers.length)];
      const stock = stocks[randomTicker];
      
      const fluctuation = (Math.random() - 0.5) * 0.016; // -0.8% to +0.8%
      const oldPrice = stock.price;
      stock.price = Math.max(1.00, stock.price * (1 + fluctuation));
      
      stock.change = stock.price - stock.prevClose;
      stock.changePercent = (stock.change / stock.prevClose) * 100;
      
      // Update historical array's latest item
      stock.history[stock.history.length - 1].price = stock.price;

      // Update UI components dynamically
      updateStockUIElements(randomTicker, stock.price > oldPrice);
    }
    
    // Refresh calculations and global UI
    updatePortfolioMetrics();
  }, 3500);
}

// Update specific stock row indicators inside DOM
function updateStockUIElements(ticker, isPriceUp) {
  // 1. Sidebar Row Update
  const stockRow = document.querySelector(`.stock-item[data-ticker="${ticker}"]`);
  if (stockRow) {
    const priceEl = stockRow.querySelector('.item-price');
    const changeEl = stockRow.querySelector('.item-change');
    const stock = stocks[ticker];

    priceEl.textContent = formatCurrency(stock.price);
    
    // Apply positive/negative styling
    const isUp = stock.change >= 0;
    changeEl.className = `item-change ${isUp ? 'up' : 'down'}`;
    changeEl.textContent = `${isUp ? '+' : ''}${stock.changePercent.toFixed(2)}%`;

    // Apply flash blink animation
    const flashClass = isPriceUp ? 'flash-up' : 'flash-down';
    priceEl.classList.remove('flash-up', 'flash-down');
    void priceEl.offsetWidth; // Trigger reflow
    priceEl.classList.add(flashClass);
  }

  // 2. Active Chart Header Update (if selected ticker is currently shown)
  if (activeTicker === ticker) {
    const stock = stocks[ticker];
    activeStockPriceEl.textContent = formatCurrency(stock.price);
    
    const isUp = stock.change >= 0;
    activeStockChangeEl.className = `active-change ${isUp ? 'up' : 'down'}`;
    activeStockChangeEl.textContent = `${isUp ? '+' : ''}${formatCurrency(stock.change)} (${isUp ? '+' : ''}${stock.changePercent.toFixed(2)}%)`;
    
    // Dynamic trading cost calculation
    updateEstimatedCost();
    tradeStockPriceEl.textContent = formatCurrency(stock.price);

    // Live update latest point on the chart if chart is running
    if (mainChartInstance) {
      const activeData = mainChartInstance.data.datasets[0].data;
      if (activeData.length > 0) {
        activeData[activeData.length - 1] = stock.price;
        mainChartInstance.update('none'); // silent update
      }
    }
  }
}

// Render dynamic stock dashboard listing (Sidebar)
function renderStockList() {
  stocksListContainer.innerHTML = '';
  
  const filteredTickers = Object.keys(stocks).filter(ticker => {
    const stock = stocks[ticker];
    
    // Watchlist filter
    if (activeListTab === 'watchlist' && !watchlist.includes(ticker)) return false;
    
    // Search query filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const tickerMatch = ticker.toLowerCase().includes(q);
      const nameMatch = stock.name.toLowerCase().includes(q);
      return tickerMatch || nameMatch;
    }
    
    return true;
  });

  if (filteredTickers.length === 0) {
    stocksListContainer.innerHTML = `
      <div style="text-align: center; color: var(--text-dim); padding: 24px; font-size: 13px;">
        조회된 종목이 없습니다.
      </div>
    `;
    return;
  }

  filteredTickers.forEach(ticker => {
    const stock = stocks[ticker];
    const item = document.createElement('div');
    item.className = `stock-item ${activeTicker === ticker ? 'active' : ''}`;
    item.dataset.ticker = ticker;
    
    const isUp = stock.change >= 0;

    item.innerHTML = `
      <div class="stock-item-left">
        <div class="stock-ticker-row">
          <span class="item-ticker">${ticker}</span>
          <span class="item-name">${escapeHTML(stock.name)}</span>
        </div>
      </div>
      <div class="stock-item-right">
        <span class="item-price">${formatCurrency(stock.price)}</span>
        <span class="item-change ${isUp ? 'up' : 'down'}">
          ${isUp ? '+' : ''}${stock.changePercent.toFixed(2)}%
        </span>
      </div>
    `;
    
    // Click listener to set active ticker
    item.addEventListener('click', () => {
      setActiveStock(ticker);
    });
    
    stocksListContainer.appendChild(item);
  });
}

// Selection handling
function setActiveStock(ticker) {
  activeTicker = ticker;
  const stock = stocks[ticker];
  
  // Highlight active listing
  document.querySelectorAll('.stock-item').forEach(el => {
    el.classList.remove('active');
    if (el.dataset.ticker === ticker) el.classList.add('active');
  });

  // Load active header info
  activeStockTickerEl.textContent = ticker;
  activeStockNameEl.textContent = stock.name;
  activeStockPriceEl.textContent = formatCurrency(stock.price);

  const isUp = stock.change >= 0;
  activeStockChangeEl.className = `active-change ${isUp ? 'up' : 'down'}`;
  activeStockChangeEl.textContent = `${isUp ? '+' : ''}${formatCurrency(stock.change)} (${isUp ? '+' : ''}${stock.changePercent.toFixed(2)}%)`;

  // Watchlist Star Icon update
  if (watchlist.includes(ticker)) {
    btnToggleWatchlist.classList.add('watchlist-active');
    watchlistStarIcon.setAttribute('data-lucide', 'star-off');
  } else {
    btnToggleWatchlist.classList.remove('watchlist-active');
    watchlistStarIcon.setAttribute('data-lucide', 'star');
  }

  // Update Trade Form inputs
  selectedTradeStockEl.textContent = `${ticker} (${stock.name})`;
  tradeStockPriceEl.textContent = formatCurrency(stock.price);
  
  const owned = portfolio.holdings[ticker] ? portfolio.holdings[ticker].qty : 0;
  tradeStockOwnedEl.textContent = `${owned} 주`;
  
  // Reset trade quantity input
  tradeQtyInput.value = 1;
  updateEstimatedCost();
  
  // Redraw Chart
  renderChart();
  
  // Generate Contextual News
  renderMockNews();
  
  lucide.createIcons();
}

// Chart.js implementation for historical trends
function renderChart() {
  const ctx = document.getElementById('stockMainChart').getContext('2d');
  const stock = stocks[activeTicker];
  
  let dataset = [];
  
  // Fetch historical data slices
  if (activeTimeframe === '1D') {
    // Hour hourly random points
    dataset = stock.history.slice(-24);
  } else if (activeTimeframe === '1W') {
    dataset = stock.history.slice(-7);
  } else if (activeTimeframe === '1M') {
    dataset = stock.history.slice(-30);
  } else if (activeTimeframe === '1Y') {
    dataset = stock.history.slice(-250);
  }

  const labels = dataset.map(d => d.date);
  const prices = dataset.map(d => d.price);
  
  const firstVal = prices[0];
  const lastVal = prices[prices.length - 1];
  const isUp = lastVal >= firstVal;
  
  const themeColor = isUp ? 'rgb(16, 185, 129)' : 'rgb(244, 63, 94)';
  const themeColorLight = isUp ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)';

  // Destroy previous chart
  if (mainChartInstance) {
    mainChartInstance.destroy();
  }

  // Draw chart gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, 300);
  gradient.addColorStop(0, themeColorLight);
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

  mainChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
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
            label: function(context) {
              return ` 주가: $${context.raw.toFixed(2)}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#64748b', font: { size: 10 } }
        },
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.03)' },
          ticks: { color: '#64748b', font: { size: 10 } }
        }
      }
    }
  });
}

// Calculate Net Asset Value (NAV) and updates Portfolio metrics in UI
function updatePortfolioMetrics() {
  let totalStockVal = 0;
  
  // Calculate value of held stocks
  Object.keys(portfolio.holdings).forEach(ticker => {
    const qty = portfolio.holdings[ticker].qty;
    const currentPrice = stocks[ticker].price;
    totalStockVal += qty * currentPrice;
  });

  const cash = portfolio.cash;
  const nav = cash + totalStockVal;
  
  // Total profit or loss compared to starting capital ($10,000)
  const initialAsset = 10000.00;
  const plAmount = nav - initialAsset;
  const plPct = (plAmount / initialAsset) * 100;

  // Set assets display
  netAssetValueEl.textContent = formatCurrency(nav);
  cashBalanceEl.textContent = formatCurrency(cash);
  stockValueEl.textContent = formatCurrency(totalStockVal);

  // Profit / Loss text and metrics
  if (plAmount > 0) {
    portfolioPLEl.className = 'portfolio-pl up';
    plIndicator.innerHTML = '<i data-lucide="arrow-up-right"></i>';
    portfolioPLTextEl.textContent = `+${formatCurrency(plAmount)} (+${plPct.toFixed(2)}%)`;
  } else if (plAmount < 0) {
    portfolioPLEl.className = 'portfolio-pl down';
    plIndicator.innerHTML = '<i data-lucide="arrow-down-right"></i>';
    portfolioPLTextEl.textContent = `${formatCurrency(plAmount)} (${plPct.toFixed(2)}%)`;
  } else {
    portfolioPLEl.className = 'portfolio-pl neutral';
    plIndicator.innerHTML = '';
    portfolioPLTextEl.textContent = `$0.00 (0.00%)`;
  }

  // Update asset allocation graph UI
  const cashPct = nav === 0 ? 100 : (cash / nav) * 100;
  const stockPct = nav === 0 ? 0 : (totalStockVal / nav) * 100;

  barCashEl.style.width = `${cashPct}%`;
  barStockEl.style.width = `${stockPct}%`;
  
  percentCashEl.textContent = `${Math.round(cashPct)}%`;
  percentStockEl.textContent = `${Math.round(stockPct)}%`;

  // Update Trade Form owned shares value
  const owned = portfolio.holdings[activeTicker] ? portfolio.holdings[activeTicker].qty : 0;
  tradeStockOwnedEl.textContent = `${owned} 주`;

  lucide.createIcons();
}

// Calculate Order Estimate
function updateEstimatedCost() {
  const qty = parseInt(tradeQtyInput.value) || 0;
  const price = stocks[activeTicker].price;
  const cost = qty * price;
  estOrderCostEl.textContent = formatCurrency(cost);
}

// Execution of transactions (Buy/Sell)
function executeTrade(e) {
  e.preventDefault();
  
  const qty = parseInt(tradeQtyInput.value) || 0;
  if (qty <= 0) return;

  const stock = stocks[activeTicker];
  const price = stock.price;
  const cost = qty * price;

  if (tradeType === 'buy') {
    // BUY ORDER
    if (portfolio.cash < cost) {
      alert('예수금이 부족하여 구매할 수 없습니다.');
      return;
    }
    
    // Deduct cash
    portfolio.cash -= cost;

    // Adjust holdings
    if (!portfolio.holdings[activeTicker]) {
      portfolio.holdings[activeTicker] = { qty: 0, avgPrice: 0 };
    }
    const current = portfolio.holdings[activeTicker];
    const totalQty = current.qty + qty;
    const totalCost = (current.qty * current.avgPrice) + cost;
    
    current.qty = totalQty;
    current.avgPrice = totalCost / totalQty;
  } else {
    // SELL ORDER
    const current = portfolio.holdings[activeTicker];
    if (!current || current.qty < qty) {
      alert('보유하고 있는 주식 수량보다 많이 매도할 수 없습니다.');
      return;
    }

    // Add cash
    portfolio.cash += cost;
    
    // Adjust holdings
    current.qty -= qty;
    if (current.qty === 0) {
      delete portfolio.holdings[activeTicker];
    }
  }

  // Save Transaction to log ledger
  const tx = {
    id: Date.now().toString(),
    timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    ticker: activeTicker,
    type: tradeType,
    qty: qty,
    price: price,
    total: cost
  };
  transactions.unshift(tx);

  saveState();
  updatePortfolioMetrics();
  renderLedger();
  
  // Reset qty input
  tradeQtyInput.value = 1;
  updateEstimatedCost();
}

// Save cash from inline editing input
function saveCashInput() {
  const val = parseFloat(cashInputEl.value);
  if (isNaN(val) || val < 0) {
    alert('올바른 예수금 금액을 입력해주세요. (0 이상의 숫자)');
    return;
  }
  portfolio.cash = val;
  saveState();
  updatePortfolioMetrics();
  cashEditEl.classList.add('hidden');
  cashDisplayEl.classList.remove('hidden');
}

// Render dynamic transactions ledger
function renderLedger() {
  ledgerTableBody.innerHTML = '';
  
  if (transactions.length === 0) {
    ledgerTableBody.innerHTML = `
      <tr class="ledger-empty">
        <td colspan="6">체결된 거래 내역이 없습니다.</td>
      </tr>
    `;
    return;
  }

  // Display last 10 transactions
  transactions.slice(0, 10).forEach(tx => {
    const row = document.createElement('tr');
    row.className = tx.type === 'buy' ? 'buy' : 'sell';

    const typeText = tx.type === 'buy' ? '매수' : '매도';
    
    row.innerHTML = `
      <td>${tx.timestamp}</td>
      <td style="font-weight: 700;">${tx.ticker}</td>
      <td class="type">${typeText}</td>
      <td>${tx.qty}</td>
      <td>${formatCurrency(tx.price)}</td>
      <td style="font-weight: 600;">${formatCurrency(tx.total)}</td>
    `;
    ledgerTableBody.appendChild(row);
  });
}

// Live Mock Stock News card layout
function renderMockNews() {
  const newsTemplates = [
    {
      ticker: 'NVDA',
      headline: 'NVIDIA, 차세대 AI 가속기 생산량 증대... 기술주 랠리 견인',
      source: 'TechPulse',
      time: '30분 전'
    },
    {
      ticker: 'AAPL',
      headline: '애플, 신규 AI 에이전트 서비스 통합 발표... 아이폰 혁신 도모',
      source: 'GlobalMarkets',
      time: '1시간 전'
    },
    {
      ticker: 'TSLA',
      headline: '테슬라, 신규 기가팩토리 구축 후보지 탐색... 연동성 확대 예정',
      source: 'AutoTrends',
      time: '2시간 전'
    },
    {
      ticker: 'MSFT',
      headline: '마이크로소프트, 오픈AI 클라우드 인프라 대규모 투자 연장 합의',
      source: 'WallStreet Log',
      time: '4시간 전'
    },
    {
      ticker: 'AMZN',
      headline: '아마존, 자율형 로봇 물류창고 신규 도입... 운영 효율 30% 개선',
      source: 'LogisticNews',
      time: '5시간 전'
    }
  ];

  newsGrid.innerHTML = '';
  
  // Show selected stock news first, then general stock news
  let newsList = newsTemplates.filter(n => n.ticker === activeTicker);
  const remaining = newsTemplates.filter(n => n.ticker !== activeTicker);
  newsList = newsList.concat(remaining).slice(0, 3); // show top 3

  newsList.forEach(news => {
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

// Setup Event Bindings
function setupEventListeners() {
  
  // List Search filtering
  stockSearchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.trim();
    renderStockList();
  });

  // Watchlist & Stock list filter tab toggles
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

  // Chart Timeframe toggles
  timeframeSelector.addEventListener('click', (e) => {
    const btn = e.target.closest('.time-btn');
    if (!btn) return;

    document.querySelectorAll('#timeframeSelector .time-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeTimeframe = btn.dataset.timeframe;
    
    renderChart();
  });

  // Watchlist Toggle Add/Remove
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

  // Order trade terminal types (Buy vs Sell)
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

  // Quantity controls
  btnDecQty.addEventListener('click', () => {
    let val = parseInt(tradeQtyInput.value) || 1;
    if (val > 1) {
      tradeQtyInput.value = val - 1;
      updateEstimatedCost();
    }
  });

  btnIncQty.addEventListener('click', () => {
    let val = parseInt(tradeQtyInput.value) || 0;
    tradeQtyInput.value = val + 1;
    updateEstimatedCost();
  });

  tradeQtyInput.addEventListener('input', () => {
    let val = parseInt(tradeQtyInput.value);
    if (isNaN(val) || val <= 0) {
      tradeQtyInput.value = 1;
    }
    updateEstimatedCost();
  });

  // Trade Execution onSubmit
  tradeForm.addEventListener('submit', executeTrade);

  // Cash editing event listeners
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
  cashInputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      saveCashInput();
    } else if (e.key === 'Escape') {
      cashEditEl.classList.add('hidden');
      cashDisplayEl.classList.remove('hidden');
    }
  });
}

// Start live clock updates
function startClock() {
  const clockEl = document.getElementById('marketTime');
  setInterval(() => {
    const now = new Date();
    
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const date = now.getDate();
    
    const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    const day = dayNames[now.getDay()];
    
    const timeStr = now.toLocaleTimeString('ko-KR', { hour12: false });
    clockEl.textContent = `${year}년 ${month}월 ${date}일 (${day}) ${timeStr}`;
  }, 1000);
}

// Global initialization
function render() {
  // Restore state
  loadState();
  
  // Set up mock stock pricing engine
  initStocks();
  
  // Start clock
  startClock();
  
  // Event Bindings
  setupEventListeners();

  // Populate dynamic elements
  renderStockList();
  setActiveStock('NVDA'); // Default active stock
  updatePortfolioMetrics();
  renderLedger();
  
  // Begin background pricing loop
  startPriceSimulation();
}

// Run app
render();
