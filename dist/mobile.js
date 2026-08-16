/* ==============================================================================
   mobile.js - Mobile Interactive Logic & Dynamic Pin Engine
   부동산 전문가 예측 관제 모바일 전용 자바스크립트
   ============================================================================== */

let mChart = null;
let mCurrentRegion = '서울';
let mData = null;

document.addEventListener('DOMContentLoaded', () => {
  if (typeof window.GLOBAL_DASHBOARD_DATA !== 'undefined') {
    mData = window.GLOBAL_DASHBOARD_DATA;
    initMobileApp();
  } else {
    fetch('static/dashboard_data.json')
      .then(res => res.json())
      .then(data => {
        mData = data;
        initMobileApp();
      });
  }
});

function initMobileApp() {
  if (!mData) return;

  setupMobileNav();
  initMobileChart();
  renderMobileFeed();
  renderMobileLeaderboard();
  setupMobileEvents();
}

// 1. Mobile Quick Navigation Tabs
function setupMobileNav() {
  const navItems = document.querySelectorAll('.m-nav-item');
  const sections = document.querySelectorAll('.m-section');

  navItems.forEach(item => {
    item.addEventListener('click', function() {
      navItems.forEach(n => n.classList.remove('active'));
      sections.forEach(s => s.style.display = 'none');

      this.classList.add('active');
      const targetId = this.dataset.target;
      const targetSec = document.getElementById(targetId);
      if (targetSec) {
        targetSec.style.display = 'block';
      }
    });
  });
}

// 2. Mobile Chart & Touch-Adaptive Pins
function initMobileChart() {
  const canvas = document.getElementById('mMarketChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const seriesList = mData.regional_series[mCurrentRegion] || mData.regional_series['서울'] || [];
  const labels = seriesList.map(d => d.DATE);
  const salesData = seriesList.map(d => d.APT_SALES_INDEX);
  const jeonseData = seriesList.map(d => d.APT_JEONSE_INDEX);
  const rateData = seriesList.map(d => d.BOK_BASE_RATE);

  const pinsByYM = {};
  (mData.expert_pins || []).forEach(p => {
    if (!pinsByYM[p.YEAR_MONTH]) pinsByYM[p.YEAR_MONTH] = [];
    pinsByYM[p.YEAR_MONTH].push(p);
  });

  function getMobilePins(reg) {
    const pts = [];
    const colors = [];
    const radius = [];

    labels.forEach((d, idx) => {
      if (pinsByYM[d] && pinsByYM[d].length > 0) {
        pts.push(salesData[idx]);
        const p = pinsByYM[d][0];
        const rOp = (p.REGIONAL_OPINIONS && p.REGIONAL_OPINIONS[reg]) ? p.REGIONAL_OPINIONS[reg] : null;
        const rStance = rOp ? rOp.STANCE : p.NUMERIC_STANCE;

        if (rStance > 0.2) colors.push('#f43f5e'); // 🔴 상승
        else if (rStance < -0.2) colors.push('#3b82f6'); // 🔵 하락
        else colors.push('#f59e0b'); // 🟡 관망
        radius.push(5);
      } else {
        pts.push(null);
        colors.push('transparent');
        radius.push(0);
      }
    });
    return { pts, colors, radius };
  }

  const { pts, colors, radius } = getMobilePins(mCurrentRegion);

  const policyMap = {};
  (mData.policies || []).forEach(p => { policyMap[p.YEAR_MONTH] = p; });

  mChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: '매매지수',
          data: salesData,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 2.5,
          yAxisID: 'yPrice',
          fill: true,
          tension: 0.2,
          pointRadius: 0
        },
        {
          label: '전세지수',
          data: jeonseData,
          borderColor: '#10b981',
          borderWidth: 2,
          borderDash: [3, 3],
          yAxisID: 'yPrice',
          fill: false,
          tension: 0.2,
          pointRadius: 0
        },
        {
          label: '기준금리',
          data: rateData,
          borderColor: '#f59e0b',
          borderWidth: 2,
          yAxisID: 'yRate',
          fill: false,
          pointRadius: 0
        },
        {
          label: '미분양',
          data: (mData.unsold_series || []).map(u => u.NATION_UNSOLD_HOUSING),
          borderColor: '#ec4899',
          borderWidth: 2,
          borderDash: [5, 2],
          yAxisID: 'yUnsold',
          fill: false,
          pointRadius: 0,
          hidden: true
        },
        {
          label: '전문가 핀',
          data: pts,
          borderColor: colors,
          backgroundColor: colors,
          pointBackgroundColor: colors,
          pointBorderColor: '#ffffff',
          pointBorderWidth: 1.5,
          pointRadius: radius,
          pointHoverRadius: 8,
          showLine: false,
          yAxisID: 'yPrice'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      onClick: (e, activeEls) => {
        if (activeEls && activeEls.length > 0) {
          const idx = activeEls[0].index;
          const ym = labels[idx];
          updateMobilePinSheet(ym, seriesList[idx], policyMap[ym], pinsByYM[ym]);
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false } // We use the dedicated floating sheet for mobile touch
      },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: { color: '#64748b', maxTicksLimit: 6 }
        },
        yPrice: {
          type: 'linear',
          position: 'left',
          grid: { color: 'rgba(255,255,255,0.06)' },
          ticks: { color: '#3b82f6', maxTicksLimit: 5 }
        },
        yRate: {
          type: 'linear',
          position: 'right',
          grid: { drawOnChartArea: false },
          ticks: { color: '#f59e0b', maxTicksLimit: 4 },
          min: 0,
          max: 6.0
        },
        yUnsold: {
          type: 'linear',
          position: 'right',
          grid: { drawOnChartArea: false },
          ticks: { display: false },
          min: 0,
          max: 90000
        }
      }
    }
  });

  const defaultYm = '2021.08';
  const defaultIdx = labels.indexOf(defaultYm) !== -1 ? labels.indexOf(defaultYm) : labels.length - 1;
  updateMobilePinSheet(labels[defaultIdx], seriesList[defaultIdx], policyMap[labels[defaultIdx]], pinsByYM[labels[defaultIdx]]);
}

