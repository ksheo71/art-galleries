<?php
/**
 * Plugin Name: AG Google Membership
 * Description: Google 전용 회원가입 + 관리자 승인 + 승인 시 개인 블로그 자동 생성 (멀티사이트).
 * Author: kyle
 *
 * 필요한 상수(wp-config.php 에서 env 로 주입):
 *   AG_GOOGLE_CLIENT_ID, AG_GOOGLE_CLIENT_SECRET
 *
 * 흐름:
 *   /wp-login.php?action=ag_login     → "Google로 계속하기" 테마 페이지
 *   /wp-login.php?action=ag_start     → Google 동의화면으로 리다이렉트
 *   /wp-login.php?action=ag_callback  → 코드 교환·검증 → (신규)대기 생성 / (활성)로그인
 *   네트워크 관리자 → 사용자 → "가입 승인" 에서 승인 시 /아이디 블로그 자동 생성
 */

if (!defined('ABSPATH')) exit;

class AG_Membership {
	const STATUS = 'ag_status';        // pending | active | rejected
	const SUB    = 'ag_google_sub';
	const GNAME  = 'ag_google_name';
	const PIC    = 'ag_google_picture';

	private static $reserved = ['www','blog','admin','wp-admin','main','site','sites','user','users','page','feed','login','signup','files','wp-content','wp-includes'];

	public static function boot() {
		add_action('login_form_ag_login',    [__CLASS__, 'screen_login']);
		add_action('login_form_ag_start',    [__CLASS__, 'oauth_start']);
		add_action('login_form_ag_callback', [__CLASS__, 'oauth_callback']);

		// 대기/거절 상태 계정은 어떤 경로로도 인증 차단
		add_filter('authenticate', [__CLASS__, 'block_non_active'], 30, 1);

		// 구글 프로필 사진을 워드프레스 아바타로 사용
		add_filter('pre_get_avatar_data', [__CLASS__, 'use_google_avatar'], 10, 2);

		// ── 구글 전용 강제: 기본(비번) 가입 경로 전면 차단 ──
		// 멀티사이트 공개 가입 설정을 항상 'none' 으로 고정(관리자가 켜도 무효)
		add_filter('pre_site_option_registration', [__CLASS__, 'force_no_registration']);
		add_filter('option_users_can_register', '__return_zero');
		// wp-signup.php 로 직접 들어오면 구글 로그인 페이지로 보냄
		add_action('signup_header', [__CLASS__, 'redirect_signup']);
		// 로그인 폼의 "등록" 링크도 구글 가입 페이지로
		add_filter('register_url', [__CLASS__, 'register_url']);

		// 네트워크 관리자 승인 화면
		add_action('network_admin_menu',    [__CLASS__, 'admin_menu']);
		add_action('admin_post_ag_approve', [__CLASS__, 'do_approve']);
		add_action('admin_post_ag_reject',  [__CLASS__, 'do_reject']);

		// 개인전 '작품(artwork)' 콘텐츠 타입 (각 유저 사이트에서 wp-admin 메뉴로 관리)
		add_action('init',                  [__CLASS__, 'register_artwork']);
		add_action('add_meta_boxes',        [__CLASS__, 'artwork_meta_box']);
		add_action('save_post_artwork',     [__CLASS__, 'save_artwork_meta']);

		// 개인전 디렉토리 REST (art-galleries.kr 허브가 회원 개인전 목록을 읽음)
		add_action('rest_api_init',         [__CLASS__, 'register_rest']);

		// 블로그 → 개인전 떠있는 링크(테마 무관, 서브블로그 프론트에만)
		add_action('wp_footer',             [__CLASS__, 'exhibition_link']);
	}

