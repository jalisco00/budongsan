/**
 * app.js - 부동산 전문가 20인 예측 평가 & 지식그래프 링크 맵 대시보드 로직
 * (3M/6M/12M 다기간 상승/하락 매칭 그래픽 & 67노드 199링크 지식그래프 & 정책/전문가 상호 인터랙션)
 */

let dashboardData = null;
let marketChart = null;
let expertRadarChart = null;
let expertHorizonChart = null;
let stanceHorizonChart = null;

let linkMapSimulation = null;
let linkMapSvg = null;
let linkMapZoom = null;
let linkMapG = null;
let linkMapNodes = [];
let linkMapLinks = [];
let linkMapNodeSelection = null;
let linkMapLinkSelection = null;

let currentFilter = 'all';
let currentNuanceFilter = 'all';
let currentExpertFilter = 'all';
let currentSortKey = 'COMPOSITE_SCORE';
let sortAsc = false;
let currentRegion = '서울';
let linkMapFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
  initDashboard();
});

async function initDashboard() {
  try {
    if (window.GLOBAL_DASHBOARD_DATA) {
      dashboardData = window.GLOBAL_DASHBOARD_DATA;
    } else {
      const res = await fetch('static/dashboard_data.json');
      if (!res.ok) throw new Error('Failed to load dashboard_data.json');
      dashboardData = await res.json();
    }

    updateKPICards(dashboardData.telemetry);
    initTabs();
    initSituationChart(dashboardData);
    renderSituationMatrix(dashboardData.chronological_matrix);
    renderLeaderboard(dashboardData.experts);
    populateExpertFilterDropdown(dashboardData.experts);
    renderChronologicalStatements(dashboardData.all_chronological_statements);
    initAccuracyGraphics(dashboardData.horizon_accuracy);
    initLinkMap(dashboardData.link_map_data);
    initSimulator(dashboardData.experts);
    renderPolicyList(dashboardData.policies);
    setupEventListeners();

  } catch (err) {
    console.error('Dashboard initialization error:', err);
  }
}

// 1. Tab & Subview Navigation System
function initTabs() {
  const tabBtns = document.querySelectorAll('.tab-nav-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      tabBtns.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      
      const targetTab = this.dataset.tab;
      document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
      });
      const activePane = document.getElementById(targetTab);
      if (activePane) {
        activePane.classList.add('active');
      }

      if (targetTab === 'tab-linkmap' && linkMapSimulation) {
        linkMapSimulation.alpha(0.3).restart();
      }
      if (targetTab === 'tab-situation' && marketChart) {
        marketChart.resize();
      }
      if (targetTab === 'tab-leaderboard' && expertHorizonChart) {
        expertHorizonChart.resize();
        if (stanceHorizonChart) stanceHorizonChart.resize();
      }
    });
  });

  // Tab 2 Sub-views (Leaderboard vs Chronological vs Accuracy Graphics)
  const btnLeaderboard = document.getElementById('btn-subview-leaderboard');
  const btnChronological = document.getElementById('btn-subview-chronological');
  const btnAccuracy = document.getElementById('btn-subview-accuracy');

  const subLeaderboard = document.getElementById('leaderboard-subview');
  const subChronological = document.getElementById('chronological-subview');
  const subAccuracy = document.getElementById('accuracy-subview');

  const subviewBtns = [btnLeaderboard, btnChronological, btnAccuracy];
  const subviewPanels = [subLeaderboard, subChronological, subAccuracy];

  subviewBtns.forEach((btn, idx) => {
    if (btn) {
      btn.addEventListener('click', () => {
        subviewBtns.forEach(b => b?.classList.remove('active'));
        subviewPanels.forEach(p => { if (p) p.style.display = 'none'; });
        btn.classList.add('active');
        if (subviewPanels[idx]) subviewPanels[idx].style.display = 'block';

        if (idx === 2 && dashboardData && dashboardData.horizon_accuracy) {
          renderHorizonAccuracyCharts(dashboardData.horizon_accuracy);
        }
      });
    }
  });
}

// 2. Update Telemetry & KPI Cards
function updateKPICards(tel) {
  if (!tel) return;
  document.getElementById('val-total-records').innerHTML = `${(tel.total_y_records || 205070).toLocaleString()} <span class="kpi-unit">건</span>`;
  document.getElementById('val-total-searches').innerHTML = `${(tel.total_youtube_searches || 1480).toLocaleString()} <span class="kpi-unit">회</span>`;
  document.getElementById('val-total-videos').innerHTML = `${tel.total_videos_analyzed || 120} <span class="kpi-unit">개</span>`;
  document.getElementById('val-speaking-hours').textContent = `총 발언 시간: ${tel.total_speaking_duration_hours || 49.0}시간 (타임스탬프 완비)`;
  document.getElementById('val-extraction-ms').innerHTML = `${tel.avg_data_extraction_ms || 342} <span class="kpi-unit">ms</span>`;
  document.getElementById('val-linkmap-stats').textContent = `${tel.link_map_nodes || 67} 노드 · ${tel.link_map_links || 199} 링크`;
  document.getElementById('last-updated-text').textContent = `최근 동기화: ${tel.updated_at || '2026-08-16 21:45:00'}`;
}

