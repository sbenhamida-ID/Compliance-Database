/**
 * Scripts Database Application
 * A browser-based script classification reference tool with Osano-style categorization
 */

class ScriptsDatabase {
    constructor() {
        this.scripts = [];
        this.categories = [];
        this.filteredScripts = [];
        this.currentCategory = 'all';
        this.searchQuery = '';
        this.currentScript = null;
        this.isEditMode = false;

        this.init();
    }

    async init() {
        await this.loadData();
        this.bindEvents();
        this.render();
    }

    /**
     * Load script data from JSON file and merge with localStorage
     */
    async loadData() {
        try {
            const response = await fetch('./data/scripts-db.json');
            const data = await response.json();

            this.categories = data.categories || [];

            // Load seed scripts
            let seedScripts = (data.scripts || []).map(s => ({ ...s, addedBy: s.addedBy || 'seed' }));

            // Load user-added scripts from localStorage
            const storedScripts = localStorage.getItem('userScripts');
            let userScripts = storedScripts ? JSON.parse(storedScripts) : [];

            // Load deleted seed script IDs
            const deletedIds = JSON.parse(localStorage.getItem('deletedSeedScripts') || '[]');

            // Filter out deleted seed scripts
            seedScripts = seedScripts.filter(s => !deletedIds.includes(s.id));

            // Load modified seed scripts
            const modifiedScripts = JSON.parse(localStorage.getItem('modifiedSeedScripts') || '{}');

            // Apply modifications to seed scripts
            seedScripts = seedScripts.map(script => {
                if (modifiedScripts[script.id]) {
                    return { ...script, ...modifiedScripts[script.id] };
                }
                return script;
            });

            // Merge seed and user scripts
            this.scripts = [...seedScripts, ...userScripts];

            this.filterScripts();
        } catch (error) {
            console.error('Error loading script data:', error);
            this.showToast('Error loading script data', 'error');
        }
    }

    /**
     * Save user-added scripts to localStorage
     */
    saveUserScripts() {
        const userScripts = this.scripts.filter(s => s.addedBy === 'manual');
        localStorage.setItem('userScripts', JSON.stringify(userScripts));
    }

    /**
     * Save a modified seed script
     */
    saveModifiedSeedScript(script) {
        const modifiedScripts = JSON.parse(localStorage.getItem('modifiedSeedScripts') || '{}');
        modifiedScripts[script.id] = script;
        localStorage.setItem('modifiedSeedScripts', JSON.stringify(modifiedScripts));
    }

    /**
     * Mark a seed script as deleted
     */
    markSeedScriptDeleted(id) {
        const deletedIds = JSON.parse(localStorage.getItem('deletedSeedScripts') || '[]');
        if (!deletedIds.includes(id)) {
            deletedIds.push(id);
            localStorage.setItem('deletedSeedScripts', JSON.stringify(deletedIds));
        }
    }

