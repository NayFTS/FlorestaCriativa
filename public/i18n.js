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
            'mood.title': 'mood',
            'mood.subtitle': 'hoje parece:',
            'lang.toggleLabel': 'EN',
            'lang.toggleAria': 'Mudar para inglês'
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
            'mood.subtitle': 'today feels like:',
            'lang.toggleLabel': 'PT',
            'lang.toggleAria': 'Switch to Portuguese'
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

        document.documentElement.setAttribute('lang', lang === 'en' ? 'en' : 'pt-BR');

        document.querySelectorAll('.lang-toggle-btn').forEach(btn => {
            btn.textContent = t('lang.toggleLabel', lang);
            btn.setAttribute('aria-label', t('lang.toggleAria', lang));
        });
    }

    function setLang(lang) {
        if (lang !== 'pt' && lang !== 'en') return;
        localStorage.setItem(STORAGE_KEY, lang);
        applyTranslations();
        document.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
    }

    function toggleLang() {
        setLang(getLang() === 'pt' ? 'en' : 'pt');
    }

    function injectLangToggle() {
        document.querySelectorAll('.theme-toggle-target').forEach(target => {
            if (target.querySelector('.lang-toggle-btn')) return;
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'lang-toggle-btn';
            btn.onclick = toggleLang;
            btn.textContent = t('lang.toggleLabel');
            btn.setAttribute('aria-label', t('lang.toggleAria'));
            target.appendChild(btn);
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