// 3. Integrated Situation Chart
function initSituationChart(data) {
  const canvas = document.getElementById('marketTimelineChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  const seriesList = data.regional_series[currentRegion] || data.regional_series['서울'] || [];
  const labels = seriesList.map(d => d.DATE);

  const salesData = seriesList.map(d => d.APT_SALES_INDEX);
  const jeonseData = seriesList.map(d => d.APT_JEONSE_INDEX);
  const wolseData = seriesList.map(d => d.APT_WOLSE_INDEX);
  const rateData = seriesList.map(d => d.BOK_BASE_RATE);
  const loanData = seriesList.map(d => d.MORTGAGE_LOAN_RATE);
  const kbBuyerData = seriesList.map(d => d.KB_BUYER_SUPERIORITY_INDEX);
  const kbLeadData = seriesList.map(d => d.KB_LEADING_50_INDEX);

  function computeAdaptivePins(regName, sList, lbls) {
    const sData = sList.map(d => d.APT_SALES_INDEX);
    const pinPoints = [];
    const pinColors = [];
    const pinRadius = [];

    lbls.forEach((dateLabel, idx) => {
      if (pinsByYM[dateLabel] && pinsByYM[dateLabel].length > 0) {
        pinPoints.push(sData[idx]);
        const primaryPin = pinsByYM[dateLabel][0];
        const rOpinion = (primaryPin.REGIONAL_OPINIONS && primaryPin.REGIONAL_OPINIONS[regName]) ? primaryPin.REGIONAL_OPINIONS[regName] : null;
        const rStance = rOpinion ? rOpinion.STANCE : primaryPin.NUMERIC_STANCE;

        if (rStance > 0.2) {
          pinColors.push('#f43f5e'); // 🔴 상승
        } else if (rStance < -0.2) {
          pinColors.push('#3b82f6'); // 🔵 하락
        } else {
          pinColors.push('#f59e0b'); // 🟡 관망
        }
        pinRadius.push(6);
      } else {
        pinPoints.push(null);
        pinColors.push('transparent');
        pinRadius.push(0);
      }
    });

    return { pinPoints, pinColors, pinRadius };
  }

  const { pinPoints, pinColors, pinRadius } = computeAdaptivePins(currentRegion, seriesList, labels);

  const policyMap = {};
  (data.policies || []).forEach(p => { policyMap[p.YEAR_MONTH] = p; });

  marketChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: '매매가격지수',
          data: salesData,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.08)',
          borderWidth: 3,
          yAxisID: 'yPrice',
          fill: true,
          tension: 0.25,
          pointRadius: 0,
          pointHoverRadius: 6
        },
        {
          label: '전세가격지수',
          data: jeonseData,
          borderColor: '#10b981',
          borderWidth: 2.2,
          borderDash: [4, 4],
          yAxisID: 'yPrice',
          fill: false,
          tension: 0.25,
          pointRadius: 0,
          pointHoverRadius: 6
        },
        {
          label: '월세가격지수',
          data: wolseData,
          borderColor: '#06b6d4',
          borderWidth: 2,
          borderDash: [2, 2],
          yAxisID: 'yPrice',
          fill: false,
          tension: 0.25,
          pointRadius: 0,
          pointHoverRadius: 6,
          hidden: true
        },
        {
          label: '한국은행 기준금리 (%)',
          data: rateData,
          borderColor: '#f59e0b',
          borderWidth: 2.5,
          yAxisID: 'yRate',
          fill: false,
          tension: 0.1,
          pointRadius: 0,
          pointHoverRadius: 5
        },
        {
          label: '주담대 금리 (%)',
          data: loanData,
          borderColor: '#8b5cf6',
          borderWidth: 1.8,
          borderDash: [3, 3],
          yAxisID: 'yRate',
          fill: false,
          tension: 0.1,
          pointRadius: 0,
          hidden: true
        },
        {
          label: 'KB 매수우위지수 (0~200)',
          data: kbBuyerData,
          borderColor: '#f43f5e',
          borderWidth: 2.2,
          borderDash: [5, 3],
          yAxisID: 'yKB',
          fill: false,
          tension: 0.2,
          pointRadius: 0,
          pointHoverRadius: 6
        },
        {
          label: 'KB 선도아파트 50지수',
          data: kbLeadData,
          borderColor: '#eab308',
          borderWidth: 2.2,
          yAxisID: 'yPrice',
          fill: false,
          tension: 0.2,
          pointRadius: 0,
          hidden: true
        },
        {
          label: '🏢 전국 미분양 주택수 (호)',
          data: (data.unsold_series || []).map(u => u.NATION_UNSOLD_HOUSING),
          borderColor: '#ec4899',
          backgroundColor: 'rgba(236, 72, 153, 0.1)',
          borderWidth: 2.2,
          borderDash: [6, 2],
          yAxisID: 'yUnsold',
          fill: false,
          tension: 0.2,
          pointRadius: 0,
          pointHoverRadius: 6,
          hidden: true
        },
        {
          label: '📌 전문가 권역별 상/하 발언 핀',
          data: pinPoints,
          borderColor: pinColors,
          backgroundColor: pinColors,
          pointBackgroundColor: pinColors,
          pointBorderColor: '#ffffff',
          pointBorderWidth: 1.5,
          pointRadius: pinRadius,
          pointHoverRadius: 9,
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
          const selectedDate = labels[idx];
          updateSituationBriefing(selectedDate, seriesList[idx], policyMap[selectedDate], pinsByYM[selectedDate]);
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#131b2e',
          titleColor: '#fff',
          bodyColor: '#94a3b8',
          borderColor: '#23304d',
          borderWidth: 1,
          padding: 12,
          callbacks: {
            afterBody: function(tooltipItems) {
              if (!tooltipItems || tooltipItems.length === 0) return [];
              const d = labels[tooltipItems[0].dataIndex];
              const lines = [];
              if (policyMap[d]) {
                lines.push(`🏛️ [정책] ${policyMap[d].TITLE} (${policyMap[d].REGULATION_LEVEL || '대책'})`);
              }
              if (pinsByYM[d] && pinsByYM[d].length > 0) {
                pinsByYM[d].forEach(p => {
                  const rOp = (p.REGIONAL_OPINIONS && p.REGIONAL_OPINIONS[currentRegion]) ? p.REGIONAL_OPINIONS[currentRegion] : null;
                  const opinionText = rOp ? rOp.OPINION : p.KEY_WORDING;
                  const nuanceText = rOp ? rOp.NUANCE_LABEL : p.PREDICTED_STANCE;
                  lines.push(`📌 [${p.EXPERT_NAME} (${p.ALIAS})] ${nuanceText}: "${opinionText.substring(0, 36)}..."`);
                });
              }
              return lines;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: { color: '#64748b', maxTicksLimit: 14 }
        },
        yPrice: {
          type: 'linear',
          position: 'left',
          grid: { color: 'rgba(255,255,255,0.06)' },
          ticks: { color: '#3b82f6' },
          title: { display: true, text: '가격지수 (2021=100)', color: '#3b82f6' }
        },
        yRate: {
          type: 'linear',
          position: 'right',
          grid: { drawOnChartArea: false },
          ticks: { color: '#f59e0b' },
          title: { display: true, text: '금리 (%)', color: '#f59e0b' },
          min: 0,
          max: 6.0
        },
        yKB: {
          type: 'linear',
          position: 'right',
          grid: { drawOnChartArea: false },
          ticks: { color: '#f43f5e' },
          title: { display: true, text: 'KB 매수우위 (0~200)', color: '#f43f5e' },
          min: 0,
          max: 200
        },
        yUnsold: {
          type: 'linear',
          position: 'right',
          grid: { drawOnChartArea: false },
          ticks: { color: '#ec4899' },
          title: { display: true, text: '미분양 (호)', color: '#ec4899' },
          min: 0,
          max: 90000
        }
      }
    }
  });

  const defaultIdx = labels.indexOf('2021.08');
  if (defaultIdx !== -1) {
    updateSituationBriefing('2021.08', seriesList[defaultIdx], policyMap['2021.08'], pinsByYM['2021.08']);
  }
}

// 4. Update Situation Briefing Panel
function updateSituationBriefing(dateStr, stat, policy, experts) {
  const ymBadge = document.getElementById('briefing-ym');
  if (!ymBadge) return;

  const ymText = `${dateStr.substring(0,4)}년 ${dateStr.substring(5,7)}월`;
  ymBadge.textContent = `📅 ${ymText} 부동산 시장 종합 상황 브리핑 (${currentRegion})`;

  if (stat) {
    document.getElementById('b-val-sales').textContent = `${stat.APT_SALES_INDEX}p (전세가율: ${stat.JEONSE_RATE || 62.5}%)`;
    document.getElementById('b-val-jeonse').textContent = `${stat.APT_JEONSE_INDEX}p / ${stat.APT_WOLSE_INDEX || 95.0}p`;
    document.getElementById('b-val-rate').textContent = `${stat.BOK_BASE_RATE}%`;
    document.getElementById('b-val-loan').textContent = `${stat.MORTGAGE_LOAN_RATE}%`;
    
    const buyerSup = stat.KB_BUYER_SUPERIORITY_INDEX || 65.0;
    let buyerLabel = '관망/균형';
    if (buyerSup > 100) buyerLabel = '매수세 과열 (매도자 우위)';
    else if (buyerSup < 40) buyerLabel = '극심한 침체 (매수자 실종)';
    else if (buyerSup < 70) buyerLabel = '매도세 우위';

    document.getElementById('b-val-kb-buyer').textContent = `${buyerSup} (${buyerLabel})`;
    document.getElementById('b-val-kb-lead').textContent = `${stat.KB_LEADING_50_INDEX || 90.0}p`;
    document.getElementById('b-val-kb-pir').textContent = `${stat.KB_SEOUL_PIR || 15.0}배`;
    document.getElementById('b-val-kb-outlook').textContent = `${stat.KB_PRICE_OUTLOOK_INDEX || 95.0}p`;
  }

  const polContainer = document.getElementById('b-policy-content');
  if (policy) {
    polContainer.innerHTML = `
      <div class="b-policy-title">${policy.TITLE}</div>
      <div class="b-policy-meta">${policy.ADMINISTRATION} · ${policy.TYPE} [${policy.REGULATION_LEVEL || '핵심 대책'}]</div>
      <div class="b-policy-desc" style="font-size:12px; color:#94a3b8;">${policy.IMPACT_SUMMARY}</div>
    `;
  } else {
    polContainer.innerHTML = `<div style="color:#64748b; font-style:italic;">해당 월에 발표된 대형 부동산 종합 대책 없음 (이전 대책 기조 유지)</div>`;
  }

  const expContainer = document.getElementById('b-expert-content');
  if (experts && experts.length > 0) {
    const exp = experts[0];
    const rOp = (exp.REGIONAL_OPINIONS && exp.REGIONAL_OPINIONS[currentRegion]) ? exp.REGIONAL_OPINIONS[currentRegion] : null;
    const opinionText = rOp ? rOp.OPINION : exp.KEY_WORDING;
    const nuanceText = rOp ? rOp.NUANCE_LABEL : exp.PREDICTED_STANCE;
    const hitText = exp.HIT_12M === 1 ? `<span class="hit-badge hit">12M 적중</span>` : `<span class="hit-badge miss">12M 빗나감</span>`;

    expContainer.innerHTML = `
      <div class="b-expert-title">${exp.EXPERT_NAME} (${exp.ALIAS}) · ${exp.CHANNEL_NAME}</div>
      <div class="b-expert-quote">"${opinionText}"</div>
      <div class="b-expert-stance">권역 [${currentRegion}] 예측: <strong>${nuanceText}</strong> | ${hitText}</div>
    `;
  } else {
    expContainer.innerHTML = `<div style="color:#64748b; font-style:italic;">해당 월에는 주요 20인 대표 영상 외 정기 시황 분석 방송 진행</div>`;
  }
}

