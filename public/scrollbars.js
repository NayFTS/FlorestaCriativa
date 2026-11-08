(function () {
    function ready(fn) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', fn);
        } else {
            fn();
        }
    }

    var SELECTORS = [
        '.site-sidebar',
        '.nav-drawer',
        '.guestbook-entries',
        '.search-overlay-box #searchResults',
        '.preview-post-content'
    ].join(', ');

    var OPTIONS = {
        scrollbars: {
            theme: 'os-theme-forest',
            autoHide: 'leave',
            autoHideDelay: 300
        }
    };

    function init(OverlayScrollbars, el) {
        if (!el || OverlayScrollbars(el)) return; // já inicializado nesse elemento
        OverlayScrollbars(el, OPTIONS);
    }

    function initAll() {
        if (!window.OverlayScrollbarsGlobal) return;
        var OverlayScrollbars = OverlayScrollbarsGlobal.OverlayScrollbars;
        init(OverlayScrollbars, document.body);
        document.querySelectorAll(SELECTORS).forEach(function (el) {
            init(OverlayScrollbars, el);
        });
    }

    ready(initAll);
    window.addEventListener('load', initAll);
    // widgets como o drawer, a busca e o preview de projeto só ganham conteúdo/overflow
    // depois de abertos ou depois de dados chegarem da API — reaplica pra pegar esses casos
    document.addEventListener('click', function () { setTimeout(initAll, 200); });
})();
