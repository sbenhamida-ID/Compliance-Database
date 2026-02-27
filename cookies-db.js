/**
 * Cookies Database Application
 * A browser-based cookie reference tool with Osano-style categorization
 */

class CookiesDatabase {
    constructor() {
        this.cookies = [];
        this.categories = [];
        this.filteredCookies = [];
        this.currentCategory = 'all';
        this.searchQuery = '';
        this.showDeprecatedOnly = false;
        this.currentCookie = null;
        this.isEditMode = false;
        
        this.init();
    }

    async init() {
        await this.loadData();
        this.bindEvents();
        this.render();
    }

    /**
     * Load cookie data from JSON file and merge with localStorage
     */
    async loadData() {
        try {
            // Load from JSON file
            const response = await fetch('./data/cookies-db.json');
            const data = await response.json();
            
            this.categories = data.categories || [];
            
            // Load seed cookies (default addedBy to 'seed' if omitted)
            let seedCookies = (data.cookies || []).map(c => ({ ...c, addedBy: c.addedBy || 'seed' }));
            
            // Load user-added cookies from localStorage
            const storedCookies = localStorage.getItem('userCookies');
            let userCookies = storedCookies ? JSON.parse(storedCookies) : [];
            
            // Load deleted seed cookie IDs
            const deletedIds = JSON.parse(localStorage.getItem('deletedSeedCookies') || '[]');
            
            // Filter out deleted seed cookies
            seedCookies = seedCookies.filter(c => !deletedIds.includes(c.id));
            
            // Load modified seed cookies
            const modifiedCookies = JSON.parse(localStorage.getItem('modifiedSeedCookies') || '{}');
            
            // Apply modifications to seed cookies
            seedCookies = seedCookies.map(cookie => {
                if (modifiedCookies[cookie.id]) {
                    return { ...cookie, ...modifiedCookies[cookie.id] };
                }
                return cookie;
            });
            
            // Merge seed and user cookies
            this.cookies = [...seedCookies, ...userCookies];
            
            this.filterCookies();
        } catch (error) {
            console.error('Error loading cookie data:', error);
            this.showToast('Error loading cookie data', 'error');
        }
    }

    /**
     * Save user-added cookies to localStorage
     */
    saveUserCookies() {
        const userCookies = this.cookies.filter(c => c.addedBy === 'manual');
        localStorage.setItem('userCookies', JSON.stringify(userCookies));
    }

    /**
     * Save a modified seed cookie
     */
    saveModifiedSeedCookie(cookie) {
        const modifiedCookies = JSON.parse(localStorage.getItem('modifiedSeedCookies') || '{}');
        modifiedCookies[cookie.id] = cookie;
        localStorage.setItem('modifiedSeedCookies', JSON.stringify(modifiedCookies));
    }

    /**
     * Mark a seed cookie as deleted
     */
    markSeedCookieDeleted(id) {
        const deletedIds = JSON.parse(localStorage.getItem('deletedSeedCookies') || '[]');
        if (!deletedIds.includes(id)) {
            deletedIds.push(id);
            localStorage.setItem('deletedSeedCookies', JSON.stringify(deletedIds));
        }
    }

