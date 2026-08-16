# Graph Report - /home/iverson/works/budongsan  (2026-08-16)

## Corpus Check
- 14 files · ~215,305 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 101 nodes · 110 edges · 14 communities (9 shown, 5 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Central DB & Benchmark Indicators
- Policy Shock & Regional Real Estate Series
- 20 YouTube Experts & Nuance Evaluation
- Interactive Web Dashboard & Link Map
- Data Collectors & Extraction Pipeline
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13

## God Nodes (most connected - your core abstractions)
1. `initDashboard()` - 9 edges
2. `main()` - 5 edges
3. `RealEstateDashboardHandler` - 4 edges
4. `initLinkMap()` - 4 edges
5. `renderLeaderboard()` - 4 edges
6. `setupEventListeners()` - 4 edges
7. `score_predictions_and_build_dashboard_json()` - 3 edges
8. `fetch_month_data()` - 3 edges
9. `collect_table_all_months()` - 3 edges
10. `build_station_and_complex_metrics()` - 3 edges

## Surprising Connections (you probably didn't know these)
- `Korea Real Estate Board R-ONE Real Transactions` --MEASURES--> `강남3구 핵심지`  [EXTRACTED]
   →   _Bridges community 7 → community 2_

## Import Cycles
- None detected.

## Communities (14 total, 5 thin omitted)

### Community 0 - "Central DB & Benchmark Indicators"
Cohesion: 0.10
Nodes (21): SQLite Database (mega_real_estate.db 28.3MB), 김학렬 (빠숑) - 스마트튜브 [스튜TV], 이상우 (이상우 대표) - 이상우의 부동산 라이프 / 인베이드투자자문, 정태익 (부읽남) - 부읽남TV_내집마련부터건물주까지, 너나위 (김민규) (너나위) - 월급쟁이부자들TV, 강승우 (삼토시) - 삼토시의 부동산노트 (삼프로TV 고정), 박원갑 (박원갑 수석위원) - KB부동산 / 삼프로TV / 한국경제TV, 고종완 (고종완 원장) - 한국자산관리연구원 / 고종완TV (+13 more)

### Community 1 - "Policy Shock & Regional Real Estate Series"
Cohesion: 0.25
Nodes (15): highlightNodeNetwork(), initDashboard(), initLinkMap(), initRadarChart(), initSimulator(), initSituationChart(), initTabs(), openExpertModal() (+7 more)

### Community 2 - "20 YouTube Experts & Nuance Evaluation"
Cohesion: 0.15
Nodes (13): 수도권 주택공급 확대 및 투기지역 추가 지정 (2018-08-27), 9.13 주택시장 안정대책 (2018-09-13), 2차 수도권 주택공급 계획 및 광역교통망 개선방안 (3기 신도시 1차) (2018-12-19), 3차 신규택지 추진계획 (3기 신도시 2차) (2019-05-07), 민간택지 분양가 상한제 적용지역 지정 (2019-11-06), 12.16 주택시장 안정화 방안 (2019-12-16), 2.20 주택시장 안정 관리방안 (2020-02-20), 6.17 주택시장 안정을 위한 관리방안 (2020-06-17) (+5 more)

### Community 3 - "Interactive Web Dashboard & Link Map"
Cohesion: 0.39
Nodes (7): build_views_and_analytics(), init_sqlite_db(), load_all_csvs(), main(), build_mega_db.py Y 데이터, X1 거시 데이터, X2 전문가 발언 DB를 SQLite(mega_real_estate.db)로…, 전문가별 정밀 스코어링 및 대시보드용 통합 JSON 번들 생성, score_predictions_and_build_dashboard_json()

### Community 4 - "Data Collectors & Extraction Pipeline"
Cohesion: 0.25
Nodes (7): build_interest_rates_database(), build_kospi_database(), build_policies_database(), collect_x1_data.py 부동산 예측 평가를 위한 X1 거시 환경 변수 데이터베이스 구축: 1. 2018.01 ~ 2026.08…, 2018.01 ~ 2026.08 대한민국 주요 부동산 정책 데이터베이스, 2018.01 ~ 2026.08 한국은행 기준금리 및 주택담보대출, COFIX 시계열 DB, 2018.01 ~ 2026.08 KOSPI 지수 월별 시계열 DB 수집 및 정제

### Community 5 - "Community 5"
Cohesion: 0.36
Nodes (7): build_station_and_complex_metrics(), collect_table_all_months(), fetch_month_data(), main(), collect_y_data.py (최적화 버전) 한국부동산원 R-ONE Open API를 활용하여 2018.01 ~ 2026.08 (총…, 역세권 프리미엄 및 대단지 세대수 효과 지표 시계열 생성, 특정 통계표의 특정 월 데이터 수집 (최대 1,000건)

### Community 6 - "Community 6"
Cohesion: 0.29
Nodes (3): server.py 부동산 전문가 예측 평가 플랫폼 실시간 모니터링 웹서버 및 API 서비스 (ThreadingHTTPServer) 포트:…, RealEstateDashboardHandler, SimpleHTTPRequestHandler

### Community 7 - "Community 7"
Cohesion: 0.40
Nodes (5): Korea Real Estate Board R-ONE Real Transactions, 1기 신도시 분당, 노도강 동북외곽, 마용성 도심권, 지방 5대 광역시

### Community 8 - "Community 8"
Cohesion: 0.50
Nodes (3): generate_comprehensive_predictions_db(), collect_x2_data.py (확장판) 20인 유튜브 부동산 전문가의 2018.01 ~ 2026.08 전 기간 (104개월) 100여 개…, 20인 전문가 전원의 2018~2026년 6개 국면별 상세 예측 100건 생성

## Knowledge Gaps
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Should `Central DB & Benchmark Indicators` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._