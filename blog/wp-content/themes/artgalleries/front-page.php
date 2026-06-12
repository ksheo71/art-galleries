<?php get_header(); ?>

<section class="text-center max-w-2xl mx-auto mb-12">
  <p class="text-xs uppercase tracking-[0.25em] text-rose-700">Art Galleries · Blog</p>
  <h2 class="mt-2 text-3xl md:text-5xl font-bold tracking-tight">우리들의 블로그</h2>
  <p class="mt-3 text-gray-600">미술관을 거닐 듯, 사람들의 글을 둘러보세요. 아래에서 블로그를 선택해 들어가세요.</p>
</section>

<?php
$grads = [
  'from-red-900 to-red-700', 'from-slate-900 to-slate-700', 'from-emerald-900 to-emerald-700',
  'from-amber-900 to-amber-700', 'from-blue-950 to-blue-800', 'from-indigo-950 to-indigo-800',
  'from-teal-900 to-rose-800', 'from-sky-900 to-violet-800', 'from-rose-900 to-stone-800',
];
$sites = function_exists('get_sites') ? get_sites([
  'number' => 60, 'public' => 1, 'archived' => 0, 'deleted' => 0, 'spam' => 0,
  'site__not_in' => [get_main_site_id()],
]) : [];
?>

<?php if (!empty($sites)) : ?>
  <section>
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 max-w-6xl mx-auto">
      <?php $i = 0; foreach ($sites as $s) :
        switch_to_blog($s->blog_id);
        $name = get_bloginfo('name');
        $url  = home_url('/');
        $desc = get_bloginfo('description');
        $recent = get_posts(['numberposts' => 1, 'post_status' => 'publish']);
        $snippet = $recent ? wp_trim_words(wp_strip_all_tags($recent[0]->post_title), 14) : ($desc ?: '아직 글이 없습니다.');
        restore_current_blog();
        $g = $grads[$i % count($grads)]; $i++;
      ?>
        <a href="<?php echo esc_url($url); ?>"
           class="block rounded-lg shadow-sm hover:shadow-lg overflow-hidden bg-white focus:outline-none focus:ring-4 focus:ring-rose-200 transition-shadow">
          <div class="aspect-[16/9] bg-gradient-to-br <?php echo esc_attr($g); ?> flex items-center justify-center text-center px-6">
            <p class="font-serif text-2xl md:text-3xl text-white leading-tight drop-shadow"><?php echo esc_html($name); ?></p>
          </div>
          <div class="p-5">
            <h3 class="font-semibold text-lg line-clamp-1"><?php echo esc_html($name); ?></h3>
            <p class="text-sm text-gray-600 mt-1 line-clamp-2"><?php echo esc_html($snippet); ?></p>
            <p class="mt-3 text-sm font-medium text-rose-700">방문 →</p>
          </div>
        </a>
      <?php endforeach; ?>
    </div>
  </section>
<?php else : ?>
  <p class="text-center text-gray-500">아직 블로그가 없습니다. 첫 번째 블로그의 주인공이 되어보세요!</p>
<?php endif; ?>

<?php
// 메인 사이트의 최근 글(있으면)
$mainPosts = get_posts(['numberposts' => 6, 'post_status' => 'publish']);
if (!empty($mainPosts)) : ?>
  <section class="max-w-4xl mx-auto mt-16">
    <h3 class="text-center text-xl font-bold tracking-tight mb-6">최근 글</h3>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
      <?php foreach ($mainPosts as $p) : ?>
        <a href="<?php echo esc_url(get_permalink($p)); ?>" class="block bg-white rounded-lg shadow-sm hover:shadow-lg p-5 transition-shadow">
          <h4 class="font-semibold leading-snug line-clamp-2"><?php echo esc_html(get_the_title($p)); ?></h4>
          <p class="text-xs text-gray-400 mt-1"><?php echo esc_html(get_the_date('', $p)); ?></p>
          <p class="text-sm text-gray-600 mt-2 line-clamp-2"><?php echo esc_html(wp_trim_words(wp_strip_all_tags($p->post_content), 24)); ?></p>
        </a>
      <?php endforeach; ?>
    </div>
  </section>
<?php endif; ?>

<?php get_footer(); ?>