	public static function exhibition_link() {
		if (is_admin() || is_main_site()) return;
		$handle = trim((string) wp_parse_url(home_url('/'), PHP_URL_PATH), '/');
		if (!$handle) return;
		$url = 'https://art-galleries.kr/show/' . rawurlencode($handle);
		echo '<a href="' . esc_url($url) . '" style="position:fixed;right:16px;bottom:16px;z-index:9999;background:#be123c;color:#fff;padding:10px 16px;border-radius:9999px;font:500 14px/1.2 sans-serif;text-decoration:none;box-shadow:0 2px 8px rgba(0,0,0,.25)">개인전 보기 →</a>';
	}

	/* ---------------- 개인전 디렉토리 ---------------- */
	public static function register_rest() {
		register_rest_route('ag/v1', '/exhibitions', [
			'methods'             => 'GET',
			'permission_callback' => '__return_true',
			'callback'            => [__CLASS__, 'rest_exhibitions'],
		]);
	}

	public static function rest_exhibitions() {
		$out  = [];
		$main = function_exists('get_main_site_id') ? get_main_site_id() : 1;
		$sites = get_sites([
			'public' => 1, 'archived' => 0, 'deleted' => 0, 'spam' => 0,
			'number' => 300, 'site__not_in' => [$main],
		]);
		foreach ($sites as $s) {
			switch_to_blog($s->blog_id);
			$counts = wp_count_posts('artwork');
			$count  = $counts ? (int) $counts->publish : 0;
			$cover  = null;
			if ($count) {
				$q = get_posts(['post_type' => 'artwork', 'numberposts' => 1, 'post_status' => 'publish']);
				if ($q) {
					$cover = get_the_post_thumbnail_url($q[0]->ID, 'large');
					if (!$cover && preg_match('/<img[^>]+src=["\']([^"\']+)["\']/', $q[0]->post_content, $m)) {
						$cover = $m[1];
					}
				}
			}
			$out[] = [
				'handle' => trim($s->path, '/'),
				'name'   => get_bloginfo('name'),
				'count'  => $count,
				'cover'  => $cover ?: null,
			];
			restore_current_blog();
		}
		usort($out, fn($a, $b) => $b['count'] - $a['count']);
		return rest_ensure_response($out);
	}

	/* ---------------- 작품(artwork) 타입 ---------------- */
	public static function register_artwork() {
		register_post_type('artwork', [
			'labels' => [
				'name'          => '작품',
				'singular_name' => '작품',
				'menu_name'     => '작품 (개인전)',
				'all_items'     => '모든 작품',
				'add_new'       => '작품 추가',
				'add_new_item'  => '새 작품 등록',
				'edit_item'     => '작품 편집',
				'view_item'     => '작품 보기',
				'search_items'  => '작품 검색',
			],
			'public'        => true,
			'has_archive'   => true,
			'menu_position' => 5,
			'menu_icon'     => 'dashicons-art',
			'supports'      => ['title', 'editor', 'thumbnail', 'excerpt'],
			'show_in_rest'  => true,    // 개인전 정적앱이 REST 로 읽음
			'rest_base'     => 'artwork',
			'rewrite'       => ['slug' => 'artwork'],
		]);
		// 작품 메타(연도·재료) — REST 노출
		foreach (['ag_year' => '제작연도', 'ag_medium' => '재료·기법'] as $key => $_label) {
			register_post_meta('artwork', $key, [
				'type'              => 'string',
				'single'            => true,
				'show_in_rest'      => true,
				'sanitize_callback' => 'sanitize_text_field',
				'auth_callback'     => function () { return current_user_can('edit_posts'); },
			]);
		}
	}

	public static function artwork_meta_box() {
		add_meta_box('ag_artwork_info', '작품 정보', [__CLASS__, 'render_artwork_meta'], 'artwork', 'side', 'high');
	}

