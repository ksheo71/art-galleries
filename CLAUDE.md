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
- 시작은 The Art Institute of Chicago 로 하지만 점점 더 추가해 나갈 계획. 현재 구현된 앱: chicago-museum, metropolitan-museum.
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
- backend: 없음 (정적 프론트엔드만). 외부 데이터는 각 미술관 Open API 를 브라우저에서 직접 호출.

## git
- https://github.com/ksheo71/art-galleries.git