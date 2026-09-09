/*! Campus Ingeniería · Contextual lesson return */
(function (global) {
  'use strict';

  var scriptURL = document.currentScript.src;
  var catalogURL = new URL('index.html', scriptURL);
  var campusURL = new URL('../index.html', scriptURL);

  function destination() {
    var requested = new URL(global.location.href).searchParams.get('returnTo');
    if (requested) {
      try {
        var url = new URL(requested, global.location.href);
        if (url.origin === catalogURL.origin && !url.username && !url.password &&
            (url.pathname === catalogURL.pathname || url.pathname === campusURL.pathname) &&
            url.pathname !== global.location.pathname) {
          return url;
        }
      } catch (_) { /* Malformed destinations fall back to the local catalog. */ }
    }
    return global.location.pathname === catalogURL.pathname ? campusURL : catalogURL;
  }

  function inMateriaViewer() {
    try {
      return global.parent !== global && global.frameElement &&
        global.frameElement.id === 'interactive-embed-frame' &&
        global.parent.location.origin === global.location.origin;
    } catch (_) { return false; }
  }

  function configureLink(link) {
    var target = destination();
    var embedded = inMateriaViewer();
    var toCampus = target.pathname === campusURL.pathname;
    var toMateria = toCampus && target.hash.indexOf('#/materia/') === 0;
    var label = embedded ? 'Cerrar lección' : (toMateria ? 'Volver a la materia' : (toCampus ? 'Volver al Campus' : 'Volver al catálogo'));
    link.href = target.href;
    link.setAttribute('aria-label', label);
    link.title = label;
    var barLabel = link.querySelector('.campus-lb-label');
    if (barLabel) barLabel.textContent = embedded ? 'Cerrar' : (toMateria ? 'Materia' : (toCampus ? 'Campus' : 'Catálogo'));
    else if (embedded || toCampus) link.textContent = '← ' + label;
    if (embedded) {
      link.addEventListener('click', function (event) {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        global.parent.postMessage({ type: 'campus:close-lesson' }, global.location.origin);
      });
    }
  }

  global.CampusLessonNavigation = { configureLink: configureLink };
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('a[data-campus-return]').forEach(configureLink);
  });
})(window);
