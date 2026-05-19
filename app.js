// Recall Box - Your External Brain
// ADHD-friendly information storage app

// ─── State ───
let items = [];
let currentFilter = 'all';
let searchQuery = '';

const STORAGE_KEY = 'recallbox_data';

const CATEGORY_CONFIG = {
    note: { icon: '📝', label: 'Note', color: '#60a5fa' },
    task: { icon: '✅', label: 'Task', color: '#f87171' },
    link: { icon: '🔗', label: 'Link', color: '#a78bfa' },
    idea: { icon: '💡', label: 'Idea', color: '#fbbf24' },
    reminder: { icon: '⏰', label: 'Reminder', color: '#34d399' }
};

const PRIORITY_CONFIG = {
    low: { label: 'Low', class: 'priority-low' },
    medium: { label: 'Medium', class: 'priority-medium' },
    high: { label: 'High', class: 'priority-high' },
    urgent: { label: 'Urgent', class: 'priority-urgent' }
};

// ─── Initialization ───
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    renderItems();
    updateCounts();
    setupKeyboardShortcuts();
});

// ─── Data Management ───
function loadData() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            items = JSON.parse(stored);
        }
    } catch (e) {
        console.error('Failed to load data:', e);
        items = [];
    }
}

function saveData() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
        showToast('Failed to save data. Storage might be full.', 'error');
    }
}

function exportData() {
    const dataStr = JSON.stringify(items, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recallbox-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Data exported successfully!', 'success');
}

function importData(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const imported = JSON.parse(e.target.result);
            if (Array.isArray(imported)) {
                if (confirm(`Import ${imported.length} items? This will REPLACE all current data.`)) {
                    items = imported;
                    saveData();
                    renderItems();
                    updateCounts();
                    showToast(`Imported ${imported.length} items!`, 'success');
                }
            } else {
                throw new Error('Invalid format');
            }
        } catch (err) {
            showToast('Failed to import. Make sure it\'s a valid backup file.', 'error');
        }
    };
    reader.readAsText(file);
    input.value = '';
}

