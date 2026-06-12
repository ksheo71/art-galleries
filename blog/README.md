# blog.art-galleries.kr — WordPress 멀티사이트 (소스 백업)

이 디렉토리는 `blog.art-galleries.kr` (WordPress 멀티사이트, 서브디렉토리)의
**커스텀 코드 소스/백업**이다. 회원 가입(구글 전용 + 관리자 승인), 회원별 개인
블로그 + 개인전(`art-galleries.kr/show/<유저>`)을 제공한다.

## ⚠️ 자동 배포 아님
메인 사이트(`apps/`)와 달리 이 블로그는 **git 으로 자동 배포되지 않는다.**
운영 트리에서 직접 편집/적용한다:

- WordPress 콘텐츠 코드(테마·mu-plugin): `/opt/stack/data/art-galleries.kr/blog/wp-content/`
  (컨테이너에 read-write 바인드 마운트 — 파일 저장 즉시 반영, mu-plugin 은 자동 로드)
- 컨테이너 정의(compose·apache conf): `/opt/stack/services/public/art-galleries.kr/blog/repo/`
- 운영 키: 같은 트리의 `.env` (`WORDPRESS_DB_PASSWORD`, `GOOGLE_OAUTH_CLIENT_ID/SECRET`,
  `WP_ADMIN_*`) — **레포에 포함하지 않는다**

여기 파일은 그 라이브 트리의 스냅샷이다. 변경 시 양쪽을 함께 갱신할 것.

## 적용 방법
```sh
# 콘텐츠 코드(테마/플러그인) — 즉시 반영
cp -R blog/wp-content/* /opt/stack/data/art-galleries.kr/blog/wp-content/

# compose / apache conf 변경 시 — 재기동 필요
cp blog/docker-compose.yml blog/apache-wp-multisite.conf \
   /opt/stack/services/public/art-galleries.kr/blog/repo/
cd /opt/stack/services/public/art-galleries.kr/blog/repo
docker compose --env-file ../.env up -d --force-recreate
```

## 구성 요약
- `wp-content/mu-plugins/ag-google-membership.php` — 핵심 플러그인:
  - 구글 OAuth 전용 가입/로그인(비번 가입 차단), 관리자 승인 후 `wpmu_create_blog` 로 개인 블로그 생성
  - 네트워크 관리자 "가입 승인" 화면
  - 구글 프로필 사진을 아바타로 사용
  - `작품(artwork)` 커스텀 포스트 타입(개인전용) + REST 노출
  - 개인전 디렉토리 REST `ag/v1/exhibitions`
  - 블로그 → 개인전 떠있는 링크(`wp_footer`, 테마 무관)
- `wp-content/themes/artgalleries/` — art-galleries.kr 룩앤필 블로그 테마(Tailwind)
- `apache-wp-multisite.conf` — 서브디렉토리 멀티사이트 rewrite.
  **`AllowOverride None` 필수**: 이미지 기본 `.htaccess`(싱글사이트용)가 이 규칙을
  덮어쓰면 서브블로그 wp-admin/wp-login 이 무한 리다이렉트된다.
- `docker-compose.yml` — `wordpress:php8.3-apache`, 공용 MySQL + Cloudflare 터널 사용.
  멀티사이트 상수와 OAuth 상수를 `WORDPRESS_CONFIG_EXTRA` 에서 env 로 주입.

## 개인전 연동(메인 사이트 `apps/show/`)
회원이 wp-admin "작품" 메뉴에 작품을 올리면, 메인 사이트의 정적 앱
`apps/show/index.html` 이 `?rest_route=/wp/v2/artwork` 로 읽어
`art-galleries.kr/show/<유저>` 에 그리드+상세로 전시한다. `/show`(유저 없음)는
`ag/v1/exhibitions` 로 회원 개인전 디렉토리를 보여준다.
