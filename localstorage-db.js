/**
 * LocalStorage Database Application
 * A browser-based localStorage item reference tool with Osano-style categorization
 */

class LocalStorageDatabase {
    constructor() {
        this.items = [];
        this.categories = [];
        this.filteredItems = [];
        this.currentCategory = 'all';
        this.searchQuery = '';
        this.currentItem = null;
        this.isEditMode = false;

        this.init();
    }

    async init() {
        await this.loadData();
        this.bindEvents();
        this.render();
    }

    async loadData() {
        try {
            const response = await fetch('./data/localstorage-db.json');
            const data = await response.json();

            this.categories = data.categories || [];

            let seedItems = (data.items || []).map(i => ({ ...i, addedBy: i.addedBy || 'seed' }));

            const storedItems = localStorage.getItem('userLsItems');
            let userItems = storedItems ? JSON.parse(storedItems) : [];

            const deletedIds = JSON.parse(localStorage.getItem('deletedSeedLsItems') || '[]');
            seedItems = seedItems.filter(i => !deletedIds.includes(i.id));

            const modifiedItems = JSON.parse(localStorage.getItem('modifiedSeedLsItems') || '{}');
            seedItems = seedItems.map(item => {
                if (modifiedItems[item.id]) {
                    return { ...item, ...modifiedItems[item.id] };
                }
                return item;
            });

            this.items = [...seedItems, ...userItems];
            this.filterItems();
        } catch (error) {
            console.error('Error loading localStorage data:', error);
            this.showToast('Error loading localStorage data', 'error');
        }
    }

    saveUserItems() {
        const userItems = this.items.filter(i => i.addedBy === 'manual');
        localStorage.setItem('userLsItems', JSON.stringify(userItems));
    }

    saveModifiedSeedItem(item) {
        const modifiedItems = JSON.parse(localStorage.getItem('modifiedSeedLsItems') || '{}');
        modifiedItems[item.id] = item;
        localStorage.setItem('modifiedSeedLsItems', JSON.stringify(modifiedItems));
    }

    markSeedItemDeleted(id) {
        const deletedIds = JSON.parse(localStorage.getItem('deletedSeedLsItems') || '[]');
        if (!deletedIds.includes(id)) {
            deletedIds.push(id);
            localStorage.setItem('deletedSeedLsItems', JSON.stringify(deletedIds));
        }
    }