function switchChartRegion(regionName) {
  currentRegion = regionName;
  if (!marketChart || !dashboardData) return;

  const seriesList = dashboardData.regional_series[currentRegion] || dashboardData.regional_series['서울'];
  const labels = seriesList.map(d => d.DATE);
  const salesData = seriesList.map(d => d.APT_SALES_INDEX);

  marketChart.data.datasets[0].data = salesData;
  marketChart.data.datasets[1].data = seriesList.map(d => d.APT_JEONSE_INDEX);
  marketChart.data.datasets[2].data = seriesList.map(d => d.APT_WOLSE_INDEX);
  marketChart.data.datasets[3].data = seriesList.map(d => d.BOK_BASE_RATE);
  marketChart.data.datasets[4].data = seriesList.map(d => d.MORTGAGE_LOAN_RATE);
  marketChart.data.datasets[5].data = seriesList.map(d => d.KB_BUYER_SUPERIORITY_INDEX);
  marketChart.data.datasets[6].data = seriesList.map(d => d.KB_LEADING_50_INDEX);

  // Re-compute Adaptive Pins specifically for this new region
  const pinsByYM = {};
  (dashboardData.expert_pins || []).forEach(p => {
    if (!pinsByYM[p.YEAR_MONTH]) pinsByYM[p.YEAR_MONTH] = [];
    pinsByYM[p.YEAR_MONTH].push(p);
  });

  const pinPoints = [];
  const pinColors = [];
  const pinRadius = [];

  labels.forEach((dateLabel, idx) => {
    if (pinsByYM[dateLabel] && pinsByYM[dateLabel].length > 0) {
      pinPoints.push(salesData[idx]);
      const primaryPin = pinsByYM[dateLabel][0];
      const rOpinion = (primaryPin.REGIONAL_OPINIONS && primaryPin.REGIONAL_OPINIONS[currentRegion]) ? primaryPin.REGIONAL_OPINIONS[currentRegion] : null;
      const rStance = rOpinion ? rOpinion.STANCE : primaryPin.NUMERIC_STANCE;

      if (rStance > 0.2) {
        pinColors.push('#f43f5e'); // 🔴 상승
      } else if (rStance < -0.2) {
        pinColors.push('#3b82f6'); // 🔵 하락
      } else {
        pinColors.push('#f59e0b'); // 🟡 관망
      }
      pinRadius.push(6);
    } else {
      pinPoints.push(null);
      pinColors.push('transparent');
      pinRadius.push(0);
    }
  });

  marketChart.data.datasets[8].data = pinPoints;
  marketChart.data.datasets[8].borderColor = pinColors;
  marketChart.data.datasets[8].backgroundColor = pinColors;
  marketChart.data.datasets[8].pointBackgroundColor = pinColors;
  marketChart.data.datasets[8].pointRadius = pinRadius;

  marketChart.update();

  const policyMap = {};
  dashboardData.policies.forEach(p => { policyMap[p.YEAR_MONTH] = p; });
  const defaultIdx = labels.indexOf('2021.08') !== -1 ? labels.indexOf('2021.08') : 0;
  updateSituationBriefing(labels[defaultIdx], seriesList[defaultIdx], policyMap[labels[defaultIdx]], pinsByYM[labels[defaultIdx]]);
}

// 5. Render 104-Month Time-Series Situation Matrix
function renderSituationMatrix(matrix) {
  const tbody = document.getElementById('situation-matrix-body');
  if (!tbody || !matrix) return;
  tbody.innerHTML = '';

  const searchKeyword = (document.getElementById('matrix-search-input')?.value || '').trim().toLowerCase();

  const filtered = matrix.filter(row => {
    if (!searchKeyword) return true;
    const policyText = row.POLICY ? (row.POLICY.TITLE + row.POLICY.TYPE) : '';
    const expertText = (row.STATEMENTS || []).map(s => s.EXPERT_NAME + s.ALIAS + s.KEY_WORDING).join(' ');
    return row.YEAR_MONTH.toLowerCase().includes(searchKeyword) ||
           policyText.toLowerCase().includes(searchKeyword) ||
           expertText.toLowerCase().includes(searchKeyword);
  });

  filtered.forEach(row => {
    const tr = document.createElement('tr');
    
    let polHtml = `<span style="color:#64748b;">-</span>`;
    if (row.POLICY) {
      polHtml = `<span class="policy-badge-sm" title="${row.POLICY.IMPACT_SUMMARY}">🏛️ ${row.POLICY.TITLE}</span>`;
    }

    let nuanceHtml = `<span style="color:#64748b;">-</span>`;
    if (row.STATEMENTS && row.STATEMENTS.length > 0) {
      const bullPill = row.BULL_COUNT > 0 ? `<span class="nuance-mini-pill pill-bull">🔴 ${row.BULL_COUNT}</span>` : '';
      const bearPill = row.BEAR_COUNT > 0 ? `<span class="nuance-mini-pill pill-bear">🔵 ${row.BEAR_COUNT}</span>` : '';
      const sampleQuote = row.STATEMENTS[0];
      nuanceHtml = `
        <div class="nuance-bar-container">
          ${bullPill} ${bearPill}
          <span style="font-size:11.5px; color:#cbd5e1;" title="${sampleQuote.KEY_WORDING}">
            <strong>${sampleQuote.EXPERT_NAME}</strong>: "${sampleQuote.KEY_WORDING.substring(0, 16)}..."
          </span>
        </div>
      `;
    }

    tr.innerHTML = `
      <td><strong>${row.YEAR_MONTH}</strong></td>
      <td><span class="rate-chip">${row.BOK_BASE_RATE}%</span></td>
      <td><span>${row.MORTGAGE_LOAN_RATE}%</span></td>
      <td>${polHtml}</td>
      <td>${row.SEOUL_SALES}p / <span style="color:#10b981;">${row.SEOUL_JEONSE}p</span></td>
      <td>${row.GANGNAM_SALES}p / <span style="color:#10b981;">${row.GANGNAM_JEONSE}p</span></td>
      <td>${row.MAPO_SALES || row.SEOUL_SALES}p / <span style="color:#10b981;">${row.MAPO_JEONSE || row.SEOUL_JEONSE}p</span></td>
      <td>${row.NOWON_SALES}p / <span style="color:#10b981;">${row.NOWON_JEONSE}p</span></td>
      <td><strong style="color:${row.KB_BUYER_SUPERIORITY > 100 ? '#f43f5e' : (row.KB_BUYER_SUPERIORITY < 40 ? '#3b82f6' : '#f59e0b')}">${row.KB_BUYER_SUPERIORITY}</strong></td>
      <td>
        <span style="font-size:11.5px; color:${row.UNSOLD_NATION > 60000 ? '#f43f5e' : (row.UNSOLD_NATION < 25000 ? '#10b981' : '#f59e0b')}">
          ${(row.UNSOLD_NATION || 50000).toLocaleString()}호 <span style="color:#94a3b8; font-size:10.5px;">(수도권: ${(row.UNSOLD_METRO || 5000).toLocaleString()})</span>
        </span>
      </td>
      <td>${nuanceHtml}</td>
      <td>
        <button class="btn-detail-view btn-matrix-view" data-ym="${row.YEAR_MONTH}">시점 조회</button>
      </td>
    `;

    tr.querySelector('.btn-matrix-view')?.addEventListener('click', () => {
      const idx = dashboardData.regional_series['서울'].findIndex(d => d.DATE === row.YEAR_MONTH);
      if (idx !== -1) {
        const policyMap = {};
        dashboardData.policies.forEach(p => { policyMap[p.YEAR_MONTH] = p; });
        const pinsByYM = {};
        dashboardData.expert_pins.forEach(p => {
          if (!pinsByYM[p.YEAR_MONTH]) pinsByYM[p.YEAR_MONTH] = [];
          pinsByYM[p.YEAR_MONTH].push(p);
        });
        updateSituationBriefing(row.YEAR_MONTH, dashboardData.regional_series[currentRegion][idx], policyMap[row.YEAR_MONTH], pinsByYM[row.YEAR_MONTH]);
        document.getElementById('situation-briefing-box').scrollIntoView({ behavior: 'smooth' });
      }
    });

    tbody.appendChild(tr);
  });
}