// ─── CRUD Operations ───
function saveEntry(event) {
    event.preventDefault();

    const id = document.getElementById('entry-id').value;
    const title = document.getElementById('entry-title').value.trim();
    const category = document.getElementById('entry-category').value;
    const priority = document.getElementById('entry-priority').value;
    const url = document.getElementById('entry-url').value.trim();
    const due = document.getElementById('entry-due').value;
    const content = document.getElementById('entry-content').value.trim();
    const tagsStr = document.getElementById('entry-tags').value;
    const tags = tagsStr.split(',').map(t => t.trim()).filter(t => t);

    if (!title) {
        showToast('Please enter a title', 'error');
        return;
    }

    const entry = {
        id: id || generateId(),
        title,
        category,
        priority,
        url: category === 'link' ? url : '',
        due: due || null,
        content,
        tags,
        pinned: id ? items.find(i => i.id === id)?.pinned || false : false,
        completed: id ? items.find(i => i.id === id)?.completed || false : false,
        archived: id ? items.find(i => i.id === id)?.archived || false : false,
        createdAt: id ? items.find(i => i.id === id).createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    if (id) {
        const index = items.findIndex(i => i.id === id);
        if (index !== -1) {
            items[index] = entry;
            showToast('Entry updated!', 'success');
        }
    } else {
        items.unshift(entry);
        showToast('Entry saved!', 'success');
    }

    saveData();
    closeModal();
    renderItems();
    updateCounts();
}

function deleteEntry(id) {
    const entry = items.find(i => i.id === id);
    if (!entry) return;

    const confirmMsg = entry.archived
        ? 'Permanently delete this entry?'
        : 'Archive this entry? (You can restore it from Archive)';

    if (confirm(confirmMsg)) {
        if (entry.archived) {
            items = items.filter(i => i.id !== id);
            showToast('Entry deleted permanently', 'success');
        } else {
            entry.archived = true;
            entry.updatedAt = new Date().toISOString();
            showToast('Entry archived', 'success');
        }
        saveData();
        renderItems();
        updateCounts();
    }
}

function restoreEntry(id) {
    const entry = items.find(i => i.id === id);
    if (entry) {
        entry.archived = false;
        entry.updatedAt = new Date().toISOString();
        saveData();
        renderItems();
        updateCounts();
        showToast('Entry restored!', 'success');
    }
}

function togglePin(id) {
    const entry = items.find(i => i.id === id);
    if (entry) {
        entry.pinned = !entry.pinned;
        entry.updatedAt = new Date().toISOString();
        saveData();
        renderItems();
        updateCounts();
        showToast(entry.pinned ? 'Pinned!' : 'Unpinned', 'success');
    }
}

function toggleComplete(id) {
    const entry = items.find(i => i.id === id);
    if (entry) {
        entry.completed = !entry.completed;
        entry.updatedAt = new Date().toISOString();
        saveData();
        renderItems();
        updateCounts();
    }
}

function editEntry(id) {
    const entry = items.find(i => i.id === id);
    if (!entry) return;

    document.getElementById('entry-id').value = entry.id;
    document.getElementById('entry-title').value = entry.title;
    document.getElementById('entry-category').value = entry.category;
    document.getElementById('entry-priority').value = entry.priority;
    document.getElementById('entry-url').value = entry.url || '';
    document.getElementById('entry-due').value = entry.due || '';
    document.getElementById('entry-content').value = entry.content || '';
    document.getElementById('entry-tags').value = entry.tags?.join(', ') || '';
    document.getElementById('modal-title').textContent = 'Edit Entry';

    updateFormFields();
    openModal();
}

// ─── Rendering ───
function renderItems() {
    const grid = document.getElementById('items-grid');
    const emptyState = document.getElementById('empty-state');
    const searchInput = document.getElementById('search');
    const sortSelect = document.getElementById('sort-by');

    searchQuery = searchInput.value.toLowerCase().trim();
    const sortBy = sortSelect.value;

    let filtered = filterItems(items, currentFilter, searchQuery);
    filtered = sortItems(filtered, sortBy);

    if (filtered.length === 0) {
        grid.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }

    grid.style.display = 'grid';
    emptyState.style.display = 'none';

    grid.innerHTML = filtered.map(item => renderItemCard(item)).join('');
}

function filterItems(items, filter, query) {
    return items.filter(item => {
        // Archive filter
        if (filter === 'archive') {
            if (!item.archived) return false;
        } else {
            if (item.archived) return false;
        }

        // Category filters
        if (['note', 'task', 'link', 'idea', 'reminder'].includes(filter)) {
            if (item.category !== filter) return false;
        }

        if (filter === 'pinned' && !item.pinned) return false;

        if (filter === 'today') {
            const isUrgent = item.priority === 'urgent' || item.priority === 'high';
            const isDueToday = item.due && isToday(item.due);
            const isOverdue = item.due && isPast(item.due) && !item.completed;
            if (!isUrgent && !isDueToday && !isOverdue) return false;
        }

        // Search
        if (query) {
            const searchable = [
                item.title,
                item.content,
                item.url,
                ...(item.tags || [])
            ].join(' ').toLowerCase();
            if (!searchable.includes(query)) return false;
        }

        return true;
    });
}

function sortItems(items, sortBy) {
    const sorted = [...items];
    switch (sortBy) {
        case 'newest':
            return sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        case 'oldest':
            return sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        case 'due':
            return sorted.sort((a, b) => {
                if (!a.due && !b.due) return 0;
                if (!a.due) return 1;
                if (!b.due) return -1;
                return new Date(a.due) - new Date(b.due);
            });
        case 'priority':
            const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
            return sorted.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
        default:
            return sorted;
    }
}

function renderItemCard(item) {
    const cat = CATEGORY_CONFIG[item.category];
    const pri = PRIORITY_CONFIG[item.priority];
    const dueClass = getDueClass(item.due, item.completed);
    const dueText = item.due ? formatDueDate(item.due) : '';

    return `
        <div class="item-card ${item.pinned ? 'pinned' : ''} ${item.priority === 'urgent' ? 'urgent' : ''} ${item.priority === 'high' ? 'high-priority' : ''} ${item.completed ? 'completed' : ''}">
            <div class="item-header">
                <div class="item-meta">
                    <span class="item-category ${item.category}">${cat.icon} ${cat.label}</span>
                    <span class="item-priority ${pri.class}">${pri.label}</span>
                </div>
                <div class="item-actions">
                    ${item.category === 'task' ? `
                        <button onclick="event.stopPropagation(); toggleComplete('${item.id}')" title="${item.completed ? 'Mark incomplete' : 'Mark complete'}">
                            ${item.completed ? '↩️' : '✓'}
                        </button>
                    ` : ''}
                    <button onclick="event.stopPropagation(); togglePin('${item.id}')" title="${item.pinned ? 'Unpin' : 'Pin'}">
                        ${item.pinned ? '📌' : '📍'}
                    </button>
                    <button onclick="event.stopPropagation(); editEntry('${item.id}')" title="Edit">✏️</button>
                    <button onclick="event.stopPropagation(); deleteEntry('${item.id}')" title="${item.archived ? 'Delete' : 'Archive'}">
                        ${item.archived ? '🗑️' : '📥'}
                    </button>
                </div>
            </div>
            
            <div class="item-title">${escapeHtml(item.title)}</div>
            
            ${item.content ? `<div class="item-content">${escapeHtml(item.content)}</div>` : ''}
            
            ${item.url ? `<a href="${escapeHtml(item.url)}" target="_blank" rel="noopener" class="item-url" onclick="event.stopPropagation()">🔗 ${escapeHtml(truncateUrl(item.url))}</a>` : ''}
            
            <div class="item-footer">
                <div class="item-tags">
                    ${(item.tags || []).map(tag => `<button class="tag" onclick="event.stopPropagation(); searchByTag('${escapeHtml(tag)}')">#${escapeHtml(tag)}</button>`).join('')}
                </div>
                ${dueText ? `<div class="item-due ${dueClass}">⏰ ${dueText}</div>` : ''}
            </div>
            
            ${item.archived ? `
                <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border);">
                    <button class="btn-primary" style="width: 100%;" onclick="event.stopPropagation(); restoreEntry('${item.id}')">Restore Entry</button>
                </div>
            ` : ''}
        </div>
    `;
}

// ─── UI Helpers ───
function setFilter(filter) {
    currentFilter = filter;

    // Update nav
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
    });

    // Update title
    const titles = {
        all: ['All Items', 'Everything you\'ve saved'],
        pinned: ['Pinned Items', 'Your most important stuff'],
        today: ['Today / Urgent', 'What needs attention now'],
        archive: ['Archive', 'Previously archived items'],
        note: ['Notes', 'All your notes'],
        task: ['Tasks', 'Things to do'],
        link: ['Links', 'Saved links and references'],
        idea: ['Ideas', 'Your brilliant ideas'],
        reminder: ['Reminders', 'Things to remember']
    };

    const [title, desc] = titles[filter] || ['Items', ''];
    document.getElementById('page-title').textContent = title;
    document.getElementById('page-desc').textContent = desc;

    renderItems();
}

function updateCounts() {
    const counts = {
        all: items.filter(i => !i.archived).length,
        pinned: items.filter(i => i.pinned && !i.archived).length,
        archive: items.filter(i => i.archived).length,
        note: items.filter(i => i.category === 'note' && !i.archived).length,
        task: items.filter(i => i.category === 'task' && !i.archived).length,
        link: items.filter(i => i.category === 'link' && !i.archived).length,
        idea: items.filter(i => i.category === 'idea' && !i.archived).length,
        reminder: items.filter(i => i.category === 'reminder' && !i.archived).length,
        today: items.filter(i => {
            if (i.archived || i.completed) return false;
            const isUrgent = i.priority === 'urgent' || i.priority === 'high';
            const isDueToday = i.due && isToday(i.due);
            const isOverdue = i.due && isPast(i.due);
            return isUrgent || isDueToday || isOverdue;
        }).length
    };

    Object.entries(counts).forEach(([key, count]) => {
        const el = document.getElementById(`count-${key}`);
        if (el) el.textContent = count;
    });
}

// ─── Modal ───
function openModal() {
    document.getElementById('modal').classList.add('active');
    document.getElementById('entry-title').focus();
}

function closeModal() {
    document.getElementById('modal').classList.remove('active');
    document.getElementById('entry-form').reset();
    document.getElementById('entry-id').value = '';
    document.getElementById('modal-title').textContent = 'New Entry';
    updateFormFields();
}

function closeModalOnBackdrop(event) {
    if (event.target === event.currentTarget) {
        closeModal();
    }
}

function updateFormFields() {
    const category = document.getElementById('entry-category').value;
    const urlField = document.getElementById('url-field');
    urlField.style.display = category === 'link' ? 'block' : 'none';
}

// ─── Search by Tag ───
function searchByTag(tag) {
    const searchInput = document.getElementById('search');
    searchInput.value = tag;
    renderItems();
    showToast(`Showing items tagged "${tag}"`, 'success');
}

// ─── Date Utilities ───
function isToday(dateStr) {
    const d = new Date(dateStr);
    const now = new Date();
    return d.toDateString() === now.toDateString();
}

function isPast(dateStr) {
    return new Date(dateStr) < new Date();
}

function getDueClass(due, completed) {
    if (!due || completed) return '';
    const date = new Date(due);
    const now = new Date();
    const diff = date - now;
    const hours = diff / (1000 * 60 * 60);

    if (diff < 0) return 'overdue';
    if (hours < 24) return 'soon';
    return '';
}

function formatDueDate(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = date - now;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (diff < 0) {
        const pastDays = Math.abs(days);
        if (pastDays === 0) return 'Today (overdue)';
        if (pastDays === 1) return 'Yesterday';
        return `${pastDays} days overdue`;
    }

    if (days === 0) {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        if (hours === 0) return 'Due now';
        if (hours < 24) return `Due in ${hours}h`;
        return 'Due today';
    }
    if (days === 1) return 'Due tomorrow';
    if (days < 7) return `Due in ${days} days`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Utilities ───
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function truncateUrl(url) {
    try {
        const u = new URL(url);
        return u.hostname + u.pathname.substring(0, 30) + (u.pathname.length > 30 ? '...' : '');
    } catch {
        return url.substring(0, 40) + (url.length > 40 ? '...' : '');
    }
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// ─── Keyboard Shortcuts ───
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + K for search
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            document.getElementById('search').focus();
        }

        // Ctrl/Cmd + N for new entry
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            openModal();
        }

        // Escape to close modal
        if (e.key === 'Escape') {
            closeModal();
        }
    });
}
