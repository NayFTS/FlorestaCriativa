(function () {
    const t = localStorage.getItem('theme');
    if (t) document.documentElement.setAttribute('data-theme', t);

    function setButtonState(btn) {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        btn.innerHTML = isDark
            ? '<img src="imagens/decor/icon-sol.png" alt="" class="theme-toggle-icon">'
            : '<img src="imagens/decor/icon-lua.png" alt="" class="theme-toggle-icon">';
        btn.setAttribute('aria-label', isDark ? 'Ativar modo claro' : 'Ativar modo escuro');
    }

    function toggleTheme() {
        const dark = document.documentElement.getAttribute('data-theme') === 'dark';
        const next = dark ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
        document.querySelectorAll('.theme-toggle').forEach(setButtonState);
    }

    function injectThemeToggle() {
        // Layout novo (sidebar/drawer): um botão por container marcado
        const targets = document.querySelectorAll('.theme-toggle-target');
        if (targets.length) {
            targets.forEach(target => {
                if (target.querySelector('.theme-toggle')) return;
                const btn = document.createElement('button');
                btn.className = 'theme-toggle';
                btn.onclick = toggleTheme;
                setButtonState(btn);
                target.appendChild(btn);
            });
            return;
        }

        // Layout antigo (nav horizontal) — mantido para páginas administrativas
        if (document.getElementById('themeToggle')) return;
        const btn = document.createElement('button');
        btn.id = 'themeToggle';
        btn.onclick = toggleTheme;
        setButtonState(btn);
        const menu = document.getElementById('menu');
        if (menu) {
            btn.className = 'theme-toggle';
            menu.appendChild(btn);
        } else {
            btn.className = 'theme-toggle theme-toggle-float';
            document.body.appendChild(btn);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectThemeToggle);
    } else {
        injectThemeToggle();
    }
})();

(function () {
    function injectCornerVines() {
        if (!document.body.classList.contains('page-public')) return;
        if (document.querySelector('.corner-vine')) return;
        const corners = [
            ['corner-vine-tr', 'imagens/decor/planta-pendente-folhas-2.png'],
            ['corner-vine-bl', 'imagens/decor/planta-galho-vertical-folhas.png'],
            ['corner-vine-br', 'imagens/decor/planta-galho-vertical-folhas-2.png'],
            ['corner-signpost-br', 'imagens/decor/placa-madeira-seta-direcao.png'],
        ];
        corners.forEach(([cls, src]) => {
            const img = document.createElement('img');
            img.src = src;
            img.alt = '';
            img.setAttribute('aria-hidden', 'true');
            img.loading = 'lazy';
            img.className = 'corner-vine ' + cls;
            document.body.appendChild(img);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectCornerVines);
    } else {
        injectCornerVines();
    }
})();

if (typeof window.API_BASE === 'undefined') {
    window.API_BASE = '/api';
}

function toggleMenu() {
    const menu = document.getElementById('menu');
    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
}

function toggleDrawer() {
    const drawer = document.getElementById('navDrawer');
    const opening = !!drawer && !drawer.classList.contains('open');
    if (opening) {
        const searchOverlay = document.getElementById('searchOverlay');
        if (searchOverlay) searchOverlay.style.display = 'none';
    }
    drawer?.classList.toggle('open');
    document.getElementById('drawerOverlay')?.classList.toggle('open');
}

function markActiveNavLinks() {
    const here = location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.sidebar-nav a, .bottom-nav a, .topbar-nav a').forEach(a => {
        const href = a.getAttribute('href');
        if (href === here) a.classList.add('active');
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', markActiveNavLinks);
} else {
    markActiveNavLinks();
}

function _emptyStateHtml(imgSrc, text, extraStyle, modifierClass) {
    const style = extraStyle ? ` style="${extraStyle}"` : '';
    const cls = 'empty-state' + (modifierClass ? ' ' + modifierClass : '');
    return `<div class="${cls}"${style}><img src="${imgSrc}" alt="" loading="lazy"><p>${text}</p></div>`;
}

function _escapeHtmlGlobal(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(String(str)));
    return div.innerHTML;
}

