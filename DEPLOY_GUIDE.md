# 🚀 부동산 인터랙티브 대시보드 1분 무료 웹 배포 & 블로그 연동 완벽 가이드

이 프로젝트는 외부 서버나 백엔드 DB 설치 없이 **GitHub Pages** 또는 **Vercel**을 통해 **100% 무료로 평생 전 세계에 웹 서비스**할 수 있도록 최적화되어 있습니다.

---

## 📌 방법 1: GitHub Pages로 1분 만에 무료 배포하기 (가장 추천)

이미 저장소에 `.github/workflows/deploy.yml` 자동 배포 액션이 세팅되어 있어 **Push만 하면 즉시 배포**됩니다.

### 1단계: GitHub에 저장소(Repository) 생성 & Push
```bash
# 1. 프로젝트 폴더로 이동
cd /home/iverson/works/budongsan

# 2. Git 초기화 및 커밋
git init
git add .
git commit -m "Deploy interactive real estate dashboard"

# 3. GitHub에서 만든 새 저장소(예: budongsan) 연결 후 Push
git remote add origin https://github.com/내아이디/budongsan.git
git branch -M main
git push -u origin main
```

### 2단계: GitHub 저장소 설정(Settings)에서 Pages 활성화
1. GitHub 저장소 페이지의 상단 **[Settings]** 탭 클릭
2. 좌측 메뉴에서 **[Pages]** 클릭
3. **Build and deployment** 섹션의 **Source** 드롭다운에서 **`GitHub Actions`** 선택
4. 약 1분 후 `https://내아이디.github.io/budongsan` 주소로 즉시 대시보드가 오픈됩니다! 🎉

---

## 📌 방법 2: Vercel로 초간단 배포하기 (가장 빠른 속도)

이미 `vercel.json` 설정 파일이 준비되어 있습니다.

1. **[Vercel 공식 웹사이트](https://vercel.com)** 에 접속하여 로그인 (GitHub 계정으로 로그인 추천)
2. **[Add New...]** ➡️ **[Project]** 클릭
3. 방금 Push한 `budongsan` GitHub 저장소 선택 후 **[Deploy]** 버튼 클릭
4. 완료 즉시 `https://budongsan.vercel.app` 과 같은 무료 독립 URL이 발급됩니다!

---

## ✍️ 방법 3: 네이버 블로그 & 티스토리 연동 마케팅 가이드

### 1. 🟢 네이버 블로그 포스팅 템플릿
* 네이버 블로그는 JS 실행이 제한되므로, **차트 캡처 이미지 + 요약 글**로 호기심을 유발하고 대시보드 링크를 연결합니다.

```markdown
[포스팅 제목 예시]
2018~2026 부동산 전문가 20인 적중률 전수검사 결과 대공개 (동탄, 분당, 광교 26개 권역 총정리)

[본문 내용]
- 2018년부터 2026년까지 주요 부동산 전문가 20인의 120개 유튜브 영상 발언을 전수 분석한 인터랙티브 대시보드를 공개합니다.
- (대시보드에서 캡처한 3M/6M/12M 적중률 차트 이미지 첨부)
- (동탄 GTX-A 및 분당 재건축 시계열 차트 이미지 첨부)

[하단 유입 버튼/링크]
👇 26개 권역별 실시간 가격 추이 및 전문가 발언 핀 직접 체험하기
🔗 https://내아이디.github.io/budongsan
```

### 2. 🟠 티스토리(Tistory) 글 본문 직접 임베딩
* 티스토리 글쓰기 화면 우측 상단 **[기본모드] ➡️ [HTML]** 로 변경 후 아래 코드를 삽입하면 글 안에 대시보드가 그대로 뜹니다:

```html
<div style="position: relative; width: 100%; height: 900px; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.15); margin: 20px 0;">
  <iframe 
    src="https://내아이디.github.io/budongsan" 
    width="100%" 
    height="100%" 
    style="border: none;"
    title="부동산 전문가 예측 인터랙티브 관제 대시보드">
  </iframe>
</div>
```

---

## 📂 파일 구성 안내
* `web/` & `dist/`: 배포 대상 정적 웹 파일 (HTML/CSS/JS/데이터셋)
* `.github/workflows/deploy.yml`: GitHub Pages 자동 빌드/배포 스크립트
* `vercel.json`: Vercel 배포 라우팅 설정
* `build_deploy_package.sh`: 마스터 데이터 재컴파일 및 정적 번들 빌드 스크립트