    /**
     * Bind all event listeners
     */
    bindEvents() {
        // Search
        const searchInput = document.getElementById('searchInput');
        const clearSearch = document.getElementById('clearSearch');
        
        searchInput.addEventListener('input', (e) => {
            this.searchQuery = e.target.value.trim().toLowerCase();
            clearSearch.style.display = this.searchQuery ? 'flex' : 'none';
            this.filterCookies();
            this.render();
        });
        
        clearSearch.addEventListener('click', () => {
            searchInput.value = '';
            this.searchQuery = '';
            clearSearch.style.display = 'none';
            this.filterCookies();
            this.render();
        });

        // Category tabs
        document.querySelectorAll('.category-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelector('.category-tab.active').classList.remove('active');
                tab.classList.add('active');
                this.currentCategory = tab.dataset.category;
                this.filterCookies();
                this.render();
            });
        });

        // Deprecated filter toggle
        document.getElementById('deprecatedToggle').addEventListener('click', () => {
            this.showDeprecatedOnly = !this.showDeprecatedOnly;
            document.getElementById('deprecatedToggle').classList.toggle('active', this.showDeprecatedOnly);
            this.filterCookies();
            this.render();
        });

        // Add cookie button
        document.getElementById('addCookieBtn').addEventListener('click', () => {
            this.openAddModal();
        });

        // Export button
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportDatabase();
        });

        // Modal close buttons
        document.getElementById('modalClose').addEventListener('click', () => this.closeModal());
        document.getElementById('cancelBtn').addEventListener('click', () => this.closeModal());
        document.getElementById('modalOverlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) this.closeModal();
        });

        // Detail modal close buttons
        document.getElementById('detailModalClose').addEventListener('click', () => this.closeDetailModal());
        document.getElementById('detailModalOverlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) this.closeDetailModal();
        });

        // Detail modal actions
        document.getElementById('detailEditBtn').addEventListener('click', () => {
            this.closeDetailModal();
            this.openEditModal(this.currentCookie);
        });
        
        document.getElementById('detailDeleteBtn').addEventListener('click', () => {
            this.closeDetailModal();
            this.openDeleteModal(this.currentCookie);
        });

        // Delete modal
        document.getElementById('deleteCancelBtn').addEventListener('click', () => this.closeDeleteModal());
        document.getElementById('deleteModalOverlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) this.closeDeleteModal();
        });
        document.getElementById('deleteConfirmBtn').addEventListener('click', () => {
            this.deleteCookie(this.currentCookie.id);
            this.closeDeleteModal();
        });

        // Form submission
        document.getElementById('cookieForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveCookie();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
                this.closeDetailModal();
                this.closeDeleteModal();
            }
        });
    }

    /**
     * Filter cookies based on category and search query
     */
    filterCookies() {
        this.filteredCookies = this.cookies.filter(cookie => {
            // Category filter
            const categoryMatch = this.currentCategory === 'all' || 
                                  cookie.category === this.currentCategory;
            
            // Search filter (includes name, provider, description, and regex pattern)
            const searchMatch = !this.searchQuery || 
                cookie.name.toLowerCase().includes(this.searchQuery) ||
                cookie.provider.toLowerCase().includes(this.searchQuery) ||
                cookie.description.toLowerCase().includes(this.searchQuery) ||
                cookie.regex.toLowerCase().includes(this.searchQuery);

            // Deprecated filter
            const deprecatedMatch = !this.showDeprecatedOnly || cookie.deprecated === true;
            
            return categoryMatch && searchMatch && deprecatedMatch;
        });

        // Sort alphabetically by name
        this.filteredCookies.sort((a, b) => a.name.localeCompare(b.name));
    }

    /**
     * Render the cookie list and update counts
     */
    render() {
        this.updateCounts();
        this.renderCookieList();
    }

    /**
     * Update category counts
     */
    updateCounts() {
        const counts = {
            all: this.cookies.length,
            Essential: 0,
            Analytics: 0,
            Marketing: 0,
            Personalized: 0,
            Blocklisted: 0
        };
        let deprecatedCount = 0;

        this.cookies.forEach(cookie => {
            if (counts.hasOwnProperty(cookie.category)) {
                counts[cookie.category]++;
            }
            if (cookie.deprecated) deprecatedCount++;
        });

        Object.keys(counts).forEach(key => {
            const el = document.getElementById(`count-${key}`);
            if (el) el.textContent = counts[key];
        });

        const depEl = document.getElementById('count-deprecated');
        if (depEl) depEl.textContent = deprecatedCount;

        // Update results count
        document.getElementById('resultsCount').textContent = 
            `${this.filteredCookies.length} cookie${this.filteredCookies.length !== 1 ? 's' : ''} found`;
    }

    /**
     * Render the cookie list
     */
    renderCookieList() {
        const container = document.getElementById('cookieList');
        const emptyState = document.getElementById('emptyState');

        if (this.filteredCookies.length === 0) {
            container.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';
        
        const deprecatedIcon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';

        container.innerHTML = this.filteredCookies.map(cookie => `
            <div class="cookie-card${cookie.deprecated ? ' deprecated' : ''}" data-id="${cookie.id}">
                <div class="cookie-card-header">
                    <div>
                        <div class="cookie-name">${this.escapeHtml(cookie.name)}</div>
                        <div class="cookie-provider">${this.escapeHtml(cookie.provider)}</div>
                    </div>
                    <div style="display:flex;gap:6px;align-items:flex-start;flex-shrink:0;">
                        ${cookie.deprecated ? `<span class="deprecated-badge">${deprecatedIcon} Deprecated</span>` : ''}
                        <span class="category-badge ${cookie.category.toLowerCase()}">
                            ${cookie.category}
                        </span>
                    </div>
                </div>
                <div class="cookie-description">${this.escapeHtml(cookie.description)}</div>
                <div class="cookie-meta">
                    <div class="cookie-meta-item">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        ${this.escapeHtml(cookie.expiry)}
                    </div>
                    <div class="cookie-meta-item">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="4 7 4 4 20 4 20 7"></polyline>
                            <line x1="9" x2="15" y1="20" y2="20"></line>
                            <line x1="12" x2="12" y1="4" y2="20"></line>
                        </svg>
                        <code>${this.escapeHtml(cookie.regex)}</code>
                    </div>
                </div>
            </div>
        `).join('');

        // Add click handlers
        container.querySelectorAll('.cookie-card').forEach(card => {
            card.addEventListener('click', () => {
                const cookie = this.cookies.find(c => c.id === card.dataset.id);
                if (cookie) this.openDetailModal(cookie);
            });
        });
    }

    /**
     * Open the add cookie modal
     */
    openAddModal() {
        this.isEditMode = false;
        document.getElementById('modalTitle').textContent = 'Add New Cookie';
        document.getElementById('saveBtn').textContent = 'Add Cookie';
        document.getElementById('cookieForm').reset();
        document.getElementById('cookieId').value = '';
        document.getElementById('modalOverlay').classList.add('active');
    }

    /**
     * Open the edit cookie modal
     */
    openEditModal(cookie) {
        this.isEditMode = true;
        this.currentCookie = cookie;
        
        document.getElementById('modalTitle').textContent = 'Edit Cookie';
        document.getElementById('saveBtn').textContent = 'Save Changes';
        
        document.getElementById('cookieId').value = cookie.id;
        document.getElementById('cookieName').value = cookie.name;
        document.getElementById('cookieProvider').value = cookie.provider;
        document.getElementById('cookieCategory').value = cookie.category;
        document.getElementById('cookieExpiry').value = cookie.expiry;
        document.getElementById('cookieRegex').value = cookie.regex;
        document.getElementById('cookieDescription').value = cookie.description;
        document.getElementById('cookieSourceUrl').value = cookie.sourceUrl || '';
        
        document.getElementById('modalOverlay').classList.add('active');
    }

    /**
     * Close the add/edit modal
     */
    closeModal() {
        document.getElementById('modalOverlay').classList.remove('active');
    }

    /**
     * Open the cookie detail modal
     */
    openDetailModal(cookie) {
        this.currentCookie = cookie;

        document.getElementById('detailModalTitle').textContent = 'Cookie Details';

        const copyIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg>';
        const checkIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
        const externalIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" x2="21" y1="14" y2="3"></line></svg>';
        const providerIcon = '<svg class="detail-meta-icon" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"></path><path d="M5 21V7l8-4v18"></path><path d="M19 21V11l-6-4"></path><path d="M9 9h1"></path><path d="M9 13h1"></path><path d="M9 17h1"></path></svg>';

        const sourceHtml = cookie.sourceUrl
            ? `<a class="detail-source-link" href="${this.escapeHtml(cookie.sourceUrl)}" target="_blank" rel="noopener noreferrer" title="View source documentation">${externalIcon}</a>`
            : '';

        const deprecatedWarningIcon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';

        const body = document.getElementById('detailModalBody');
        body.innerHTML = `
            ${cookie.deprecated ? `<div class="deprecated-banner">${deprecatedWarningIcon}<span class="deprecated-banner-text">This cookie is deprecated. If still present on your site, republish your consent manager configuration to remove it.</span></div>` : ''}
            <div class="detail-hero">
                <div class="detail-copyable">
                    <code class="detail-cookie-name">${this.escapeHtml(cookie.name)}</code>
                    <button class="btn-copy" data-field="name" title="Copy cookie name">${copyIcon}</button>
                </div>
                <div class="detail-meta">
                    ${cookie.deprecated ? `<span class="deprecated-badge">${deprecatedWarningIcon} Deprecated</span><span class="detail-sep">&middot;</span>` : ''}
                    <span class="category-badge ${cookie.category.toLowerCase()}">${cookie.category}</span>
                    <span class="detail-sep">&middot;</span>
                    <span class="detail-provider">${providerIcon}${this.escapeHtml(cookie.provider)}</span>
                    ${sourceHtml}
                </div>
            </div>

            <hr class="detail-divider" />

            <div>
                <div class="detail-section-head">
                    <span class="detail-label">Description</span>
                    <button class="btn-copy" data-field="description" title="Copy description">${copyIcon}</button>
                </div>
                <p class="detail-text">${this.escapeHtml(cookie.description)}</p>
            </div>

            <hr class="detail-divider" />

            <div class="detail-row">
                <div>
                    <span class="detail-label">Expiry</span>
                    <div class="detail-copyable detail-copyable-sm">
                        <span>${this.escapeHtml(cookie.expiry)}</span>
                        <button class="btn-copy" data-field="expiry" title="Copy expiry">${copyIcon}</button>
                    </div>
                </div>
                <div>
                    <span class="detail-label">Regex Pattern</span>
                    <div class="detail-copyable detail-copyable-sm">
                        <code>${this.escapeHtml(cookie.regex)}</code>
                        <button class="btn-copy" data-field="regex" title="Copy regex pattern">${copyIcon}</button>
                    </div>
                </div>
            </div>
        `;

        // Bind copy buttons — use data-field to look up the raw value from the cookie object
        body.querySelectorAll('.btn-copy').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const field = btn.dataset.field;
                const text = cookie[field] || '';
                navigator.clipboard.writeText(text).then(() => {
                    btn.innerHTML = checkIcon;
                    btn.classList.add('copied');
                    this.showToast('Copied to clipboard', 'success');
                    setTimeout(() => {
                        btn.innerHTML = copyIcon;
                        btn.classList.remove('copied');
                    }, 1500);
                }).catch(() => this.showToast('Failed to copy', 'error'));
            });
        });

        document.getElementById('detailModalOverlay').classList.add('active');
    }

    /**
     * Close the detail modal
     */
    closeDetailModal() {
        document.getElementById('detailModalOverlay').classList.remove('active');
    }

    /**
     * Open the delete confirmation modal
     */
    openDeleteModal(cookie) {
        this.currentCookie = cookie;
        document.getElementById('deleteCookieName').textContent = cookie.name;
        document.getElementById('deleteModalOverlay').classList.add('active');
    }

    /**
     * Close the delete modal
     */
    closeDeleteModal() {
        document.getElementById('deleteModalOverlay').classList.remove('active');
    }

    /**
     * Save a cookie (add or update)
     */
    saveCookie() {
        const id = document.getElementById('cookieId').value;
        const cookieData = {
            name: document.getElementById('cookieName').value.trim(),
            provider: document.getElementById('cookieProvider').value.trim(),
            category: document.getElementById('cookieCategory').value,
            expiry: document.getElementById('cookieExpiry').value.trim(),
            regex: document.getElementById('cookieRegex').value.trim(),
            description: document.getElementById('cookieDescription').value.trim(),
            sourceUrl: document.getElementById('cookieSourceUrl').value.trim()
        };

        if (this.isEditMode && id) {
            // Update existing cookie
            const index = this.cookies.findIndex(c => c.id === id);
            if (index !== -1) {
                const existingCookie = this.cookies[index];
                const updatedCookie = { ...existingCookie, ...cookieData };
                this.cookies[index] = updatedCookie;
                
                if (existingCookie.addedBy === 'seed') {
                    this.saveModifiedSeedCookie(updatedCookie);
                } else {
                    this.saveUserCookies();
                }
                
                this.showToast('Cookie updated successfully', 'success');
            }
        } else {
            // Add new cookie
            const newCookie = {
                id: this.generateId(),
                ...cookieData,
                addedBy: 'manual'
            };
            this.cookies.push(newCookie);
            this.saveUserCookies();
            this.showToast('Cookie added successfully', 'success');
        }

        this.closeModal();
        this.filterCookies();
        this.render();
    }

    /**
     * Delete a cookie
     */
    deleteCookie(id) {
        const cookie = this.cookies.find(c => c.id === id);
        if (!cookie) return;

        this.cookies = this.cookies.filter(c => c.id !== id);

        if (cookie.addedBy === 'seed') {
            this.markSeedCookieDeleted(id);
        } else {
            this.saveUserCookies();
        }

        this.filterCookies();
        this.render();
        this.showToast('Cookie deleted successfully', 'success');
    }

    /**
     * Export the database as JSON
     */
    exportDatabase() {
        const exportData = {
            cookies: this.cookies,
            categories: this.categories,
            metadata: {
                version: '1.0.0',
                exportedAt: new Date().toISOString(),
                totalCookies: this.cookies.length
            }
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cookies-db-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showToast('Database exported successfully', 'success');
    }

    /**
     * Generate a unique ID
     */
    generateId() {
        return 'cookie-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    /**
     * Show a toast notification
     */
    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toastMessage');
        
        toastMessage.textContent = message;
        toast.className = 'toast ' + type;
        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    window.cookiesDB = new CookiesDatabase();
});
