<?php
// 자식 테마: 부모(artgalleries)의 본문 가독성 스타일(style.css)을 함께 로드.
add_action('wp_enqueue_scripts', function () {
  wp_enqueue_style('artgalleries-parent', get_template_directory_uri() . '/style.css', [], '1.0');
  wp_enqueue_style('artgalleries-blog', get_stylesheet_uri(), ['artgalleries-parent'], '1.0');
});
