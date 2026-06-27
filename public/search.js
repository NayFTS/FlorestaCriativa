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
