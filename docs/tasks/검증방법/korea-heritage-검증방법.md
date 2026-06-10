# korea-heritage (국가유산청 시대별 건축물) 검증방법

## 개요
국가유산청 Open API(키 불필요·CORS 허용)에서 **유적건조물**을 수집해 시대별로 보여주는 앱.
- 데이터: `apps/korea-heritage/scripts/harvest.mjs` → `apps/korea-heritage/data/heritage.json` (빌드타임 수집)
- 프론트: `apps/korea-heritage/index.html`(시대별 갤러리), `detail.html`(상세 + 이미지 갤러리)
- 웹 경로: `/korea-heritage`

## 1. 데이터셋 수집(선택 — 이미 생성되어 있으면 생략)

수집은 국가유산청 API를 호출하므로 네트워크가 필요합니다. 종목·상한은 환경변수로 조절합니다.

```bash
# mac/linux
node apps/korea-heritage/scripts/harvest.mjs

# 옵션 예: 국보+사적만, 상세호출 600건 상한
KINDS=11,13 MAX_DETAILS=600 node apps/korea-heritage/scripts/harvest.mjs
```

```powershell
# windows (PowerShell)
node apps\korea-heritage\scripts\harvest.mjs
```

검증 포인트: 콘솔 마지막에 `완료: ... 건축물 N건` 출력, `apps/korea-heritage/data/heritage.json` 생성.

## 2. 데이터셋 무결성 한줄 검사

```bash
# mac/linux — total 건수와 시대분포가 출력되면 정상
node -e "const d=require('./apps/korea-heritage/data/heritage.json'); console.log('total=',d.counts.total); console.log(d.counts.byEra); console.log('필수필드 누락:', d.items.filter(i=>!i.id||!i.name||!i.thumb||!i.era).length)"
```

```powershell
# windows
node -e "const d=require('./apps/korea-heritage/data/heritage.json'); console.log('total=',d.counts.total); console.log(d.counts.byEra)"
```

기대값: `total > 0`, `필수필드 누락: 0`, 여러 시대 버킷에 분포.

## 3. 로컬 서버 실행 후 화면 검증

```bash
# mac/linux — apps 디렉토리를 정적 서빙
cd apps && python3 -m http.server 4173
# 브라우저: http://localhost:4173/korea-heritage/
```

```powershell
# windows
cd apps; python -m http.server 4173
# 브라우저: http://localhost:4173/korea-heritage/
```

화면 검증 체크리스트:
- [ ] 허브(`http://localhost:4173/`)에 "우리나라 시대별 건축물" 카드가 보이고 클릭 시 이동
- [ ] 갤러리에 썸네일 카드가 그리드로 표시(이미지 로드됨, https)
- [ ] 상단 시대 칩(전체/조선/고려/…)을 누르면 해당 시대만 필터링되고 개수가 맞음
- [ ] 이름 검색창에 글자 입력 시 실시간 필터
- [ ] 카드 클릭 → 상세페이지에서 큰 이미지 + 시대/지정종목/분류/소재지/설명 표시
- [ ] 상세페이지 썸네일 스트립(이미지 API 실시간 호출) 클릭 시 메인 이미지 교체
- [ ] 좌표가 있는 항목은 "카카오맵에서 보기" 링크 노출

## 4. 콘솔 오류 없음 확인
브라우저 DevTools 콘솔에 빨간 오류(특히 mixed-content/CORS)가 없어야 함.
이미지 URL은 모두 `https://`로 정규화되어 mixed-content 차단이 없어야 함.
