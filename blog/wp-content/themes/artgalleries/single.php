<?php get_header(); ?>
<article class="max-w-3xl mx-auto bg-white rounded-lg shadow-sm p-6 md:p-10">
  <?php while (have_posts()) : the_post(); ?>
    <a href="<?php echo esc_url(home_url('/')); ?>" class="text-sm text-rose-700 hover:underline">← <?php bloginfo('name'); ?></a>
    <h1 class="mt-3 text-3xl md:text-4xl font-bold tracking-tight leading-tight"><?php the_title(); ?></h1>
    <p class="text-sm text-gray-400 mt-2"><?php echo get_the_date(); ?> · <?php the_author(); ?></p>
    <?php if (has_post_thumbnail()) : ?>
      <div class="mt-6 rounded-lg overflow-hidden"><?php the_post_thumbnail('large', ['class' => 'w-full h-auto']); ?></div>
    <?php endif; ?>
    <div class="entry-content mt-6"><?php the_content(); ?></div>
  <?php endwhile; ?>
</article>
<?php get_footer(); ?>
