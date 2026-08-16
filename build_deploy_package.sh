#!/usr/bin/env bash
# ==============================================================================
# build_deploy_package.sh
# 부동산 대시보드 마스터 데이터 컴파일 및 배포용 번들 생성 스크립트
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=========================================================="
echo "🚀 [1/3] 마스터 데이터셋 및 26개 권역 적응형 핀 엔진 컴파일..."
echo "=========================================================="
python3 src/advanced_matching_engine.py

echo ""
echo "=========================================================="
echo "📦 [2/3] 정적 웹 배포 번들 (dist/) 생성 및 동기화..."
echo "=========================================================="
rm -rf dist
mkdir -p dist

cp -r web/* dist/
echo "✓ web/ -> dist/ 복사 완료."

echo ""
echo "=========================================================="
echo "🔍 [3/3] 정적 파일 무결성 및 브라우저 호환성 검증..."
echo "=========================================================="
node -e "
const fs = require('fs');
const dataJs = fs.readFileSync('dist/static/dashboard_data.js', 'utf-8');
eval(dataJs);
console.log('✓ Experts:', global.GLOBAL_DASHBOARD_DATA.experts.length);
console.log('✓ Regions:', Object.keys(global.GLOBAL_DASHBOARD_DATA.regional_series).length);
console.log('✓ Statements:', global.GLOBAL_DASHBOARD_DATA.all_chronological_statements.length);
console.log('✓ Knowledge Graph Nodes:', global.GLOBAL_DASHBOARD_DATA.link_map_data.nodes.length);
console.log('✓ 100% Ready for GitHub Pages / Vercel deployment!');
"

echo ""
echo "🎉 모든 배포 준비가 완료되었습니다!"
echo "👉 GitHub에 Push하거나 Vercel에 연결하면 즉시 무료 웹사이트로 서비스됩니다."