// ── Curtidas (persistidas no navegador via localStorage, sem precisar de login) ──
function _getLikedPostIds() {
    try {
        return JSON.parse(localStorage.getItem('likedPosts') || '[]');
    } catch (e) {
        return [];
    }
}

function _isPostLiked(id) {
    return _getLikedPostIds().includes(id);
}

function _setPostLiked(id, liked) {
    const ids = _getLikedPostIds();
    const next = liked ? [...new Set([...ids, id])] : ids.filter(x => x !== id);
    localStorage.setItem('likedPosts', JSON.stringify(next));
}

const LIKE_ICON_SAD = 'imagens/decor/icon-sapo-triste.png';
const LIKE_ICON_HEART = 'imagens/decor/icon-sapo-heart.png';

function _setLikeIcon(btn, liked) {
    const iconEl = btn.querySelector('.like-icon');
    if (iconEl) iconEl.src = liked ? LIKE_ICON_HEART : LIKE_ICON_SAD;
}

function _wireLikeButton(btn, postId, initialLikes) {
    const countEl = btn.querySelector('.like-count');
    let likes = initialLikes || 0;
    let liked = _isPostLiked(postId);
    btn.classList.toggle('liked', liked);
    _setLikeIcon(btn, liked);

    btn.addEventListener('click', () => {
        const nextLiked = !liked;
        const endpoint = nextLiked ? 'like' : 'unlike';
        btn.disabled = true;
        fetch(`${API_BASE}/posts/${postId}/${endpoint}`, { method: 'POST' })
            .then(r => {
                if (!r.ok) throw new Error('like request failed');
                return r.json();
            })
            .then(data => {
                liked = nextLiked;
                _setPostLiked(postId, liked);
                btn.classList.toggle('liked', liked);
                _setLikeIcon(btn, liked);
                likes = typeof data.likes === 'number' ? data.likes : likes;
                if (countEl) countEl.textContent = likes;
            })
            .catch(() => {})
            .finally(() => { btn.disabled = false; });
    });
}

function loadSiteSettings() {
    const currentlyLists = document.querySelectorAll('.js-currently-list');
    const moodWidgets = document.querySelectorAll('.js-mood-widget');
    const nowPlayingTrack = document.getElementById('nowPlayingTrack');
    const nowPlayingArtist = document.getElementById('nowPlayingArtist');
    const featuredCaption = document.getElementById('featuredCaption');
    if (!currentlyLists.length && !moodWidgets.length && !nowPlayingTrack && !featuredCaption) return;

    fetch(`${API_BASE}/settings`)
        .then(r => r.json())
        .then(s => {
            currentlyLists.forEach(list => {
                list.innerHTML = (s.currently && s.currently.length)
                    ? s.currently.map(c => `<li>${_escapeHtmlGlobal(c)}</li>`).join('')
                    : '<li>Nada por aqui no momento.</li>';
            });
            moodWidgets.forEach(widget => {
                const emoji = widget.querySelector('.widget-mood-emoji');
                const label = widget.querySelector('.widget-mood-label');
                if (emoji) emoji.textContent = s.moodEmoji || '🐸';
                if (label) label.textContent = s.moodLabel || '';
            });
            if (nowPlayingTrack) nowPlayingTrack.textContent = s.nowPlayingTrack || '';
            if (nowPlayingArtist) nowPlayingArtist.textContent = s.nowPlayingArtist || '';
            if (featuredCaption) featuredCaption.textContent = s.featuredCaption || '';
        })
        .catch(() => {});
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadSiteSettings);
} else {
    loadSiteSettings();
}

