// Array to store notes (each note has a title and multiple tasks)
let notes = [];
let selectedColor = 'white';
let pendingTasks = [];
let isGridView = true;
let editingNoteId = null;
let editColor = 'white';
let selectedNotes = new Set(); // Track selected note IDs
let currentTheme = 'light'; // light, dark, cream

// Load notes from localStorage when page loads
document.addEventListener('DOMContentLoaded', function() {
    loadNotes();
    loadTheme();
    renderNotes();
});

// Handle Enter key for adding tasks
document.getElementById('taskInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        addPendingTask();
    }
});

// Add task to pending list before creating note
function addPendingTask() {
    const taskInput = document.getElementById('taskInput');
    const taskText = taskInput.value.trim();
    
    if (taskText === '') return;
    
    pendingTasks.push({
        id: Date.now(),
        text: taskText,
        completed: false
    });
    
    taskInput.value = '';
    renderPendingTasks();
}

// Render pending tasks in the input area
function renderPendingTasks() {
    const container = document.getElementById('pendingTasks');
    container.innerHTML = '';
    
    pendingTasks.forEach(function(task, index) {
        const div = document.createElement('div');
        div.className = 'pending-task';
        div.innerHTML = `
            <input type="checkbox" disabled>
            <span>${escapeHtml(task.text)}</span>
            <span class="material-icons" onclick="removePendingTask(${index})">close</span>
        `;
        container.appendChild(div);
    });
}

// Remove a pending task
function removePendingTask(index) {
    pendingTasks.splice(index, 1);
    renderPendingTasks();
}

// Select color for new note
function selectColor(color) {
    selectedColor = color;
    document.querySelectorAll('.note-input .color-dot').forEach(function(dot) {
        dot.classList.remove('active');
        if (dot.dataset.color === color) {
            dot.classList.add('active');
        }
    });
}

// Toggle between grid and list view
function toggleView() {
    isGridView = !isGridView;
    const grid = document.getElementById('notesList');
    const icon = document.querySelector('#viewToggle .material-icons');
    
    if (isGridView) {
        grid.classList.remove('list-view');
        icon.textContent = 'view_module';
    } else {
        grid.classList.add('list-view');
        icon.textContent = 'view_agenda';
    }
}

// Search notes
function searchNotes() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const cards = document.querySelectorAll('.note-card');
    
    cards.forEach(function(card) {
        const title = card.querySelector('.note-title').textContent.toLowerCase();
        const tasks = card.querySelectorAll('.task-text');
        let taskMatch = false;
        tasks.forEach(function(t) {
            if (t.textContent.toLowerCase().includes(searchTerm)) {
                taskMatch = true;
            }
        });
        
        if (title.includes(searchTerm) || taskMatch) {
            card.style.display = 'flex';
        } else {
            card.style.display = 'none';
        }
    });
}

// CREATE - Create a new note with tasks
function createNote() {
    const titleInput = document.getElementById('noteTitleInput');
    const taskInput = document.getElementById('taskInput');
    const title = titleInput.value.trim();
    
    // Add any remaining text in task input
    if (taskInput.value.trim()) {
        addPendingTask();
    }
    
    // Need at least a title or tasks
    if (title === '' && pendingTasks.length === 0) {
        titleInput.focus();
        return;
    }
    
    // Create new note object
    const newNote = {
        id: Date.now(),
        title: title || 'Untitled',
        tasks: [...pendingTasks],
        color: selectedColor,
        createdAt: new Date().toLocaleDateString()
    };
    
    // Add to notes array
    notes.unshift(newNote);
    
    // Save to localStorage
    saveNotes();
    
    // Re-render notes
    renderNotes();
    
    // Clear inputs
    titleInput.value = '';
    taskInput.value = '';
    pendingTasks = [];
    renderPendingTasks();
}

