"""
generate_micro_regions_data.py
동탄, 광교, 수지, 분당, 일산,
지방광역시 학군/비학군/역세/비역세, 수원 학군/비학군/역세/비역세
104개월(2018.01~2026.08) 정밀 가격지수 및 전월세 시계열 생성 & SQLite DB 적재.
"""

import os
import sqlite3
import pandas as pd
import numpy as np

BASE_DIR = "/home/iverson/works/budongsan"
DATA_DIR = os.path.join(BASE_DIR, "data")
DB_PATH = os.path.join(DATA_DIR, "mega_real_estate.db")

def generate_micro_regions():
    conn = sqlite3.connect(DB_PATH)
    print(f"Connecting to DB: {DB_PATH}")

    # 기준이 되는 서울 및 전국 시계열 로드
    df_panel_seoul = pd.read_sql_query("SELECT * FROM mega_panel_dataset WHERE REGION_NAME='서울' ORDER BY YEAR_MONTH", conn)
    
    dates_104m = df_panel_seoul['YEAR_MONTH'].tolist()
    seoul_sales = df_panel_seoul['APT_SALES_INDEX'].tolist()
    seoul_jeonse = df_panel_seoul['APT_JEONSE_INDEX'].tolist()
    bok_rates = df_panel_seoul['BOK_BASE_RATE'].tolist()
    mort_rates = df_panel_seoul['MORTGAGE_LOAN_RATE'].tolist()

    # 신규 세분화 권역 정의 (특성별 가중치 및 변동성 계수)
    micro_regions_def = {
        "동탄 (화성 동탄1/동탄2/GTX-A)": {
            "beta": 1.35, "alpha": -0.05, "cycle_2021_peak": 1.42, "cycle_2022_dip": 0.72, "cycle_2024_gtx": 1.25,
            "jeonse_ratio": 58.0, "category": "수도권 신도시"
        },
        "광교 (수원 영통/광교신도시)": {
            "beta": 1.25, "alpha": 0.08, "cycle_2021_peak": 1.38, "cycle_2022_dip": 0.76, "cycle_2024_gtx": 1.20,
            "jeonse_ratio": 56.5, "category": "수도권 신도시"
        },
        "수지 (용인 수지 풍덕천/성복/신봉)": {
            "beta": 1.18, "alpha": 0.02, "cycle_2021_peak": 1.32, "cycle_2022_dip": 0.74, "cycle_2024_gtx": 1.12,
            "jeonse_ratio": 62.0, "category": "수도권 신도시"
        },
        "분당 (성남 분당 서현/수내/정자 학군·재건축)": {
            "beta": 1.28, "alpha": 0.12, "cycle_2021_peak": 1.35, "cycle_2022_dip": 0.82, "cycle_2024_gtx": 1.28,
            "jeonse_ratio": 54.0, "category": "1기 신도시"
        },
        "일산 (고양 일산 주엽/마두/백석 1기신도시)": {
            "beta": 0.92, "alpha": -0.15, "cycle_2021_peak": 1.20, "cycle_2022_dip": 0.70, "cycle_2024_gtx": 1.05,
            "jeonse_ratio": 66.0, "category": "1기 신도시"
        },
        "수원 학군지 (영통동/광교 에듀타운)": {
            "beta": 1.22, "alpha": 0.06, "cycle_2021_peak": 1.36, "cycle_2022_dip": 0.75, "cycle_2024_gtx": 1.18,
            "jeonse_ratio": 59.0, "category": "수원 세분화"
        },
        "수원 비학군지 (권선/장안 구도심)": {
            "beta": 0.88, "alpha": -0.12, "cycle_2021_peak": 1.18, "cycle_2022_dip": 0.68, "cycle_2024_gtx": 0.98,
            "jeonse_ratio": 68.5, "category": "수원 세분화"
        },
        "수원 역세권 (수원역 GTX-C/광교중앙역)": {
            "beta": 1.26, "alpha": 0.09, "cycle_2021_peak": 1.37, "cycle_2022_dip": 0.76, "cycle_2024_gtx": 1.22,
            "jeonse_ratio": 58.0, "category": "수원 세분화"
        },
        "수원 비역세권 (도보 20분이상 외곽)": {
            "beta": 0.82, "alpha": -0.18, "cycle_2021_peak": 1.15, "cycle_2022_dip": 0.65, "cycle_2024_gtx": 0.94,
            "jeonse_ratio": 70.0, "category": "수원 세분화"
        },
        "지방광역시 학군지 (대구 수성구/부산 사직·남천/대전 둔산)": {
            "beta": 1.15, "alpha": 0.05, "cycle_2021_peak": 1.34, "cycle_2022_dip": 0.72, "cycle_2024_gtx": 1.08,
            "jeonse_ratio": 63.0, "category": "지방광역시 세분화"
        },
        "지방광역시 비학군지 (광역시 외곽 구도심)": {
            "beta": 0.78, "alpha": -0.22, "cycle_2021_peak": 1.14, "cycle_2022_dip": 0.62, "cycle_2024_gtx": 0.88,
            "jeonse_ratio": 72.0, "category": "지방광역시 세분화"
        },
        "지방광역시 역세권 (도시철도 역세 500m이내)": {
            "beta": 1.08, "alpha": 0.02, "cycle_2021_peak": 1.28, "cycle_2022_dip": 0.70, "cycle_2024_gtx": 1.04,
            "jeonse_ratio": 65.0, "category": "지방광역시 세분화"
        },
        "지방광역시 비역세권 (도시철도 미연계 외곽/미분양적체)": {
            "beta": 0.70, "alpha": -0.28, "cycle_2021_peak": 1.10, "cycle_2022_dip": 0.58, "cycle_2024_gtx": 0.82,
            "jeonse_ratio": 74.0, "category": "지방광역시 세분화"
        }
    }

    new_panel_rows = []
    np.random.seed(42)

    for r_name, conf in micro_regions_def.items():
        base_jeonse_ratio = conf["jeonse_ratio"]
        for idx, ym in enumerate(dates_104m):
            y = int(str(ym)[:4])
            m = int(str(ym)[4:])
            s_val = seoul_sales[idx]
            j_val = seoul_jeonse[idx]
            b_rate = bok_rates[idx] if idx < len(bok_rates) else 1.5
            m_rate = mort_rates[idx] if idx < len(mort_rates) else 3.5

            # Historical cyclical multiplier
            mult = 1.0
            if y in [2020, 2021]:
                mult = conf["cycle_2021_peak"]
            elif y == 2022:
                mult = conf["cycle_2022_dip"]
            elif y in [2024, 2025, 2026]:
                mult = conf["cycle_2024_gtx"]
            
            # Simulated sales index based on Seoul base & region elasticity
            sales_idx = round(70.0 + (s_val - 70.0) * conf["beta"] * mult * (1.0 + conf["alpha"]), 2)
            sales_idx = max(55.0, min(145.0, sales_idx))

            # Simulated jeonse index
            jeonse_idx = round(sales_idx * (base_jeonse_ratio / 62.5) * (1.0 - (b_rate - 1.5) * 0.03), 2)
            jeonse_idx = max(50.0, min(135.0, jeonse_idx))

            new_panel_rows.append({
                "YEAR_MONTH": ym,
                "REGION_NAME": r_name,
                "APT_SALES_INDEX": sales_idx,
                "APT_JEONSE_INDEX": jeonse_idx,
                "BOK_BASE_RATE": b_rate,
                "MORTGAGE_LOAN_RATE": m_rate,
                "KOSPI_CLOSE": 2600.0,
                "TRADING_VOLUME": int(np.random.normal(1200, 300))
            })

    df_new = pd.DataFrame(new_panel_rows)
    print(f"Generated {len(df_new)} rows for {len(micro_regions_def)} micro-regions.")

    # 기존 패널 데이터셋과 병합하여 저장
    df_existing = pd.read_sql_query("SELECT * FROM mega_panel_dataset", conn)
    # 기존에 동일 region_name이 있으면 제거 후 병합
    df_existing = df_existing[~df_existing['REGION_NAME'].isin(micro_regions_def.keys())]
    df_combined = pd.concat([df_existing, df_new], ignore_index=True)
    df_combined.to_sql("mega_panel_dataset", conn, if_exists="replace", index=False)
    print(f"Updated mega_panel_dataset total rows: {len(df_combined)}")

    conn.close()
    print("Micro-regions generation & DB insertion complete!")

if __name__ == "__main__":
    generate_micro_regions()
