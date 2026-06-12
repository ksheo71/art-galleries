<?php
$gallery = 'https://art-galleries.kr';
?><!doctype html>
<html <?php language_attributes(); ?>>
<head>
  <meta charset="<?php bloginfo('charset'); ?>"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <script src="https://cdn.tailwindcss.com"></script>
  <?php wp_head(); ?>
</head>
<body <?php body_class('bg-gray-50 text-gray-900 min-h-screen flex flex-col'); ?>
      style="background-image:linear-gradient(160deg,#f7f6f4,#ecebe8 55%,#e6e5e2);background-attachment:fixed;">
  <header class="border-b bg-white/95 backdrop-blur sticky top-0 z-30">
    <div class="container mx-auto px-4 py-4 flex items-center justify-between">
      <div class="flex items-center gap-2 whitespace-nowrap">
        <a href="<?php echo esc_url($gallery); ?>" class="text-xs text-gray-500 hover:underline" title="갤러리로">Gallery</a>
        <span class="text-gray-300">·</span>
        <a href="<?php echo esc_url(home_url('/')); ?>" class="text-xl font-bold"><?php bloginfo('name'); ?></a>
      </div>
      <div class="text-sm text-gray-600">
        <?php if (is_user_logged_in()) : ?>
          <a href="<?php echo esc_url(admin_url('post-new.php')); ?>" class="hover:underline">글쓰기</a>
          <span class="text-gray-300 mx-1">·</span>
          <a href="<?php echo esc_url(admin_url()); ?>" class="hover:underline">관리</a>
        <?php else : ?>
          <a href="<?php echo esc_url(network_site_url('wp-login.php?action=ag_login')); ?>" class="hover:underline">로그인 · 가입</a>
        <?php endif; ?>
      </div>
    </div>
  </header>
  <main class="flex-1 container mx-auto px-4 py-10 md:py-16">