// 3. Update Floating Bottom Sheet on Touch
function updateMobilePinSheet(ym, stat, policy, pins) {
  const authorEl = document.getElementById('m-pin-author');
  const stanceEl = document.getElementById('m-pin-stance');
  const quoteEl = document.getElementById('m-pin-quote');
  const dateEl = document.getElementById('m-pin-date');
  const policyEl = document.getElementById('m-pin-policy');

  if (!authorEl) return;

  dateEl.textContent = `📅 ${ym}`;
  policyEl.textContent = policy ? `🏛️ ${policy.TITLE}` : `🏛️ 대형 대책 없음`;

  if (pins && pins.length > 0) {
    const p = pins[0];
    const rOp = (p.REGIONAL_OPINIONS && p.REGIONAL_OPINIONS[mCurrentRegion]) ? p.REGIONAL_OPINIONS[mCurrentRegion] : null;
    const opinionText = rOp ? rOp.OPINION : p.KEY_WORDING;
    const nuanceText = rOp ? rOp.NUANCE_LABEL : p.PREDICTED_STANCE;

    authorEl.textContent = `${p.EXPERT_NAME} (${p.ALIAS})`;
    quoteEl.textContent = `"${opinionText}"`;
    stanceEl.textContent = nuanceText;

    if (nuanceText.includes('상승')) {
      stanceEl.style.background = '#f43f5e';
    } else if (nuanceText.includes('하락')) {
      stanceEl.style.background = '#3b82f6';
    } else {
      stanceEl.style.background = '#f59e0b';
    }
  } else {
    authorEl.textContent = `한국은행 & 시장 지표`;
    stanceEl.textContent = stat ? `매매: ${stat.APT_SALES_INDEX}p | 금리: ${stat.BOK_BASE_RATE}%` : `시장 관망`;
    stanceEl.style.background = '#475569';
    quoteEl.textContent = stat ? `전세가율: ${stat.JEONSE_RATE}% | KB매수우위: ${stat.KB_BUYER_SUPERIORITY_INDEX}` : `정기 시황 데이터`;
  }
}

