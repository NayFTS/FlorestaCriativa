// Estante de animes: renderiza a lista pública de /api/animes num elemento da página.
// Uso: <div id="animeShelf"></div> + <script src="animes.js"></script>
// (ou initAnimeShelf('outroId') manualmente).
(function () {
    var API = '/api';

    var LABELS = {
        pt: {
            title: '📺 Estante de Animes',
            assistindo: 'Assistindo', assistido: 'Assistidos', quero_ver: 'Quero ver',
            pausado: 'Pausados', abandonado: 'Abandonados',
            empty: 'Nada por aqui ainda… o sapinho está escolhendo o próximo!',
            error: 'Não consegui carregar os animes agora.',
            loading: 'Carregando...', eps: 'eps', fav: 'Favorito', open: 'abre em nova aba',
            all: 'ver todos', less: 'ver menos'
        },
        en: {
            title: '📺 Anime Shelf',
            assistindo: 'Watching', assistido: 'Completed', quero_ver: 'Plan to watch',
            pausado: 'On hold', abandonado: 'Dropped',
            empty: 'Nothing here yet… the frog is picking the next one!',
            error: "Couldn't load the anime list right now.",
            loading: 'Loading...', eps: 'eps', fav: 'Favorite', open: 'opens in a new tab',
            all: 'see all', less: 'see less'
        }
    };
    var ORDER = ['assistindo', 'assistido', 'quero_ver', 'pausado', 'abandonado'];

    function lang() {
        return (window.i18n && window.i18n.getLang && window.i18n.getLang() === 'en') ? 'en' : 'pt';
    }
    function L(key) { return LABELS[lang()][key] || key; }

    function esc(str) {
        var d = document.createElement('div');
        d.appendChild(document.createTextNode(str == null ? '' : String(str)));
        return d.innerHTML;
    }

    function safeImg(url) {
        return typeof url === 'string' && /^https:\/\//i.test(url) ? url : '';
    }

    function safeLink(url) {
        return typeof url === 'string' && /^https?:\/\//i.test(url) ? url : '';
    }

    function cardHtml(a) {
        var cover = safeImg(a.cover)
            ? '<img class="anime-card-cover" src="' + esc(a.cover) + '" alt="" loading="lazy">'
            : '<div class="anime-card-cover anime-card-cover--empty" aria-hidden="true">🐸</div>';
        if (safeLink(a.link)) {
            cover = '<a class="anime-card-link" href="' + esc(a.link) + '" target="_blank" rel="noopener noreferrer" aria-label="' + esc(a.title) + ' (' + L('open') + ')">' + cover + '</a>';
        }
        var meta = [];
        if (a.rating != null) meta.push('<span class="anime-card-rating">★ ' + esc(a.rating) + '</span>');
        if (a.status === 'assistindo' || a.status === 'pausado') {
            if (a.episodesTotal) meta.push(esc(a.episodesWatched || 0) + '/' + esc(a.episodesTotal) + ' ' + L('eps'));
            else if (a.episodesWatched) meta.push(esc(a.episodesWatched) + ' ' + L('eps'));
        } else if (a.episodesTotal) {
            meta.push(esc(a.episodesTotal) + ' ' + L('eps'));
        }
        var progress = '';
        if (a.status === 'assistindo' && a.episodesTotal) {
            var pct = Math.min(100, Math.round(((a.episodesWatched || 0) / a.episodesTotal) * 100));
            progress = '<div class="anime-progress" role="progressbar" aria-valuenow="' + pct + '" aria-valuemin="0" aria-valuemax="100"><span style="width:' + pct + '%"></span></div>';
        }
        return '<article class="anime-card">' + cover +
            (a.favorite ? '<span class="anime-card-fav" title="' + L('fav') + '" aria-label="' + L('fav') + '">💚</span>' : '') +
            '<div class="anime-card-body">' +
            '<h4 class="anime-card-title">' + esc(a.title) + '</h4>' +
            progress +
            (meta.length ? '<div class="anime-card-meta">' + meta.join(' · ') + '</div>' : '') +
            (a.notes ? '<p class="anime-card-notes">' + esc(a.notes) + '</p>' : '') +
            '</div></article>';
    }

    function initAnimeShelf(targetId) {
        var root = document.getElementById(targetId || 'animeShelf');
        if (!root || root.dataset.ready) return;
        root.dataset.ready = '1';
        root.classList.add('anime-shelf', 'sticker-card');
        root.innerHTML =
            '<div class="widget-window-header"><h3>' + L('title') + '</h3>' +
            '<span class="window-dots" aria-hidden="true"><span>−</span><span>□</span><span>✕</span></span></div>' +
            '<div class="anime-shelf-bar"><div class="anime-shelf-tabs" role="tablist"></div>' +
            '<button type="button" class="anime-shelf-more" hidden aria-expanded="false">' + L('all') + '</button></div>' +
            '<div class="anime-grid" aria-live="polite">' + L('loading') + '</div>';
        var tabs = root.querySelector('.anime-shelf-tabs');
        var grid = root.querySelector('.anime-grid');
        var more = root.querySelector('.anime-shelf-more');

        // Prateleira numa linha só; "ver todos" abre a grade completa
        function setExpanded(on) {
            root.classList.toggle('anime-shelf--expanded', on);
            more.setAttribute('aria-expanded', on ? 'true' : 'false');
            more.textContent = on ? L('less') : L('all');
        }
        function updateMore() {
            if (root.classList.contains('anime-shelf--expanded')) { more.hidden = false; return; }
            more.hidden = grid.scrollWidth <= grid.clientWidth + 4;
        }
        more.addEventListener('click', function () {
            setExpanded(!root.classList.contains('anime-shelf--expanded'));
            if (!root.classList.contains('anime-shelf--expanded')) grid.scrollLeft = 0;
        });
        window.addEventListener('resize', updateMore);

        fetch(API + '/animes')
            .then(function (r) { if (!r.ok) throw new Error(); return r.json(); })
            .then(function (animes) {
                var byStatus = {};
                ORDER.forEach(function (s) { byStatus[s] = []; });
                animes.forEach(function (a) { (byStatus[a.status] = byStatus[a.status] || []).push(a); });

                // Mostra só as abas com algum anime (assistindo/assistidos/quero ver sempre aparecem)
                var visible = ORDER.filter(function (s) {
                    return byStatus[s].length || s === 'assistindo' || s === 'assistido' || s === 'quero_ver';
                });
                var first = visible.find(function (s) { return byStatus[s].length; }) || visible[0];

                function show(status) {
                    tabs.querySelectorAll('.filter-pill').forEach(function (b) {
                        var on = b.dataset.status === status;
                        b.classList.toggle('active', on);
                        b.setAttribute('aria-selected', on ? 'true' : 'false');
                    });
                    var list = byStatus[status];
                    grid.innerHTML = list.length
                        ? list.map(cardHtml).join('')
                        : '<div class="anime-shelf-empty"><img src="imagens/decor/sapo-lendo-livro.webp" alt="">' + L('empty') + '</div>';
                    grid.classList.toggle('anime-grid--empty', !list.length);
                    grid.scrollLeft = 0;
                    setExpanded(false);
                    updateMore();
                }

                tabs.innerHTML = visible.map(function (s) {
                    return '<button type="button" role="tab" class="filter-pill" data-status="' + s + '">' +
                        L(s) + ' <span class="anime-tab-count">' + byStatus[s].length + '</span></button>';
                }).join('');
                tabs.addEventListener('click', function (e) {
                    var b = e.target.closest('.filter-pill');
                    if (b) show(b.dataset.status);
                });
                show(first);
            })
            .catch(function () {
                grid.innerHTML = '<div class="anime-shelf-empty"><img src="imagens/decor/icon-sapo-triste.webp" alt="">' + L('error') + '</div>';
            });
    }

    window.initAnimeShelf = initAnimeShelf;
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { initAnimeShelf(); });
    } else {
        initAnimeShelf();
    }
})();