    /**
     * Bind all event listeners
     */
    bindEvents() {
        // Search
        const searchInput = document.getElementById('scriptSearchInput');
        const clearSearch = document.getElementById('scriptClearSearch');

        searchInput.addEventListener('input', (e) => {
            this.searchQuery = e.target.value.trim().toLowerCase();
            clearSearch.style.display = this.searchQuery ? 'flex' : 'none';
            this.filterScripts();
            this.render();
        });

        clearSearch.addEventListener('click', () => {
            searchInput.value = '';
            this.searchQuery = '';
            clearSearch.style.display = 'none';
            this.filterScripts();
            this.render();
        });

        // Category tabs
        document.querySelectorAll('#scriptCategoryTabs .category-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelector('#scriptCategoryTabs .category-tab.active').classList.remove('active');
                tab.classList.add('active');
                this.currentCategory = tab.dataset.category;
                this.filterScripts();
                this.render();
            });
        });

        // Add script button
        document.getElementById('addScriptBtn').addEventListener('click', () => {
            this.openAddModal();
        });

        // Export button
        document.getElementById('scriptExportBtn').addEventListener('click', () => {
            this.exportDatabase();
        });

        // Modal close buttons
        document.getElementById('scriptModalClose').addEventListener('click', () => this.closeModal());
        document.getElementById('scriptCancelBtn').addEventListener('click', () => this.closeModal());
        document.getElementById('scriptModalOverlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) this.closeModal();
        });

        // Detail modal close buttons
        document.getElementById('scriptDetailModalClose').addEventListener('click', () => this.closeDetailModal());
        document.getElementById('scriptDetailModalOverlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) this.closeDetailModal();
        });

        // Detail modal actions
        document.getElementById('scriptDetailEditBtn').addEventListener('click', () => {
            this.closeDetailModal();
            this.openEditModal(this.currentScript);
        });

        document.getElementById('scriptDetailDeleteBtn').addEventListener('click', () => {
            this.closeDetailModal();
            this.openDeleteModal(this.currentScript);
        });

        // Delete modal
        document.getElementById('scriptDeleteCancelBtn').addEventListener('click', () => this.closeDeleteModal());
        document.getElementById('scriptDeleteModalOverlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) this.closeDeleteModal();
        });
        document.getElementById('scriptDeleteConfirmBtn').addEventListener('click', () => {
            this.deleteScript(this.currentScript.id);
            this.closeDeleteModal();
        });

        // Form submission
        document.getElementById('scriptForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveScript();
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
     * Filter scripts based on category and search query
     */
    filterScripts() {
        this.filteredScripts = this.scripts.filter(script => {
            const categoryMatch = this.currentCategory === 'all' ||
                                  script.category === this.currentCategory;

            const searchMatch = !this.searchQuery ||
                script.name.toLowerCase().includes(this.searchQuery) ||
                script.provider.toLowerCase().includes(this.searchQuery) ||
                script.description.toLowerCase().includes(this.searchQuery) ||
                script.regex.toLowerCase().includes(this.searchQuery);

            return categoryMatch && searchMatch;
        });

        // Sort alphabetically by name
        this.filteredScripts.sort((a, b) => a.name.localeCompare(b.name));
    }

    /**
     * Render the script list and update counts
     */
    render() {
        this.updateCounts();
        this.renderScriptList();
    }

    /**
     * Update category counts
     */
    updateCounts() {
        const counts = {
            all: this.scripts.length,
            Essential: 0,
            Analytics: 0,
            Marketing: 0,
            Personalized: 0,
            Blocklisted: 0
        };

        this.scripts.forEach(script => {
            if (counts.hasOwnProperty(script.category)) {
                counts[script.category]++;
            }
        });

        Object.keys(counts).forEach(key => {
            const el = document.getElementById(`script-count-${key}`);
            if (el) el.textContent = counts[key];
        });

        // Update results count
        document.getElementById('scriptResultsCount').textContent =
            `${this.filteredScripts.length} script${this.filteredScripts.length !== 1 ? 's' : ''} found`;
    }

    /**
     * Render the script list
     */
    renderScriptList() {
        const container = document.getElementById('scriptList');
        const emptyState = document.getElementById('scriptEmptyState');

        if (this.filteredScripts.length === 0) {
            container.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';

        container.innerHTML = this.filteredScripts.map(script => `
            <div class="cookie-card script-card" data-id="${script.id}">
                <div class="cookie-card-header">
                    <div>
                        <div class="cookie-name">${this.escapeHtml(script.name)}</div>
                        <div class="cookie-provider">${this.escapeHtml(script.provider)}</div>
                    </div>
                    <span class="category-badge ${script.category.toLowerCase()}">
                        ${script.category}
                    </span>
                </div>
                <div class="cookie-description">${this.escapeHtml(script.description)}</div>
                <div class="cookie-meta">
                    <div class="cookie-meta-item">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="16 18 22 12 16 6"></polyline>
                            <polyline points="8 6 2 12 8 18"></polyline>
                        </svg>
                        <code>${this.escapeHtml(script.regex)}</code>
                    </div>
                </div>
            </div>
        `).join('');

        // Add click handlers
        container.querySelectorAll('.script-card').forEach(card => {
            card.addEventListener('click', () => {
                const script = this.scripts.find(s => s.id === card.dataset.id);
                if (script) this.openDetailModal(script);
            });
        });
    }

    /**
     * Open the add script modal
     */
    openAddModal() {
        this.isEditMode = false;
        document.getElementById('scriptModalTitle').textContent = 'Add New Script';
        document.getElementById('scriptSaveBtn').textContent = 'Add Script';
        document.getElementById('scriptForm').reset();
        document.getElementById('scriptId').value = '';
        document.getElementById('scriptModalOverlay').classList.add('active');
    }

    /**
     * Open the edit script modal
     */
    openEditModal(script) {
        this.isEditMode = true;
        this.currentScript = script;

        document.getElementById('scriptModalTitle').textContent = 'Edit Script';
        document.getElementById('scriptSaveBtn').textContent = 'Save Changes';

        document.getElementById('scriptId').value = script.id;
        document.getElementById('scriptName').value = script.name;
        document.getElementById('scriptProvider').value = script.provider;
        document.getElementById('scriptCategory').value = script.category;
        document.getElementById('scriptRegex').value = script.regex;
        document.getElementById('scriptDescription').value = script.description;
        document.getElementById('scriptSourceUrl').value = script.sourceUrl || '';

        document.getElementById('scriptModalOverlay').classList.add('active');
    }

    /**
     * Close the add/edit modal
     */
    closeModal() {
        document.getElementById('scriptModalOverlay').classList.remove('active');
    }

    /**
     * Open the script detail modal
     */
    openDetailModal(script) {
        this.currentScript = script;

        document.getElementById('scriptDetailModalTitle').textContent = 'Script Details';

        const copyIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg>';
        const checkIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
        const externalIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" x2="21" y1="14" y2="3"></line></svg>';
        const providerIcon = '<svg class="detail-meta-icon" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"></path><path d="M5 21V7l8-4v18"></path><path d="M19 21V11l-6-4"></path><path d="M9 9h1"></path><path d="M9 13h1"></path><path d="M9 17h1"></path></svg>';

        const sourceHtml = script.sourceUrl
            ? `<a class="detail-source-link" href="${this.escapeHtml(script.sourceUrl)}" target="_blank" rel="noopener noreferrer" title="View source documentation">${externalIcon}</a>`
            : '';

        const body = document.getElementById('scriptDetailModalBody');
        body.innerHTML = `
            <div class="detail-hero">
                <div class="detail-copyable">
                    <span class="detail-cookie-name">${this.escapeHtml(script.name)}</span>
                    <button class="btn-copy" data-field="name" title="Copy script name">${copyIcon}</button>
                </div>
                <div class="detail-meta">
                    <span class="category-badge ${script.category.toLowerCase()}">${script.category}</span>
                    <span class="detail-sep">&middot;</span>
                    <span class="detail-provider">${providerIcon}${this.escapeHtml(script.provider)}</span>
                    ${sourceHtml}
                </div>
            </div>

            <hr class="detail-divider" />

            <div>
                <div class="detail-section-head">
                    <span class="detail-label">Description</span>
                    <button class="btn-copy" data-field="description" title="Copy description">${copyIcon}</button>
                </div>
                <p class="detail-text">${this.escapeHtml(script.description)}</p>
            </div>

            <hr class="detail-divider" />

            <div>
                <span class="detail-label">Regex Rule</span>
                <div class="detail-copyable detail-copyable-sm" style="margin-top: 8px;">
                    <code>${this.escapeHtml(script.regex)}</code>
                    <button class="btn-copy" data-field="regex" title="Copy regex rule">${copyIcon}</button>
                </div>
            </div>
        `;

        // Bind copy buttons
        body.querySelectorAll('.btn-copy').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const field = btn.dataset.field;
                const text = script[field] || '';
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

        document.getElementById('scriptDetailModalOverlay').classList.add('active');
    }

    /**
     * Close the detail modal
     */
    closeDetailModal() {
        document.getElementById('scriptDetailModalOverlay').classList.remove('active');
    }

    /**
     * Open the delete confirmation modal
     */
    openDeleteModal(script) {
        this.currentScript = script;
        document.getElementById('deleteScriptName').textContent = script.name;
        document.getElementById('scriptDeleteModalOverlay').classList.add('active');
    }

    /**
     * Close the delete modal
     */
    closeDeleteModal() {
        document.getElementById('scriptDeleteModalOverlay').classList.remove('active');
    }

    /**
     * Save a script (add or update)
     */
    saveScript() {
        const id = document.getElementById('scriptId').value;
        const scriptData = {
            name: document.getElementById('scriptName').value.trim(),
            provider: document.getElementById('scriptProvider').value.trim(),
            category: document.getElementById('scriptCategory').value,
            regex: document.getElementById('scriptRegex').value.trim(),
            description: document.getElementById('scriptDescription').value.trim(),
            sourceUrl: document.getElementById('scriptSourceUrl').value.trim()
        };

        if (this.isEditMode && id) {
            // Update existing script
            const index = this.scripts.findIndex(s => s.id === id);
            if (index !== -1) {
                const existingScript = this.scripts[index];
                const updatedScript = { ...existingScript, ...scriptData };
                this.scripts[index] = updatedScript;

                if (existingScript.addedBy === 'seed') {
                    this.saveModifiedSeedScript(updatedScript);
                } else {
                    this.saveUserScripts();
                }

                this.showToast('Script updated successfully', 'success');
            }
        } else {
            // Add new script
            const newScript = {
                id: this.generateId(),
                ...scriptData,
                addedBy: 'manual'
            };
            this.scripts.push(newScript);
            this.saveUserScripts();
            this.showToast('Script added successfully', 'success');
        }

        this.closeModal();
        this.filterScripts();
        this.render();
    }

    /**
     * Delete a script
     */
    deleteScript(id) {
        const script = this.scripts.find(s => s.id === id);
        if (!script) return;

        this.scripts = this.scripts.filter(s => s.id !== id);

        if (script.addedBy === 'seed') {
            this.markSeedScriptDeleted(id);
        } else {
            this.saveUserScripts();
        }

        this.filterScripts();
        this.render();
        this.showToast('Script deleted successfully', 'success');
    }

    /**
     * Export the database as JSON
     */
    exportDatabase() {
        const exportData = {
            scripts: this.scripts,
            categories: this.categories,
            metadata: {
                version: '1.0.0',
                exportedAt: new Date().toISOString(),
                totalScripts: this.scripts.length
            }
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `scripts-db-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showToast('Scripts database exported successfully', 'success');
    }

    /**
     * Generate a unique ID
     */
    generateId() {
        return 'script-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
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
     * Show a toast notification (shared with cookies app)
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

// ===================== Page Navigation =====================

function initPageNavigation() {
    const navTabs = document.querySelectorAll('.page-nav-tab');
    const pages = document.querySelectorAll('.page-content');

    navTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetPage = tab.dataset.page;

            // Update active tab
            navTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Show/hide pages
            pages.forEach(page => {
                if (page.id === targetPage + 'Page') {
                    page.classList.add('active');
                } else {
                    page.classList.remove('active');
                }
            });
        });
    });
}

// Initialize scripts app and page navigation after DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initPageNavigation();
    window.scriptsDB = new ScriptsDatabase();
});
