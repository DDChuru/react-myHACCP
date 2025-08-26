# Visual Development Server

A comprehensive visual development environment that provides a beautiful web interface for interacting with multiple AI agents (Claude and Gemini) in real-time. This server enables seamless collaboration between AI agents while providing live code editing, terminal integration, and task management capabilities.

## 🌟 Features

### Real-time AI Agent Collaboration
- **Claude Integration**: Direct integration with Claude agents via existing workflow
- **Gemini Integration**: Seamless Gemini CLI integration for multi-agent conversations
- **Live Streaming**: Real-time streaming of agent responses and conversations
- **Task Management**: Visual task queue with progress tracking and status updates

### Professional Development Environment
- **Split View Interface**: Chat on the left, code/terminal on the right
- **Dark Theme**: Beautiful dark theme optimized for long coding sessions
- **Syntax Highlighting**: Code syntax highlighting with highlight.js
- **File System Integration**: Live file monitoring and real-time file operations

### Advanced Capabilities
- **Terminal Emulation**: Full terminal integration with command execution
- **WebSocket Communication**: Real-time bidirectional communication
- **File Watching**: Automatic detection of file changes with live updates
- **Multi-file Editing**: Tabbed interface for managing multiple open files

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ 
- NPM or Yarn
- Gemini CLI (optional, for full agent features)

### Installation & Launch
```bash
# From the project root directory
./start-visual-dev.sh
```

The server will:
1. Install dependencies automatically
2. Perform pre-flight checks
3. Start the server on http://localhost:3000
4. Automatically open your browser

### Manual Start
```bash
cd dev-server
npm install
npm start
```

## 🎯 Usage

### Agent Collaboration
1. **Select Task Type**: Choose between Collaborative Task, Code Review, or Brainstorm
2. **Enter Details**: Provide task description, code to review, or brainstorm topic
3. **Watch Live**: See real-time conversations between Claude and Gemini
4. **Track Progress**: Monitor task status and completion times

### File Management
1. **Browse Files**: Use the file explorer to navigate your project
2. **Edit Code**: Click files to open in the integrated code editor
3. **Live Sync**: Changes are automatically detected and synced
4. **Multiple Files**: Work with multiple files using the tabbed interface

### Terminal Integration
1. **Execute Commands**: Run any terminal command directly in the interface
2. **Live Output**: See command output in real-time with color coding
3. **Command History**: Access previous commands and outputs
4. **Multiple Sessions**: Support for concurrent terminal sessions

## 🏗️ Architecture

### Server Components
```
dev-server/
├── server.js          # Express server with Socket.IO
├── public/             # Frontend assets
│   ├── index.html     # Main interface
│   ├── styles.css     # Dark theme styling
│   └── app.js         # Client-side logic
├── package.json       # Dependencies
└── README.md          # Documentation
```

### Key Technologies
- **Backend**: Express.js, Socket.IO, Chokidar
- **Frontend**: Vanilla JS, WebSocket, HTML5/CSS3
- **Integration**: Existing agent-workflow.js, Gemini CLI
- **Styling**: CSS Custom Properties, Flexbox/Grid

### Communication Flow
```
Browser ↔ WebSocket ↔ Express Server ↔ Agent Workflow ↔ AI Services
                    ↕
              File System ↔ Terminal ↔ Project Files
```

## 🎨 Interface Overview

### Left Panel (240px)
- **Agents Tab**: AI agent conversations and task controls
- **Files Tab**: File explorer with project navigation
- **Terminal Tab**: Integrated terminal emulation
- **Tasks Tab**: Task queue and progress visualization

### Right Panel (Flexible)
- **Editor Tab**: Code editor with syntax highlighting
- **Preview Tab**: Live preview of generated content
- **Output Tab**: System output and notifications

### Header & Status
- **Connection Status**: Real-time server connection indicator
- **Task Counter**: Running and queued task counters
- **Project Info**: Current project and file information

## 🔧 Configuration

### Server Settings
Edit `server.js` to modify:
- Port (default: 3000)
- File watching patterns
- CORS settings
- Terminal environment

### Client Settings
Edit `app.js` to modify:
- WebSocket connection settings
- UI behavior and themes
- File handling preferences
- Keyboard shortcuts

### Styling
Edit `styles.css` to customize:
- Color scheme and themes
- Layout dimensions
- Animation timings
- Responsive breakpoints

## 🚨 Troubleshooting

### Common Issues

**Port Already in Use**
```bash
lsof -i :3000  # Find process using port 3000
kill -9 <PID>  # Kill the process
```

**Dependencies Not Installing**
```bash
cd dev-server
rm -rf node_modules package-lock.json
npm install
```

**Agent Integration Issues**
- Ensure `scripts/agent-workflow.js` exists
- Verify Gemini CLI is installed and configured
- Check network connectivity for AI services

**File System Permission Issues**
```bash
chmod -R 755 dev-server/
```

### Debug Mode
Set environment variable for detailed logging:
```bash
DEBUG=visual-dev-server:* npm start
```

## 🔒 Security Considerations

### File System Access
- Server only accesses files within the project directory
- File operations are sandboxed to prevent directory traversal
- Input sanitization on all file paths and commands

### Network Security
- CORS configured for development use
- WebSocket connections validated
- No external network access by default

### Terminal Security
- Commands executed in controlled environment
- Process isolation and resource limits
- No elevated privilege execution

## 🤝 Integration

### With Existing Workflows
The server integrates seamlessly with:
- `scripts/agent-workflow.js` for AI agent collaboration
- Existing project structure and file organization
- Current development tools and processes

### API Endpoints
- `GET /api/files/*` - Read file contents
- `PUT /api/files/*` - Write file contents
- `GET /api/directory/*` - List directory contents
- `POST /api/terminal` - Execute terminal commands

### WebSocket Events
- `start-agent-task` - Initiate AI agent collaboration
- `terminal-command` - Execute terminal commands
- `read-file` / `write-file` - File operations
- `list-directory` - Directory navigation

## 📈 Performance

### Optimizations
- Efficient file watching with Chokidar
- Lazy loading of file contents
- WebSocket connection pooling
- Syntax highlighting caching

### Resource Usage
- Memory: ~50MB baseline + file contents
- CPU: Low usage, spikes during AI agent tasks
- Network: WebSocket + HTTP traffic only
- Disk: Minimal, only for temporary files

## 🔄 Updates

### Version History
- v1.0.0 - Initial release with full feature set
- Real-time agent collaboration
- File system integration
- Terminal emulation
- Task management

### Future Enhancements
- Plugin system for extensions
- Custom theme support
- Advanced debugging tools
- Performance profiling
- Collaborative editing features

## 📞 Support

### Getting Help
1. Check this README for common solutions
2. Review server logs for error details
3. Verify all dependencies are correctly installed
4. Ensure proper file permissions

### Reporting Issues
When reporting issues, include:
- Node.js version (`node -v`)
- Operating system details
- Server logs and error messages
- Steps to reproduce the issue

---

**Built for Professional Development**
This visual development server is designed to enhance productivity by providing a unified interface for AI-assisted development, real-time collaboration, and seamless project management.