// 4. Render Vertical 104-Month Situation Feed
function renderMobileFeed() {
  const container = document.getElementById('m-matrix-feed-container');
  if (!container || !mData.chronological_matrix) return;

  container.innerHTML = '';
  // Show in reverse chronological order (latest first)
  const list = [...mData.chronological_matrix].reverse();

  list.forEach(row => {
    const card = document.createElement('div');
    card.className = 'm-matrix-card';

    let polHtml = '';
    if (row.POLICY) {
      polHtml = `<div class="m-policy-pill">🏛️ ${row.POLICY.TITLE}</div>`;
    }

    let quoteHtml = '';
    if (row.STATEMENTS && row.STATEMENTS.length > 0) {
      const s = row.STATEMENTS[0];
      const rOp = (s.REGIONAL_OPINIONS && s.REGIONAL_OPINIONS[mCurrentRegion]) ? s.REGIONAL_OPINIONS[mCurrentRegion] : null;
      const opText = rOp ? rOp.OPINION : s.KEY_WORDING;
      quoteHtml = `<div class="m-matrix-quote"><strong>${s.EXPERT_NAME}</strong>: "${opText.substring(0, 48)}..."</div>`;
    }

    card.innerHTML = `
      <div class="m-matrix-top">
        <span class="m-matrix-ym">${row.YEAR_MONTH}</span>
        <span class="m-matrix-rates">금리: <strong style="color:#f59e0b;">${row.BOK_BASE_RATE}%</strong> (주담대 ${row.MORTGAGE_LOAN_RATE}%)</span>
      </div>
      <div class="m-matrix-price-grid">
        <div class="m-stat-box">
          <div class="m-stat-label">서울 매매/전세</div>
          <div class="m-stat-value">${row.SEOUL_SALES}p / <span style="color:#10b981;">${row.SEOUL_JEONSE}p</span></div>
        </div>
        <div class="m-stat-box">
          <div class="m-stat-label">미분양 (전국)</div>
          <div class="m-stat-value" style="color:${row.UNSOLD_NATION > 60000 ? '#f43f5e' : '#fff'}">${(row.UNSOLD_NATION || 50000).toLocaleString()}호</div>
        </div>
      </div>
      ${polHtml}
      ${quoteHtml}
    `;

    container.appendChild(card);
  });
}

// 5. Render Vertical Leaderboard Cards
function renderMobileLeaderboard() {
  const container = document.getElementById('m-ranking-container');
  if (!container || !mData.experts) return;

  container.innerHTML = '';

  mData.experts.forEach(exp => {
    const card = document.createElement('div');
    card.className = 'm-expert-card';

    card.innerHTML = `
      <div class="m-exp-head">
        <span class="m-exp-rank">${exp.RANK}위</span>
        <span class="m-exp-name">${exp.NAME} <span style="color:#94a3b8; font-size:12px;">(${exp.ALIAS})</span></span>
        <span class="m-exp-tier">${exp.TIER}</span>
      </div>
      <div class="m-acc-row">
        <div class="m-acc-chip">
          <div style="color:#94a3b8; font-size:10px;">3M 초단기</div>
          <div class="m-acc-val" style="color:#38bdf8;">${exp.HIT_RATE_3M}%</div>
        </div>
        <div class="m-acc-chip">
          <div style="color:#94a3b8; font-size:10px;">6M 단중기</div>
          <div class="m-acc-val" style="color:#a855f7;">${exp.HIT_RATE_6M}%</div>
        </div>
        <div class="m-acc-chip">
          <div style="color:#94a3b8; font-size:10px;">12M 적중률</div>
          <div class="m-acc-val" style="color:#10b981;">${exp.HIT_RATE_12M}%</div>
        </div>
      </div>
      <div style="font-size:12px; color:#cbd5e1; background:rgba(0,0,0,0.2); padding:6px 8px; border-radius:6px;">
        💡 <strong>핵심 성향</strong>: ${exp.STANCE_GROUP} · ${exp.CORE_THEME}
      </div>
    `;

    container.appendChild(card);
  });
}

