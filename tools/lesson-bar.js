/*! Campus Ingeniería · Shared Lesson Navigation Bar */
(function (global) {
  'use strict';

  var mounted = false;

  function injectStyles() {
    if (document.getElementById('campus-lesson-shell-css')) return;
    var link = document.createElement('link');
    link.id = 'campus-lesson-shell-css';
    link.rel = 'stylesheet';
    link.href = 'lesson-shell.css';
    document.head.appendChild(link);
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }

  function mount(opts) {
    if (mounted) return;
    opts = opts || {};
    injectStyles();

    var wrap = document.createElement('nav');
    wrap.setAttribute('aria-label', 'Navegación de la lección');
    wrap.className = 'campus-lesson-bar-wrap';
    wrap.id = 'campus-lesson-bar-wrap';

    var bar = document.createElement('div');
    bar.className = 'campus-lesson-bar';

    // Back to Campus button
    var backBtn = document.createElement('a');
    backBtn.className = 'campus-lb-btn primary';
    backBtn.href = 'index.html';
    backBtn.innerHTML = '<span class="campus-lb-icon" aria-hidden="true">←</span><span class="campus-lb-label">Catálogo</span>';
    global.CampusLessonNavigation.configureLink(backBtn);

    // Separator
    var sep1 = document.createElement('span');
    sep1.className = 'campus-lb-sep';

    // Fullscreen button
    var fsBtn = document.createElement('button');
    fsBtn.type = 'button';
    fsBtn.className = 'campus-lb-btn';
    fsBtn.title = 'Pantalla completa';
    fsBtn.innerHTML = '<span class="campus-lb-icon">⛶</span>';
    fsBtn.addEventListener('click', toggleFullscreen);

    // Reload button
    var reloadBtn = document.createElement('button');
    reloadBtn.type = 'button';
    reloadBtn.className = 'campus-lb-btn';
    reloadBtn.title = 'Reiniciar interactivo';
    reloadBtn.innerHTML = '<span class="campus-lb-icon">↻</span>';
    reloadBtn.addEventListener('click', function () {
      window.location.reload();
    });

    bar.appendChild(backBtn);
    bar.appendChild(sep1);
    bar.appendChild(fsBtn);
    bar.appendChild(reloadBtn);

    wrap.appendChild(bar);
    document.body.prepend(wrap);
    mounted = true;
  }

  function unmount() {
    var wrap = document.getElementById('campus-lesson-bar-wrap');
    if (wrap) wrap.remove();
    mounted = false;
  }

  global.CampusLessonBar = {
    mount: mount,
    unmount: unmount
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { mount(); });
  } else {
    mount();
  }
})(typeof window !== 'undefined' ? window : this);