function _formatMsAsTime(ms) {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${String(sec).padStart(2, '0')}`;
}

function _updateNowPlayingProgressUI(progressMs, durationMs) {
    const fill = document.querySelector('.widget-progress-fill');
    if (fill) fill.style.width = Math.min(100, (progressMs / durationMs) * 100) + '%';

    const elapsedEl = document.getElementById('nowPlayingElapsed');
    const durationEl = document.getElementById('nowPlayingDuration');
    if (elapsedEl && durationEl) {
        elapsedEl.textContent = _formatMsAsTime(progressMs);
        durationEl.textContent = _formatMsAsTime(durationMs);
        elapsedEl.hidden = false;
        durationEl.hidden = false;
    }
}

// Entre os polls de 20s ao servidor, extrapola o progresso localmente a cada
// segundo (baseado no timestamp da última resposta), pra barra e tempo
// avançarem sozinhos sem precisar dar refresh na página.
let _spotifyTicker = null;
let _spotifyTickerInterval = null;

function _startSpotifyProgressTicker(progressMs, durationMs) {
    _spotifyTicker = { progressMs, durationMs, fetchedAt: Date.now() };
    if (_spotifyTickerInterval) return;
    _spotifyTickerInterval = setInterval(() => {
        if (!_spotifyTicker) return;
        const elapsedSinceFetch = Date.now() - _spotifyTicker.fetchedAt;
        const currentProgress = Math.min(_spotifyTicker.progressMs + elapsedSinceFetch, _spotifyTicker.durationMs);
        _updateNowPlayingProgressUI(currentProgress, _spotifyTicker.durationMs);
    }, 1000);
}

function _stopSpotifyProgressTicker() {
    _spotifyTicker = null;
    if (_spotifyTickerInterval) {
        clearInterval(_spotifyTickerInterval);
        _spotifyTickerInterval = null;
    }
}

function loadSpotifyNowPlaying() {
    const trackEl = document.getElementById('nowPlayingTrack');
    const artistEl = document.getElementById('nowPlayingArtist');
    if (!trackEl) return;

    fetch(`${API_BASE}/spotify/now-playing`)
        .then(r => r.json())
        .then(data => {
            const playIcon = document.getElementById('nowPlayingPlayIcon');

            // Sem conexão, sem música tocando ou erro: mantém o fallback estático do /settings
            if (!data.connected || !data.playing) {
                if (playIcon) playIcon.classList.remove('is-playing');
                _stopSpotifyProgressTicker();
                return;
            }

            trackEl.textContent = data.track;
            if (artistEl) artistEl.textContent = data.artist;
            if (playIcon) playIcon.classList.add('is-playing');

            const cover = document.getElementById('nowPlayingCover');
            if (cover && data.albumArt) {
                cover.src = data.albumArt;
                cover.hidden = false;
            }

            const link = document.getElementById('nowPlayingLink');
            if (link && data.url) {
                link.href = data.url;
                link.hidden = false;
            }

            if (data.durationMs) {
                _updateNowPlayingProgressUI(data.progressMs, data.durationMs);
                _startSpotifyProgressTicker(data.progressMs, data.durationMs);
            }
        })
        .catch(() => {});
}

function initSpotifyNowPlaying() {
    if (!document.getElementById('nowPlayingTrack')) return;
    loadSpotifyNowPlaying();
    setInterval(loadSpotifyNowPlaying, 20000);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSpotifyNowPlaying);
} else {
    initSpotifyNowPlaying();
}

function toggleSearch() {
    const overlay = document.getElementById('searchOverlay');
    if (!overlay) return;
    const open = overlay.style.display === 'flex';
    if (!open) {
        document.getElementById('navDrawer')?.classList.remove('open');
        document.getElementById('drawerOverlay')?.classList.remove('open');
    }
    overlay.style.display = open ? 'none' : 'flex';
    if (!open) setTimeout(() => document.getElementById('searchBar')?.focus(), 50);
}

function closeSearchOverlay(e) {
    if (e.target.id === 'searchOverlay') toggleSearch();
}

function toggleFilters() {
    const filters = document.getElementById('advancedFilters');
    filters.style.display = filters.style.display === 'none' ? 'block' : 'none';
}

function clearSearch() {
    document.getElementById('searchBar').value = '';
    document.querySelectorAll('.category').forEach(cb => cb.checked = false);
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';
    document.getElementById('searchResults').innerHTML = '';
    document.getElementById('advancedFilters').style.display = 'none';
}

function search() {
    const query = document.getElementById('searchBar').value.trim();
    const selectedCategories = Array.from(document.querySelectorAll('.category:checked')).map(cb => cb.value);
    const startDate = document.getElementById('startDate').value || '';
    const endDate = document.getElementById('endDate').value || '';

    if (!query && selectedCategories.length === 0 && !startDate && !endDate) {
        alert('Por favor, preencha ao menos um campo para realizar a pesquisa.');
        return;
    }

    const searchURL = `${API_BASE}/search?q=${encodeURIComponent(query)}&category=${selectedCategories.join(',')}&startDate=${startDate}&endDate=${endDate}`;

    fetch(searchURL)
        .then(response => {
            if (!response.ok) throw new Error('Erro na busca');
            return response.json();
        })
        .then(data => {
            const resultContainer = document.getElementById('searchResults');
            resultContainer.innerHTML = '';
            resultContainer.style.display = 'block';

            if (!data.length) {
                resultContainer.innerHTML = _emptyStateHtml('imagens/decor/sapo-espiando-agua-1.png', 'Nenhum resultado encontrado.', null, 'empty-state--lg');
                return;
            }

            data.forEach(post => {
                const resultItem = document.createElement('div');
                resultItem.className = 'search-result';

                const link = post.slug ? `post.html?slug=${post.slug}` : `post.html?id=${post._id}`;
                const titleElement = document.createElement('h3');
                const a = document.createElement('a');
                a.href = link;
                a.textContent = post.title;
                titleElement.appendChild(a);
                resultItem.appendChild(titleElement);

                if (post.categories && post.categories.length > 0) {
                    const categoryElement = document.createElement('p');
                    const strong = document.createElement('strong');
                    strong.textContent = 'Categoria(s): ';
                    categoryElement.appendChild(strong);
                    categoryElement.appendChild(document.createTextNode([...new Set(post.categories)].join(', ')));
                    resultItem.appendChild(categoryElement);
                }

                const tmp = document.createElement('div');
                tmp.innerHTML = post.content || '';
                const plain = (tmp.textContent || '').trim();
                const excerptElement = document.createElement('p');
                excerptElement.textContent = plain.length > 120 ? plain.substring(0, 120) + '...' : plain;
                resultItem.appendChild(excerptElement);

                resultContainer.appendChild(resultItem);
            });
        })
        .catch(error => console.error('Erro na busca:', error));
}

function updateLoginButton() {
    const loginBtns = document.querySelectorAll('.login-link');
    if (!loginBtns.length) return;

    fetch(`${API_BASE}/user-info`)
        .then(response => {
            if (!response.ok) {
                loginBtns.forEach(btn => { btn.textContent = 'Login'; btn.href = 'login.html'; });
                return null;
            }
            return response.json();
        })
        .then(data => {
            if (data && data.username) {
                loginBtns.forEach(btn => {
                    btn.textContent = `Bem-vindo, ${data.username}`;
                    btn.href = 'dashboard.html';
                });
            }
        })
        .catch(error => console.error('Erro ao verificar autenticação:', error));
}

updateLoginButton();

function _renderPostCard(post) {
    const temp = document.createElement('div');
    temp.innerHTML = post.content;
    const text = (temp.textContent || temp.innerText || '').trim();
    const excerpt = text.length > 150 ? text.substring(0, 150) + '...' : text;
    const link = post.slug
        ? `post.html?slug=${post.slug}`
        : `post.html?id=${post._id}`;
    const imgSrc = post.image_path
        ? (post.image_path.startsWith('http') ? post.image_path : '/imagens/uploads/' + post.image_path)
        : null;
    const dateStr = post.publish_date
        ? new Date(post.publish_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
        : '';

    const postItem = document.createElement('div');
    postItem.className = 'post-container';
    postItem.innerHTML =
        (imgSrc
            ? `<a href="${link}" class="post-img-link" tabindex="-1" aria-hidden="true"><img src="${imgSrc}" alt="${_escapeHtmlGlobal(post.title)}" loading="lazy"></a>`
            : '<div class="post-img-placeholder"></div>') +
        `<div class="post-card-body">
            <h3><a href="${link}">${_escapeHtmlGlobal(post.title)}</a></h3>
            <p>${_escapeHtmlGlobal(excerpt)}</p>
            <div class="post-card-stats">
                <button type="button" class="like-btn" aria-label="Curtir post"><img class="like-icon" src="imagens/decor/icon-sapo-triste.png" alt="" loading="lazy"> <span class="like-count">${post.likes || 0}</span></button>
                <span class="comment-count"><img src="imagens/decor/icone-comentario-balao.png" alt="" class="comment-icon"> ${post.commentsCount || 0}</span>
            </div>
            <div class="post-card-footer">
                <a href="${link}" class="leia-mais">Leia mais</a>
                ${dateStr ? `<time class="post-date">${dateStr}</time>` : ''}
            </div>
        </div>`;
    _wireLikeButton(postItem.querySelector('.like-btn'), post._id, post.likes);
    return postItem;
}

// Intervalo de páginas com reticências, ex: [1, '...', 4, 5, 6, '...', 12]
function _paginationRange(current, total) {
    const range = [];
    for (let i = 1; i <= total; i++) {
        if (i === 1 || i === total || (i >= current - 1 && i <= current + 1)) range.push(i);
    }
    const withDots = [];
    let prev = 0;
    range.forEach(i => {
        if (prev && i - prev > 1) withDots.push('...');
        withDots.push(i);
        prev = i;
    });
    return withDots;
}

function _renderPagination(el, page, limit, total, onGoto) {
    if (!el) return;
    el.innerHTML = '';
    const pageCount = Math.max(1, Math.ceil(total / limit));
    if (pageCount <= 1) return;

    function makeBtn(label, targetPage, opts) {
        opts = opts || {};
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = label;
        btn.className = 'pagination-btn' + (opts.active ? ' active' : '');
        if (opts.disabled) btn.disabled = true;
        else btn.onclick = () => onGoto(targetPage);
        return btn;
    }

    el.appendChild(makeBtn('‹', page - 1, { disabled: page <= 1 }));
    _paginationRange(page, pageCount).forEach(p => {
        if (p === '...') {
            const span = document.createElement('span');
            span.className = 'pagination-ellipsis';
            span.textContent = '…';
            el.appendChild(span);
        } else {
            el.appendChild(makeBtn(String(p), p, { active: p === page }));
        }
    });
    el.appendChild(makeBtn('›', page + 1, { disabled: page >= pageCount }));
}

function initPostListing(pageUrl, containerId) {
    const container = document.getElementById(containerId);
    const controls = document.getElementById(containerId + '-controls');
    const pagination = document.getElementById(containerId + '-pagination');
    const state = { page: 1, limit: 6, category: '', sort: 'latest' };

    function render() {
        container.innerHTML = '<p class="post-loading">Carregando...</p>';
        const params = new URLSearchParams({ url: pageUrl, page: state.page, limit: state.limit, sort: state.sort });
        if (state.category) params.set('category', state.category);

        fetch(`${API_BASE}/posts?${params.toString()}`)
            .then(response => response.json())
            .then(data => {
                const posts = data.posts || [];
                const total = data.total || 0;
                container.innerHTML = '';

                if (posts.length === 0) {
                    container.innerHTML = _emptyStateHtml('imagens/decor/sapo-lendo-livro.png', 'Nenhum post encontrado.');
                } else {
                    posts.forEach(post => container.appendChild(_renderPostCard(post)));
                }

                _renderPagination(pagination, state.page, state.limit, total, (goto) => {
                    state.page = goto;
                    render();
                    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
                });
            })
            .catch(error => {
                console.error('Erro ao buscar posts:', error);
                container.innerHTML = '<p class="post-error">Erro ao carregar os posts. Tente novamente mais tarde.</p>';
            });
    }

    if (controls) {
        const sortSelect = controls.querySelector('.listing-sort');
        if (sortSelect) {
            sortSelect.addEventListener('change', () => {
                state.sort = sortSelect.value;
                state.page = 1;
                render();
            });
        }

        const pillsEl = controls.querySelector('.listing-pills');
        if (pillsEl) {
            fetch(`${API_BASE}/posts/categories?url=${encodeURIComponent(pageUrl)}`)
                .then(response => response.json())
                .then(categories => {
                    (categories || []).forEach(cat => {
                        const btn = document.createElement('button');
                        btn.type = 'button';
                        btn.className = 'filter-pill';
                        btn.textContent = cat;
                        btn.dataset.category = cat;
                        pillsEl.appendChild(btn);
                    });
                })
                .catch(() => {});

            pillsEl.addEventListener('click', (e) => {
                const btn = e.target.closest('.filter-pill');
                if (!btn) return;
                pillsEl.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.category = btn.dataset.category || '';
                state.page = 1;
                render();
            });
        }
    }

    render();
}