// 6. Setup Mobile Event Listeners
function setupMobileEvents() {
  // Region Selector
  document.getElementById('m-select-region')?.addEventListener('change', function() {
    mCurrentRegion = this.value;
    const titleEl = document.getElementById('m-chart-reg-title');
    if (titleEl) titleEl.textContent = mCurrentRegion.split(' ')[0];

    if (mChart && mData) {
      const seriesList = mData.regional_series[mCurrentRegion] || mData.regional_series['서울'];
      const sales = seriesList.map(d => d.APT_SALES_INDEX);
      const jeonse = seriesList.map(d => d.APT_JEONSE_INDEX);
      const rate = seriesList.map(d => d.BOK_BASE_RATE);

      mChart.data.datasets[0].data = sales;
      mChart.data.datasets[1].data = jeonse;
      mChart.data.datasets[2].data = rate;

      // Re-calculate pins for new region
      const pinsByYM = {};
      (mData.expert_pins || []).forEach(p => {
        if (!pinsByYM[p.YEAR_MONTH]) pinsByYM[p.YEAR_MONTH] = [];
        pinsByYM[p.YEAR_MONTH].push(p);
      });

      const pts = [];
      const colors = [];
      const labels = seriesList.map(d => d.DATE);

      labels.forEach((d, idx) => {
        if (pinsByYM[d] && pinsByYM[d].length > 0) {
          pts.push(sales[idx]);
          const p = pinsByYM[d][0];
          const rOp = (p.REGIONAL_OPINIONS && p.REGIONAL_OPINIONS[mCurrentRegion]) ? p.REGIONAL_OPINIONS[mCurrentRegion] : null;
          const rStance = rOp ? rOp.STANCE : p.NUMERIC_STANCE;

          if (rStance > 0.2) colors.push('#f43f5e');
          else if (rStance < -0.2) colors.push('#3b82f6');
          else colors.push('#f59e0b');
        } else {
          pts.push(null);
          colors.push('transparent');
        }
      });

      mChart.data.datasets[4].data = pts;
      mChart.data.datasets[4].borderColor = colors;
      mChart.data.datasets[4].backgroundColor = colors;
      mChart.data.datasets[4].pointBackgroundColor = colors;

      mChart.update();

      const defaultIdx = labels.indexOf('2021.08') !== -1 ? labels.indexOf('2021.08') : labels.length - 1;
      const policyMap = {};
      (mData.policies || []).forEach(p => { policyMap[p.YEAR_MONTH] = p; });
      updateMobilePinSheet(labels[defaultIdx], seriesList[defaultIdx], policyMap[labels[defaultIdx]], pinsByYM[labels[defaultIdx]]);
    }
  });

  // Layer Toggles
  document.getElementById('m-toggle-sales')?.addEventListener('click', function() {
    this.classList.toggle('active');
    mChart.setDatasetVisibility(0, this.classList.contains('active'));
    mChart.update();
  });
  document.getElementById('m-toggle-jeonse')?.addEventListener('click', function() {
    this.classList.toggle('active');
    mChart.setDatasetVisibility(1, this.classList.contains('active'));
    mChart.update();
  });
  document.getElementById('m-toggle-rate')?.addEventListener('click', function() {
    this.classList.toggle('active');
    mChart.setDatasetVisibility(2, this.classList.contains('active'));
    mChart.update();
  });
  document.getElementById('m-toggle-unsold')?.addEventListener('click', function() {
    this.classList.toggle('active');
    mChart.setDatasetVisibility(3, this.classList.contains('active'));
    mChart.update();
  });
  document.getElementById('m-toggle-pins')?.addEventListener('click', function() {
    this.classList.toggle('active');
    mChart.setDatasetVisibility(4, this.classList.contains('active'));
    mChart.update();
  });

  // Force Desktop Switcher
  document.getElementById('btn-force-desktop')?.addEventListener('click', () => {
    sessionStorage.setItem('FORCE_DESKTOP_VIEW', 'true');
    window.location.href = 'index.html';
  });
}