// READ - Render all notes to the DOM
function renderNotes() {
    const notesList = document.getElementById('notesList');
    notesList.innerHTML = '';
    
    if (notes.length === 0) {
        notesList.innerHTML = `
            <div class="empty-message">
                <span class="material-icons">lightbulb</span>
                Notes you add appear here
            </div>
        `;
        updateCount();
        return;
    }
    
    notes.forEach(function(note) {
        const card = document.createElement('div');
        card.className = 'note-card color-' + note.color + (selectedNotes.has(note.id) ? ' selected' : '');
        card.setAttribute('data-id', note.id);
        card.onclick = function(e) {
            if (!e.target.closest('.card-actions') && !e.target.closest('input[type="checkbox"]') && !e.target.closest('.note-select-checkbox')) {
                openEditModal(note.id);
            }
        };
        
        let tasksHtml = '';
        note.tasks.forEach(function(task) {
            tasksHtml += `
                <li class="note-task-item ${task.completed ? 'completed' : ''}">
                    <input type="checkbox" ${task.completed ? 'checked' : ''} 
                           onclick="event.stopPropagation(); toggleTask(${note.id}, ${task.id})">
                    <span class="task-text">${escapeHtml(task.text)}</span>
                </li>
            `;
        });
        
        card.innerHTML = `
            <div class="note-select-checkbox" onclick="event.stopPropagation(); toggleNoteSelection(${note.id})">
                <span class="material-icons">${selectedNotes.has(note.id) ? 'check_box' : 'check_box_outline_blank'}</span>
            </div>
            <div class="note-title">${escapeHtml(note.title)}</div>
            <ul class="note-tasks">${tasksHtml}</ul>
            <div class="card-footer">
                <span class="card-label">To Do List</span>
                <div class="card-actions">
                    <button class="icon-btn" onclick="event.stopPropagation(); selectAllTasks(${note.id})" title="Select All">
                        <span class="material-icons">checklist</span>
                    </button>
                    <button class="icon-btn" onclick="event.stopPropagation(); openEditModal(${note.id})" title="Edit">
                        <span class="material-icons">edit</span>
                    </button>
                    <button class="icon-btn" onclick="event.stopPropagation(); deleteNote(${note.id})" title="Delete">
                        <span class="material-icons">delete</span>
                    </button>
                </div>
            </div>
        `;
        
        notesList.appendChild(card);
    });
    
    updateCount();
}

// Toggle task completion
function toggleTask(noteId, taskId) {
    notes = notes.map(function(note) {
        if (note.id === noteId) {
            return {
                ...note,
                tasks: note.tasks.map(function(task) {
                    if (task.id === taskId) {
                        return { ...task, completed: !task.completed };
                    }
                    return task;
                })
            };
        }
        return note;
    });
    
    saveNotes();
    renderNotes();
}

// Select all tasks in a note
function selectAllTasks(noteId) {
    const note = notes.find(n => n.id === noteId);
    if (!note || note.tasks.length === 0) return;
    
    // Check if all are already completed
    const allCompleted = note.tasks.every(t => t.completed);
    
    // Toggle: if all completed, uncheck all; otherwise check all
    notes = notes.map(function(n) {
        if (n.id === noteId) {
            return {
                ...n,
                tasks: n.tasks.map(function(task) {
                    return { ...task, completed: !allCompleted };
                })
            };
        }
        return n;
    });
    
    saveNotes();
    renderNotes();
}

// Open edit modal
function openEditModal(noteId) {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    
    editingNoteId = noteId;
    editColor = note.color;
    
    document.getElementById('editNoteTitle').value = note.title;
    
    // Update color picker
    document.querySelectorAll('.modal .color-dot').forEach(function(dot) {
        dot.classList.remove('active');
        if (dot.dataset.color === note.color) {
            dot.classList.add('active');
        }
    });
    
    // Render tasks
    const tasksList = document.getElementById('editTasksList');
    tasksList.innerHTML = '';
    
    note.tasks.forEach(function(task) {
        const div = document.createElement('div');
        div.className = 'edit-task-item';
        div.innerHTML = `
            <input type="checkbox" ${task.completed ? 'checked' : ''} 
                   onchange="toggleEditTask(${task.id})">
            <input type="text" value="${escapeHtml(task.text)}" 
                   class="${task.completed ? 'completed' : ''}"
                   data-task-id="${task.id}">
            <button class="delete-task-btn" onclick="deleteEditTask(${task.id})">
                <span class="material-icons">close</span>
            </button>
        `;
        tasksList.appendChild(div);
    });
    
    // Update modal background color
    const modalContent = document.querySelector('.modal-content');
    modalContent.className = 'modal-content color-' + note.color;
    
    document.getElementById('editModal').classList.add('active');
}

