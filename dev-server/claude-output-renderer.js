// Claude Output Renderer for Dev Server
// This captures Claude's markdown outputs and renders them in the preview area

const fs = require('fs').promises;
const path = require('path');

class ClaudeOutputRenderer {
    constructor(io) {
        this.io = io;
        this.currentOutput = '';
    }

    // Render Claude's markdown output in the preview area
    async renderClaudeOutput(markdownContent) {
        this.currentOutput = markdownContent;
        
        // Send to all connected clients
        this.io.emit('claude-output', {
            type: 'markdown',
            content: markdownContent,
            timestamp: new Date()
        });
        
        // Also save to file for persistence
        const outputPath = path.join(__dirname, 'claude-outputs', `output-${Date.now()}.md`);
        await fs.mkdir(path.dirname(outputPath), { recursive: true });
        await fs.writeFile(outputPath, markdownContent);
        
        return outputPath;
    }

    // Get the current output
    getCurrentOutput() {
        return this.currentOutput;
    }
}

module.exports = ClaudeOutputRenderer;