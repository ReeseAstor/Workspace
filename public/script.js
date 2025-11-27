const state = {
  opportunities: [],
  markets: [],
  books: [],
  executions: [],
  metrics: {},
};

const els = {
  opportunitiesBody: document.getElementById('opportunities-body'),
  marketHealth: document.getElementById('market-health'),
  booksGrid: document.getElementById('books-grid'),
  executionsBody: document.getElementById('executions-body'),
  heroOpps: document.getElementById('hero-opps'),
  heroMarkets: document.getElementById('hero-markets'),
  heroRefresh: document.getElementById('hero-refresh'),
  quantityInput: document.getElementById('quantity-input'),
  refreshMarkets: document.getElementById('refresh-markets'),
  refreshBooks: document.getElementById('refresh-books'),
};

const fmtCurrency = (value, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value || 0);

const fmtTime = (value) =>
  new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(value));

async function fetchJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed request: ${path}`);
  return res.json();
}

function renderHero() {
  els.heroOpps.textContent = state.opportunities.length;
  els.heroMarkets.textContent = state.markets.filter((m) => m.state === 'healthy').length;
  els.heroRefresh.textContent = state.metrics.lastRefresh ? fmtTime(state.metrics.lastRefresh) : '-';
}

function renderMarkets() {
  if (!els.marketHealth) return;
  els.marketHealth.innerHTML = state.markets
    .map(
      (market) => `
      <div class="list-item">
        <div>
          <h3>${market.market || market.id}</h3>
          <small>${market.state === 'healthy' ? 'Synchronized' : market.lastError || 'Awaiting data'}</small>
        </div>
        <div>
          <span class="badge ${market.state}">${market.state.toUpperCase()}</span>
          <div class="muted">Latency: ${market.lastLatencyMs || '-'} ms</div>
        </div>
      </div>`
    )
    .join('');
}

function renderOpportunities() {
  if (!els.opportunitiesBody) return;
  if (!state.opportunities.length) {
    els.opportunitiesBody.innerHTML = `<tr><td colspan="8" class="muted">No qualified spreads at the moment.</td></tr>`;
    return;
  }
  els.opportunitiesBody.innerHTML = state.opportunities
    .map((opp) => {
      const btnDisabled = opp.status === 'executed';
      return `
      <tr>
        <td>${opp.brand}</td>
        <td>${fmtCurrency(opp.denomination)}</td>
        <td>
          <div>${opp.buyLeg.marketName}</div>
          <div class="route">${fmtCurrency(opp.buyLeg.price)} / card</div>
        </td>
        <td>
          <div>${opp.sellLeg.marketName}</div>
          <div class="route">${fmtCurrency(opp.sellLeg.price)} / card</div>
        </td>
        <td>${opp.metrics.netSpreadBps.toFixed(2)}</td>
        <td>${fmtCurrency(opp.metrics.netProfitPerUnit)}</td>
        <td>${opp.quantity}</td>
        <td><button class="execute" data-id="${opp.id}" ${btnDisabled ? 'disabled' : ''}>Execute</button></td>
      </tr>`;
    })
    .join('');
}

function renderBooks() {
  if (!els.booksGrid) return;
  els.booksGrid.innerHTML = state.books
    .map((book) => {
      const bestSell = book.sell[0];
      const bestBuy = book.buy[0];
      return `
        <div class="book-card">
          <h3>${book.brand} · ${fmtCurrency(book.denomination)}</h3>
          <div>
            <small class="label">Buy From</small>
            <ul>
              ${book.sell
                .slice(0, 2)
                .map((quote) => `<li><span>${quote.marketName}</span><span>${fmtCurrency(quote.price)}</span></li>`)
                .join('') || '<li>No liquidity</li>'}
            </ul>
          </div>
          <div style="margin-top:0.75rem;">
            <small class="label">Sell Into</small>
            <ul>
              ${book.buy
                .slice(0, 2)
                .map((quote) => `<li><span>${quote.marketName}</span><span>${fmtCurrency(quote.price)}</span></li>`)
                .join('') || '<li>No liquidity</li>'}
            </ul>
          </div>
          <div class="muted" style="margin-top:0.75rem;">Spread: ${bestSell && bestBuy ? (bestBuy.price - bestSell.price).toFixed(2) : '-'} USD</div>
        </div>`;
    })
    .join('');
}

function renderExecutions() {
  if (!els.executionsBody) return;
  if (!state.executions.length) {
    els.executionsBody.innerHTML = '<tr><td colspan="5" class="muted">No fills yet.</td></tr>';
    return;
  }
  els.executionsBody.innerHTML = state.executions
    .map(
      (exec) => `
      <tr>
        <td>${fmtTime(exec.executedAt)}</td>
        <td>${exec.brand} · ${fmtCurrency(exec.denomination)}</td>
        <td>${exec.quantity}</td>
        <td>${exec.buyMarket} → ${exec.sellMarket}</td>
        <td>${fmtCurrency(exec.netProfitTotal)}</td>
      </tr>`
    )
    .join('');
}

function renderAll() {
  renderHero();
  renderMarkets();
  renderOpportunities();
  renderBooks();
  renderExecutions();
}

async function loadInitial() {
  try {
    const [opps, markets, books, executions, metrics] = await Promise.all([
      fetchJSON('/api/opportunities'),
      fetchJSON('/api/markets'),
      fetchJSON('/api/books'),
      fetchJSON('/api/executions'),
      fetchJSON('/api/metrics'),
    ]);
    state.opportunities = opps;
    state.markets = markets;
    state.books = books;
    state.executions = executions;
    state.metrics = metrics;
    renderAll();
  } catch (err) {
    console.error(err);
  }
}

function connectStream() {
  const source = new EventSource('/api/stream');
  source.addEventListener('opportunities', (event) => {
    state.opportunities = JSON.parse(event.data);
    renderOpportunities();
    renderHero();
  });
  source.addEventListener('marketHealth', (event) => {
    state.markets = JSON.parse(event.data);
    renderMarkets();
    renderHero();
  });
  source.addEventListener('metrics', (event) => {
    state.metrics = JSON.parse(event.data);
    renderHero();
  });
  source.addEventListener('execution', (event) => {
    const execution = JSON.parse(event.data);
    state.executions = [execution, ...state.executions].slice(0, 20);
    renderExecutions();
  });
}

async function executeOpportunity(id) {
  const quantity = Number(els.quantityInput.value) || undefined;
  try {
    const res = await fetch(`/api/opportunities/${id}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity }),
    });
    const payload = await res.json();
    if (!res.ok) throw new Error(payload.error || 'Execution failed');
    state.executions = [payload.execution, ...state.executions].slice(0, 20);
    renderExecutions();
  } catch (err) {
    alert(err.message);
  }
}

els.opportunitiesBody?.addEventListener('click', (event) => {
  if (event.target.matches('button.execute')) {
    executeOpportunity(event.target.dataset.id);
  }
});

els.refreshMarkets?.addEventListener('click', async () => {
  state.markets = await fetchJSON('/api/markets');
  renderMarkets();
  renderHero();
});

els.refreshBooks?.addEventListener('click', async () => {
  state.books = await fetchJSON('/api/books');
  renderBooks();
});

loadInitial();
connectStream();
