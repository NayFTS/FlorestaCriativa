(function () {
    const STORAGE_KEY = 'lang';
    const DEFAULT_LANG = 'pt';

    const translations = {
        pt: {
            'footer.login': 'Login',
            'search.title': 'Pesquisar',
            'search.placeholder': 'Pesquise por termos...',
            'search.submit': 'Pesquisar',
            'search.filters': 'Filtros',
            'search.clear': 'Limpar',
            'search.close': 'Fechar',
            'mood.title': 'humor',
            'mood.subtitle': 'hoje me sinto',
            'banner.alt': 'Bem-vinde ao meu cantinho! Onde as ideias pulam soltas, crescem desenfreadas e florescem lindamente',
            'home.recentPosts': '🌿 Posts Recentes',
            'home.qlVerde': 'Hobbies e gostos',
            'home.qlSapo': 'códigos e projetos',
            'home.qlRascunhos': 'textos e ideias soltas',
            'home.qlSobre': 'quem sou eu?',
            'home.qlGuestbookTitle': 'Livro de Visitas',
            'home.qlGuestbookDesc': 'veja as mensagens',
            'home.readMore': 'Leia mais →',
            'home.postsLoadError': 'Não foi possível carregar os posts.',
            'home.featuredEmpty': 'Nenhum post ainda.',
            'home.featuredError': 'Não foi possível carregar.',
            'home.featuredLikes': '— {n} curtidas',
            'home.nowPlaying': '🎵 Ouvindo agora',
            'home.spotifyLink': 'Ouvir no Spotify ↗',
            'home.gardenLogPosted': 'publicou',
            'home.gardenLogEmpty': 'Nenhuma postagem ainda.',
            'home.guestbookTitle': '📝 Livro de Visitas',
            'home.guestbookSubtitle': 'Deixe uma mensagem para mim ♡',
            'home.guestbookName': 'Seu nome:',
            'home.guestbookMessage': 'Mensagem:',
            'home.guestbookSend': 'Enviar',
            'home.guestbookEmpty': 'Nenhuma mensagem ainda — seja a primeira!',
            'home.guestbookLoadError': 'Não foi possível carregar as mensagens.',
            'home.guestbookSendError': 'Erro ao enviar mensagem.',
            'home.guestbookMore': 'Ver mais mensagens',
            'subscribe.title': 'Receba novidades por e-mail',
            'subscribe.emailPlaceholder': 'seu@email.com',
            'subscribe.emailAriaLabel': 'E-mail',
            'subscribe.submit': 'Inscrever-se',
            'subscribe.btnAriaLabel': 'Inscreva-se por e-mail',
            'subscribe.error': 'Erro ao se inscrever.',
            'nav.verde': 'Verde Inspiração',
            'nav.sapo': 'Sapo Imaginário',
            'nav.rascunhos': 'Rascunhos da Floresta',
            'nav.sobre': 'Sobre Mim',
            'nav.bottomBlog': 'Blog',
            'nav.bottomProjetos': 'Projetos',
            'nav.bottomEscrita': 'Escrita',
            'search.triggerPlaceholder': 'Pesquisar...',
            'search.openAria': 'Abrir busca',
            'dashboard.welcome': 'Bem-vindo!',
            'dashboard.welcomeUser': 'Bem-vindo, {name}!',
            'lang.pt': 'Português',
            'lang.en': 'English'
        },
        en: {
            'footer.login': 'Login',
            'search.title': 'Search',
            'search.placeholder': 'Search for terms...',
            'search.submit': 'Search',
            'search.filters': 'Filters',
            'search.clear': 'Clear',
            'search.close': 'Close',
            'mood.title': 'mood',
            'mood.subtitle': 'today I feel',
            'banner.alt': 'Welcome to my little place, where ideas hop, grow and bloom',
            'home.recentPosts': '🌿 Recent Posts',
            'home.qlVerde': 'Hobbies and interests',
            'home.qlSapo': 'code and projects',
            'home.qlRascunhos': 'loose texts and ideas',
            'home.qlSobre': 'who am I?',
            'home.qlGuestbookTitle': 'Guestbook',
            'home.qlGuestbookDesc': 'see the messages',
            'home.readMore': 'Read more →',
            'home.postsLoadError': "Couldn't load posts.",
            'home.featuredEmpty': 'No posts yet.',
            'home.featuredError': "Couldn't load.",
            'home.featuredLikes': '— {n} likes',
            'home.nowPlaying': '🎵 Now Playing',
            'home.spotifyLink': 'Listen on Spotify ↗',
            'home.gardenLogPosted': 'posted',
            'home.gardenLogEmpty': 'No posts yet.',
            'home.guestbookTitle': '📝 Guestbook',
            'home.guestbookSubtitle': 'Leave me a message',
            'home.guestbookName': 'Your name:',
            'home.guestbookMessage': 'Message:',
            'home.guestbookSend': 'Send',
            'home.guestbookEmpty': 'No messages yet — be the first!',
            'home.guestbookLoadError': "Couldn't load messages.",
            'home.guestbookSendError': 'Error sending message.',
            'home.guestbookMore': 'See more messages',
            'subscribe.title': 'Get news by email',
            'subscribe.emailPlaceholder': 'your@email.com',
            'subscribe.emailAriaLabel': 'Email',
            'subscribe.submit': 'Subscribe',
            'subscribe.btnAriaLabel': 'Subscribe by email',
            'subscribe.error': 'Error subscribing.',
            'nav.verde': 'Green Inspiration',
            'nav.sapo': 'Imaginary Frog',
            'nav.rascunhos': 'Forest Drafts',
            'nav.sobre': 'About Me',
            'nav.bottomBlog': 'Blog',
            'nav.bottomProjetos': 'Projects',
            'nav.bottomEscrita': 'Writing',
            'search.triggerPlaceholder': 'Search...',
            'search.openAria': 'Open search',
            'dashboard.welcome': 'Welcome!',
            'dashboard.welcomeUser': 'Welcome, {name}!',
            'lang.pt': 'Português',
            'lang.en': 'English'
        }
    };

    function getLang() {
        const stored = localStorage.getItem(STORAGE_KEY);
        return (stored === 'pt' || stored === 'en') ? stored : DEFAULT_LANG;
    }

    function t(key, lang) {
        lang = lang || getLang();
        const dict = translations[lang] || translations[DEFAULT_LANG];
        if (dict && dict[key] !== undefined) return dict[key];
        return translations[DEFAULT_LANG][key] !== undefined ? translations[DEFAULT_LANG][key] : key;
    }

    function applyTranslations(root) {
        root = root || document;
        const lang = getLang();

        root.querySelectorAll('[data-i18n]').forEach(el => {
            el.textContent = t(el.getAttribute('data-i18n'), lang);
        });
        root.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder'), lang));
        });
        root.querySelectorAll('[data-i18n-aria-label]').forEach(el => {
            el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria-label'), lang));
        });
        root.querySelectorAll('[data-i18n-alt]').forEach(el => {
            el.setAttribute('alt', t(el.getAttribute('data-i18n-alt'), lang));
        });

        document.documentElement.setAttribute('lang', lang === 'en' ? 'en' : 'pt-BR');

        document.querySelectorAll('.lang-toggle-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.lang === lang);
        });
    }

    function setLang(lang) {
        if (lang !== 'pt' && lang !== 'en') return;
        if (getLang() === lang) return;
        localStorage.setItem(STORAGE_KEY, lang);
        // Recarrega em vez de só reaplicar as traduções estáticas: posts/histórias são
        // buscados via fetch com título/conteúdo em pt ou en (ver postText() em search.js),
        // e não há um jeito barato de re-renderizar tudo isso sem refazer as chamadas.
        location.reload();
    }

    function toggleLang() {
        setLang(getLang() === 'pt' ? 'en' : 'pt');
    }

    function injectLangToggle() {
        document.querySelectorAll('.theme-toggle-target').forEach(target => {
            if (target.querySelector('.lang-toggle')) return;
            const lang = getLang();
            const wrap = document.createElement('div');
            wrap.className = 'lang-toggle';
            wrap.setAttribute('role', 'group');
            wrap.setAttribute('aria-label', 'Idioma / Language');
            ['pt', 'en'].forEach(code => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'lang-toggle-btn' + (code === lang ? ' active' : '');
                btn.dataset.lang = code;
                btn.textContent = code.toUpperCase();
                btn.setAttribute('aria-label', t('lang.' + code));
                btn.onclick = () => setLang(code);
                wrap.appendChild(btn);
            });
            target.appendChild(wrap);
        });
    }

    window.i18n = { getLang, setLang, toggleLang, t, applyTranslations, translations };

    function init() {
        applyTranslations();
        injectLangToggle();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
