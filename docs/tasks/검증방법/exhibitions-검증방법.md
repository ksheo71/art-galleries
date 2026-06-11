# exhibitions (전국 전시 · 장르별) 검증방법

## 개요
KCISA 문화포털 공연·전시 API로 **전국 미술관·박물관의 진행중·예정 전시**를 수집해 장르·지역·상태별로 보여주는 앱. **매일 야간 배치(맥미니 launchd)** 로 데이터를 갱신한다.
- 수집: `apps/exhibitions/scripts/harvest.mjs` (API_CCA_145) → `apps/exhibitions/data/exhibitions.json` (`.gitignore`)
- 배치: `scripts/exhibitions-batch.sh` + `deploy/launchd/com.art-galleries.exhibitions.plist` (새벽 04:10)
- 프론트: `apps/exhibitions/index.html` (장르 ∩ 지역 ∩ 상태 ∩ 검색, 카드 클릭 시 원문 링크아웃)
- 웹 경로: `/exhibitions` · 키: 운영 `.env` 의 `EXHIBITIONS_API_KEY`(전용키, 브라우저 비노출)

## 1. 수집(harvest) 검증

```bash
# mac/linux — 키를 넣고 직접 실행(진행중+예정 N건 출력, exhibitions.json 생성)
EXHIBITIONS_API_KEY=<발급키> node apps/exhibitions/scripts/harvest.mjs
```

검증 포인트: 콘솔에 `진행중+예정 N건`, `상태:{ongoing,upcoming}`, `장르:{...}` 출력, `apps/exhibitions/data/exhibitions.json` 생성.

```bash
# 무결성 한줄 검사
node -e "const d=require('./apps/exhibitions/data/exhibitions.json'); console.log('total',d.counts.total); console.log('byStatus',d.counts.byStatus); console.log('이미지',d.items.filter(i=>i.thumb).length,'/ http이미지',d.items.filter(i=>i.thumb&&!/^https:/.test(i.thumb)).length,'/ url없음',d.items.filter(i=>!i.url).length)"
```

기대값: `total>0`, http 이미지 0, url 없음 0(전부 링크아웃 가능), 종료된 전시(과거) 미포함.

## 2. 야간 배치(launchd) 검증

```bash
# 설치(맥미니, 운영 트리에 코드 배포된 뒤)
cp deploy/launchd/com.art-galleries.exhibitions.plist ~/Library/LaunchAgents/
launchctl unload ~/Library/LaunchAgents/com.art-galleries.exhibitions.plist 2>/dev/null
launchctl load   ~/Library/LaunchAgents/com.art-galleries.exhibitions.plist

# 즉시 1회 실행(시드/테스트)
launchctl start com.art-galleries.exhibitions
sleep 30
tail -5 /opt/stack/services/public/art-galleries.kr/www/exhibitions-batch.log
```

검증 포인트: 로그에 `완료`, 운영 트리 `apps/exhibitions/data/exhibitions.json` 갱신 시각이 최신. 등록 확인: `launchctl list | grep art-galleries.exhibitions`.

## 3. 로컬 화면 검증

```bash
cd apps && python3 -m http.server 4173   # http://localhost:4173/exhibitions/
```

체크리스트:
- [ ] 허브에 "전국 전시 장르별" 카드 → 클릭 이동
- [ ] 상태(전체/진행중/예정)·장르·지역 칩 3줄, 각 칩 동적 건수
- [ ] 교차 필터(예: 진행중 + 회화·드로잉 + 서울)로 좁혀지고 건수 일치
- [ ] 카드: 포스터(있으면)·상태/D-day 배지·장르·기관·지역·기간 표시
- [ ] **카드 클릭 시 새 탭으로 원문(기관) 페이지 이동**(포스터 재호스팅 아님)
- [ ] 검색(전시명·기관) 실시간 필터
- [ ] 콘솔 오류 없음(포스터 일부 404는 placeholder 로 대체되며 정상)

## 4. 운영 확인

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://art-galleries.kr/exhibitions
curl -s https://art-galleries.kr/exhibitions/data/exhibitions.json | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const d=JSON.parse(s);console.log('total',d.counts.total,'생성',d.generatedAt)})"
```
