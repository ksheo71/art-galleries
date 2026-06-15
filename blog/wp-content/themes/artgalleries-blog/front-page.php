<?php get_header(); ?>

<?php
// 블로그 주인(이 서브사이트의 가장 오래된 관리자)
$owners = get_users(['role' => 'administrator', 'orderby' => 'registered', 'order' => 'ASC', 'number' => 1]);
$owner  = $owners[0] ?? null;

$name = get_bloginfo('name');
$desc = get_bloginfo('description');

// 서브사이트 경로 슬러그 = 유저명 → 개인전 링크(art-galleries.kr/show/<유저>)
$slug    = trim((string) parse_url(home_url('/'), PHP_URL_PATH), '/');
$showUrl = $slug ? 'https://art-galleries.kr/show/' . rawurlencode($slug) : 'https://art-galleries.kr/show';
?>

<section class="ag-hero rounded-2xl text-white px-6 py-12 md:py-16 text-center max-w-3xl mx-auto shadow-sm">
  <?php if ($owner) : ?>
    <div class="flex justify-center mb-4">
      <?php echo get_avatar($owner->ID, 96, '', $name, ['class' => 'rounded-full ring-4 ring-white/30 w-24 h-24']); ?>
    </div>
  <?php endif; ?>
  <h2 class="text-3xl md:text-4xl font-bold tracking-tight"><?php echo esc_html($name); ?></h2>
  <?php if ($desc) : ?>
    <p class="mt-3 text-white/80 max-w-xl mx-auto"><?php echo esc_html($desc); ?></p>
  <?php endif; ?>
  <div class="mt-6 flex items-center justify-center gap-3">
    <a href="<?php echo esc_url($showUrl); ?>"
       class="inline-flex items-center gap-1 bg-white text-rose-700 font-medium rounded-full px-5 py-2 hover:bg-rose-50 transition-colors">
      개인전 보기 →
    </a>
    <?php if (is_user_logged_in()) : ?>
      <a href="<?php echo esc_url(admin_url('post-new.php')); ?>"
         class="inline-flex items-center gap-1 border border-white/40 text-white rounded-full px-5 py-2 hover:bg-white/10 transition-colors">
        글쓰기
      </a>
    <?php endif; ?>
  </div>
</section>

<section class="max-w-3xl mx-auto mt-12">
  <h3 class="text-xl font-bold tracking-tight mb-5">최근 글</h3>
  <?php if (have_posts()) : ?>
    <?php while (have_posts()) : the_post(); ?>
      <article class="bg-white rounded-lg shadow-sm p-6 mb-5">
        <h4 class="text-2xl font-bold leading-snug">
          <a href="<?php the_permalink(); ?>" class="hover:underline"><?php the_title(); ?></a>
        </h4>
        <p class="text-xs text-gray-400 mt-1"><?php echo get_the_date(); ?></p>
        <?php if (has_post_thumbnail()) : ?>
          <a href="<?php the_permalink(); ?>" class="block mt-4 rounded-lg overflow-hidden">
            <?php the_post_thumbnail('large', ['class' => 'w-full h-auto']); ?>
          </a>
        <?php endif; ?>
        <div class="mt-3 text-gray-700 leading-relaxed"><?php the_excerpt(); ?></div>
        <a href="<?php the_permalink(); ?>" class="inline-block mt-2 text-rose-700 text-sm font-medium">읽기 →</a>
      </article>
    <?php endwhile; ?>
    <div class="flex justify-between text-sm text-rose-700 mt-4">
      <span><?php previous_posts_link('← 최신'); ?></span>
      <span><?php next_posts_link('이전 →'); ?></span>
    </div>
  <?php else : ?>
    <div class="bg-white rounded-lg shadow-sm p-10 text-center text-gray-500">
      아직 글이 없습니다.
      <?php if (is_user_logged_in()) : ?>
        <a href="<?php echo esc_url(admin_url('post-new.php')); ?>" class="text-rose-700 font-medium">첫 글을 써보세요 →</a>
      <?php endif; ?>
    </div>
  <?php endif; ?>
</section>

<?php get_footer(); ?>
