# korea-artifacts (국가유산청 시대·유형별 유물) 검증방법

## 개요
국가유산청 Open API(키 불필요·CORS 허용)에서 **유물(동산문화유산: 도자기·조각·회화·금속공예 등, gcodeName="유물")** 을 수집해 **시대 × 유형** 2축으로 보여주는 앱. `korea-heritage`(건조물)의 자매 앱.
- 데이터: `apps/korea-artifacts/scripts/harvest.mjs` → `apps/korea-artifacts/data/artifacts.json` (빌드타임 수집)
- 프론트: `apps/korea-artifacts/index.html`(시대·유형 갤러리), `detail.html`(상세 + 이미지 갤러리)
- 웹 경로: `/korea-artifacts`

## 1. 데이터셋 수집(선택 — 이미 생성되어 있으면 생략)

수집은 국가유산청 API를 호출하므로 네트워크가 필요합니다. 종목·상한은 환경변수로 조절합니다.
유물은 국보·보물에 가장 많아 기본값이 `KINDS=11,12`, `MAX_DETAILS=4000` 입니다(전체 ~십수 분).

```bash
# mac/linux — 전체 수집(국보+보물)
node apps/korea-artifacts/scripts/harvest.mjs

# 옵션 예: 국보만 빠르게(검증용)
KINDS=11 DELAY_MS=40 node apps/korea-artifacts/scripts/harvest.mjs
```

```powershell
# windows (PowerShell)
node apps\korea-artifacts\scripts\harvest.mjs
```

검증 포인트: 콘솔 마지막에 `완료: ... 유물 N건`, `시대분포:`, `유형분포:` 출력, `apps/korea-artifacts/data/artifacts.json` 생성.

## 2. 데이터셋 무결성 한줄 검사

```bash
# mac/linux — total/시대/유형 분포와 필수필드 누락 0 이면 정상
node -e "const d=require('./apps/korea-artifacts/data/artifacts.json'); console.log('total=',d.counts.total); console.log('byEra',d.counts.byEra); console.log('byType',d.counts.byType); console.log('필수필드 누락:', d.items.filter(i=>!i.id||!i.name||!i.thumb||!i.era||!i.type).length)"
```

```powershell
# windows
node -e "const d=require('./apps/korea-artifacts/data/artifacts.json'); console.log('total=',d.counts.total); console.log(d.counts.byType)"
```

기대값: `total > 0`, `필수필드 누락: 0`, 여러 시대·유형 버킷에 분포(도자기·조각·회화·금속공예 모두 1건 이상).

## 3. 로컬 서버 실행 후 화면 검증

```bash
# mac/linux — apps 디렉토리를 정적 서빙
cd apps && python3 -m http.server 4173
# 브라우저: http://localhost:4173/korea-artifacts/
```

```powershell
# windows
cd apps; python -m http.server 4173
# 브라우저: http://localhost:4173/korea-artifacts/
```

화면 검증 체크리스트:
- [ ] 허브(`http://localhost:4173/`)에 "우리나라 시대별 유물" 카드가 보이고 클릭 시 이동
- [ ] 갤러리에 썸네일 카드가 그리드로 표시(이미지 로드됨, https), 카드마다 시대·유형·종목 배지
- [ ] **시대 칩 줄**(전체/삼국/고려/조선/…)과 **유형 칩 줄**(도자기·토기/조각·조형/회화·서화/금속·공예/기타)이 각각 표시
- [ ] 시대 ∩ 유형 **교차 필터**: 예) "고려" + "도자기·토기" 선택 시 고려 청자만 남고, 칩 건수가 다른 축 조건을 반영해 줄어듦
- [ ] 이름 검색창에 글자 입력 시 실시간 필터(시대·유형 선택과 AND 결합)
- [ ] 카드 클릭 → 상세페이지에서 큰 이미지 + 시대/지정종목/분류/소재지/설명 표시
- [ ] 상세페이지 썸네일 스트립(이미지 API 실시간 호출) 클릭 시 메인 이미지 교체
- [ ] 좌표가 있는 항목은 "카카오맵에서 보기" 링크 노출

## 4. 콘솔 오류 없음 확인
브라우저 DevTools 콘솔에 빨간 오류(특히 mixed-content/CORS)가 없어야 함.
이미지 URL은 모두 `https://`로 정규화되어 mixed-content 차단이 없어야 함.
