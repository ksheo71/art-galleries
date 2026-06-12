<?php get_header(); ?>
<article class="max-w-3xl mx-auto bg-white rounded-lg shadow-sm p-6 md:p-10">
  <?php while (have_posts()) : the_post(); ?>
    <h1 class="text-3xl md:text-4xl font-bold tracking-tight leading-tight"><?php the_title(); ?></h1>
    <div class="entry-content mt-6"><?php the_content(); ?></div>
  <?php endwhile; ?>
</article>
<?php get_footer(); ?>
