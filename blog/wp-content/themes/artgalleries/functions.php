<?php
// Art Galleries 블로그 테마
add_action('after_setup_theme', function () {
  add_theme_support('title-tag');
  add_theme_support('post-thumbnails');
  add_theme_support('automatic-feed-links');
  add_theme_support('html5', ['search-form', 'comment-list', 'gallery', 'caption', 'style', 'script']);
  register_nav_menus(['primary' => 'Primary']);
});
