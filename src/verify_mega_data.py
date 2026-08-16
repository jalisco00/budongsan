"""
verify_mega_data.py
메가 데이터베이스(mega_real_estate.db)의 무결성 검증, 테이블별 레코드 수,
20인 전문가별 예측 적중률 1차 통계, 거시 지표 통계를 출력합니다.
"""

import sqlite3
import pandas as pd

DB_PATH = "/home/iverson/works/real_estate_eval/data/mega_real_estate.db"

def verify():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    print("================================================================================")
    print("           [메가 부동산 DB (mega_real_estate.db) 구축 및 무결성 검증]           ")
    print("================================================================================")

    # 1. 테이블 목록 및 레코드 카운트
    cur.execute("SELECT name, type FROM sqlite_master WHERE type IN ('table', 'view') ORDER BY type, name;")
    items = cur.fetchall()
    
    print("\n--- 1. 데이터베이스 테이블 및 뷰 현황 ---")
    for name, itype in items:
        if itype == "table":
            cnt = cur.execute(f"SELECT COUNT(*) FROM {name}").fetchone()[0]
            print(f"  [Table] {name:<30} : {cnt:>8,} 건")
        else:
            print(f"  [View ] {name:<30} : (Analytical View)")

    # 2. 20인 전문가 목록 및 프로필 요약
    print("\n--- 2. 유튜브 부동산 전문가 20인 리스트업 및 분류 ---")
    df_exp = pd.read_sql_query("SELECT EXPERT_ID, NAME, ALIAS, STANCE_GROUP, SUBSCRIBERS_EST, CHANNEL_NAME FROM x2_experts_metadata ORDER BY EXPERT_ID", conn)
    for _, r in df_exp.iterrows():
        print(f"  {r['EXPERT_ID']} | {r['NAME']}({r['ALIAS']}) | {r['STANCE_GROUP']:<35} | 구독자 {r['SUBSCRIBERS_EST']:>7,}명 | {r['CHANNEL_NAME']}")

    # 3. 전문가 예측 평가 1차 요약 통계
    print("\n--- 3. 전문가 예측 적중률 1차 기초 통계 (1년 시계 기준) ---")
    df_eval = pd.read_sql_query("""
    SELECT 
        EXPERT_NAME,
        STANCE_GROUP,
        COUNT(*) AS TOTAL_PREDICTIONS,
        ROUND(AVG(PREDICTION_ACCURACY_SCORE), 1) AS AVG_ACCURACY_SCORE,
        SUM(ACCURACY_HIT_12M) AS HITS_12M,
        ROUND(SUM(ACCURACY_HIT_12M) * 100.0 / COUNT(*), 1) AS HIT_RATE_12M_PCT
    FROM eval_predictions_scored
    GROUP BY EXPERT_NAME, STANCE_GROUP
    ORDER BY AVG_ACCURACY_SCORE DESC;
    """, conn)
    print(df_eval.to_string(index=False))

    # 4. 거시 환경 (금리 / KOSPI / 서울 아파트 지수) 주요 변곡점 요약
    print("\n--- 4. 시장 주요 변곡점 (금리 / 코스피 / 서울 아파트 지수) ---")
    df_macro = pd.read_sql_query("""
    SELECT 
        m.YEAR_MONTH,
        m.BOK_BASE_RATE AS BASE_RATE,
        m.MORTGAGE_LOAN_RATE AS MORTGAGE_RATE,
        m.KOSPI_CLOSE,
        p.APT_SALES_INDEX AS SEOUL_APT_INDEX,
        p.APT_JEONSE_INDEX AS SEOUL_JEONSE_INDEX
    FROM view_macro_market_monthly m
    LEFT JOIN mega_panel_dataset p ON m.YEAR_MONTH = p.YEAR_MONTH AND p.REGION_NAME = '서울'
    WHERE m.YEAR_MONTH IN ('201801', '201912', '202005', '202108', '202212', '202306', '202406', '202506', '202606')
    ORDER BY m.YEAR_MONTH;
    """, conn)
    print(df_macro.to_string(index=False))

    conn.close()

if __name__ == "__main__":
    verify()