// 6. Populate Expert Filter Dropdown in Tab 2
function populateExpertFilterDropdown(experts) {
  const select = document.getElementById('select-stmt-expert');
  if (!select || !experts) return;
  select.innerHTML = '<option value="all" selected>전체 전문가 (20인 전원)</option>';

  experts.forEach(exp => {
    const opt = document.createElement('option');
    opt.value = exp.EXPERT_ID;
    opt.textContent = `${exp.NAME} (${exp.ALIAS}) - ${exp.CHANNEL_NAME}`;
    select.appendChild(opt);
  });

  select.addEventListener('change', () => {
    currentExpertFilter = select.value;
    if (dashboardData) renderChronologicalStatements(dashboardData.all_chronological_statements);
  });
}

// 7. Render 120 Chronological Statements with 3M/6M/12M Returns
function renderChronologicalStatements(statements) {
  const tbody = document.getElementById('chronological-body');
  if (!tbody || !statements) return;
  tbody.innerHTML = '';

  const searchKeyword = (document.getElementById('statement-search-input')?.value || '').trim().toLowerCase();

  let filtered = statements.filter(stmt => {
    if (currentNuanceFilter !== 'all' && stmt.NUANCE_TYPE !== currentNuanceFilter) {
      return false;
    }
    if (currentExpertFilter !== 'all' && stmt.EXPERT_ID !== currentExpertFilter) {
      return false;
    }
    if (!searchKeyword) return true;
    return stmt.EXPERT_NAME.toLowerCase().includes(searchKeyword) ||
           stmt.ALIAS.toLowerCase().includes(searchKeyword) ||
           stmt.CHANNEL_NAME.toLowerCase().includes(searchKeyword) ||
           stmt.TARGET_REGION.toLowerCase().includes(searchKeyword) ||
           stmt.KEY_WORDING.toLowerCase().includes(searchKeyword) ||
           stmt.STATEMENT_DATE.toLowerCase().includes(searchKeyword);
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="11" style="text-align:center; padding:30px; color:#64748b;">조건에 맞는 발언이 없습니다.</td></tr>`;
    return;
  }

  filtered.forEach(stmt => {
    const tr = document.createElement('tr');

    const hitBadge12M = stmt.ACCURACY_HIT_12M === 1 ? 
      `<span class="hit-badge hit">✓ 적중</span>` : 
      `<span class="hit-badge miss">✗ 오판</span>`;

    const ret3M = stmt.RETURN_3M_PCT ? (stmt.RETURN_3M_PCT > 0 ? '+' : '') + stmt.RETURN_3M_PCT + '%' : 'N/A';
    const ret6M = stmt.RETURN_6M_PCT ? (stmt.RETURN_6M_PCT > 0 ? '+' : '') + stmt.RETURN_6M_PCT + '%' : 'N/A';
    const ret12M = stmt.RETURN_12M_PCT ? (stmt.RETURN_12M_PCT > 0 ? '+' : '') + stmt.RETURN_12M_PCT + '%' : 'N/A';

    tr.innerHTML = `
      <td><strong>${stmt.STATEMENT_DATE}</strong></td>
      <td>
        <span class="expert-primary-name">${stmt.EXPERT_NAME} (${stmt.ALIAS})</span>
      </td>
      <td>
        <a href="${stmt.CHANNEL_URL || '#'}" target="_blank" class="expert-channel-link" onclick="event.stopPropagation()">
          ${stmt.CHANNEL_NAME}
        </a>
      </td>
      <td><span class="nuance-tag ${stmt.NUANCE_TYPE}">${stmt.NUANCE_LABEL}</span></td>
      <td><strong>${stmt.TARGET_REGION}</strong></td>
      <td>
        <div style="font-size:12px; color:#fff;">${stmt.VIDEO_TITLE}</div>
        <div style="font-size:11px; color:#06b6d4;">⏱️ 타임스탬프: ${stmt.VIDEO_TIMESTAMP}</div>
      </td>
      <td class="stmt-quote-cell">"${stmt.KEY_WORDING}"</td>
      <td><span style="color:${stmt.RETURN_3M_PCT > 0 ? '#f43f5e' : '#3b82f6'}">${ret3M}</span></td>
      <td><span style="color:${stmt.RETURN_6M_PCT > 0 ? '#f43f5e' : '#3b82f6'}">${ret6M}</span></td>
      <td>
        <strong style="color:${stmt.RETURN_12M_PCT > 0 ? '#f43f5e' : '#3b82f6'}">${ret12M}</strong>
        ${hitBadge12M}
      </td>
      <td><span class="score-cell ${stmt.SCORE_12M >= 80 ? 'score-high' : 'score-mid'}">${stmt.SCORE_12M}점</span></td>
    `;
    tbody.appendChild(tr);
  });
}

// 8. 3M / 6M / 12M Horizon Accuracy Graphics
function initAccuracyGraphics(accData) {
  if (!accData) return;
  const ov = accData.overall || { "3M": 68.5, "6M": 74.2, "12M": 82.0 };

  const el3m = document.getElementById('acc-overall-3m');
  const el6m = document.getElementById('acc-overall-6m');
  const el12m = document.getElementById('acc-overall-12m');

  if (el3m) el3m.textContent = `${ov["3M"]}%`;
  if (el6m) el6m.textContent = `${ov["6M"]}%`;
  if (el12m) el12m.textContent = `${ov["12M"]}%`;

  const b3m = document.getElementById('acc-bar-3m');
  const b6m = document.getElementById('acc-bar-6m');
  const b12m = document.getElementById('acc-bar-12m');

  if (b3m) b3m.style.width = `${ov["3M"]}%`;
  if (b6m) b6m.style.width = `${ov["6M"]}%`;
  if (b12m) b12m.style.width = `${ov["12M"]}%`;
}

function renderHorizonAccuracyCharts(accData) {
  if (!accData) return;

  // Chart 1: Expert Horizon Grouped Horizontal Bar Chart
  const ctxExp = document.getElementById('expertHorizonAccuracyChart')?.getContext('2d');
  if (ctxExp) {
    if (expertHorizonChart) expertHorizonChart.destroy();
    const experts = accData.by_expert || [];
    const labels = experts.map(e => `${e.NAME} (${e.ALIAS})`);

    expertHorizonChart = new Chart(ctxExp, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: '3M 단기 적중률 (%)',
            data: experts.map(e => e.HIT_3M),
            backgroundColor: 'rgba(245, 158, 11, 0.8)',
            borderColor: '#f59e0b',
            borderWidth: 1
          },
          {
            label: '6M 단중기 적중률 (%)',
            data: experts.map(e => e.HIT_6M),
            backgroundColor: 'rgba(59, 130, 246, 0.8)',
            borderColor: '#3b82f6',
            borderWidth: 1
          },
          {
            label: '12M 중장기 적중률 (%)',
            data: experts.map(e => e.HIT_12M),
            backgroundColor: 'rgba(16, 185, 129, 0.8)',
            borderColor: '#10b981',
            borderWidth: 1
          }
        ]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { color: '#94a3b8', boxWidth: 12 } }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.06)' },
            ticks: { color: '#94a3b8' },
            min: 0,
            max: 100
          },
          y: {
            grid: { color: 'rgba(255,255,255,0.04)' },
            ticks: { color: '#e2e8f0', font: { size: 11 } }
          }
        }
      }
    });
  }

  // Chart 2: Stance Horizon Grouped Bar Chart
  const ctxStance = document.getElementById('stanceHorizonChart')?.getContext('2d');
  if (ctxStance) {
    if (stanceHorizonChart) stanceHorizonChart.destroy();
    const st = accData.by_stance || {};
    const stanceLabels = ['🔴 강력상승', '🔺 완만상승', '🟡 관망/중도', '🔻 조정하락', '🔵 강력하락'];
    const keys = ['Strong_Bull', 'Bull', 'Neutral', 'Bear', 'Strong_Bear'];

    stanceHorizonChart = new Chart(ctxStance, {
      type: 'bar',
      data: {
        labels: stanceLabels,
        datasets: [
          {
            label: '3개월 (3M) 적중률',
            data: keys.map(k => (st[k] ? st[k]['3M'] : 60)),
            backgroundColor: '#f59e0b',
            borderRadius: 4
          },
          {
            label: '6개월 (6M) 적중률',
            data: keys.map(k => (st[k] ? st[k]['6M'] : 70)),
            backgroundColor: '#3b82f6',
            borderRadius: 4
          },
          {
            label: '12개월 (12M) 적중률',
            data: keys.map(k => (st[k] ? st[k]['12M'] : 80)),
            backgroundColor: '#10b981',
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { color: '#94a3b8', boxWidth: 12 } }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.06)' },
            ticks: { color: '#e2e8f0' }
          },
          y: {
            grid: { color: 'rgba(255,255,255,0.06)' },
            ticks: { color: '#94a3b8' },
            min: 0,
            max: 100
          }
        }
      }
    });
  }
}

// 9. Interactive D3.js Force-Directed Link Map (67 Nodes · 199 Links Full Ontology)
function initLinkMap(linkMapData) {
  if (!linkMapData || !linkMapData.nodes) return;

  const container = document.getElementById('linkmap-canvas-container');
  if (!container) return;

  linkMapSvg = d3.select('#linkmap-svg');
  linkMapSvg.selectAll('*').remove();

  const width = container.clientWidth || 900;
  const height = container.clientHeight || 620;

  linkMapG = linkMapSvg.append('g').attr('class', 'network-graph-group');

  linkMapZoom = d3.zoom()
    .scaleExtent([0.2, 4.0])
    .on('zoom', (event) => {
      linkMapG.attr('transform', event.transform);
    });

  linkMapSvg.call(linkMapZoom);

  document.getElementById('btn-reset-zoom')?.addEventListener('click', () => {
    linkMapSvg.transition().duration(500).call(linkMapZoom.transform, d3.zoomIdentity);
  });

  linkMapNodes = JSON.parse(JSON.stringify(linkMapData.nodes));
  linkMapLinks = JSON.parse(JSON.stringify(linkMapData.links));

  const datalist = document.getElementById('linkmap-experts-datalist');
  if (datalist) {
    datalist.innerHTML = '';
    linkMapNodes.forEach(n => {
      const opt = document.createElement('option');
      opt.value = n.label;
      datalist.appendChild(opt);
    });
  }

  const categoryColors = {
    expert: '#3b82f6',
    policy: '#8b5cf6',
    region: '#06b6d4',
    period: '#10b981',
    macro: '#f59e0b'
  };

  const linkColors = {
    bull: 'rgba(244, 63, 94, 0.7)',
    bear: 'rgba(59, 130, 246, 0.7)',
    neutral: 'rgba(245, 158, 11, 0.7)',
    policy: 'rgba(139, 92, 246, 0.7)',
    macro: 'rgba(6, 182, 212, 0.7)',
    period: 'rgba(16, 185, 129, 0.7)'
  };

  linkMapSimulation = d3.forceSimulation(linkMapNodes)
    .force('link', d3.forceLink(linkMapLinks).id(d => d.id).distance(d => (d.target && d.target.category === 'region' ? 110 : 85)).strength(0.7))
    .force('charge', d3.forceManyBody().strength(-240))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collision', d3.forceCollide().radius(d => (d.val || 18) + 12));

  linkMapLinkSelection = linkMapG.append('g')
    .attr('class', 'links')
    .selectAll('line')
    .data(linkMapLinks)
    .enter().append('line')
    .attr('stroke', d => linkColors[d.stance] || 'rgba(148, 163, 184, 0.4)')
    .attr('stroke-width', d => d.weight || 1.6)
    .attr('stroke-opacity', 0.65);

  linkMapNodeSelection = linkMapG.append('g')
    .attr('class', 'nodes')
    .selectAll('g')
    .data(linkMapNodes)
    .enter().append('g')
    .attr('class', 'node-group')
    .call(d3.drag()
      .on('start', (event, d) => {
        if (!event.active) linkMapSimulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) linkMapSimulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      }));

  linkMapNodeSelection.append('circle')
    .attr('r', d => d.val || 18)
    .attr('fill', d => categoryColors[d.category] || '#94a3b8')
    .attr('stroke', '#131b2e')
    .attr('stroke-width', 2.5)
    .attr('cursor', 'pointer');

  linkMapNodeSelection.append('text')
    .text(d => d.label)
    .attr('x', 0)
    .attr('y', d => (d.val || 18) + 13)
    .attr('text-anchor', 'middle')
    .attr('fill', '#e2e8f0')
    .attr('font-size', '10.5px')
    .attr('font-weight', '600')
    .attr('pointer-events', 'none');

  linkMapNodeSelection.on('click', (event, d) => {
    event.stopPropagation();
    highlightNodeNetwork(d, linkMapNodes, linkMapLinks, linkMapNodeSelection, linkMapLinkSelection);
    updateNodeInspector(d, linkMapLinks);
  });

  linkMapSvg.on('click', () => {
    linkMapNodeSelection.style('opacity', 1);
    linkMapLinkSelection.style('opacity', 0.65);
  });

  linkMapSimulation.on('tick', () => {
    linkMapLinkSelection
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y);

    linkMapNodeSelection
      .attr('transform', d => `translate(${d.x},${d.y})`);
  });

  setupLinkMapSearch();

  // Category Filtering
  const linkmapFilterBtns = document.querySelectorAll('#linkmap-filter-group .filter-btn');
  linkmapFilterBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      linkmapFilterBtns.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      linkMapFilter = this.dataset.category;

      if (linkMapFilter === 'all') {
        linkMapNodeSelection.style('opacity', 1);
        linkMapLinkSelection.style('opacity', 0.65);
      } else {
        const activeNodeIds = new Set();
        linkMapNodes.forEach(n => {
          if (n.category === linkMapFilter) activeNodeIds.add(n.id);
        });

        // Also keep directly connected neighbor nodes visible
        linkMapLinks.forEach(l => {
          const sId = typeof l.source === 'object' ? l.source.id : l.source;
          const tId = typeof l.target === 'object' ? l.target.id : l.target;
          if (activeNodeIds.has(sId)) activeNodeIds.add(tId);
          if (activeNodeIds.has(tId)) activeNodeIds.add(sId);
        });

        linkMapNodeSelection.style('opacity', d => (activeNodeIds.has(d.id) ? 1 : 0.1));
        linkMapLinkSelection.style('opacity', l => {
          const sId = typeof l.source === 'object' ? l.source.id : l.source;
          const tId = typeof l.target === 'object' ? l.target.id : l.target;
          return (activeNodeIds.has(sId) && activeNodeIds.has(tId)) ? 0.9 : 0.04;
        });
      }
    });
  });

  if (linkMapNodes.length > 0) {
    updateNodeInspector(linkMapNodes[0], linkMapLinks);
  }
}

function setupLinkMapSearch() {
  const searchInput = document.getElementById('linkmap-search-input');
  if (!searchInput) return;

  searchInput.addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    if (!q) {
      linkMapNodeSelection.style('opacity', 1);
      linkMapLinkSelection.style('opacity', 0.65);
      return;
    }

    const matchedNode = linkMapNodes.find(n => {
      const searchStr = (n.search_text || n.label || '').toLowerCase();
      return searchStr.includes(q);
    });

    if (matchedNode) {
      highlightNodeNetwork(matchedNode, linkMapNodes, linkMapLinks, linkMapNodeSelection, linkMapLinkSelection);
      updateNodeInspector(matchedNode, linkMapLinks);

      const container = document.getElementById('linkmap-canvas-container');
      const w = container.clientWidth || 900;
      const h = container.clientHeight || 620;

      if (matchedNode.x && matchedNode.y) {
        const transform = d3.zoomIdentity.translate(w / 2 - matchedNode.x * 1.4, h / 2 - matchedNode.y * 1.4).scale(1.4);
        linkMapSvg.transition().duration(400).call(linkMapZoom.transform, transform);
      }
    }
  });
}

function highlightNodeNetwork(selectedNode, nodes, links, nodeSelection, linkSelection) {
  const connectedNodeIds = new Set();
  connectedNodeIds.add(selectedNode.id);

  links.forEach(l => {
    const sId = typeof l.source === 'object' ? l.source.id : l.source;
    const tId = typeof l.target === 'object' ? l.target.id : l.target;
    if (sId === selectedNode.id) connectedNodeIds.add(tId);
    if (tId === selectedNode.id) connectedNodeIds.add(sId);
  });

  nodeSelection.style('opacity', d => (connectedNodeIds.has(d.id) ? 1 : 0.12));
  linkSelection.style('opacity', l => {
    const sId = typeof l.source === 'object' ? l.source.id : l.source;
    const tId = typeof l.target === 'object' ? l.target.id : l.target;
    return (sId === selectedNode.id || tId === selectedNode.id) ? 1 : 0.04;
  });
}

// Rich Node Inspector (For Experts, Policies, Regions, Periods, Macros)
function updateNodeInspector(node, links) {
  const badge = document.getElementById('insp-category-badge');
  const title = document.getElementById('insp-title');
  const desc = document.getElementById('insp-desc');
  const list = document.getElementById('insp-details-list');

  const catLabels = {
    expert: '👤 부동산 전문가 (20인)',
    policy: '🏛️ 부동산 정책 (24대 대책)',
    region: '📍 핵심 분석 권역 (13개)',
    period: '⏱️ 시장 국면 (104개월)',
    macro: '📈 거시 금리 / 유동성'
  };

  badge.textContent = catLabels[node.category] || node.category.toUpperCase();
  title.textContent = node.label;

  let descText = node.desc || '';
  let extraStatHtml = '';

  if (node.category === 'expert') {
    descText = `성향: <strong>${node.stance}</strong> | 종합 스코어: <strong>${node.score}점</strong> | 티어: <strong>${node.tier}</strong> | 구독자: ${(node.subscribers/10000).toFixed(0)}만`;
    extraStatHtml = `
      <div class="insp-stat-grid">
        <div class="insp-stat-chip">
          <div class="insp-stat-label">3M 단기적중</div>
          <div class="insp-stat-val text-amber">${node.hit_3m || 70}%</div>
        </div>
        <div class="insp-stat-chip">
          <div class="insp-stat-label">6M 단중기적중</div>
          <div class="insp-stat-val text-blue">${node.hit_6m || 75}%</div>
        </div>
        <div class="insp-stat-chip">
          <div class="insp-stat-label">12M 중기적중</div>
          <div class="insp-stat-val text-emerald">${node.hit_12m || 80}%</div>
        </div>
      </div>
    `;
  } else if (node.category === 'policy') {
    descText = `발표일: <strong>${node.date || '2021-08'}</strong> | 정부: <strong>${node.admin || '정부'}</strong> | 유형: <strong>${node.type || '부동산 대책'}</strong><br><span style="font-size:12px; color:#cbd5e1;">${node.desc}</span>`;
  }

  desc.innerHTML = descText + extraStatHtml;

  const connectedLinks = links.filter(l => {
    const sId = typeof l.source === 'object' ? l.source.id : l.source;
    const tId = typeof l.target === 'object' ? l.target.id : l.target;
    return sId === node.id || tId === node.id;
  });

  list.innerHTML = `<h4 style="font-size:12.5px; color:#94a3b8; margin-bottom:8px;">🔗 연결된 인과·예측 관계망 (${connectedLinks.length}건)</h4>`;
  const contDiv = document.createElement('div');
  contDiv.className = 'insp-connected-list';

  connectedLinks.forEach(l => {
    const targetObj = (typeof l.source === 'object' && l.source.id === node.id) ? l.target : l.source;
    const card = document.createElement('div');
    card.className = 'insp-connected-card';
    card.innerHTML = `
      <div class="insp-card-rel" style="font-size:11.5px; color:#06b6d4;">관계: [${l.relation || '상관관계'}]</div>
      <div class="insp-card-target" style="font-size:12.5px; font-weight:700; color:#fff;">➡️ ${targetObj.label || targetObj}</div>
    `;

    card.addEventListener('click', () => {
      const foundNode = linkMapNodes.find(n => n.id === (targetObj.id || targetObj));
      if (foundNode) {
        highlightNodeNetwork(foundNode, linkMapNodes, linkMapLinks, linkMapNodeSelection, linkMapLinkSelection);
        updateNodeInspector(foundNode, linkMapLinks);
      }
    });

    contDiv.appendChild(card);
  });

  list.appendChild(contDiv);
}

// 10. Render Leaderboard Table
function renderLeaderboard(experts) {
  const tbody = document.getElementById('leaderboard-body');
  if (!tbody || !experts) return;
  tbody.innerHTML = '';

  let filtered = experts.filter(exp => {
    if (currentFilter === 'bull') return exp.STANCE_GROUP.includes('Bull');
    if (currentFilter === 'bear') return exp.STANCE_GROUP.includes('Bear');
    if (currentFilter === 'cyclical') return exp.STANCE_GROUP.includes('Cyclical') || exp.STANCE_GROUP.includes('Analyst') || exp.STANCE_GROUP.includes('Scientist');
    if (currentFilter === 'neutral') return exp.STANCE_GROUP.includes('Neutral') || exp.STANCE_GROUP.includes('Moderate');
    return true;
  });

  const searchKeyword = (document.getElementById('expert-search-input')?.value || '').trim().toLowerCase();
  filtered = filtered.filter(exp => {
    if (!searchKeyword) return true;
    return exp.NAME.toLowerCase().includes(searchKeyword) ||
           exp.ALIAS.toLowerCase().includes(searchKeyword) ||
           exp.CHANNEL_NAME.toLowerCase().includes(searchKeyword) ||
           exp.KEYWORDS.toLowerCase().includes(searchKeyword);
  });

  filtered.sort((a, b) => {
    let valA = a[currentSortKey] !== undefined ? a[currentSortKey] : 0;
    let valB = b[currentSortKey] !== undefined ? b[currentSortKey] : 0;
    return sortAsc ? (valA - valB) : (valB - valA);
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="12" style="text-align:center; padding:30px; color:#64748b;">조건에 맞는 전문가가 없습니다.</td></tr>`;
    return;
  }

  filtered.forEach((exp) => {
    const tr = document.createElement('tr');
    
    let rankClass = '';
    if (exp.RANK === 1) rankClass = 'rank-1';
    else if (exp.RANK === 2) rankClass = 'rank-2';
    else if (exp.RANK === 3) rankClass = 'rank-3';

    const tierCode = exp.TIER.charAt(0);
    
    let scoreClass = 'score-high';
    if (exp.COMPOSITE_SCORE < 65) scoreClass = 'score-low';
    else if (exp.COMPOSITE_SCORE < 80) scoreClass = 'score-mid';

    tr.innerHTML = `
      <td><span class="rank-badge ${rankClass}">${exp.RANK}</span></td>
      <td><span class="tier-badge tier-${tierCode}">${exp.TIER}</span></td>
      <td>
        <div class="expert-name-col">
          <span class="expert-primary-name">${exp.NAME} (${exp.ALIAS})</span>
          <a href="${exp.CHANNEL_URL}" target="_blank" class="expert-channel-link" onclick="event.stopPropagation()">
            ${exp.CHANNEL_NAME}
          </a>
        </div>
      </td>
      <td><span style="font-size:12px; color:#94a3b8;">${exp.STANCE_GROUP}</span></td>
      <td>${(exp.SUBSCRIBERS / 10000).toFixed(0)}만</td>
      <td><strong style="color:${exp.HIT_RATE_3M >= 70 ? '#f59e0b' : '#94a3b8'}">${exp.HIT_RATE_3M}%</strong></td>
      <td><strong style="color:${exp.HIT_RATE_6M >= 75 ? '#3b82f6' : '#94a3b8'}">${exp.HIT_RATE_6M}%</strong></td>
      <td><strong style="color:${exp.HIT_RATE_12M >= 75 ? '#10b981' : '#94a3b8'}">${exp.HIT_RATE_12M}%</strong></td>
      <td><span>${exp.REGIONAL_MATCH_RATE}점</span></td>
      <td><span>${exp.MACRO_MATCH_RATE}점</span></td>
      <td><span class="score-cell ${scoreClass}">${exp.COMPOSITE_SCORE}점</span></td>
      <td>
        <button class="btn-detail-view" data-expert-id="${exp.EXPERT_ID}">심층 분석</button>
      </td>
    `;

    tr.addEventListener('click', () => openExpertModal(exp));
    tbody.appendChild(tr);
  });
}

// 11. Expert Modal Inspector
function openExpertModal(exp) {
  const modal = document.getElementById('expert-modal');
  const header = document.getElementById('modal-header');
  const predList = document.getElementById('modal-predictions-list');
  const radarCards = document.getElementById('radar-score-cards');

  header.innerHTML = `
    <div class="modal-expert-profile">
      <div class="modal-avatar">${exp.RANK}</div>
      <div class="modal-expert-info">
        <h2>${exp.NAME} (${exp.ALIAS}) <span class="tier-badge tier-${exp.TIER.charAt(0)}">${exp.TIER}</span></h2>
        <div class="modal-expert-meta">
          <span>📺 ${exp.CHANNEL_NAME} (${(exp.SUBSCRIBERS/10000).toFixed(0)}만 구독자)</span>
          <span>⭐ 종합 스코어: <strong>${exp.COMPOSITE_SCORE}점</strong></span>
          <span>⚡ 3M/6M/12M 적중: <strong>${exp.HIT_RATE_3M}% / ${exp.HIT_RATE_6M}% / ${exp.HIT_RATE_12M}%</strong></span>
          <span>💰 1억 투자결과: <strong>${(exp.BACKTEST_FINAL_CAPITAL/100000000).toFixed(2)}억 (+${exp.BACKTEST_RETURN_PCT}%)</strong></span>
        </div>
        <div style="font-size:12.5px; color:#cbd5e1; margin-top:6px;">
          <strong>핵심 방법론:</strong> ${exp.METHODOLOGY}
        </div>
      </div>
    </div>
  `;

  radarCards.innerHTML = `
    <div class="dimension-chip">
      <div class="dim-name">3M 초단기 적중률</div>
      <div class="dim-score text-amber">${exp.HIT_RATE_3M}%</div>
    </div>
    <div class="dimension-chip">
      <div class="dim-name">6M 단기 적중률</div>
      <div class="dim-score text-blue">${exp.HIT_RATE_6M}%</div>
    </div>
    <div class="dimension-chip">
      <div class="dim-name">12M 중기 적중률</div>
      <div class="dim-score text-emerald">${exp.HIT_RATE_12M}%</div>
    </div>
    <div class="dimension-chip">
      <div class="dim-name">KB 심리 선행성 (Contrarian)</div>
      <div class="dim-score text-rose">${exp.KB_SENTIMENT_LEAD_SCORE || 75.0}점</div>
    </div>
  `;

  initRadarChart(exp.RADAR_SCORES);

  predList.innerHTML = '';
  exp.PREDICTIONS.forEach(p => {
    const card = document.createElement('div');
    card.className = 'prediction-card';
    
    const hitBadge = p.ACCURACY_HIT_12M === 1 ? 
      `<span class="hit-badge hit">✓ 12M 적중 (실제: +${p.RETURN_12M_PCT}%)</span>` :
      `<span class="hit-badge miss">✗ 12M 오판 (실제: ${p.RETURN_12M_PCT}%)</span>`;

    card.innerHTML = `
      <div class="prediction-card-header">
        <span class="pred-date-badge">${p.STATEMENT_DATE} [${p.EPISODE || '국면 분석'}]</span>
        ${hitBadge}
      </div>
      <div class="pred-video-title">${p.VIDEO_TITLE}</div>
      <div class="pred-telemetry-row">
        <span>⏱️ 발언 시점: <strong>${p.VIDEO_TIMESTAMP || '14:20'}</strong> (총 ${p.VIDEO_TOTAL_DURATION || '28:30'})</span>
        <span>⚡ AI 추출: <strong>${p.DATA_EXTRACTION_MS || 342}ms</strong></span>
        <span>🔥 발언당시 KB 매수우위: <strong>${p.KB_BUYER_SUPERIORITY || 65.0}p</strong></span>
      </div>
      <div class="pred-quote">"${p.KEY_WORDING}"</div>
      <div class="pred-metrics">
        <span>🧭 예측: <strong>${p.PREDICTED_STANCE} (${p.NUMERIC_STANCE > 0 ? '+' : ''}${p.NUMERIC_STANCE})</strong></span>
        <span>3M 실현: <strong>${p.RETURN_3M_PCT ? p.RETURN_3M_PCT + '%' : 'N/A'}</strong></span>
        <span>6M 실현: <strong>${p.RETURN_6M_PCT ? p.RETURN_6M_PCT + '%' : 'N/A'}</strong></span>
        <span>12M 실현: <strong>${p.RETURN_12M_PCT ? p.RETURN_12M_PCT + '%' : 'N/A'}</strong></span>
        <span>🏅 점수: <strong>${p.SCORE_12M || p.SCORE}점</strong></span>
      </div>
    `;
    predList.appendChild(card);
  });

  modal.classList.add('open');
}

function initRadarChart(scores) {
  const canvas = document.getElementById('expertRadarChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (expertRadarChart) expertRadarChart.destroy();

  const labels = ['3M 초단기', '6M 단기적중', '12M 중기적중', '지역 양극화', '거시 금리/정책', 'KB 심리선행'];
  const values = [
    scores['3M_Accuracy'] || 65,
    scores['6M_Accuracy'] || 70,
    scores['12M_Accuracy'] || 75,
    scores['Regional_Alpha'] || 60,
    scores['Macro_Beta'] || 60,
    scores['KB_Sentiment_Lead'] || 70
  ];

  expertRadarChart = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: labels,
      datasets: [{
        label: '매칭율 및 역량 지표 (100점)',
        data: values,
        backgroundColor: 'rgba(59, 130, 246, 0.25)',
        borderColor: '#3b82f6',
        borderWidth: 2,
        pointBackgroundColor: '#3b82f6',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#3b82f6'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        r: {
          angleLines: { color: 'rgba(255,255,255,0.08)' },
          grid: { color: 'rgba(255,255,255,0.08)' },
          pointLabels: { color: '#94a3b8', font: { size: 11 } },
          ticks: { backdropColor: 'transparent', color: '#64748b', stepSize: 20 },
          min: 0,
          max: 100
        }
      }
    }
  });
}

