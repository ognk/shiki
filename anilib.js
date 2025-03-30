// @sign 9e5a3d7b4c1f8a2b6d0e4c3a5b8d7f1
(function() {
    'use strict';

    const AnimeLibParser = {
        name: 'animelib_parser',
        base_url: 'https://anilib.me',
        version: '2.1',
        
        selectors: {
            search: '.search-item[data-anime]',
            title: '.anime-title-main',
            episodes: '.episode-card',
            player: 'iframe[src*="player"]'
        },

        init() {
            lampa.plugins.add({
                name: this.name,
                version: this.version,
                init: () => this.registerSource()
            });
        },

        registerSource() {
            lampa.sources.add({
                name: 'animelib',
                title: 'AnimeLib',
                priority: 950,
                
                search: async (query) => {
                    try {
                        const html = await this.fetchPage(`/search?q=${query}`);
                        return this.parseSearchResults(html);
                    } catch(e) {
                        console.error('Search error:', e);
                        return [];
                    }
                },

                files: async (id) => {
                    const html = await this.fetchPage(`/anime/${id}`);
                    return this.parseEpisodes(html);
                },

                file: async (episodeId) => {
                    try {
                        const html = await this.fetchPage(`/watch/${episodeId}`);
                        return this.parseVideo(html);
                    } catch(e) {
                        return { error: 'Видео недоступно' };
                    }
                }
            });
        },

        async fetchPage(path) {
            const proxy = 'https://cors.lampa-proxy.workers.dev/';
            const url = proxy + encodeURIComponent(`${this.base_url}${path}`);
            return lampa.request.text(url, { timeout: 10000 });
        },

        parseSearchResults(html) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            return Array.from(doc.querySelectorAll(this.selectors.search))
                .slice(0, 20)
                .map(item => ({
                    id: item.dataset.anime,
                    title: item.querySelector('.anime-title').textContent.trim(),
                    year: item.querySelector('.anime-year')?.textContent || '2024',
                    poster: item.querySelector('img.cover').src
                }));
        },

        parseEpisodes(html) {
            const doc = new DOMParser().parseFromString(html, 'text/html');
            
            return Array.from(doc.querySelectorAll(this.selectors.episodes))
                .map(ep => ({
                    id: ep.dataset.episode,
                    number: ep.querySelector('.episode-num').textContent,
                    title: ep.querySelector('.episode-title')?.textContent || 'Эпизод'
                }));
        },

        parseVideo(html) {
            const doc = new DOMParser().parseFromString(html, 'text/html');
            const iframe = doc.querySelector(this.selectors.player);
            
            if(!iframe) throw new Error('Player not found');
            
            const src = new URL(iframe.src);
            const videoHash = src.searchParams.get('v');
            
            return {
                url: `https://video1.anilib.me/${videoHash}_1080.mp4`,
                quality: {
                    '1080p': `https://video1.anilib.me/${videoHash}_1080.mp4`,
                    '720p': `https://video1.anilib.me/${videoHash}_720.mp4`
                },
                headers: { Referer: this.base_url }
            };
        }
    };

    if(!window.animelib_parser) new AnimeLibParser().init();
})();
