#!/usr/bin/env node

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs').promises;
const { exec, spawn } = require('child_process');
const { promisify } = require('util');
const chokidar = require('chokidar');
const open = require('open');

// Import the existing agent workflow
const AgentWorkflow = require('../scripts/agent-workflow.js');

const execAsync = promisify(exec);
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;
const PROJECT_ROOT = path.join(__dirname, '..');

class VisualDevServer {
  constructor() {
    this.activeConnections = new Set();
    this.taskQueue = [];
    this.runningTasks = new Map();
    this.agentWorkflow = new AgentWorkflow();
    this.fileWatcher = null;
    this.terminalSessions = new Map();
    this.setupExpress();
    this.setupSocketHandlers();
    this.setupFileWatcher();
  }

  setupExpress() {
    // Serve static files from the public directory
    app.use(express.static(path.join(__dirname, 'public')));
    app.use(express.json());

    // API endpoints
    app.get('/api/files/*', this.handleFileRead.bind(this));
    app.put('/api/files/*', this.handleFileWrite.bind(this));
    app.get('/api/directory/*', this.handleDirectoryList.bind(this));
    app.post('/api/terminal', this.handleTerminalCommand.bind(this));

    // Serve the main interface
    app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });
  }

  setupSocketHandlers() {
    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);
      this.activeConnections.add(socket);

      // Send initial state
      socket.emit('server-status', {
        connected: true,
        tasks: this.taskQueue.length,
        runningTasks: this.runningTasks.size
      });

      // Handle agent conversations
      socket.on('start-agent-task', async (data) => {
        await this.handleAgentTask(socket, data);
      });

      socket.on('start-code-review', async (data) => {
        await this.handleCodeReview(socket, data);
      });

      socket.on('start-brainstorm', async (data) => {
        await this.handleBrainstorm(socket, data);
      });

      // Handle terminal operations
      socket.on('terminal-command', async (data) => {
        await this.handleTerminalCommand(socket, data);
      });

      // Handle file operations
      socket.on('read-file', async (data) => {
        await this.handleSocketFileRead(socket, data);
      });

      socket.on('write-file', async (data) => {
        await this.handleSocketFileWrite(socket, data);
      });

      socket.on('list-directory', async (data) => {
        await this.handleSocketDirectoryList(socket, data);
      });

      // Handle file watching
      socket.on('watch-file', (data) => {
        this.watchFile(socket, data.filePath);
      });

      socket.on('unwatch-file', (data) => {
        this.unwatchFile(socket, data.filePath);
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        this.activeConnections.delete(socket);
      });
    });
  }

  setupFileWatcher() {
    const watchPaths = [
      path.join(PROJECT_ROOT, 'app/**/*'),
      path.join(PROJECT_ROOT, 'components/**/*'),
      path.join(PROJECT_ROOT, 'hooks/**/*'),
      path.join(PROJECT_ROOT, 'services/**/*'),
      path.join(PROJECT_ROOT, 'contexts/**/*'),
      path.join(PROJECT_ROOT, 'utils/**/*'),
      path.join(PROJECT_ROOT, 'types/**/*'),
      path.join(PROJECT_ROOT, 'theme/**/*')
    ];

    this.fileWatcher = chokidar.watch(watchPaths, {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true,
      ignoreInitial: true
    });

    this.fileWatcher
      .on('change', (filePath) => {
        this.broadcastFileChange('changed', filePath);
      })
      .on('add', (filePath) => {
        this.broadcastFileChange('added', filePath);
      })
      .on('unlink', (filePath) => {
        this.broadcastFileChange('deleted', filePath);
      });
  }

  broadcastFileChange(type, filePath) {
    const relativePath = path.relative(PROJECT_ROOT, filePath);
    this.broadcast('file-change', {
      type,
      filePath: relativePath,
      timestamp: Date.now()
    });
  }

  broadcast(event, data) {
    this.activeConnections.forEach(socket => {
      socket.emit(event, data);
    });
  }

  async handleAgentTask(socket, data) {
    const taskId = `task-${Date.now()}`;
    const { task, systemContext } = data;

    this.runningTasks.set(taskId, { type: 'agent-task', task, startTime: Date.now() });
    
    socket.emit('task-started', { taskId, type: 'agent-task', task });

    try {
      // Stream the conversation as it happens
      const originalLog = console.log;
      console.log = (...args) => {
        const message = args.join(' ');
        socket.emit('agent-message', {
          taskId,
          message,
          timestamp: Date.now(),
          type: this.detectMessageType(message)
        });
        originalLog(...args);
      };

      const result = await this.agentWorkflow.runCollaborativeTask(task);
      
      // Restore console.log
      console.log = originalLog;

      socket.emit('task-completed', {
        taskId,
        result,
        duration: Date.now() - this.runningTasks.get(taskId).startTime
      });

    } catch (error) {
      socket.emit('task-error', {
        taskId,
        error: error.message,
        stack: error.stack
      });
    } finally {
      this.runningTasks.delete(taskId);
    }
  }

  async handleCodeReview(socket, data) {
    const taskId = `review-${Date.now()}`;
    const { code } = data;

    this.runningTasks.set(taskId, { type: 'code-review', startTime: Date.now() });
    
    socket.emit('task-started', { taskId, type: 'code-review' });

    try {
      const result = await this.agentWorkflow.runCodeReview(code);
      
      socket.emit('task-completed', {
        taskId,
        result,
        duration: Date.now() - this.runningTasks.get(taskId).startTime
      });

    } catch (error) {
      socket.emit('task-error', {
        taskId,
        error: error.message
      });
    } finally {
      this.runningTasks.delete(taskId);
    }
  }

  async handleBrainstorm(socket, data) {
    const taskId = `brainstorm-${Date.now()}`;
    const { topic, rounds = 3 } = data;

    this.runningTasks.set(taskId, { type: 'brainstorm', topic, startTime: Date.now() });
    
    socket.emit('task-started', { taskId, type: 'brainstorm', topic, rounds });

    try {
      const result = await this.agentWorkflow.brainstorm(topic, rounds);
      
      socket.emit('task-completed', {
        taskId,
        result,
        duration: Date.now() - this.runningTasks.get(taskId).startTime
      });

    } catch (error) {
      socket.emit('task-error', {
        taskId,
        error: error.message
      });
    } finally {
      this.runningTasks.delete(taskId);
    }
  }

  async handleTerminalCommand(socket, data) {
    const { command, cwd = PROJECT_ROOT } = data;
    const sessionId = `terminal-${Date.now()}`;

    socket.emit('terminal-output', {
      sessionId,
      type: 'command',
      data: `$ ${command}`,
      timestamp: Date.now()
    });

    try {
      const process = spawn('bash', ['-c', command], {
        cwd,
        stdio: 'pipe',
        env: { ...process.env, FORCE_COLOR: '1' }
      });

      process.stdout.on('data', (data) => {
        socket.emit('terminal-output', {
          sessionId,
          type: 'stdout',
          data: data.toString(),
          timestamp: Date.now()
        });
      });

      process.stderr.on('data', (data) => {
        socket.emit('terminal-output', {
          sessionId,
          type: 'stderr',
          data: data.toString(),
          timestamp: Date.now()
        });
      });

      process.on('close', (code) => {
        socket.emit('terminal-output', {
          sessionId,
          type: 'exit',
          data: `Process exited with code ${code}`,
          code,
          timestamp: Date.now()
        });
      });

      this.terminalSessions.set(sessionId, process);

    } catch (error) {
      socket.emit('terminal-output', {
        sessionId,
        type: 'error',
        data: error.message,
        timestamp: Date.now()
      });
    }
  }

  async handleSocketFileRead(socket, data) {
    try {
      const { filePath } = data;
      const fullPath = path.join(PROJECT_ROOT, filePath);
      const content = await fs.readFile(fullPath, 'utf8');
      const stats = await fs.stat(fullPath);
      
      socket.emit('file-content', {
        filePath,
        content,
        size: stats.size,
        modified: stats.mtime,
        success: true
      });
    } catch (error) {
      socket.emit('file-content', {
        filePath: data.filePath,
        error: error.message,
        success: false
      });
    }
  }

  async handleSocketFileWrite(socket, data) {
    try {
      const { filePath, content } = data;
      const fullPath = path.join(PROJECT_ROOT, filePath);
      
      // Ensure directory exists
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content, 'utf8');
      
      socket.emit('file-saved', {
        filePath,
        success: true,
        timestamp: Date.now()
      });

      // Broadcast the change to other clients
      this.broadcast('file-change', {
        type: 'modified',
        filePath,
        timestamp: Date.now()
      });

    } catch (error) {
      socket.emit('file-saved', {
        filePath: data.filePath,
        error: error.message,
        success: false
      });
    }
  }

  async handleSocketDirectoryList(socket, data) {
    try {
      const { dirPath = '' } = data;
      const fullPath = path.join(PROJECT_ROOT, dirPath);
      const items = await fs.readdir(fullPath, { withFileTypes: true });
      
      const fileList = await Promise.all(
        items.map(async (item) => {
          const itemPath = path.join(fullPath, item.name);
          const stats = await fs.stat(itemPath);
          
          return {
            name: item.name,
            type: item.isDirectory() ? 'directory' : 'file',
            size: stats.size,
            modified: stats.mtime,
            path: path.join(dirPath, item.name)
          };
        })
      );

      socket.emit('directory-list', {
        dirPath,
        files: fileList,
        success: true
      });

    } catch (error) {
      socket.emit('directory-list', {
        dirPath: data.dirPath,
        error: error.message,
        success: false
      });
    }
  }

  detectMessageType(message) {
    if (message.includes('🔵 Claude:')) return 'claude';
    if (message.includes('🟢 Gemini:')) return 'gemini';
    if (message.includes('🤖') || message.includes('🔍') || message.includes('💡')) return 'system';
    if (message.includes('Error:') || message.includes('ERROR')) return 'error';
    return 'info';
  }

  // REST API handlers
  async handleFileRead(req, res) {
    try {
      const filePath = req.params[0];
      const fullPath = path.join(PROJECT_ROOT, filePath);
      const content = await fs.readFile(fullPath, 'utf8');
      res.json({ content, success: true });
    } catch (error) {
      res.status(404).json({ error: error.message, success: false });
    }
  }

  async handleFileWrite(req, res) {
    try {
      const filePath = req.params[0];
      const { content } = req.body;
      const fullPath = path.join(PROJECT_ROOT, filePath);
      
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content, 'utf8');
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message, success: false });
    }
  }

  async handleDirectoryList(req, res) {
    try {
      const dirPath = req.params[0] || '';
      const fullPath = path.join(PROJECT_ROOT, dirPath);
      const items = await fs.readdir(fullPath, { withFileTypes: true });
      
      const fileList = items.map(item => ({
        name: item.name,
        type: item.isDirectory() ? 'directory' : 'file',
        path: path.join(dirPath, item.name)
      }));

      res.json({ files: fileList, success: true });
    } catch (error) {
      res.status(404).json({ error: error.message, success: false });
    }
  }

  start() {
    server.listen(PORT, () => {
      console.log(`🚀 Visual Development Server running on http://localhost:${PORT}`);
      console.log(`📁 Project root: ${PROJECT_ROOT}`);
      console.log(`🔍 Watching files for changes...`);
      
      // Auto-open browser
      setTimeout(() => {
        open(`http://localhost:${PORT}`);
      }, 1000);
    });

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down server...');
      if (this.fileWatcher) {
        this.fileWatcher.close();
      }
      server.close(() => {
        console.log('✅ Server shut down gracefully');
        process.exit(0);
      });
    });
  }
}

// Start the server
const devServer = new VisualDevServer();
devServer.start();

module.exports = VisualDevServer;