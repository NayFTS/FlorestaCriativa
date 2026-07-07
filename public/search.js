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

if (typeof window.API_BASE === 'undefined') {
    window.API_BASE = '/api';
}

function toggleMenu() {
    const menu = document.getElementById('menu');
    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
}

function toggleDrawer() {
    document.getElementById('navDrawer')?.classList.toggle('open');
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

function _escapeHtmlGlobal(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(String(str)));
    return div.innerHTML;
}

function loadSiteSettings() {
    const currentlyList = document.getElementById('currentlyList');
    const moodEmoji = document.querySelector('#moodWidget .widget-mood-emoji');
    const moodLabel = document.querySelector('#moodWidget .widget-mood-label');
    const nowPlayingTrack = document.getElementById('nowPlayingTrack');
    const nowPlayingArtist = document.getElementById('nowPlayingArtist');
    const featuredCaption = document.getElementById('featuredCaption');
    if (!currentlyList && !moodEmoji && !nowPlayingTrack && !featuredCaption) return;

    fetch(`${API_BASE}/settings`)
        .then(r => r.json())
        .then(s => {
            if (currentlyList) {
                currentlyList.innerHTML = (s.currently && s.currently.length)
                    ? s.currently.map(c => `<li>${_escapeHtmlGlobal(c)}</li>`).join('')
                    : '<li>Nada por aqui no momento.</li>';
            }
            if (moodEmoji) moodEmoji.textContent = s.moodEmoji || '🐸';
            if (moodLabel) moodLabel.textContent = s.moodLabel || '';
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

function toggleSearch() {
    const overlay = document.getElementById('searchOverlay');
    if (!overlay) return;
    const open = overlay.style.display === 'flex';
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
                resultContainer.innerHTML = '<p>Nenhum resultado encontrado.</p>';
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
                    categoryElement.appendChild(document.createTextNode(post.categories.join(', ')));
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

function loadPosts(pageUrl, containerId, page, limit) {
    if (page === undefined) page = 1;
    if (limit === undefined) limit = 5;
    const container = document.getElementById(containerId);

    if (page === 1) {
        container.innerHTML = '<p class="post-loading">Carregando...</p>';
    }

    const existing = document.getElementById('loadMoreBtn');
    if (existing) existing.remove();

    fetch(`${API_BASE}/posts?url=${encodeURIComponent(pageUrl)}&page=${page}&limit=${limit}`)
        .then(response => response.json())
        .then(data => {
            if (page === 1) container.innerHTML = '';

            const posts = data.posts || [];
            const total = data.total || 0;

            if (posts.length === 0 && page === 1) {
                container.innerHTML = '<p>Nenhum post encontrado.</p>';
                return;
            }

            posts.forEach(post => {
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
                        ? `<a href="${link}" class="post-img-link" tabindex="-1" aria-hidden="true"><img src="${imgSrc}" alt="${post.title}" loading="lazy"></a>`
                        : '<div class="post-img-placeholder"></div>') +
                    `<div class="post-card-body">
                        <h3><a href="${link}">${post.title}</a></h3>
                        <p>${excerpt}</p>
                        <div class="post-card-footer">
                            <a href="${link}" class="leia-mais">Leia mais</a>
                            ${dateStr ? `<time class="post-date">${dateStr}</time>` : ''}
                        </div>
                    </div>`;
                container.appendChild(postItem);
            });

            const loaded = (page - 1) * limit + posts.length;
            if (loaded < total) {
                const btn = document.createElement('button');
                btn.id = 'loadMoreBtn';
                btn.className = 'load-more-btn';
                btn.textContent = 'Carregar mais';
                btn.onclick = () => loadPosts(pageUrl, containerId, page + 1, limit);
                container.parentNode.insertBefore(btn, container.nextSibling);
            }
        })
        .catch(error => {
            console.error('Erro ao buscar posts:', error);
            if (page === 1) {
                container.innerHTML = '<p class="post-error">Erro ao carregar os posts. Tente novamente mais tarde.</p>';
            }
        });
}
