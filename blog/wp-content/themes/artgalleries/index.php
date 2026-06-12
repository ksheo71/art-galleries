<?php get_header(); ?>
<div class="max-w-3xl mx-auto">
  <?php if (have_posts()) : ?>
    <?php while (have_posts()) : the_post(); ?>
      <article class="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 class="text-2xl font-bold leading-snug">
          <a href="<?php the_permalink(); ?>" class="hover:underline"><?php the_title(); ?></a>
        </h2>
        <p class="text-xs text-gray-400 mt-1"><?php echo get_the_date(); ?> · <?php the_author(); ?></p>
        <div class="mt-3 text-gray-700 leading-relaxed"><?php the_excerpt(); ?></div>
        <a href="<?php the_permalink(); ?>" class="inline-block mt-2 text-rose-700 text-sm font-medium">읽기 →</a>
      </article>
    <?php endwhile; ?>
    <div class="flex justify-between text-sm text-rose-700 mt-4">
      <span><?php previous_posts_link('← 최신'); ?></span>
      <span><?php next_posts_link('이전 →'); ?></span>
    </div>
  <?php else : ?>
    <p class="text-center text-gray-500 py-16">아직 글이 없습니다.</p>
  <?php endif; ?>
</div>
<?php get_footer(); ?>
