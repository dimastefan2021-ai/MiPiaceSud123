(function () {
    'use strict';

    // Limbi suportate și limba implicită de rezervă (fallback)
    var SUPPORTED_LANGS = ['ro', 'ru'];
    var DEFAULT_LANG = 'ro';
    var STORAGE_KEY = 'mipiace_lang';
    
    // Preluarea selecției de limbă din localStorage, implicit Română (ro)
    function getSavedLang() {
        try {
            var saved = localStorage.getItem(STORAGE_KEY);
            return SUPPORTED_LANGS.indexOf(saved) !== -1 ? saved : DEFAULT_LANG;
        } catch (e) {
            return DEFAULT_LANG;
        }
    }

    function saveLang(lang) {
        try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
    }
    window.currentLang = getSavedLang();

    // Traduce o cheie de traducere dată pe baza limbii active
    window.t = function (key) {
        var locales = window.LOCALES || {};
        var lang = window.currentLang;
        if (locales[lang] && locales[lang][key] !== undefined) {
            return locales[lang][key];
        }
        if (locales[DEFAULT_LANG] && locales[DEFAULT_LANG][key] !== undefined) {
            return locales[DEFAULT_LANG][key];
        }
        return key;
    };
    // Traduce elementele din pagină folosind atribute de date personalizate
    window.applyTranslations = function () {
        document.querySelectorAll('.lang-switcher-placeholder').forEach(function (el) {
            el.innerHTML = window.buildLangSwitcher();
        });
        document.querySelectorAll('[data-i18n]').forEach(function (el) {
            var key = el.getAttribute('data-i18n');
            el.textContent = window.t(key);
        });
        document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
            var key = el.getAttribute('data-i18n-placeholder');
            el.setAttribute('placeholder', window.t(key));
        });
        document.querySelectorAll('[data-i18n-title]').forEach(function (el) {
            var key = el.getAttribute('data-i18n-title');
            el.setAttribute('title', window.t(key));
        });
        document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
            var key = el.getAttribute('data-i18n-html');
            el.innerHTML = window.t(key);
        });
        document.documentElement.setAttribute('lang', window.currentLang);
    };
    // Schimbă limba activă și declanșează actualizările de traducere
    window.setLang = function (lang) {
        if (SUPPORTED_LANGS.indexOf(lang) === -1) return;
        window.currentLang = lang;
        saveLang(lang);
        window.applyTranslations();
        try {
            document.dispatchEvent(new CustomEvent('langchange', { detail: { lang: lang } }));
        } catch (e) {}
    };
    window.buildLangSwitcher = function () {
        var saved = window.currentLang;
        var nextLang = (saved === 'ro' ? 'ru' : 'ro');
        var label = nextLang.toUpperCase();
        return '<span class="lang-switcher">' +
            '<button class="lang-btn" data-lang="' + nextLang + '" onclick="setLang(\'' + nextLang + '\')">' + label + '</button>' +
            '</span>';
    };
    // Punctul de pornire pentru aplicarea traducerilor la încărcarea paginii
    function init() {
        window.applyTranslations();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    })();