    bindEvents() {
        const searchInput = document.getElementById('lsSearchInput');
        const clearSearch = document.getElementById('lsClearSearch');

        searchInput.addEventListener('input', (e) => {
            this.searchQuery = e.target.value.trim().toLowerCase();
            clearSearch.style.display = this.searchQuery ? 'flex' : 'none';
            this.filterItems();
            this.render();
        });

        clearSearch.addEventListener('click', () => {
            searchInput.value = '';
            this.searchQuery = '';
            clearSearch.style.display = 'none';
            this.filterItems();
            this.render();
        });

        document.querySelectorAll('#lsCategoryTabs .category-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelector('#lsCategoryTabs .category-tab.active').classList.remove('active');
                tab.classList.add('active');
                this.currentCategory = tab.dataset.category;
                this.filterItems();
                this.render();
            });
        });

        document.getElementById('addLsBtn').addEventListener('click', () => {
            this.openAddModal();
        });

        document.getElementById('lsExportBtn').addEventListener('click', () => {
            this.exportDatabase();
        });

        document.getElementById('lsModalClose').addEventListener('click', () => this.closeModal());
        document.getElementById('lsCancelBtn').addEventListener('click', () => this.closeModal());
        document.getElementById('lsModalOverlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) this.closeModal();
        });

        document.getElementById('lsDetailModalClose').addEventListener('click', () => this.closeDetailModal());
        document.getElementById('lsDetailModalOverlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) this.closeDetailModal();
        });

        document.getElementById('lsDetailEditBtn').addEventListener('click', () => {
            this.closeDetailModal();
            this.openEditModal(this.currentItem);
        });

        document.getElementById('lsDetailDeleteBtn').addEventListener('click', () => {
            this.closeDetailModal();
            this.openDeleteModal(this.currentItem);
        });

        document.getElementById('lsDeleteCancelBtn').addEventListener('click', () => this.closeDeleteModal());
        document.getElementById('lsDeleteModalOverlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) this.closeDeleteModal();
        });
        document.getElementById('lsDeleteConfirmBtn').addEventListener('click', () => {
            this.deleteItem(this.currentItem.id);
            this.closeDeleteModal();
        });

        document.getElementById('lsForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveItem();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
                this.closeDetailModal();
                this.closeDeleteModal();
            }
        });
    }

    filterItems() {
        this.filteredItems = this.items.filter(item => {
            const categoryMatch = this.currentCategory === 'all' ||
                                  item.category === this.currentCategory;

            const searchMatch = !this.searchQuery ||
                item.name.toLowerCase().includes(this.searchQuery) ||
                item.provider.toLowerCase().includes(this.searchQuery) ||
                item.description.toLowerCase().includes(this.searchQuery) ||
                item.regex.toLowerCase().includes(this.searchQuery);

            return categoryMatch && searchMatch;
        });

        this.filteredItems.sort((a, b) => a.name.localeCompare(b.name));
    }

    render() {
        this.updateCounts();
        this.renderItemList();
    }

    updateCounts() {
        const counts = {
            all: this.items.length,
            Essential: 0,
            Analytics: 0,
            Marketing: 0,
            Personalized: 0,
            Blocklisted: 0
        };

        this.items.forEach(item => {
            if (counts.hasOwnProperty(item.category)) {
                counts[item.category]++;
            }
        });

        Object.keys(counts).forEach(key => {
            const el = document.getElementById(`ls-count-${key}`);
            if (el) el.textContent = counts[key];
        });

        document.getElementById('lsResultsCount').textContent =
            `${this.filteredItems.length} item${this.filteredItems.length !== 1 ? 's' : ''} found`;
    }

    renderItemList() {
        const container = document.getElementById('lsList');
        const emptyState = document.getElementById('lsEmptyState');

        if (this.filteredItems.length === 0) {
            container.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';

        container.innerHTML = this.filteredItems.map(item => `
            <div class="cookie-card ls-card" data-id="${item.id}">
                <div class="cookie-card-header">
                    <div>
                        <div class="cookie-name">${this.escapeHtml(item.name)}</div>
                        <div class="cookie-provider">${this.escapeHtml(item.provider)}</div>
                    </div>
                    <span class="category-badge ${item.category.toLowerCase()}">
                        ${item.category}
                    </span>
                </div>
                <div class="cookie-description">${this.escapeHtml(item.description)}</div>
                <div class="cookie-meta">
                    <div class="cookie-meta-item">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                            <path d="M3 5V19A9 3 0 0 0 21 19V5"></path>
                            <path d="M3 12A9 3 0 0 0 21 12"></path>
                        </svg>
                        ${this.escapeHtml(item.persistence)}
                    </div>
                    <div class="cookie-meta-item">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="4 7 4 4 20 4 20 7"></polyline>
                            <line x1="9" x2="15" y1="20" y2="20"></line>
                            <line x1="12" x2="12" y1="4" y2="20"></line>
                        </svg>
                        <code>${this.escapeHtml(item.regex)}</code>
                    </div>
                </div>
            </div>
        `).join('');

        container.querySelectorAll('.ls-card').forEach(card => {
            card.addEventListener('click', () => {
                const item = this.items.find(i => i.id === card.dataset.id);
                if (item) this.openDetailModal(item);
            });
        });
    }

    openAddModal() {
        this.isEditMode = false;
        document.getElementById('lsModalTitle').textContent = 'Add New Item';
        document.getElementById('lsSaveBtn').textContent = 'Add Item';
        document.getElementById('lsForm').reset();
        document.getElementById('lsId').value = '';
        document.getElementById('lsModalOverlay').classList.add('active');
    }

    openEditModal(item) {
        this.isEditMode = true;
        this.currentItem = item;

        document.getElementById('lsModalTitle').textContent = 'Edit Item';
        document.getElementById('lsSaveBtn').textContent = 'Save Changes';

        document.getElementById('lsId').value = item.id;
        document.getElementById('lsName').value = item.name;
        document.getElementById('lsProvider').value = item.provider;
        document.getElementById('lsCategory').value = item.category;
        document.getElementById('lsPersistence').value = item.persistence;
        document.getElementById('lsRegex').value = item.regex;
        document.getElementById('lsDescription').value = item.description;
        document.getElementById('lsSourceUrl').value = item.sourceUrl || '';

        document.getElementById('lsModalOverlay').classList.add('active');
    }

    closeModal() {
        document.getElementById('lsModalOverlay').classList.remove('active');
    }

    openDetailModal(item) {
        this.currentItem = item;

        document.getElementById('lsDetailModalTitle').textContent = 'LocalStorage Item Details';

        const copyIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg>';
        const checkIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
        const externalIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" x2="21" y1="14" y2="3"></line></svg>';
        const providerIcon = '<svg class="detail-meta-icon" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"></path><path d="M5 21V7l8-4v18"></path><path d="M19 21V11l-6-4"></path><path d="M9 9h1"></path><path d="M9 13h1"></path><path d="M9 17h1"></path></svg>';

        const sourceHtml = item.sourceUrl
            ? `<a class="detail-source-link" href="${this.escapeHtml(item.sourceUrl)}" target="_blank" rel="noopener noreferrer" title="View source documentation">${externalIcon}</a>`
            : '';

        const body = document.getElementById('lsDetailModalBody');
        body.innerHTML = `
            <div class="detail-hero">
                <div class="detail-copyable">
                    <code class="detail-cookie-name">${this.escapeHtml(item.name)}</code>
                    <button class="btn-copy" data-field="name" title="Copy key name">${copyIcon}</button>
                </div>
                <div class="detail-meta">
                    <span class="category-badge ${item.category.toLowerCase()}">${item.category}</span>
                    <span class="detail-sep">&middot;</span>
                    <span class="detail-provider">${providerIcon}${this.escapeHtml(item.provider)}</span>
                    ${sourceHtml}
                </div>
            </div>

            <hr class="detail-divider" />

            <div>
                <div class="detail-section-head">
                    <span class="detail-label">Description</span>
                    <button class="btn-copy" data-field="description" title="Copy description">${copyIcon}</button>
                </div>
                <p class="detail-text">${this.escapeHtml(item.description)}</p>
            </div>

            <hr class="detail-divider" />

            <div class="detail-row">
                <div>
                    <span class="detail-label">Persistence</span>
                    <div class="detail-copyable detail-copyable-sm">
                        <span>${this.escapeHtml(item.persistence)}</span>
                        <button class="btn-copy" data-field="persistence" title="Copy persistence">${copyIcon}</button>
                    </div>
                </div>
                <div>
                    <span class="detail-label">Regex Pattern</span>
                    <div class="detail-copyable detail-copyable-sm">
                        <code>${this.escapeHtml(item.regex)}</code>
                        <button class="btn-copy" data-field="regex" title="Copy regex pattern">${copyIcon}</button>
                    </div>
                </div>
            </div>
        `;

        body.querySelectorAll('.btn-copy').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const field = btn.dataset.field;
                const text = item[field] || '';
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

        document.getElementById('lsDetailModalOverlay').classList.add('active');
    }

    closeDetailModal() {
        document.getElementById('lsDetailModalOverlay').classList.remove('active');
    }

    openDeleteModal(item) {
        this.currentItem = item;
        document.getElementById('deleteLsName').textContent = item.name;
        document.getElementById('lsDeleteModalOverlay').classList.add('active');
    }

    closeDeleteModal() {
        document.getElementById('lsDeleteModalOverlay').classList.remove('active');
    }

    saveItem() {
        const id = document.getElementById('lsId').value;
        const itemData = {
            name: document.getElementById('lsName').value.trim(),
            provider: document.getElementById('lsProvider').value.trim(),
            category: document.getElementById('lsCategory').value,
            persistence: document.getElementById('lsPersistence').value.trim(),
            regex: document.getElementById('lsRegex').value.trim(),
            description: document.getElementById('lsDescription').value.trim(),
            sourceUrl: document.getElementById('lsSourceUrl').value.trim()
        };

        if (this.isEditMode && id) {
            const index = this.items.findIndex(i => i.id === id);
            if (index !== -1) {
                const existingItem = this.items[index];
                const updatedItem = { ...existingItem, ...itemData };
                this.items[index] = updatedItem;

                if (existingItem.addedBy === 'seed') {
                    this.saveModifiedSeedItem(updatedItem);
                } else {
                    this.saveUserItems();
                }

                this.showToast('Item updated successfully', 'success');
            }
        } else {
            const newItem = {
                id: this.generateId(),
                ...itemData,
                addedBy: 'manual'
            };
            this.items.push(newItem);
            this.saveUserItems();
            this.showToast('Item added successfully', 'success');
        }

        this.closeModal();
        this.filterItems();
        this.render();
    }

    deleteItem(id) {
        const item = this.items.find(i => i.id === id);
        if (!item) return;

        this.items = this.items.filter(i => i.id !== id);

        if (item.addedBy === 'seed') {
            this.markSeedItemDeleted(id);
        } else {
            this.saveUserItems();
        }

        this.filterItems();
        this.render();
        this.showToast('Item deleted successfully', 'success');
    }

    exportDatabase() {
        const exportData = {
            items: this.items,
            categories: this.categories,
            metadata: {
                version: '1.0.0',
                exportedAt: new Date().toISOString(),
                totalItems: this.items.length
            }
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `localstorage-db-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showToast('LocalStorage database exported successfully', 'success');
    }

    generateId() {
        return 'ls-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

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

document.addEventListener('DOMContentLoaded', () => {
    window.localStorageDB = new LocalStorageDatabase();
});
