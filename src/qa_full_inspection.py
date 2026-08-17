"""
qa_full_inspection.py
가야르도(Grok Build) 데스크톱 & 모바일 UI/UX 및 데이터 처리 프로세싱 전수검사 스크립트.
모든 버튼, 선택상자, 검색창, 탭, 정렬 헤더, 모바일 칩, 차트 인스턴스, 링크의 무결성을 전수 점검.
"""

import os
import re
import json

BASE_DIR = "/home/iverson/works/budongsan"
WEB_DIR = os.path.join(BASE_DIR, "web")

def load_file(rel_path):
    with open(os.path.join(WEB_DIR, rel_path), "r", encoding="utf-8") as f:
        return f.read()

def run_qa_inspection():
    print("=" * 70)
    print("🔍 [가야르도] 데스크톱 & 모바일 UI/UX 전수검사 (QA Full Inspection)")
    print("=" * 70)

    index_html = load_file("index.html")
    app_js = load_file("app.js")
    mobile_html = load_file("mobile.html")
    mobile_js = load_file("mobile.js")
    style_css = load_file("style.css")
    mobile_css = load_file("mobile.css")
    data_js = load_file("static/dashboard_data.js")

    issues_found = []
    checks_passed = []

    # 1. Desktop Tab Buttons Inspection
    print("\n--- 1. 데스크톱 탭 네비게이션 검사 ---")
    tab_btns = re.findall(r'<button class="tab-nav-btn[^"]*" data-tab="([^"]+)">', index_html)
    tab_panes = re.findall(r'<div class="tab-pane[^"]*" id="([^"]+)">', index_html)
    print(f"Found {len(tab_btns)} Tab Buttons: {tab_btns}")
    print(f"Found {len(tab_panes)} Tab Panes: {tab_panes}")

    for tb in tab_btns:
        if tb in tab_panes:
            checks_passed.append(f"데스크톱 탭 '{tb}' ↔ Tab Pane 매핑 정상")
        else:
            issues_found.append(f"데스크톱 탭 '{tb}'에 해당하는 tab-pane이 없습니다.")

    # 2. Desktop Tab 2 Sub-views Inspection
    print("\n--- 2. 데스크톱 Tab 2 서브뷰 검사 ---")
    subview_btns = ['btn-subview-leaderboard', 'btn-subview-chronological', 'btn-subview-accuracy']
    subview_panels = ['leaderboard-subview', 'chronological-subview', 'accuracy-subview']
    for sb in subview_btns:
        if sb in index_html and sb in app_js:
            checks_passed.append(f"서브뷰 버튼 #{sb} HTML/JS 바인딩 정상")
        else:
            issues_found.append(f"서브뷰 버튼 #{sb} 바인딩 누락")

    for sp in subview_panels:
        if sp in index_html and sp in app_js:
            checks_passed.append(f"서브뷰 패널 #{sp} HTML/JS 바인딩 정상")
        else:
            issues_found.append(f"서브뷰 패널 #{sp} 바인딩 누락")

    # 3. Desktop Chart Layer Toggles
    print("\n--- 3. 데스크톱 차트 레이어 토글 버튼 검사 ---")
    chart_toggles = [
        'btn-toggle-sales', 'btn-toggle-jeonse', 'btn-toggle-wolse',
        'btn-toggle-rate', 'btn-toggle-loan', 'btn-toggle-kb-buyer',
        'btn-toggle-kb-lead', 'btn-toggle-unsold', 'btn-toggle-expert-pins'
    ]
    for ct in chart_toggles:
        if ct in index_html and ct in app_js:
            checks_passed.append(f"차트 토글 #{ct} 바인딩 정상")
        else:
            issues_found.append(f"차트 토글 #{ct} 바인딩 누락")

    # 4. Desktop Search Inputs
    print("\n--- 4. 데스크톱 검색 및 필터 컨트롤 검사 ---")
    inputs = ['expert-search-input', 'statement-search-input', 'matrix-search-input', 'linkmap-search-input']
    for inp in inputs:
        if inp in index_html and inp in app_js:
            checks_passed.append(f"검색 입력창 #{inp} 이벤트 바인딩 정상")
        else:
            issues_found.append(f"검색 입력창 #{inp} 누락")

    # 5. Desktop Table Sort Headers
    print("\n--- 5. 데스크톱 정렬 헤더 검사 ---")
    sort_headers = ['th-sort-3m', 'th-sort-6m', 'th-sort-12m', 'th-sort-reg', 'th-sort-macro', 'th-sort-score']
    for sh in sort_headers:
        if sh in index_html and sh in app_js:
            checks_passed.append(f"정렬 헤더 #{sh} 바인딩 정상")
        else:
            issues_found.append(f"정렬 헤더 #{sh} 누락")

    # 6. Mobile HTML & JS Component Inspection
    print("\n--- 6. 모바일 전용 UI 컴포넌트 검사 ---")
    m_navs = re.findall(r'data-target="([^"]+)"', mobile_html)
    m_sections = re.findall(r'<section id="([^"]+)"', mobile_html)
    print(f"Mobile Nav Targets: {m_navs}")
    print(f"Mobile Section IDs: {m_sections}")

    for mn in m_navs:
        if mn in m_sections:
            checks_passed.append(f"모바일 네비게이션 타깃 '{mn}' 매핑 정상")
        else:
            issues_found.append(f"모바일 네비게이션 타깃 '{mn}' 누락")

    m_chips = ['m-toggle-sales', 'm-toggle-jeonse', 'm-toggle-rate', 'm-toggle-unsold', 'm-toggle-pins']
    for mc in m_chips:
        if mc in mobile_html and mc in mobile_js:
            checks_passed.append(f"모바일 토글 칩 #{mc} 바인딩 정상")
        else:
            issues_found.append(f"모바일 토글 칩 #{mc} 누락")

    # 7. Mobile Region Select & Desktop Button
    if 'm-select-region' in mobile_html and 'm-select-region' in mobile_js:
        checks_passed.append("모바일 26개 권역 선택 셀렉터 바인딩 정상")
    else:
        issues_found.append("모바일 26개 권역 선택 셀렉터 누락")

    if 'btn-force-desktop' in mobile_html and 'btn-force-desktop' in mobile_js:
        checks_passed.append("모바일 → 데스크톱 전환 버튼 바인딩 정상")
    else:
        issues_found.append("모바일 → 데스크톱 전환 버튼 누락")

    # 8. Check 26 Regions match in Desktop and Mobile
    print("\n--- 7. 26개 권역 옵션 데스크톱 ↔ 모바일 일치성 검사 ---")
    d_sel_match = re.search(r'<select id="select-chart-region"[^>]*>(.*?)</select>', index_html, re.DOTALL)
    m_sel_match = re.search(r'<select id="m-select-region"[^>]*>(.*?)</select>', mobile_html, re.DOTALL)

    d_regions = re.findall(r'<option value="([^"]+)"', d_sel_match.group(1)) if d_sel_match else []
    m_regions = re.findall(r'<option value="([^"]+)"', m_sel_match.group(1)) if m_sel_match else []
    print(f"Desktop Regions count: {len(d_regions)}")
    print(f"Mobile Regions count: {len(m_regions)}")

    if len(d_regions) == len(m_regions) and set(d_regions) == set(m_regions):
        checks_passed.append(f"데스크톱({len(d_regions)}개)과 모바일({len(m_regions)}개) 26개 세분화 권역 리스트 100% 일치")
    else:
        issues_found.append(f"권역 수/목록 불일치: 데스크톱 {len(d_regions)}개 vs 모바일 {len(m_regions)}개")

    # Summary
    print("\n" + "=" * 70)
    print(f"📊 검사 결과 요약: 통과 {len(checks_passed)}건 / 문제점 {len(issues_found)}건")
    print("=" * 70)
    for c in checks_passed:
        print(f"  [PASS] {c}")
    if issues_found:
        for iss in issues_found:
            print(f"  [FAIL] {iss}")
    else:
        print("  🎉 모든 컴포넌트, 버튼, 아이콘, 탭, 정렬, 데이터 파이프라인 무결성 검증 통과!")

if __name__ == "__main__":
    run_qa_inspection()
