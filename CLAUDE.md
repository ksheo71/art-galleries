# 프로젝트명
Art Gallery

## 프로젝트 개요
- 미술품에 대한 정보를 제공해주는 API를 통해 해당 작품들을 감상할 수 있게 해주는 서비스

## 프로젝트 구조
- /docs/references: 요구사항을 작성하기 위한 참조파일
- /docs/requirements: 분석된 요구사항을 저장한다
- /docs/specs: 요구사항을 바탕으로 결정된 spec을 정리해서 저장한다
- /docs/wireframe: 요구사항을 바탕으로 화면설계서를 작성해서 저장
- /apps: 구현단계에서 생성되는 것들
- /apps/index.html : 각 박물관으로 들어가는 허브 랜딩 페이지 (루트 `/` 에서 서빙)
- /apps 하위에는 API제공해주는 사이트 단위로 구성
  예: The Art Institute of Chicago 에서 제공해주는 API를 통해 보여주는 사이트는 /apps/chicago-museum 이런 식으로
  웹상에서는 http://domain/chicago-museum 이렇게 보이게
- 시작은 The Art Institute of Chicago 로 하지만 점점 더 추가해 나갈 계획. 현재 구현된 앱: chicago-museum, metropolitan-museum, cleveland-museum, vna-east-museum, yale-museum, harvard-museum, korea-heritage, korea-artifacts.
- `korea-heritage` 는 박물관 소장품이 아니라 국가유산청(khs.go.kr) Open API 의 **시대별 건축물(유적건조물)** 을 보여주는 앱이다. API 가 시대/분류/이미지를 상세조회에만 주고 목록 필터가 약해, 빌드타임 수집 스크립트(`scripts/harvest.mjs`)로 `data/heritage.json` 을 만들고 프론트는 그 JSON 을 시대별로 렌더링한다(키·프록시 불필요, CORS 허용). 개별 이미지 다건은 상세페이지에서 이미지 API 를 실시간 호출.
- `korea-artifacts` 는 `korea-heritage` 의 자매 앱으로, 같은 국가유산청 API 의 **유물(동산문화유산: 도자기·조각·회화·금속공예 등, gcodeName="유물")** 을 보여준다. 수집 방식은 동일하나(`scripts/harvest.mjs` → `data/artifacts.json`) 두 가지가 다르다: ① 필터를 `gcodeName="유물"` 로 잡고(건조물 대신), ② 분류 코드(b/m/scodeName)·이름으로 **유형 버킷**(도자기·토기 / 조각·조형 / 회화·서화 / 금속·공예 / 기타)을 부여한다. 프론트는 **시대 ∩ 유형 ∩ 검색** 2축 AND 필터(각 칩은 다른 축 조건을 반영한 동적 건수 표시). 기본 수집 종목은 유물이 많은 `KINDS=11,12`(국보·보물), `MAX_DETAILS=4000`. 목록·이미지 API 구조는 korea-heritage 와 동일.
- 박물관 폴더명은 `docs/references/api_info.md` 의 `folder` 컬럼을 단일 소스로 사용한다.
- /scripts: 로컬 정적 서버 start/stop PowerShell 스크립트 (`start-server.ps1`, `stop-server.ps1`)

## 문서작성가이드라인
- 요구사항은 최소단위로 작성
- 요구사항파일은 markdown파일로 작성하고, 파일명 형식은 prefix(FR,NFR) + '-' + number(2자리) + '-' + description 형식으로 파일명을 정한다 
- 요구사항이 변경되면 반드시 관련 파일을 모두 업데이트
- 모든 변경된 사항은 연결된 github에 commit & push 한다(CLAUDE.md도 포함)
- erd작성 시 mermaid 기준으로 작성


## 구현검증
- 반드시 **화면설계서를 참고**하여 구현
- 구현 시 반드시 검증방법을 제공한다
- 검증방법은 사용자가 수행만 하면 되도록 스크립트나 한줄 명령어로 제공한다(스크립트나 명령어는 window용, linux용, mac용 따로 작성)
- 구현 후 검증방법에 의해 테스트 진행하되, 반드시 모든 테스트를 통과해야 한다
- 구현 시 태스크 목록을 대시보드로 관리하며, 태스크(구현 및 검증) 이 끝나면 상태를 대시보드에 업데이트
- 구현 후 검증방법에 대한 내용을 /docs/tasks/검증방법 디렉토리에 태스크명 + '-' + 검증방법.md로 생성
- /docs/mistake-history.md 에 기술된 내용을 참고하여 이전의 오류를 반복하지 않는다

## 구현 시 반드시 참고할 내용
- 구현 후 테스트 시 요구사항과 다르게 구현이 되었거나, 기능 누락이 되었거나 오류가 발행하는 것들은 내가 다시 요구할 텐데, 그때 기능 구현 뿐만 아니라, 관련된 문서들도 모두 업데이트
- 오류에 관련된 것들은 다음에 또 다시 실수하지 않기 위해 /docs/mistake-history.md 파일에 요약정리


## 기술스펙
- frontend: vanilla js / html / tailwind.css
- backend: 원칙적으로 없음(정적 프론트엔드). 대부분 미술관 Open API 는 브라우저에서 직접 호출.
  단, **API 키가 필요한 미술관**(Harvard 등)은 키를 정적 자산에 노출하지 않기 위해 얇은 키 프록시
  컨테이너(`/proxy`, Node, 의존성 0)를 둔다. nginx 가 `/api/<museum>/*` → 프록시로 proxy_pass 하며
  키는 운영 트리 `.env`(레포 제외)에서 주입한다. 프론트는 동일 출처(`/api/harvard/...`)로 호출.

## 운영 (맥미니 상시 운영 — pdfsnap 패턴)
- 공개 도메인: `https://art-galleries.kr` (Cloudflare 존)
- 배포 흐름: GitHub `main` push → 맥미니 self-hosted runner(`kyle-mini-art-galleries`) →
  운영 트리 `scripts/deploy.sh` 실행 → `git reset --hard origin/main` + `docker compose up -d` + `/healthz` 헬스체크.
- 서빙: 단일 `nginx:alpine` 컨테이너(`art-galleries-frontend`)가 `apps/` 를 read-only 바인드 마운트로
  정적 서빙(빌드 없음, 새 파일 즉시 반영). 라우팅은 `deploy/nginx.conf` 가 `apps/serve.json` 을 미러.
- 외부 노출: 공용 Cloudflare Tunnel(`edge_shared` 네트워크) 의 Public Hostname `art-galleries.kr → art-galleries-frontend:3100` (nginx 는 컨테이너 내부 3100 수신).
- 운영 트리: `/opt/stack/services/public/art-galleries.kr/www/repo` (GitHub clone). 컨테이너 포트 외부 발행 없음.
- 관련 파일: `docker-compose.yml`, `deploy/nginx.conf`, `scripts/deploy.sh`, `.github/workflows/deploy.yml`.
- 검증방법: `docs/tasks/검증방법/맥미니-상시운영-검증방법.md`.

## git
- https://github.com/ksheo71/art-galleries.git