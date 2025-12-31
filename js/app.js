class NavigationApp {
    constructor() {
        this.navigationData = null;
        this.currentCategoryIndex = 0;
        this.searchKeyword = '';
        
        this.categoryNav = document.getElementById('categoryNav');
        this.sitesGrid = document.getElementById('sitesGrid');
        this.currentCategory = document.getElementById('currentCategory');
        this.searchBox = document.getElementById('searchBox');
        this.menuToggle = document.getElementById('menuToggle');
        this.sidebar = document.getElementById('sidebar');
        this.noResults = document.getElementById('noResults');
        
        this.init();
    }

    async init() {
        await this.loadNavigationData();
        this.bindEvents();
        this.renderCategories();
        this.renderSites();
    }

    async loadNavigationData() {
        try {
            const response = await fetch('data/navigation.json');
            if (!response.ok) {
                throw new Error('Failed to load navigation data');
            }
            this.navigationData = await response.json();
        } catch (error) {
            console.error('Error loading navigation data:', error);
            this.sitesGrid.innerHTML = '<p class="no-results">加载数据失败，请刷新页面重试</p>';
        }
    }

    bindEvents() {
        this.searchBox.addEventListener('input', (e) => {
            this.searchKeyword = e.target.value.trim().toLowerCase();
            this.renderSites();
        });

        this.menuToggle.addEventListener('click', () => {
            this.toggleSidebar();
        });

        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('sidebar-overlay')) {
                this.closeSidebar();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeSidebar();
            }
        });
    }

    toggleSidebar() {
        this.sidebar.classList.toggle('open');
        
        if (this.sidebar.classList.contains('open')) {
            this.createOverlay();
        } else {
            this.removeOverlay();
        }
    }

    closeSidebar() {
        this.sidebar.classList.remove('open');
        this.removeOverlay();
    }

    createOverlay() {
        let overlay = document.querySelector('.sidebar-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'sidebar-overlay';
            document.body.appendChild(overlay);
        }
        requestAnimationFrame(() => overlay.classList.add('open'));
    }

    removeOverlay() {
        const overlay = document.querySelector('.sidebar-overlay');
        if (overlay) {
            overlay.classList.remove('open');
            setTimeout(() => overlay.remove(), 300);
        }
    }

    renderCategories() {
        if (!this.navigationData?.categories) return;
        
        const icons = ['⭐', '🤖', '💻', '🔌', '🌐', '☁️', '📦', '⚡', '🛠️', '📚', '👥', '📌'];
        
        this.categoryNav.innerHTML = this.navigationData.categories.map((category, index) => `
            <div class="category-item ${index === this.currentCategoryIndex ? 'active' : ''}" 
                 data-index="${index}">
                <span class="category-icon">${icons[index % icons.length]}</span>
                <span class="category-name">${this.escapeHtml(category.name)}</span>
                <span class="category-count">${category.sites.length}</span>
            </div>
        `).join('');

        this.categoryNav.querySelectorAll('.category-item').forEach(item => {
            item.addEventListener('click', () => {
                const index = parseInt(item.dataset.index);
                this.switchCategory(index);
            });
        });

        this.updateCurrentCategoryName();
    }

    switchCategory(index) {
        if (index === this.currentCategoryIndex) return;
        
        this.currentCategoryIndex = index;
        
        this.categoryNav.querySelectorAll('.category-item').forEach((item, i) => {
            item.classList.toggle('active', i === index);
        });

        this.updateCurrentCategoryName();
        this.renderSites();
        this.closeSidebar();
    }

    updateCurrentCategoryName() {
        const category = this.navigationData?.categories?.[this.currentCategoryIndex];
        if (category) {
            this.currentCategory.textContent = category.name;
        }
    }

    renderSites() {
        if (!this.navigationData?.categories) return;

        const category = this.navigationData.categories[this.currentCategoryIndex];
        if (!category) return;

        let sites = category.sites;

        if (this.searchKeyword) {
            sites = sites.filter(site => 
                site.name.toLowerCase().includes(this.searchKeyword) ||
                (site.description && site.description.toLowerCase().includes(this.searchKeyword))
            );
        }

        if (sites.length === 0) {
            this.sitesGrid.innerHTML = '';
            this.noResults.style.display = 'block';
            return;
        }

        this.noResults.style.display = 'none';
        
        this.sitesGrid.innerHTML = sites.map((site, index) => {
            const iconHtml = this.renderIcon(site.icon, site.name);
            const description = site.description || '暂无描述';
            
            return `
                <a href="${this.escapeHtml(site.url)}" 
                   class="site-card" 
                   target="_blank" 
                   rel="noopener noreferrer"
                   style="animation-delay: ${Math.min(index * 0.05, 0.4)}s">
                    <div class="site-card-header">
                        ${iconHtml}
                        <div class="site-info">
                            <h3 class="site-name">${this.escapeHtml(site.name)}</h3>
                        </div>
                    </div>
                    <p class="site-description">${this.escapeHtml(description)}</p>
                </a>
            `;
        }).join('');

        this.bindIconErrorHandlers();
    }

    renderIcon(iconUrl, siteName) {
        const fallbackText = this.getInitials(siteName);
        
        return `
            <img class="site-icon" 
                 src="${this.escapeHtml(iconUrl)}" 
                 alt="${this.escapeHtml(siteName)}"
                 onerror="this.classList.add('default'); this.innerHTML='${fallbackText}'; this.src='data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';"
                 onload="this.classList.remove('default');"
            >
        `;
    }

    getInitials(name) {
        const cleanedName = name.replace(/[👍⭐🔥💯]/g, '').trim();
        const words = cleanedName.split(/\s+/);
        if (words.length >= 2) {
            return (words[0][0] + words[1][0]).toUpperCase();
        }
        return cleanedName.substring(0, 2).toUpperCase();
    }

    bindIconErrorHandlers() {
        const iconImages = this.sitesGrid.querySelectorAll('.site-icon');
        iconImages.forEach(img => {
            img.onerror = function() {
                this.classList.add('default');
                const siteCard = this.closest('.site-card');
                const siteName = siteCard.querySelector('.site-name').textContent;
                this.innerHTML = this.parentElement.querySelector('img').getAttribute('onerror')
                    .match(/'([^']+)'/)[1];
                this.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
            };
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new NavigationApp();
});