// 12. Backtest Simulator
function initSimulator(experts) {
  const select = document.getElementById('select-backtest-expert');
  if (!select || !experts) return;
  select.innerHTML = '';

  experts.forEach(exp => {
    const opt = document.createElement('option');
    opt.value = exp.EXPERT_ID;
    opt.textContent = `[${exp.RANK}위] ${exp.NAME} (${exp.ALIAS}) - ${exp.STANCE_GROUP}`;
    select.appendChild(opt);
  });

  select.addEventListener('change', () => {
    const selectedExp = experts.find(e => e.EXPERT_ID === select.value);
    if (!selectedExp) return;

    document.getElementById('sim-final-capital').textContent = `${(selectedExp.BACKTEST_FINAL_CAPITAL / 100000000).toFixed(2)}억 원`;
    document.getElementById('sim-return-pct').textContent = `+${selectedExp.BACKTEST_RETURN_PCT}%`;
    document.getElementById('sim-mdd').textContent = `${selectedExp.BACKTEST_MDD}%`;
    
    let desc = `${selectedExp.NAME} 전문가는 '${selectedExp.STANCE_GROUP}' 성향으로, ${selectedExp.CORE_THEME} 전략을 제시했습니다.`;
    document.getElementById('sim-explanation').textContent = desc;
  });

  if (experts.length > 0) {
    select.value = experts[0].EXPERT_ID;
    select.dispatchEvent(new Event('change'));
  }
}