	public static function render_artwork_meta($post) {
		wp_nonce_field('ag_artwork_meta', 'ag_artwork_nonce');
		$year   = esc_attr(get_post_meta($post->ID, 'ag_year', true));
		$medium = esc_attr(get_post_meta($post->ID, 'ag_medium', true));
		echo '<p><label><strong>제작연도</strong><br><input type="text" name="ag_year" value="' . $year . '" placeholder="예: 2024" style="width:100%"></label></p>';
		echo '<p><label><strong>재료·기법</strong><br><input type="text" name="ag_medium" value="' . $medium . '" placeholder="예: 캔버스에 유채, 72.7×60.6cm" style="width:100%"></label></p>';
		echo '<p style="color:#666;font-size:12px;margin-top:8px;">· <b>대표 이미지</b>를 작품 사진으로 설정하세요.<br>· 본문은 작품 설명으로 쓰입니다.</p>';
	}

	public static function save_artwork_meta($post_id) {
		if (!isset($_POST['ag_artwork_nonce']) || !wp_verify_nonce($_POST['ag_artwork_nonce'], 'ag_artwork_meta')) return;
		if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) return;
		if (!current_user_can('edit_post', $post_id)) return;
		foreach (['ag_year', 'ag_medium'] as $k) {
			if (isset($_POST[$k])) update_post_meta($post_id, $k, sanitize_text_field(wp_unslash($_POST[$k])));
		}
	}

	/* ---------------- 설정 ---------------- */
	private static function cfg($k) { return defined($k) ? (string) constant($k) : ''; }
	private static function configured() { return self::cfg('AG_GOOGLE_CLIENT_ID') !== '' && self::cfg('AG_GOOGLE_CLIENT_SECRET') !== ''; }
	private static function action_url($action) { return network_site_url('wp-login.php?action=' . $action); }
	private static function redirect_uri() { return self::action_url('ag_callback'); }

	/* ---------------- 화면 ---------------- */
	public static function screen_login() {
		if (is_user_logged_in()) { wp_safe_redirect(home_url('/')); exit; }
		$btn = self::action_url('ag_start');
		$inner = '
			<div class="bg-white rounded-lg shadow-sm p-8 text-center">
				<p class="text-xs uppercase tracking-[0.25em] text-rose-700">Art Galleries · Blog</p>
				<h1 class="mt-2 text-2xl font-bold">로그인 · 가입</h1>
				<p class="mt-3 text-sm text-gray-600 leading-relaxed">Google 계정으로 시작하세요.<br>처음이라면 <b>가입 신청</b>이 되며, 관리자 승인 후<br>나만의 블로그가 만들어집니다.</p>
				<a href="' . esc_url($btn) . '" class="mt-6 inline-flex items-center justify-center gap-2 w-full rounded-md border border-gray-300 bg-white px-4 py-3 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-rose-200">
					<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"/><path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.05l3.01-2.33z"/><path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"/></svg>
					Google로 계속하기
				</a>
				<p class="mt-4 text-xs text-gray-400">로그인하면 운영정책에 동의하는 것으로 간주됩니다.</p>
			</div>';
		self::render('로그인 · 가입', $inner);
	}

	private static function pending_html($just_signed_up = false) {
		$msg = $just_signed_up
			? '가입 신청이 접수되었습니다.<br>관리자 승인 후 나만의 블로그가 만들어집니다.'
			: '아직 승인 대기 중입니다.<br>승인되면 다음 로그인부터 블로그를 이용할 수 있습니다.';
		return '
			<div class="bg-white rounded-lg shadow-sm p-8 text-center">
				<div class="mx-auto w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-2xl">⏳</div>
				<h1 class="mt-4 text-2xl font-bold">승인 대기 중</h1>
				<p class="mt-3 text-sm text-gray-600 leading-relaxed">' . $msg . '</p>
				<a href="' . esc_url(home_url('/')) . '" class="mt-6 inline-block text-sm font-medium text-rose-700 hover:underline">← 블로그 둘러보기</a>
			</div>';
	}

	private static function rejected_html() {
		return '
			<div class="bg-white rounded-lg shadow-sm p-8 text-center">
				<h1 class="text-2xl font-bold">가입이 거절되었습니다</h1>
				<p class="mt-3 text-sm text-gray-600">문의가 필요하면 운영자에게 연락해 주세요.</p>
				<a href="' . esc_url(home_url('/')) . '" class="mt-6 inline-block text-sm font-medium text-rose-700 hover:underline">← 홈으로</a>
			</div>';
	}

	/* 테마와 동일한 룩앤필의 독립 HTML 셸(로그인 컨텍스트에서도 안전) */
	private static function render($title, $inner) {
		$name = get_bloginfo('name');
		$gallery = 'https://art-galleries.kr';
		$home = home_url('/');
		nocache_headers();
		status_header(200);
		if (!headers_sent()) header('Content-Type: text/html; charset=utf-8');
		echo '<!doctype html><html lang="ko"><head><meta charset="utf-8">';
		echo '<meta name="viewport" content="width=device-width, initial-scale=1">';
		echo '<title>' . esc_html($title . ' · ' . $name) . '</title>';
		echo '<script src="https://cdn.tailwindcss.com"></script></head>';
		echo '<body class="bg-gray-50 text-gray-900 min-h-screen flex flex-col" style="background-image:linear-gradient(160deg,#f7f6f4,#ecebe8 55%,#e6e5e2);background-attachment:fixed;">';
		echo '<header class="border-b bg-white/95 backdrop-blur sticky top-0 z-30"><div class="container mx-auto px-4 py-4 flex items-center gap-2 whitespace-nowrap">';
		echo '<a href="' . esc_url($gallery) . '" class="text-xs text-gray-500 hover:underline">Gallery</a><span class="text-gray-300">·</span>';
		echo '<a href="' . esc_url($home) . '" class="text-xl font-bold">' . esc_html($name) . '</a></div></header>';
		echo '<main class="flex-1 container mx-auto px-4 py-16"><div class="max-w-md mx-auto">' . $inner . '</div></main>';
		echo '<footer class="border-t py-6 text-center text-sm text-gray-500"><a href="' . esc_url($gallery) . '" class="underline">art-galleries.kr</a> · ' . esc_html($name) . '</footer>';
		echo '</body></html>';
		exit;
	}

	/* ---------------- OAuth ---------------- */
	public static function oauth_start() {
		if (!self::configured()) self::render('구성 필요', '<div class="bg-white rounded-lg shadow-sm p-8 text-center"><h1 class="text-xl font-bold">Google 로그인 미구성</h1><p class="mt-3 text-sm text-gray-600">관리자가 OAuth 자격증명을 설정해야 합니다.</p></div>');
		$state = wp_generate_password(32, false);
		setcookie('ag_oauth_state', $state, time() + 600, '/', '', is_ssl(), true);
		$params = http_build_query([
			'client_id'     => self::cfg('AG_GOOGLE_CLIENT_ID'),
			'redirect_uri'  => self::redirect_uri(),
			'response_type' => 'code',
			'scope'         => 'openid email profile',
			'state'         => $state,
			'prompt'        => 'select_account',
			'access_type'   => 'online',
		]);
		wp_redirect('https://accounts.google.com/o/oauth2/v2/auth?' . $params);
		exit;
	}

	public static function oauth_callback() {
		if (!empty($_GET['error'])) {
			self::render('로그인 취소', '<div class="bg-white rounded-lg shadow-sm p-8 text-center"><h1 class="text-xl font-bold">로그인이 취소되었습니다</h1><a href="' . esc_url(self::action_url('ag_login')) . '" class="mt-4 inline-block text-sm font-medium text-rose-700 hover:underline">다시 시도</a></div>');
		}
		$state  = isset($_GET['state']) ? (string) $_GET['state'] : '';
		$cookie = isset($_COOKIE['ag_oauth_state']) ? (string) $_COOKIE['ag_oauth_state'] : '';
		setcookie('ag_oauth_state', '', time() - 3600, '/', '', is_ssl(), true);
		if ($state === '' || $cookie === '' || !hash_equals($cookie, $state)) wp_die('잘못된 요청입니다(state 불일치).');

		$code = isset($_GET['code']) ? (string) $_GET['code'] : '';
		if ($code === '') wp_die('인증 코드가 없습니다.');

		// 코드 → 토큰 (서버사이드, 클라이언트 시크릿으로 Google 과 직접 TLS 통신)
		$resp = wp_remote_post('https://oauth2.googleapis.com/token', [
			'timeout' => 15,
			'body'    => [
				'code'          => $code,
				'client_id'     => self::cfg('AG_GOOGLE_CLIENT_ID'),
				'client_secret' => self::cfg('AG_GOOGLE_CLIENT_SECRET'),
				'redirect_uri'  => self::redirect_uri(),
				'grant_type'    => 'authorization_code',
			],
		]);
		if (is_wp_error($resp)) wp_die('토큰 교환에 실패했습니다.');
		$body = json_decode(wp_remote_retrieve_body($resp), true);
		if (empty($body['id_token'])) wp_die('id_token 을 받지 못했습니다.');

		$claims = self::jwt_payload($body['id_token']);
		// id_token 은 Google 토큰 엔드포인트에서 시크릿 인증된 TLS 로 직접 수신 → 서명 검증 생략, 클레임만 검증
		if (!$claims) wp_die('토큰 해석에 실패했습니다.');
		if (($claims['aud'] ?? '') !== self::cfg('AG_GOOGLE_CLIENT_ID')) wp_die('aud 불일치.');
		$iss = $claims['iss'] ?? '';
		if ($iss !== 'https://accounts.google.com' && $iss !== 'accounts.google.com') wp_die('iss 불일치.');
		if ((int) ($claims['exp'] ?? 0) < time()) wp_die('토큰이 만료되었습니다.');
		if (empty($claims['email']) || empty($claims['email_verified'])) wp_die('인증된 이메일이 아닙니다.');

		$email = sanitize_email($claims['email']);
		$sub   = (string) $claims['sub'];
		$name  = isset($claims['name']) ? sanitize_text_field($claims['name']) : explode('@', $email)[0];
		$pic   = isset($claims['picture']) ? esc_url_raw($claims['picture']) : '';
		if (!$email) wp_die('이메일이 올바르지 않습니다.');

		self::handle_identity($email, $sub, $name, $pic);
	}

	private static function jwt_payload($jwt) {
		$parts = explode('.', (string) $jwt);
		if (count($parts) < 2) return null;
		$seg = strtr($parts[1], '-_', '+/');
		$seg .= str_repeat('=', (4 - strlen($seg) % 4) % 4);
		$json = base64_decode($seg, true);
		if ($json === false) return null;
		$data = json_decode($json, true);
		return is_array($data) ? $data : null;
	}

	/* ---------------- 신원 처리 ---------------- */
	private static function handle_identity($email, $sub, $name, $picture = '') {
		$user = get_user_by('email', $email);

		if ($user) {
			if (!get_user_meta($user->ID, self::SUB, true)) update_user_meta($user->ID, self::SUB, $sub);
			if ($picture) update_user_meta($user->ID, self::PIC, $picture); // 매 로그인 시 최신 사진 반영
			$status = get_user_meta($user->ID, self::STATUS, true);
			if ($status === '') $status = 'active'; // 기존(관리자 등) 계정은 활성으로 간주
			if ($status === 'active')   { self::login_and_go($user); }
			if ($status === 'rejected') { self::render('가입 거절', self::rejected_html()); }
			self::render('승인 대기 중', self::pending_html(false)); // pending
		}

		// 신규: 대기 상태로 생성(블로그 없음, 로그인 안 됨)
		$login = self::unique_login($email);
		$password = wp_generate_password(24, true, true);
		$uid = wpmu_create_user($login, $password, $email);
		if (!$uid) wp_die('계정 생성에 실패했습니다(이미 사용 중인 이메일일 수 있습니다).');
		update_user_meta($uid, self::STATUS, 'pending');
		update_user_meta($uid, self::SUB, $sub);
		update_user_meta($uid, self::GNAME, $name);
		if ($picture) update_user_meta($uid, self::PIC, $picture);
		wp_update_user(['ID' => $uid, 'display_name' => $name]);

		self::render('가입 신청 완료', self::pending_html(true));
	}

	private static function login_and_go($user) {
		wp_set_current_user($user->ID);
		wp_set_auth_cookie($user->ID, true);
		do_action('wp_login', $user->user_login, $user);
		$blog = function_exists('get_active_blog_for_user') ? get_active_blog_for_user($user->ID) : null;
		$dest = $blog ? get_admin_url($blog->blog_id) : home_url('/');
		wp_safe_redirect($dest);
		exit;
	}

	private static function unique_login($email) {
		$base = strtolower(preg_replace('/[^a-z0-9]/i', '', explode('@', $email)[0]));
		if (strlen($base) < 3) $base = 'user' . $base;
		$base = substr($base, 0, 30);
		if (in_array($base, self::$reserved, true)) $base = 'u' . $base;
		$login = $base; $i = 1;
		while (username_exists($login) || get_id_from_blogname($login) || in_array($login, self::$reserved, true)) {
			$login = $base . $i; $i++;
		}
		return $login;
	}

	/* ---------------- 구글 전용 강제 ---------------- */
	public static function force_no_registration() { return 'none'; }
	public static function register_url() { return self::action_url('ag_login'); }
	public static function redirect_signup() {
		wp_safe_redirect(self::action_url('ag_login'));
		exit;
	}

	/* ---------------- 아바타(구글 사진) ---------------- */
	public static function use_google_avatar($args, $id_or_email) {
		$user = self::resolve_user($id_or_email);
		if ($user) {
			$pic = get_user_meta($user->ID, self::PIC, true);
			if ($pic) {
				$args['url']          = $pic;
				$args['found_avatar'] = true;
			}
		}
		return $args;
	}

	private static function resolve_user($id_or_email) {
		if ($id_or_email instanceof WP_User)    return $id_or_email;
		if ($id_or_email instanceof WP_Post)    return get_user_by('id', (int) $id_or_email->post_author);
		if ($id_or_email instanceof WP_Comment) {
			if (!empty($id_or_email->user_id)) return get_user_by('id', (int) $id_or_email->user_id);
			if (!empty($id_or_email->comment_author_email)) return get_user_by('email', $id_or_email->comment_author_email);
			return null;
		}
		if (is_numeric($id_or_email)) return get_user_by('id', (int) $id_or_email);
		if (is_string($id_or_email) && is_email($id_or_email)) return get_user_by('email', $id_or_email);
		return null;
	}

	/* ---------------- 인증 차단(대기/거절) ---------------- */
	public static function block_non_active($user) {
		if ($user instanceof WP_User) {
			$status = get_user_meta($user->ID, self::STATUS, true);
			if ($status === 'pending')  return new WP_Error('ag_pending', '관리자 승인 대기 중인 계정입니다.');
			if ($status === 'rejected') return new WP_Error('ag_rejected', '가입이 거절된 계정입니다.');
		}
		return $user;
	}

	/* ---------------- 관리자 승인 ---------------- */
	public static function admin_menu() {
		$pending = count(self::pending_users());
		$label = '가입 승인' . ($pending ? ' <span class="awaiting-mod">' . $pending . '</span>' : '');
		add_submenu_page('users.php', '가입 승인', $label, 'manage_network_users', 'ag-approvals', [__CLASS__, 'approvals_page']);
	}

	private static function pending_users() {
		return get_users([
			'blog_id'    => 0,
			'meta_key'   => self::STATUS,
			'meta_value' => 'pending',
			'number'     => 200,
			'orderby'    => 'registered',
			'order'      => 'ASC',
		]);
	}

	public static function approvals_page() {
		if (!current_user_can('manage_network_users')) wp_die('권한이 없습니다.');
		$users = self::pending_users();
		echo '<div class="wrap"><h1>가입 승인 대기</h1>';
		if (isset($_GET['ag_done'])) {
			$m = $_GET['ag_done'] === 'approved' ? '승인 완료 — 블로그가 생성되었습니다.' : '처리되었습니다.';
			echo '<div class="notice notice-success is-dismissible"><p>' . esc_html($m) . '</p></div>';
		}
		if (!$users) { echo '<p>대기 중인 가입 신청이 없습니다.</p></div>'; return; }
		echo '<table class="widefat striped"><thead><tr><th>이름</th><th>이메일</th><th>아이디(블로그 주소)</th><th>신청일</th><th>처리</th></tr></thead><tbody>';
		foreach ($users as $u) {
			$approve = wp_nonce_url(admin_url('admin-post.php?action=ag_approve&user_id=' . $u->ID), 'ag_approve_' . $u->ID);
			$reject  = wp_nonce_url(admin_url('admin-post.php?action=ag_reject&user_id=' . $u->ID), 'ag_reject_' . $u->ID);
			echo '<tr>';
			echo '<td>' . esc_html($u->display_name) . '</td>';
			echo '<td>' . esc_html($u->user_email) . '</td>';
			echo '<td><code>/' . esc_html($u->user_login) . '/</code></td>';
			echo '<td>' . esc_html(mysql2date('Y-m-d', $u->user_registered)) . '</td>';
			echo '<td><a class="button button-primary" href="' . esc_url($approve) . '">승인</a> ';
			echo '<a class="button" href="' . esc_url($reject) . '" onclick="return confirm(\'거절하시겠습니까?\')">거절</a></td>';
			echo '</tr>';
		}
		echo '</tbody></table></div>';
	}

	public static function do_approve() {
		if (!current_user_can('manage_network_users')) wp_die('권한이 없습니다.');
		$uid = isset($_GET['user_id']) ? intval($_GET['user_id']) : 0;
		check_admin_referer('ag_approve_' . $uid);
		$user = get_user_by('id', $uid);
		if (!$user) wp_die('사용자를 찾을 수 없습니다.');

		if (get_user_meta($uid, self::STATUS, true) !== 'active') {
			$handle  = $user->user_login;
			$network = get_network();
			$domain  = $network ? $network->domain : parse_url(network_site_url(), PHP_URL_HOST);
			$path    = '/' . $handle . '/';
			$blog_id = wpmu_create_blog($domain, $path, $user->display_name . '의 블로그', $uid, ['public' => 1]);
			if (is_wp_error($blog_id)) wp_die('블로그 생성 실패: ' . esc_html($blog_id->get_error_message()));
			add_user_to_blog($blog_id, $uid, 'administrator');
			update_user_meta($uid, 'primary_blog', $blog_id);
			update_user_meta($uid, self::STATUS, 'active');
		}
		wp_safe_redirect(add_query_arg('ag_done', 'approved', network_admin_url('users.php?page=ag-approvals')));
		exit;
	}

	public static function do_reject() {
		if (!current_user_can('manage_network_users')) wp_die('권한이 없습니다.');
		$uid = isset($_GET['user_id']) ? intval($_GET['user_id']) : 0;
		check_admin_referer('ag_reject_' . $uid);
		if (get_user_by('id', $uid)) update_user_meta($uid, self::STATUS, 'rejected');
		wp_safe_redirect(add_query_arg('ag_done', 'rejected', network_admin_url('users.php?page=ag-approvals')));
		exit;
	}
}

AG_Membership::boot();
