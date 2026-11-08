(function () {
    const STORAGE_KEY = 'lang';
    const DEFAULT_LANG = 'pt';

    // Categorias de post são texto livre digitado no publicar/editPost, mas as fixas
    // (ver FIXED_CATEGORIES em publicar.html/editPost.html) têm tradução conhecida pra
    // exibição pública (pills de filtro, checkboxes de busca, lista "Categoria(s)" dos
    // resultados). O valor enviado/salvo continua sempre em português — só o rótulo muda.
    const CATEGORY_TRANSLATIONS = {
        'Escrita': 'Writing',
        'Projetos': 'Projects',
        'Animes': 'Anime',
        'Jogos': 'Games',
        'Slice of Life': 'Slice of Life'
    };

    const translations = {
        pt: {
            'footer.login': 'Login',
            'search.title': 'Pesquisar',
            'search.placeholder': 'Pesquise por termos...',
            'search.submit': 'Pesquisar',
            'search.filters': 'Filtros',
            'search.clear': 'Limpar',
            'search.close': 'Fechar',
            'search.categoriesLabel': 'Categoria(s): ',
            'search.categoriesFilterLabel': 'Categorias:',
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
            'nav.bottomHobbies': 'Hobbies',
            'nav.livro': 'Livro de Visitas',
            'nav.bottomProjetos': 'Projetos',
            'nav.bottomEscrita': 'Escrita',
            'search.triggerPlaceholder': 'Pesquisar...',
            'search.openAria': 'Abrir busca',
            'dashboard.welcome': 'Bem-vindo!',
            'dashboard.welcomeUser': 'Bem-vindo, {name}!',
            'lang.pt': 'Português',
            'lang.en': 'English',
            'listing.filterAllAria': 'Filtrar por categoria',
            'listing.filterAll': 'Todos',
            'listing.sortAria': 'Ordenar posts',
            'listing.sortLatest': 'Mais recentes',
            'listing.sortOldest': 'Mais antigos',
            'listing.sortLikes': 'Mais curtidos',
            'listing.sortViews': 'Mais vistos',
            'listing.loading': 'Carregando...',
            'listing.noPostsFound': 'Nenhum post encontrado.',
            'listing.loadError': 'Erro ao carregar os posts. Tente novamente mais tarde.',
            'listing.likeAria': 'Curtir post',
            'listing.readMoreCard': 'Leia mais',
            'listing.updatesEmpty': 'Nenhuma atualização ainda.',
            'listing.emptyGeneric': 'Nada por aqui no momento.',
            'verde.subtitle': 'Meus hobbies, leituras, animes e jogos.',
            'sapo.subtitle': 'Veja um pouco do meu portfólio e projetos que estou participando!',
            'sapo.sortAria': 'Ordenar projetos',
            'sapo.viewToggleAria': 'Alternar visualização',
            'sapo.viewGridAria': 'Ver em grade',
            'sapo.viewListAria': 'Ver em lista',
            'sapo.loadingProjects': 'Carregando projetos...',
            'sapo.noProjectsYet': 'Nenhum projeto ainda. Em breve!',
            'sapo.loadProjectsError': 'Erro ao carregar projetos. Tente novamente.',
            'sapo.featuredEmpty': 'Nenhum projeto ainda.',
            'sapo.viewProjectCta': 'Ver projeto →',
            'sapo.viewProjectBtn': 'Ver Projeto ↗',
            'sapo.previewNewTab': '↗ Abrir em nova aba',
            'sapo.previewCloseAria': 'Fechar preview',
            'sapo.previewIframeTitle': 'Preview do projeto',
            'sapo.previewLoadError': 'Erro ao carregar conteúdo.',
            'rascunhos.subtitle': 'Trechos, Traduções e Idéias Perdidas',
            'rascunhos.featuredEmpty': 'Nenhum rascunho ainda.',
            'sobre.subtitle': 'A sapinha por trás da Floresta Criativa',
            'sobre.greeting': 'Olá, sou a Nay!',
            'sobre.tagline': 'Programadora nas horas vagas, escritora amadora e otaku em tempo integral',
            'sobre.aboutTitle': 'Sobre mim',
            'sobre.aboutP1': 'Bem-vinde à minha Floresta Criativa! Este é o meu espaço pessoal na internet; um lugar onde junto tudo que me move: escrita, projetos, referências e devaneios do dia a dia. Aqui não tem tema fixo, só meus pensamentos e o que eu quero conversar mas não tenho quem.',
            'sobre.aboutP2': 'Sou apaixonada por histórias em todas as formas: animes, jogos, livros, séries... e principalmente as que são criadas com base em histórias que já existem, isso mesmo, estou falando de fanfics. A escrita é o meu jeito favorito de processar o mundo e de deixar um rastro de quem eu fui em cada fase da vida.',
            'sobre.aboutP3': "É interessante como nós sendo seres humanos temos necessidade de dar significado a tudo que existe e eu não sou exceção, quero que minhas palavras alcancem os outros e tragam sorrisos, quero que você fique pensativo enquanto lê algo e, acima disso tudo, quero que pense: onde que eu consigo melhorar isso? E se ela tivesse feito tal coisa diferente? Somos naturalmente seres que buscam, estamos sempre querendo consumir e consumir e nunca estamos satisfeitos, a maneira que eu encontrei de 'saciar' essa vontade foi escrevendo e criando meu próprio mundinho.",
            'sobre.aboutP4': 'Também me aventuro pelo desenvolvimento web, onde código e criatividade andam juntos. Construir esse site foi parte do processo: aprender fazendo, errando e tentando de novo, do mesmo jeito que a escrita funciona.',
            'sobre.factDrinkLabel': 'Bebida favorita',
            'sobre.factDrinkValue': 'Água com gás e um limãozinho',
            'sobre.factWeatherLabel': 'Clima favorito',
            'sobre.factWeatherValue': 'Dia ensolarado, céu azul e limpo, com um ventinho gelado no sol quente',
            'sobre.factHobbyLabel': 'Hobby favorito',
            'sobre.factHobbyValue': 'Ler muuuuuito (e escrever um pouco)',
            'sobre.factPersonalityLabel': 'Personalidade',
            'sobre.factPersonalityValue': 'Pessoalmente me considero uma pessoa quieta, não sou muito de falar ou expressar minha opinião a menos que seja algo que eu me importe, mas sou boa para resolver conflitos e me chamaram de resolutiva esses dias, então tem isso!',
            'sobre.chipMusicais': 'Musicais',
            'sobre.chipAnimes': 'Animes',
            'sobre.chipLer': 'Ler',
            'sobre.chipMusica': 'Ouvir música',
            'sobre.chipRede': 'Balançar na rede',
            'sobre.chipCochilo': 'Cochilo pós-almoço',
            'sobre.chipPraia': 'Praia de Sergipe',
            'sobre.journeyColombia': 'Colômbia',
            'sobre.journeyCasada': 'CASADAAAAAA 💍',
            'sobre.sitemapTitle': 'O que tem por aqui',
            'sobre.sitemapVerdeDesc': 'Hobbies, animes, jogos e leituras do momento.',
            'sobre.sitemapSapoDesc': 'Projetos e experimentos de programação.',
            'sobre.sitemapRascunhosDesc': 'Textos, fanfics e tudo que escrevo.',
            'sobre.findMeTitle': 'Encontre-me por aí',
            'sobre.featuredMemoryCaption': 'Um dos meus momentos favoritos ♥'
        },
        en: {
            'footer.login': 'Login',
            'search.title': 'Search',
            'search.placeholder': 'Search for terms...',
            'search.submit': 'Search',
            'search.filters': 'Filters',
            'search.clear': 'Clear',
            'search.close': 'Close',
            'search.categoriesLabel': 'Categories: ',
            'search.categoriesFilterLabel': 'Categories:',
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
            'nav.bottomHobbies': 'Hobbies',
            'nav.livro': 'Guestbook',
            'nav.bottomProjetos': 'Projects',
            'nav.bottomEscrita': 'Writing',
            'search.triggerPlaceholder': 'Search...',
            'search.openAria': 'Open search',
            'dashboard.welcome': 'Welcome!',
            'dashboard.welcomeUser': 'Welcome, {name}!',
            'lang.pt': 'Português',
            'lang.en': 'English',
            'listing.filterAllAria': 'Filter by category',
            'listing.filterAll': 'All',
            'listing.sortAria': 'Sort posts',
            'listing.sortLatest': 'Latest',
            'listing.sortOldest': 'Oldest',
            'listing.sortLikes': 'Most liked',
            'listing.sortViews': 'Most viewed',
            'listing.loading': 'Loading...',
            'listing.noPostsFound': 'No posts found.',
            'listing.loadError': 'Error loading posts. Please try again later.',
            'listing.likeAria': 'Like post',
            'listing.readMoreCard': 'Read more',
            'listing.updatesEmpty': 'No updates yet.',
            'listing.emptyGeneric': 'Nothing here yet.',
            'verde.subtitle': 'My hobbies, reads, anime and games.',
            'sapo.subtitle': 'Check out a bit of my portfolio and the projects I’m part of!',
            'sapo.sortAria': 'Sort projects',
            'sapo.viewToggleAria': 'Switch view',
            'sapo.viewGridAria': 'Grid view',
            'sapo.viewListAria': 'List view',
            'sapo.loadingProjects': 'Loading projects...',
            'sapo.noProjectsYet': 'No projects yet. Coming soon!',
            'sapo.loadProjectsError': 'Error loading projects. Please try again.',
            'sapo.featuredEmpty': 'No projects yet.',
            'sapo.viewProjectCta': 'View project →',
            'sapo.viewProjectBtn': 'View Project ↗',
            'sapo.previewNewTab': '↗ Open in new tab',
            'sapo.previewCloseAria': 'Close preview',
            'sapo.previewIframeTitle': 'Project preview',
            'sapo.previewLoadError': 'Error loading content.',
            'rascunhos.subtitle': 'Excerpts, Translations and Lost Ideas',
            'rascunhos.featuredEmpty': 'No drafts yet.',
            'sobre.subtitle': 'The little frog behind Floresta Criativa',
            'sobre.greeting': "Hi, I'm Nay!",
            'sobre.tagline': 'Part-time programmer, amateur writer, and full-time otaku',
            'sobre.aboutTitle': 'About me',
            'sobre.aboutP1': "Welcome to my Floresta Criativa! This is my personal spot on the internet — a place where I bring together everything that moves me: writing, projects, references, and everyday daydreams. There's no fixed theme here, just my thoughts and the things I want to talk about but have no one to talk to.",
            'sobre.aboutP2': "I'm passionate about stories in every form: anime, games, books, shows... and especially ones built on stories that already exist — yes, I'm talking about fanfiction. Writing is my favorite way to process the world and leave a trace of who I was in each phase of life.",
            'sobre.aboutP3': "It's interesting how, as humans, we all need to find meaning in everything that exists, and I'm no exception. I want my words to reach others and bring smiles, I want you to feel thoughtful while reading something and, above all, I want you to think: where could this be better? What if she'd done that differently? We're naturally seeking creatures, always wanting to consume and consume and never quite satisfied — the way I found to 'satisfy' that urge was by writing and building my own little world.",
            'sobre.aboutP4': 'I also dabble in web development, where code and creativity go hand in hand. Building this site was part of the process: learning by doing, messing up, and trying again — the same way writing works.',
            'sobre.factDrinkLabel': 'Favorite drink',
            'sobre.factDrinkValue': 'Sparkling water with a splash of lime',
            'sobre.factWeatherLabel': 'Favorite weather',
            'sobre.factWeatherValue': 'Sunny day, clear blue sky, with a cool breeze under the warm sun',
            'sobre.factHobbyLabel': 'Favorite hobby',
            'sobre.factHobbyValue': 'Reading a looot (and writing a little)',
            'sobre.factPersonalityLabel': 'Personality',
            'sobre.factPersonalityValue': "I consider myself a quiet person — I don't talk much or share my opinion unless it's something I really care about, but I'm good at resolving conflicts and got called a problem-solver recently, so there's that!",
            'sobre.chipMusicais': 'Musicals',
            'sobre.chipAnimes': 'Anime',
            'sobre.chipLer': 'Reading',
            'sobre.chipMusica': 'Listening to music',
            'sobre.chipRede': 'Swinging in a hammock',
            'sobre.chipCochilo': 'Post-lunch nap',
            'sobre.chipPraia': 'Sergipe beaches',
            'sobre.journeyColombia': 'Colombia',
            'sobre.journeyCasada': 'MARRIEDDDDD 💍',
            'sobre.sitemapTitle': "What's around here",
            'sobre.sitemapVerdeDesc': 'Hobbies, anime, games, and current reads.',
            'sobre.sitemapSapoDesc': 'Coding projects and experiments.',
            'sobre.sitemapRascunhosDesc': 'Writing, fanfics, and everything I write.',
            'sobre.findMeTitle': 'Find me around',
            'sobre.featuredMemoryCaption': 'One of my favorite moments ♥'
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
        root.querySelectorAll('[data-i18n-title]').forEach(el => {
            el.setAttribute('title', t(el.getAttribute('data-i18n-title'), lang));
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

    function translateCategory(cat) {
        if (getLang() === 'en' && CATEGORY_TRANSLATIONS[cat]) return CATEGORY_TRANSLATIONS[cat];
        return cat;
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

    window.i18n = { getLang, setLang, toggleLang, t, applyTranslations, translations, translateCategory };

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
