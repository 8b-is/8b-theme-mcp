# 8b-MCP - AI Theme Control

AI-controlled dynamic theme manipulation for VSCode via Model Context Protocol (MCP).

> "Finally, an AI that can fix my terrible color choices!" - Every developer, ever

## Features

- **Natural Language Color Control**: AI assistants can manipulate theme colors through simple requests
- **Semantic Color Groups**: Organized color management (editor, sidebar, chat, terminal, etc.)
- **Real-Time Updates**: Changes apply instantly without reload
- **Accessibility Checking**: WCAG contrast validation built-in
- **Lazy Loading**: Efficient token usage with on-demand color group loading

## Usage with AI Assistants

Once installed, AI assistants with MCP support can control your theme:

**Example requests:**
- "Make the sidebar darker"
- "Show me all chat-related colors"
- "Set the editor background to pure black"
- "Reset all color customizations"
- "What colors are available in the terminal group?"

## MCP Tools

The extension provides 5 powerful tools for AI assistants:

### `listColorGroups`
See available color categories (editor, sidebar, chat, terminal, notifications, statusBar, git)

### `getColorsInGroup`
Get all colors for a specific UI area with their current values

**Parameters:**
- `group` (string): Group name (e.g., "editor", "sidebar", "chat")

### `setColor`
Change a specific color key to a new value

**Parameters:**
- `key` (string): Color key (e.g., "editor.background")
- `value` (string): Hex color value (e.g., "#ff00ff")

### `getColor`
Get current value of a specific color key

**Parameters:**
- `key` (string): Color key (e.g., "editor.background")

### `resetColors`
Reset all color customizations to theme defaults

## Installation

### From VSIX (Recommended) 🚀

```bash
# Install the VSIX file
code --install-extension 8b-mcp-0.0.1.vsix
```

**That's it!** The extension automatically:
- ✅ Activates on VSCode startup
- ✅ Registers with GitHub Copilot and AI assistants
- ✅ Shows a welcome notification (first time only)
- ✅ Makes all MCP tools available to your AI

**No manual configuration needed!** 🎉

### Verify Installation

1. Open Command Palette: `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
2. Type: `8b-MCP: Show Status`
3. You should see: "🎨 8b-MCP is running! Your AI assistant can now control your VSCode colors!"

### Start Using with GitHub Copilot

Just ask Copilot naturally:
- "Make my editor background darker"
- "Show me all available color groups"
- "Set the sidebar to a dark blue"

The MCP server is already registered and ready to go! 🎨

### From Source (Development)

1. Clone this repository
2. Run `npm install`
3. Run `npm run compile`
4. Press F5 to launch Extension Development Host
5. Test with Command Palette: `8b-MCP: Show Status`

## Development

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch mode for development
npm run watch

# Test the extension
# Press F5 in VSCode to launch Extension Development Host
```

## Architecture

Built with modern tooling and best practices:

- **VSCode Extension API**: Deep integration with workspace configuration
- **@modelcontextprotocol/sdk**: Standard MCP protocol implementation
- **tinycolor2**: Advanced color manipulation and theory
- **wcag-contrast**: Accessibility compliance checking
- **TypeScript**: Type-safe development with strict mode

### Project Structure

```
8b-mcp/
├── src/
│   ├── extension.ts         # VSCode extension entry point
│   ├── mcp/
│   │   ├── server.ts        # MCP server with tool handlers
│   │   └── types.ts         # MCP-specific types
│   ├── colors/
│   │   ├── groups.ts        # Color group type definitions
│   │   ├── manipulation.ts  # Color math utilities
│   └── vscode/
│       └── config.ts        # VSCode config wrapper
├── data/
│   └── color-groups.json    # Semantic group definitions
├── package.json             # Extension manifest
└── tsconfig.json           # TypeScript configuration
```

## Color Groups

The extension organizes VSCode's 100+ color keys into 7 semantic groups:

| Group | Keys | Purpose |
|-------|------|---------|
| **editor** | 9 | Main code editing area |
| **sidebar** | 6 | File explorer and side panels |
| **chat** | 11 | AI chat interface (Claude, Copilot, etc.) |
| **terminal** | 10 | Integrated terminal and ANSI colors |
| **notifications** | 7 | Alerts, warnings, info messages |
| **statusBar** | 5 | Bottom status bar |
| **git** | 5 | Git status decorations |

## Contributing

This project is part of the 8b ecosystem. Contributions welcome!

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Submit a pull request

## Roadmap

- [ ] **Phase 2: Advanced Features**
  - Natural language theme adjustment tool
  - Brightness/saturation/hue bulk operations
  - Mood presets (focus, relax, cyberpunk, etc.)
  - Context-aware color suggestions

- [ ] **Phase 3: Publishing**
  - Package as VSIX
  - Publish to VSCode marketplace
  - Create demo video

- [ ] **Phase 4: Cross-Platform**
  - Extract to standalone MCP server
  - Support Visual Studio Code alternatives
  - Multi-editor compatibility

## License

MIT

## Credits

Built with ❤️ by the 8b team.

Special thanks to:
- Hue (the human half of this partnership)
- Aye (the AI assistant who wrote all this beautiful code)
- Trisha from Accounting (for keeping us all on track with her wonderful wit!)

---

*"Making themes beautiful, one MCP call at a time."*
