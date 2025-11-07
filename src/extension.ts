import * as vscode from 'vscode';
import { ThemeMCPServer } from './mcp/server';
import * as path from 'path';

let mcpServer: ThemeMCPServer | undefined;

/**
 * Extension activation - called when VSCode loads the extension
 * This happens on startup (onStartupFinished activation event)
 */
export async function activate(context: vscode.ExtensionContext) {
  console.log('8b-Theme-MCP extension is now active');

  // Initialize MCP server
  mcpServer = new ThemeMCPServer();

  // Start the MCP server with stdio transport
  try {
    await mcpServer.start();
    console.log('8b-Theme-MCP server started successfully');
  } catch (error) {
    console.error('Failed to start 8b-Theme-MCP server:', error);
    vscode.window.showErrorMessage('Failed to start 8b-Theme-MCP server');
  }

  // TODO: ARCHITECTURAL REFACTOR NEEDED
  //
  // PROBLEM: The current architecture has a fundamental conflict:
  // - MCP providers spawn separate Node.js processes (via McpStdioServerDefinition)
  // - Separate processes don't have access to the 'vscode' module
  // - Our ThemeMCPServer needs vscode module to modify VSCode settings
  //
  // SOLUTION OPTIONS:
  // 1. Bridge Architecture (recommended):
  //    - Create src/mcp/standalone.ts as entry point for separate process
  //    - Extension provides HTTP/IPC bridge for VSCode API access
  //    - MCP server calls bridge instead of direct vscode imports
  //
  // 2. In-Process Only (current workaround):
  //    - MCP server runs only in extension host (lines 14-24 above)
  //    - Works but limits integration with external MCP clients
  //
  // For now, we're using option 2 to get the extension working.
  // Provider registration is commented out until bridge architecture is implemented.

  /*
  const mcpProvider = vscode.lm.registerMcpServerDefinitionProvider(
    '8b-theme-mcp-provider',
    {
      async provideMcpServerDefinitions(): Promise<vscode.McpServerDefinition[]> {
        const extensionPath = context.extensionPath;
        const serverPath = path.join(extensionPath, 'out', 'mcp', 'server.js');

        return [
          new vscode.McpStdioServerDefinition(
            '8b-theme-mcp',
            'node',
            [serverPath],
            {
              cwd: extensionPath,
            }
          ),
        ];
      },

      async resolveMcpServerDefinition(
        definition: vscode.McpServerDefinition
      ): Promise<vscode.McpServerDefinition> {
        console.log('8b-Theme-MCP server definition resolved for AI assistant');
        return definition;
      },
    }
  );

  context.subscriptions.push(mcpProvider);
  */

  // Register a command to test the extension is loaded
  const statusCommand = vscode.commands.registerCommand(
    '8b-theme-mcp.showStatus',
    () => {
      vscode.window.showInformationMessage(
        '🎨 8b-Theme-MCP is running! Your AI assistant can now control your VSCode colors!'
      );
    }
  );

  context.subscriptions.push(statusCommand);

  // Show a welcome notification on first install (only once)
  const hasShownWelcome = context.globalState.get('8b-theme-mcp.welcomeShown', false);
  if (!hasShownWelcome) {
    vscode.window
      .showInformationMessage(
        '🎨 8b-Theme-MCP installed! Your AI assistant (like GitHub Copilot) can now dynamically change your theme colors. Try asking: "Make my editor background dark blue"',
        'Got it!',
        'Show Tools'
      )
      .then((selection) => {
        if (selection === 'Show Tools') {
          vscode.commands.executeCommand('8b-theme-mcp.showStatus');
        }
      });
    context.globalState.update('8b-theme-mcp.welcomeShown', true);
  }
}

/**
 * Extension deactivation - called when VSCode unloads the extension
 */
export function deactivate() {
  console.log('8b-Theme-MCP extension is now deactivated');
}
