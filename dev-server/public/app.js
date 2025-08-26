class VisualDevClient {
  constructor() {
    this.socket = null;
    this.currentFile = null;
    this.openFiles = new Map();
    this.currentPanel = 'agents';
    this.currentTab = 'editor';
    this.taskHistory = [];
    this.isConnected = false;
    
    this.initializeSocket();
    this.setupEventListeners();
    this.setupUI();
    
    // Hide loading overlay after initialization
    setTimeout(() => {
      document.getElementById('loadingOverlay').style.display = 'none';
    }, 1500);
  }

  initializeSocket() {
    this.socket = io();
    
    this.socket.on('connect', () => {
      console.log('Connected to development server');
      this.isConnected = true;
      this.updateConnectionStatus('connected', 'Connected');
    });
    
    this.socket.on('disconnect', () => {
      console.log('Disconnected from development server');
      this.isConnected = false;
      this.updateConnectionStatus('disconnected', 'Disconnected');
    });
    
    this.socket.on('server-status', (data) => {
      this.updateTaskCounter(data.runningTasks, data.tasks);
    });
    
    this.socket.on('task-started', (data) => {
      this.addTaskToUI(data);
      this.addConversationMessage('system', `Started ${data.type}: ${data.task || data.topic || 'Task'}`);
    });
    
    this.socket.on('agent-message', (data) => {
      this.addConversationMessage(data.type, data.message, data.timestamp);
    });
    
    this.socket.on('task-completed', (data) => {
      this.updateTaskStatus(data.taskId, 'completed', data.duration);
      this.addConversationMessage('system', `Task completed in ${this.formatDuration(data.duration)}`);
    });
    
    this.socket.on('task-error', (data) => {
      this.updateTaskStatus(data.taskId, 'error');
      this.addConversationMessage('error', `Task failed: ${data.error}`);
    });
    
    this.socket.on('terminal-output', (data) => {
      this.addTerminalOutput(data);
    });
    
    this.socket.on('file-content', (data) => {
      if (data.success) {
        this.openFileInEditor(data.filePath, data.content);
      } else {
        this.showError(`Failed to load file: ${data.error}`);
      }
    });
    
    this.socket.on('file-saved', (data) => {
      if (data.success) {
        this.showSuccess(`File saved: ${data.filePath}`);
        this.markFileClean(data.filePath);
      } else {
        this.showError(`Failed to save file: ${data.error}`);
      }
    });
    
    this.socket.on('directory-list', (data) => {
      if (data.success) {
        this.updateFileTree(data.files, data.dirPath);
      } else {
        this.showError(`Failed to load directory: ${data.error}`);
      }
    });
    
    this.socket.on('file-change', (data) => {
      this.handleFileChange(data);
    });
  }

  setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const panel = item.dataset.panel;
        this.switchPanel(panel);
      });
    });
    
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        this.switchTab(tab);
      });
    });
    
    // Task type switching
    document.getElementById('taskType').addEventListener('change', (e) => {
      this.updateTaskInputs(e.target.value);
    });
    
    // Start agent task
    document.getElementById('startAgentTask').addEventListener('click', () => {
      this.startAgentTask();
    });
    
    // Terminal input
    document.getElementById('terminalInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const command = e.target.value.trim();
        if (command) {
          this.executeTerminalCommand(command);
          e.target.value = '';
        }
      }
    });
    
    // Code editor changes
    document.getElementById('codeEditor').addEventListener('input', () => {
      this.markFileModified();
    });
    
    // Save file
    document.getElementById('saveFileBtn').addEventListener('click', () => {
      this.saveCurrentFile();
    });
    
    // File tree refresh
    document.getElementById('refreshFilesBtn').addEventListener('click', () => {
      this.loadFileTree();
    });
    
    // Clear buttons
    document.getElementById('clearTerminalBtn').addEventListener('click', () => {
      document.getElementById('terminalOutput').innerHTML = '';
    });
    
    document.getElementById('clearTasksBtn').addEventListener('click', () => {
      this.clearTaskList();
    });
    
    document.getElementById('clearOutputBtn').addEventListener('click', () => {
      document.getElementById('outputContent').innerHTML = '<div class="output-placeholder"><p>System output will appear here...</p></div>';
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch(e.key) {
          case 's':
            e.preventDefault();
            this.saveCurrentFile();
            break;
          case 'n':
            e.preventDefault();
            this.createNewFile();
            break;
          case '`':
            e.preventDefault();
            this.switchPanel('terminal');
            break;
        }
      }
    });
  }

  setupUI() {
    this.loadFileTree();
    this.updateTaskInputs('task');
  }

  // UI State Management
  updateConnectionStatus(status, text) {
    const statusEl = document.getElementById('connectionStatus');
    const dotEl = statusEl.querySelector('.status-dot');
    const textEl = statusEl.querySelector('span');
    
    dotEl.className = `status-dot ${status}`;
    textEl.textContent = text;
    
    document.getElementById('serverStatus').textContent = `Server: ${text}`;
  }

  updateTaskCounter(running, queued) {
    document.querySelector('.running-tasks').textContent = running || 0;
    document.querySelector('.queued-tasks').textContent = queued || 0;
  }

  switchPanel(panelName) {
    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.panel === panelName);
    });
    
    // Update panels
    document.querySelectorAll('.panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === `${panelName}Panel`);
    });
    
    this.currentPanel = panelName;
    
    // Load data if needed
    if (panelName === 'files') {
      this.loadFileTree();
    }
  }

  switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.toggle('active', content.id === `${tabName}Tab`);
    });
    
    this.currentTab = tabName;
  }

  updateTaskInputs(taskType) {
    const taskGroup = document.getElementById('taskInputGroup');
    const codeGroup = document.getElementById('codeInputGroup');
    const topicGroup = document.getElementById('topicInputGroup');
    
    // Hide all groups
    taskGroup.style.display = 'none';
    codeGroup.style.display = 'none';
    topicGroup.style.display = 'none';
    
    // Show appropriate group
    switch(taskType) {
      case 'task':
        taskGroup.style.display = 'block';
        break;
      case 'review':
        codeGroup.style.display = 'block';
        break;
      case 'brainstorm':
        topicGroup.style.display = 'block';
        break;
    }
  }

  // Agent Task Management
  startAgentTask() {
    const taskType = document.getElementById('taskType').value;
    let data = { type: taskType };
    
    switch(taskType) {
      case 'task':
        const task = document.getElementById('taskInput').value.trim();
        if (!task) {
          this.showError('Please enter a task description');
          return;
        }
        data.task = task;
        this.socket.emit('start-agent-task', data);
        break;
        
      case 'review':
        const code = document.getElementById('codeInput').value.trim();
        if (!code) {
          this.showError('Please enter code to review');
          return;
        }
        data.code = code;
        this.socket.emit('start-code-review', data);
        break;
        
      case 'brainstorm':
        const topic = document.getElementById('topicInput').value.trim();
        const rounds = parseInt(document.getElementById('roundsInput').value) || 3;
        if (!topic) {
          this.showError('Please enter a topic to brainstorm');
          return;
        }
        data.topic = topic;
        data.rounds = rounds;
        this.socket.emit('start-brainstorm', data);
        break;
    }
    
    // Clear input after starting task
    this.clearTaskInputs();
  }

  clearTaskInputs() {
    document.getElementById('taskInput').value = '';
    document.getElementById('codeInput').value = '';
    document.getElementById('topicInput').value = '';
    document.getElementById('roundsInput').value = '3';
  }

  // Conversation UI
  addConversationMessage(type, message, timestamp = Date.now()) {
    const conversationArea = document.getElementById('conversationArea');
    
    // Remove placeholder if it exists
    const placeholder = conversationArea.querySelector('.conversation-placeholder');
    if (placeholder) {
      placeholder.remove();
    }
    
    const messageEl = document.createElement('div');
    messageEl.className = `conversation-message message-${type}`;
    
    const agentName = this.getAgentName(type);
    const time = new Date(timestamp).toLocaleTimeString();
    
    messageEl.innerHTML = `
      <div class="message-header">
        <span class="agent-name">${agentName}</span>
        <span class="message-timestamp">${time}</span>
      </div>
      <div class="message-content">${this.escapeHtml(message)}</div>
    `;
    
    conversationArea.appendChild(messageEl);
    
    // Auto-scroll to bottom
    conversationArea.scrollTop = conversationArea.scrollHeight;
  }

  getAgentName(type) {
    const names = {
      claude: '🔵 Claude',
      gemini: '🟢 Gemini',
      system: '🤖 System',
      error: '❌ Error',
      info: 'ℹ️ Info'
    };
    return names[type] || 'Unknown';
  }

  // Task Management UI
  addTaskToUI(taskData) {
    const taskList = document.getElementById('taskList');
    
    // Remove empty state
    const emptyState = taskList.querySelector('.task-list-empty');
    if (emptyState) {
      emptyState.remove();
    }
    
    const taskEl = document.createElement('div');
    taskEl.className = 'task-item';
    taskEl.dataset.taskId = taskData.taskId;
    
    taskEl.innerHTML = `
      <div class="task-header">
        <span class="task-type">${taskData.type}</span>
        <span class="task-status running">Running</span>
      </div>
      <div class="task-description">${this.escapeHtml(taskData.task || taskData.topic || 'Task')}</div>
      <div class="task-duration">Started at ${new Date().toLocaleTimeString()}</div>
    `;
    
    taskList.insertBefore(taskEl, taskList.firstChild);
  }

  updateTaskStatus(taskId, status, duration) {
    const taskEl = document.querySelector(`[data-task-id="${taskId}"]`);
    if (!taskEl) return;
    
    const statusEl = taskEl.querySelector('.task-status');
    const durationEl = taskEl.querySelector('.task-duration');
    
    statusEl.textContent = status.charAt(0).toUpperCase() + status.slice(1);
    statusEl.className = `task-status ${status}`;
    
    if (duration) {
      durationEl.textContent = `Completed in ${this.formatDuration(duration)}`;
    }
  }

  clearTaskList() {
    const taskList = document.getElementById('taskList');
    taskList.innerHTML = `
      <div class="task-list-empty">
        <div class="empty-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14,2 14,8 20,8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
        </div>
        <p>No tasks in queue</p>
      </div>
    `;
  }

  // Terminal Management
  executeTerminalCommand(command) {
    this.socket.emit('terminal-command', { command });
  }

  addTerminalOutput(data) {
    const terminalOutput = document.getElementById('terminalOutput');
    const line = document.createElement('div');
    line.className = `terminal-line terminal-${data.type}`;
    
    const time = new Date(data.timestamp).toLocaleTimeString();
    
    switch(data.type) {
      case 'command':
        line.innerHTML = `<span class="terminal-timestamp">[${time}]</span> ${this.escapeHtml(data.data)}`;
        break;
      case 'exit':
        line.innerHTML = `<span class="terminal-timestamp">[${time}]</span> <span class="terminal-exit">${this.escapeHtml(data.data)}</span>`;
        break;
      default:
        line.textContent = data.data;
    }
    
    terminalOutput.appendChild(line);
    terminalOutput.scrollTop = terminalOutput.scrollHeight;
  }

  // File Management
  loadFileTree() {
    this.socket.emit('list-directory', { dirPath: '' });
  }

  updateFileTree(files, dirPath) {
    const fileTree = document.getElementById('fileTree');
    
    // Remove loading state
    const loading = fileTree.querySelector('.file-tree-loading');
    if (loading) {
      loading.remove();
    }
    
    // Filter and sort files
    const filteredFiles = files.filter(file => 
      !file.name.startsWith('.') && 
      !file.name.includes('node_modules') &&
      !file.name.includes('.git')
    );
    
    const directories = filteredFiles.filter(f => f.type === 'directory').sort((a, b) => a.name.localeCompare(b.name));
    const regularFiles = filteredFiles.filter(f => f.type === 'file').sort((a, b) => a.name.localeCompare(b.name));
    
    fileTree.innerHTML = '';
    
    [...directories, ...regularFiles].forEach(file => {
      const fileEl = document.createElement('div');
      fileEl.className = 'file-item';
      fileEl.dataset.filePath = file.path;
      
      const icon = this.getFileIcon(file);
      const size = file.type === 'file' ? this.formatFileSize(file.size) : '';
      
      fileEl.innerHTML = `
        <div class="file-icon">${icon}</div>
        <div class="file-name">${this.escapeHtml(file.name)}</div>
        <div class="file-size">${size}</div>
      `;
      
      if (file.type === 'file') {
        fileEl.addEventListener('click', () => {
          this.openFile(file.path);
        });
      } else {
        fileEl.addEventListener('click', () => {
          this.socket.emit('list-directory', { dirPath: file.path });
        });
      }
      
      fileTree.appendChild(fileEl);
    });
  }

  getFileIcon(file) {
    if (file.type === 'directory') {
      return '📁';
    }
    
    const ext = file.name.split('.').pop().toLowerCase();
    const icons = {
      js: '🟨',
      jsx: '⚛️',
      ts: '🟦',
      tsx: '⚛️',
      json: '📄',
      md: '📝',
      css: '🎨',
      html: '🌐',
      png: '🖼️',
      jpg: '🖼️',
      jpeg: '🖼️',
      svg: '🎨',
      txt: '📄'
    };
    
    return icons[ext] || '📄';
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  openFile(filePath) {
    this.socket.emit('read-file', { filePath });
    
    // Switch to editor tab
    this.switchTab('editor');
    
    // Update file tree selection
    document.querySelectorAll('.file-item').forEach(item => {
      item.classList.toggle('selected', item.dataset.filePath === filePath);
    });
  }

  openFileInEditor(filePath, content) {
    this.currentFile = filePath;
    this.openFiles.set(filePath, { content, modified: false });
    
    // Update editor
    const editor = document.getElementById('codeEditor');
    editor.value = content;
    
    // Update file tabs
    this.updateFileTabs();
    
    // Update status
    document.getElementById('currentFile').textContent = filePath;
    document.getElementById('saveFileBtn').disabled = false;
    
    // Highlight syntax
    this.highlightSyntax();
  }

  updateFileTabs() {
    const fileTabs = document.getElementById('fileTabs');
    
    if (this.openFiles.size === 0) {
      fileTabs.innerHTML = `
        <div class="no-file-open">
          <span>No file open</span>
          <button class="btn-sm" onclick="openFileDialog()">Open File</button>
        </div>
      `;
      return;
    }
    
    fileTabs.innerHTML = '';
    
    this.openFiles.forEach((fileData, filePath) => {
      const tabEl = document.createElement('div');
      tabEl.className = `file-tab ${filePath === this.currentFile ? 'active' : ''}`;
      
      const fileName = filePath.split('/').pop();
      const modifiedIndicator = fileData.modified ? '●' : '';
      
      tabEl.innerHTML = `
        <span class="tab-name">${this.escapeHtml(fileName)}${modifiedIndicator}</span>
        <span class="tab-close" onclick="closeFile('${filePath}')">×</span>
      `;
      
      tabEl.addEventListener('click', (e) => {
        if (!e.target.classList.contains('tab-close')) {
          this.switchToFile(filePath);
        }
      });
      
      fileTabs.appendChild(tabEl);
    });
  }

  switchToFile(filePath) {
    if (this.openFiles.has(filePath)) {
      this.currentFile = filePath;
      const fileData = this.openFiles.get(filePath);
      document.getElementById('codeEditor').value = fileData.content;
      this.updateFileTabs();
      document.getElementById('currentFile').textContent = filePath;
      this.highlightSyntax();
    }
  }

  closeFile(filePath) {
    const fileData = this.openFiles.get(filePath);
    if (fileData && fileData.modified) {
      if (!confirm(`File ${filePath} has unsaved changes. Close anyway?`)) {
        return;
      }
    }
    
    this.openFiles.delete(filePath);
    
    if (this.currentFile === filePath) {
      const remainingFiles = Array.from(this.openFiles.keys());
      if (remainingFiles.length > 0) {
        this.switchToFile(remainingFiles[0]);
      } else {
        this.currentFile = null;
        document.getElementById('codeEditor').value = '';
        document.getElementById('currentFile').textContent = 'No file selected';
        document.getElementById('saveFileBtn').disabled = true;
      }
    }
    
    this.updateFileTabs();
  }

  markFileModified() {
    if (this.currentFile && this.openFiles.has(this.currentFile)) {
      const fileData = this.openFiles.get(this.currentFile);
      const currentContent = document.getElementById('codeEditor').value;
      const isModified = currentContent !== fileData.content;
      
      fileData.modified = isModified;
      this.openFiles.set(this.currentFile, fileData);
      this.updateFileTabs();
    }
  }

  markFileClean(filePath) {
    if (this.openFiles.has(filePath)) {
      const fileData = this.openFiles.get(filePath);
      fileData.modified = false;
      fileData.content = document.getElementById('codeEditor').value;
      this.openFiles.set(filePath, fileData);
      this.updateFileTabs();
    }
  }

  saveCurrentFile() {
    if (!this.currentFile) {
      this.showError('No file open to save');
      return;
    }
    
    const content = document.getElementById('codeEditor').value;
    this.socket.emit('write-file', {
      filePath: this.currentFile,
      content: content
    });
  }

  createNewFile() {
    const fileName = prompt('Enter file name:');
    if (fileName) {
      this.openFileInEditor(fileName, '');
    }
  }

  highlightSyntax() {
    if (!this.currentFile) return;
    
    const editor = document.getElementById('codeEditor');
    const language = this.getLanguageFromFile(this.currentFile);
    
    // Apply basic styling based on file type
    editor.dataset.language = language;
    
    // If highlight.js is available, use it for better syntax highlighting
    if (typeof hljs !== 'undefined') {
      try {
        const result = hljs.highlight(editor.value, { language });
        // Create a preview div to show highlighted syntax
        this.updateSyntaxPreview(result.value);
      } catch (error) {
        console.log('Syntax highlighting not available for', language);
      }
    }
  }

  getLanguageFromFile(filePath) {
    const ext = filePath.split('.').pop().toLowerCase();
    const languageMap = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'json': 'json',
      'css': 'css',
      'html': 'html',
      'md': 'markdown',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'sh': 'bash',
      'yaml': 'yaml',
      'yml': 'yaml'
    };
    return languageMap[ext] || 'plaintext';
  }

  updateSyntaxPreview(highlightedCode) {
    // This could be used to show a syntax-highlighted preview
    // For now, we'll just log it for debugging
    console.log('Syntax highlighted code available');
  }

  // File change handling
  handleFileChange(data) {
    // Update file tree or notify user of external changes
    console.log(`File ${data.type}: ${data.filePath}`);
  }

  // Utility functions
  formatDuration(ms) {
    if (ms < 1000) return `${ms}ms`;
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  showError(message) {
    this.showNotification(message, 'error');
  }

  showSuccess(message) {
    this.showNotification(message, 'success');
  }

  showNotification(message, type = 'info') {
    // Add to output panel
    const outputContent = document.getElementById('outputContent');
    const placeholder = outputContent.querySelector('.output-placeholder');
    if (placeholder) {
      placeholder.remove();
    }
    
    const time = new Date().toLocaleTimeString();
    const notification = document.createElement('div');
    notification.innerHTML = `[${time}] ${type.toUpperCase()}: ${this.escapeHtml(message)}\n`;
    notification.style.color = type === 'error' ? 'var(--accent-danger)' : 
                                  type === 'success' ? 'var(--text-success)' : 
                                  'var(--text-primary)';
    
    outputContent.appendChild(notification);
    outputContent.scrollTop = outputContent.scrollHeight;
  }
}

// Global functions for HTML event handlers
function openFileDialog() {
  // This would open a file dialog or file picker
  console.log('Open file dialog');
}

function closeFile(filePath) {
  window.devClient.closeFile(filePath);
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  window.devClient = new VisualDevClient();
});