(function() {
    'use strict';

    const AnimeLibParser = {
        name: 'animelib_parser',
        base_url: 'https://anilib.me',
        selectors: {
            search: '.search-results .anime-item',
            title: '#anime-title',
            episodes: '.episodes-list li',
            player: '#video-player iframe'
        },

        init() {
            lampa.plugins.add({
                name: this.name,
                version: '1.0',
                init: () => {
                    this.registerSource();
                }
            });
        },

        registerSource() {
            lampa.sources.add({
                name: 'animelib',
                title: 'AnimeLib (HTML Parser)',
                icon: `${this.base_url}/favicon.ico`,

                // Поиск аниме
                search: async (query) => {
                    const html = await this.fetchPage('/search', { q: query });
                    return this.parseSearchResults(html);
                },

                // Получение информации о тайтле
                get: async (id) => {
                    const html = await this.fetchPage(`/anime/${id}`);
                    return this.parseTitlePage(html);
                },

                // Получение эпизодов
                files: async (id) => {
                    const html = await this.fetchPage(`/anime/${id}`);
                    return this.parseEpisodes(html);
                },

                // Получение ссылки на видео
                file: async (episodeId) => {
                    const html = await this.fetchPage(
                        `/anime/watch?episode=${episodeId}`
                    );
                    return this.parseVideo(html);
                }
            });
        },

        async fetchPage(path, params = {}) {
            const url = new URL(`${this.base_url}${path}`);
            Object.entries(params).forEach(([k, v]) => 
                url.searchParams.append(k, v));

            return lampa.request.text(url.toString(), {
                headers: {
                    'User-Agent': 'Lampa/AnimelibParser',
                    'Referer': this.base_url
                }
            });
        },

        parseSearchResults(html) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            return Array.from(doc.querySelectorAll(this.selectors.search))
                .map(item => ({
                    id: item.dataset.id,
                    title: item.querySelector('.title').textContent,
                    year: item.querySelector('.year').textContent,
                    poster: item.querySelector('img').src
                }));
        },

        parseTitlePage(html) {
            const doc = new DOMParser().parseFromString(html, 'text/html');
            
            return {
                title: doc.querySelector(this.selectors.title).textContent,
                description: doc.querySelector('.description').textContent,
                poster: doc.querySelector('.poster img').src,
                genres: Array.from(doc.querySelectorAll('.genres li'))
                    .map(li => li.textContent)
            };
        },

        parseEpisodes(html) {
            const doc = new DOMParser().parseFromString(html, 'text/html');
            
            return Array.from(doc.querySelectorAll(this.selectors.episodes))
                .map(ep => ({
                    id: ep.dataset.episodeId,
                    number: ep.querySelector('.ep-num').textContent,
                    title: ep.querySelector('.ep-title').textContent
                }));
        },

        parseVideo(html) {
            const doc = new DOMParser().parseFromString(html, 'text/html');
            const iframe = doc.querySelector(this.selectors.player);
            const src = iframe ? iframe.src : '';
            
            // Извлекаем прямую ссылку из iframe
            const videoUrl = this.extractVideoUrl(src);
            
            return {
                url: videoUrl,
                quality: this.detectQuality(videoUrl)
            };
        },

        extractVideoUrl(iframeSrc) {
            // Парсим URL вида:
            // https://anilib.me/player/?video=cd087ee9-00eb-4eba-b587-553d853e3e3a_1080
            const match = iframeSrc.match(/video=([^&]+)/);
            return match ? 
                `https://video1.anilib.me/${match[1]}.mp4` : 
                null;
        },

        detectQuality(url) {
            const res = url.match(/_(\d+p)/);
            return res ? res[1] : 'HD';
        }
    };

    if(!window.animelib_parser) {
        window.animelib_parser = new AnimeLibParser().init();
    }
})();
