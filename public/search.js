// Aplica o tema salvo antes do primeiro paint
(function () {
    const t = localStorage.getItem('theme');
    if (t) document.documentElement.setAttribute('data-theme', t);

    function injectThemeToggle() {
        const menu = document.getElementById('menu');
        if (!menu || document.getElementById('themeToggle')) return;
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const btn = document.createElement('button');
        btn.id = 'themeToggle';
        btn.className = 'theme-toggle';
        btn.textContent = isDark ? 'Modo Claro' : 'Modo Escuro';
        btn.onclick = function () {
            const dark = document.documentElement.getAttribute('data-theme') === 'dark';
            const next = dark ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('theme', next);
            btn.textContent = next === 'dark' ? 'Modo Claro' : 'Modo Escuro';
        };
        menu.appendChild(btn);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectThemeToggle);
    } else {
        injectThemeToggle();
    }
})();

const API_BASE = location.hostname === 'localhost' ? '' : '/api';

function toggleMenu() {
    const menu = document.getElementById('menu');
    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
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
        .then(response => response.json())
        .then(data => {
            const resultContainer = document.getElementById('searchResults');
            resultContainer.innerHTML = '';
            resultContainer.style.display = 'block';

            if (data.length === 0) {
                resultContainer.innerHTML = '<p>Nenhum resultado encontrado.</p>';
                return;
            }

            data.forEach(post => {
                const resultItem = document.createElement('div');
                resultItem.className = 'search-result';

                const titleElement = document.createElement('h3');
                titleElement.innerHTML = `<a href="post.html?id=${post._id}">${post.title}</a>`;
                resultItem.appendChild(titleElement);

                if (post.categories && post.categories.length > 0) {
                    const categoryElement = document.createElement('p');
                    categoryElement.innerHTML = `<strong>Categoria(s):</strong> ${post.categories.join(', ')}`;
                    resultItem.appendChild(categoryElement);
                }

                const excerptElement = document.createElement('p');
                excerptElement.innerHTML = post.content.substring(0, 100) + '...';
                resultItem.appendChild(excerptElement);

                resultContainer.appendChild(resultItem);
            });
        })
        .catch(error => console.error('Erro na busca:', error));
}

function updateLoginButton() {
    const loginBtn = document.getElementById('loginButton');
    if (!loginBtn) return;

    fetch(`${API_BASE}/user-info`)
        .then(response => {
            if (!response.ok) {
                loginBtn.textContent = 'Login';
                loginBtn.href = 'login.html';
                return null;
            }
            return response.json();
        })
        .then(data => {
            if (data && data.username) {
                loginBtn.textContent = `Bem-vindo, ${data.username}`;
                loginBtn.href = 'dashboard.html';
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

                const postItem = document.createElement('div');
                postItem.className = 'post-container';
                postItem.innerHTML =
                    `<h3><a href="${link}">${post.title}</a></h3>` +
                    (post.image_path ? `<img src="/imagens/uploads/${post.image_path}" alt="${post.title}" loading="lazy">` : '') +
                    `<p>${excerpt}</p>` +
                    `<a href="${link}" class="leia-mais">Leia mais</a>`;
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