// Close modal when clicking backdrop
function closeModalOnBackdrop(event) {
    if (event.target.id === 'editModal') {
        saveNoteEdit();
    }
}

// Toggle task in edit modal
function toggleEditTask(taskId) {
    const note = notes.find(n => n.id === editingNoteId);
    if (!note) return;
    
    note.tasks = note.tasks.map(function(task) {
        if (task.id === taskId) {
            return { ...task, completed: !task.completed };
        }
        return task;
    });
    
    // Update text decoration
    const input = document.querySelector(`[data-task-id="${taskId}"]`);
    if (input) {
        input.classList.toggle('completed');
    }
}

// Select all tasks in edit modal
function selectAllInModal() {
    const note = notes.find(n => n.id === editingNoteId);
    if (!note || note.tasks.length === 0) return;
    
    // Check if all are already completed
    const allCompleted = note.tasks.every(t => t.completed);
    
    // Toggle all tasks
    note.tasks = note.tasks.map(function(task) {
        return { ...task, completed: !allCompleted };
    });
    
    // Re-render the modal
    openEditModal(editingNoteId);
}

// Delete task in edit modal
function deleteEditTask(taskId) {
    const note = notes.find(n => n.id === editingNoteId);
    if (!note) return;
    
    note.tasks = note.tasks.filter(t => t.id !== taskId);
    openEditModal(editingNoteId); // Re-render
}

// Handle Enter key in edit modal
function handleEditTaskKeypress(event) {
    if (event.key === 'Enter') {
        const input = document.getElementById('editNewTask');
        const text = input.value.trim();
        
        if (text === '') return;
        
        const note = notes.find(n => n.id === editingNoteId);
        if (!note) return;
        
        note.tasks.push({
            id: Date.now(),
            text: text,
            completed: false
        });
        
        input.value = '';
        openEditModal(editingNoteId); // Re-render
    }
}

// Select color in edit modal
function selectEditColor(color) {
    editColor = color;
    document.querySelectorAll('.modal .color-dot').forEach(function(dot) {
        dot.classList.remove('active');
        if (dot.dataset.color === color) {
            dot.classList.add('active');
        }
    });
    
    // Update modal background
    const modalContent = document.querySelector('.modal-content');
    modalContent.className = 'modal-content color-' + color;
}

// Save note edit
function saveNoteEdit() {
    const note = notes.find(n => n.id === editingNoteId);
    if (!note) {
        document.getElementById('editModal').classList.remove('active');
        return;
    }
    
    // Update title
    note.title = document.getElementById('editNoteTitle').value.trim() || 'Untitled';
    
    // Update task texts
    document.querySelectorAll('.edit-task-item input[type="text"]').forEach(function(input) {
        const taskId = parseInt(input.dataset.taskId);
        const task = note.tasks.find(t => t.id === taskId);
        if (task) {
            task.text = input.value.trim() || task.text;
        }
    });
    
    // Add new task if there's text
    const newTaskInput = document.getElementById('editNewTask');
    if (newTaskInput.value.trim()) {
        note.tasks.push({
            id: Date.now(),
            text: newTaskInput.value.trim(),
            completed: false
        });
    }
    
    // Update color
    note.color = editColor;
    
    saveNotes();
    renderNotes();
    
    document.getElementById('editModal').classList.remove('active');
    editingNoteId = null;
}

