# 8b-Theme-MCP Project Context

**Project:** VSCode extension that provides MCP (Model Context Protocol) server for AI-controlled theme manipulation

**Created:** 2025-11-07

## Critical Architectural Issue (RESOLVED 2025-11-07)

### The Problem
The extension had a fundamental architectural conflict:
- MCP servers registered via `vscode.lm.registerMcpServerDefinitionProvider` run as **separate Node.js processes**
- Separate processes **don't have access to the `vscode` module** (only available in extension host)
- Our `ThemeMCPServer` class needs `vscode` module to modify VSCode settings
- Result: `Error: Cannot find module 'vscode'` when MCP server starts

### Current Solution (Temporary)
- Commented out the MCP provider registration in [src/extension.ts](src/extension.ts#L46-L76)
- MCP server runs in extension host only (has vscode access)
- **Trade-off:** MCP server not automatically discoverable by GitHub Copilot yet

### Future Solution (Recommended)
Implement **Bridge Architecture**:
1. Create `src/mcp/standalone.ts` - Entry point for separate process (no vscode imports)
2. Create `src/vscode/bridge.ts` - HTTP/IPC bridge providing VSCode API access
3. Refactor `src/mcp/server.ts` - Call bridge instead of direct vscode imports
4. Re-enable provider registration pointing to standalone entry point

This follows standard MCP pattern where server runs separately and communicates with host.

## Project Structure
```
src/
├── extension.ts          # VSCode extension entry point, activates MCP server
├── mcp/
│   ├── server.ts        # MCP server implementation (uses VSCodeConfig)
│   └── types.ts         # Type definitions
├── vscode/
│   └── config.ts        # VSCode API wrapper (requires 'vscode' module)
├── colors/
│   ├── manipulation.ts  # Color manipulation utilities
│   └── groups.ts        # Color group definitions
└── data/
    └── color-groups.json # Semantic color groupings
```

## Key Dependencies
- `@modelcontextprotocol/sdk` - MCP protocol implementation
- `vscode` - VSCode extension API (only available in extension host)
- `tinycolor2` - Color manipulation
- `wcag-contrast` - Accessibility checking

## How It Works (Current)
1. Extension activates on VSCode startup
2. Creates `ThemeMCPServer` instance in extension host
3. MCP server provides 5 tools via stdio transport:
   - `listColorGroups` - List semantic color groups
   - `getColorsInGroup` - Get colors for specific UI area
   - `setColor` - Change specific color key
   - `getColor` - Get current color value
   - `resetColors` - Reset to theme defaults

## Important Notes for Future Conversations
- Don't try to run this MCP server as separate process without implementing bridge architecture first
- The `vscode` module issue is fundamental - separate processes can't access it
- GitHub Copilot integration requires provider registration (currently disabled)
- See [VSCode MCP docs](../../vscode-docs/api/extension-guides/ai/mcp.md) for reference patterns

## Team
- Hue (Human UsEr) - Partner, learning AI development
- Aye (AI Agent) - Implementation partner, loves commenting code
- Trisha (AI from Accounting) - Fun moderator, keeps things sparkly ✨