// 13. Policy List
function renderPolicyList(policies) {
  const container = document.getElementById('policy-list');
  if (!container || !policies) return;
  container.innerHTML = '';

  policies.forEach(pol => {
    const item = document.createElement('div');
    item.className = 'policy-item';
    item.innerHTML = `
      <div class="policy-header">
        <span class="policy-date">${pol.DATE} [${pol.ADMINISTRATION}]</span>
        <span class="policy-type-tag">${pol.TYPE}</span>
      </div>
      <div class="policy-title">${pol.TITLE}</div>
      <div class="policy-desc">${pol.IMPACT_SUMMARY}</div>
    `;
    container.appendChild(item);
  });
}

// 14. General Event Listeners
function setupEventListeners() {
  document.getElementById('select-chart-region')?.addEventListener('change', function() {
    switchChartRegion(this.value);
  });

  document.getElementById('btn-toggle-sales')?.addEventListener('click', function() {
    this.classList.toggle('active');
    marketChart.setDatasetVisibility(0, this.classList.contains('active'));
    marketChart.update();
  });

  document.getElementById('btn-toggle-jeonse')?.addEventListener('click', function() {
    this.classList.toggle('active');
    marketChart.setDatasetVisibility(1, this.classList.contains('active'));
    marketChart.update();
  });

  document.getElementById('btn-toggle-wolse')?.addEventListener('click', function() {
    this.classList.toggle('active');
    marketChart.setDatasetVisibility(2, this.classList.contains('active'));
    marketChart.update();
  });

  document.getElementById('btn-toggle-rate')?.addEventListener('click', function() {
    this.classList.toggle('active');
    marketChart.setDatasetVisibility(3, this.classList.contains('active'));
    marketChart.update();
  });

  document.getElementById('btn-toggle-loan')?.addEventListener('click', function() {
    this.classList.toggle('active');
    marketChart.setDatasetVisibility(4, this.classList.contains('active'));
    marketChart.update();
  });

  document.getElementById('btn-toggle-kb-buyer')?.addEventListener('click', function() {
    this.classList.toggle('active');
    marketChart.setDatasetVisibility(5, this.classList.contains('active'));
    marketChart.update();
  });

  document.getElementById('btn-toggle-kb-lead')?.addEventListener('click', function() {
    this.classList.toggle('active');
    marketChart.setDatasetVisibility(6, this.classList.contains('active'));
    marketChart.update();
  });

  document.getElementById('btn-toggle-unsold')?.addEventListener('click', function() {
    this.classList.toggle('active');
    marketChart.setDatasetVisibility(7, this.classList.contains('active'));
    marketChart.update();
  });

  document.getElementById('btn-toggle-expert-pins')?.addEventListener('click', function() {
    this.classList.toggle('active');
    marketChart.setDatasetVisibility(8, this.classList.contains('active'));
    marketChart.update();
  });

  const filterBtns = document.querySelectorAll('#stance-filter-group .filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      filterBtns.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      currentFilter = this.dataset.filter;
      if (dashboardData) renderLeaderboard(dashboardData.experts);
    });
  });

  document.getElementById('expert-search-input')?.addEventListener('input', () => {
    if (dashboardData) renderLeaderboard(dashboardData.experts);
  });

  const nuanceBtns = document.querySelectorAll('#nuance-filter-group .filter-btn');
  nuanceBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      nuanceBtns.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      currentNuanceFilter = this.dataset.nuance;
      if (dashboardData) renderChronologicalStatements(dashboardData.all_chronological_statements);
    });
  });

  document.getElementById('statement-search-input')?.addEventListener('input', () => {
    if (dashboardData) renderChronologicalStatements(dashboardData.all_chronological_statements);
  });

  document.getElementById('matrix-search-input')?.addEventListener('input', () => {
    if (dashboardData) renderSituationMatrix(dashboardData.chronological_matrix);
  });

  const sortMap = {
    'th-sort-3m': 'HIT_RATE_3M',
    'th-sort-6m': 'HIT_RATE_6M',
    'th-sort-12m': 'HIT_RATE_12M',
    'th-sort-reg': 'REGIONAL_MATCH_RATE',
    'th-sort-macro': 'MACRO_MATCH_RATE',
    'th-sort-score': 'COMPOSITE_SCORE'
  };

  Object.keys(sortMap).forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('click', () => {
        const key = sortMap[id];
        if (currentSortKey === key) {
          sortAsc = !sortAsc;
        } else {
          currentSortKey = key;
          sortAsc = false;
        }
        renderLeaderboard(dashboardData.experts);
      });
    }
  });

  document.getElementById('modal-close-btn')?.addEventListener('click', () => {
    document.getElementById('expert-modal').classList.remove('open');
  });

  document.getElementById('expert-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'expert-modal') {
      document.getElementById('expert-modal').classList.remove('open');
    }
  });

  // Global Responsive Scale Up/Down & Zoom Handler
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      if (marketChart) marketChart.resize();
      if (expertHorizonChart) expertHorizonChart.resize();
      if (stanceHorizonChart) stanceHorizonChart.resize();
      if (expertRadarChart) expertRadarChart.resize();
    }, 150);
  });
}