// DELETE - Remove a note
function deleteNote(noteId) {
    notes = notes.filter(n => n.id !== noteId);
    selectedNotes.delete(noteId);
    saveNotes();
    renderNotes();
    updateSelectionUI();
}

// Toggle note selection
function toggleNoteSelection(noteId) {
    if (selectedNotes.has(noteId)) {
        selectedNotes.delete(noteId);
    } else {
        selectedNotes.add(noteId);
    }
    renderNotes();
    updateSelectionUI();
}

// Toggle select all notes
function toggleSelectAllNotes() {
    if (selectedNotes.size === notes.length && notes.length > 0) {
        // All selected, deselect all
        selectedNotes.clear();
    } else {
        // Select all
        notes.forEach(n => selectedNotes.add(n.id));
    }
    renderNotes();
    updateSelectionUI();
}

// Clear selection
function clearSelection() {
    selectedNotes.clear();
    renderNotes();
    updateSelectionUI();
}

// Delete all selected notes
function deleteSelectedNotes() {
    if (selectedNotes.size === 0) return;
    
    notes = notes.filter(n => !selectedNotes.has(n.id));
    selectedNotes.clear();
    saveNotes();
    renderNotes();
    updateSelectionUI();
}

// Update selection UI
function updateSelectionUI() {
    const controls = document.getElementById('selectionControls');
    const selectAllBtn = document.getElementById('selectAllNotesBtn');
    const countEl = document.getElementById('selectedCount');
    
    if (selectedNotes.size > 0) {
        controls.classList.add('visible');
        countEl.textContent = selectedNotes.size + ' selected';
    } else {
        controls.classList.remove('visible');
    }
    
    // Update select all button icon
    if (selectAllBtn) {
        const icon = selectAllBtn.querySelector('.material-icons');
        if (selectedNotes.size === notes.length && notes.length > 0) {
            icon.textContent = 'check_box';
        } else if (selectedNotes.size > 0) {
            icon.textContent = 'indeterminate_check_box';
        } else {
            icon.textContent = 'check_box_outline_blank';
        }
    }
}

// Save notes to localStorage
function saveNotes() {
    localStorage.setItem('castilloNotes', JSON.stringify(notes));
}

// Load notes from localStorage
function loadNotes() {
    const stored = localStorage.getItem('castilloNotes');
    if (stored) {
        notes = JSON.parse(stored);
    }
}

// Update count display
function updateCount() {
    const countEl = document.getElementById('taskCount');
    const totalNotes = notes.length;
    const totalTasks = notes.reduce((sum, note) => sum + note.tasks.length, 0);
    const completedTasks = notes.reduce((sum, note) => 
        sum + note.tasks.filter(t => t.completed).length, 0);
    
    if (totalNotes === 0) {
        countEl.textContent = 'No notes';
    } else {
        countEl.textContent = `${totalNotes} note${totalNotes !== 1 ? 's' : ''} • ${totalTasks} task${totalTasks !== 1 ? 's' : ''} (${completedTasks} completed)`;
    }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Theme functions
function cycleTheme() {
    const themes = ['light', 'dark', 'cream'];
    const currentIndex = themes.indexOf(currentTheme);
    const nextIndex = (currentIndex + 1) % themes.length;
    currentTheme = themes[nextIndex];
    applyTheme();
    saveTheme();
}

function applyTheme() {
    document.body.classList.remove('theme-light', 'theme-dark', 'theme-cream');
    document.body.classList.add('theme-' + currentTheme);
    
    // Update theme icon
    const icon = document.querySelector('#themeToggle .material-icons');
    if (icon) {
        if (currentTheme === 'light') {
            icon.textContent = 'light_mode';
        } else if (currentTheme === 'dark') {
            icon.textContent = 'dark_mode';
        } else {
            icon.textContent = 'wb_sunny';
        }
    }
}

function saveTheme() {
    localStorage.setItem('castilloTheme', currentTheme);
}

function loadTheme() {
    const saved = localStorage.getItem('castilloTheme');
    if (saved) {
        currentTheme = saved;
    }
    applyTheme();
}
