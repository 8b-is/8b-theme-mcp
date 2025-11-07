import * as vscode from 'vscode';
import { ThemeMCPServer } from './mcp/server';
import * as path from 'path';

let mcpServer: ThemeMCPServer | undefined;

/**
 * Extension activation - called when VSCode loads the extension
 * This happens on startup (onStartupFinished activation event)
 */
export async function activate(context: vscode.ExtensionContext) {
  console.log('8b-MCP extension is now active');

  // Initialize MCP server
  mcpServer = new ThemeMCPServer();

  // Start the MCP server with stdio transport
  try {
    await mcpServer.start();
    console.log('8b-MCP server started successfully');
  } catch (error) {
    console.error('Failed to start 8b-MCP server:', error);
    vscode.window.showErrorMessage('Failed to start 8b-MCP server');
  }

  // Register MCP server provider for automatic discovery by GitHub Copilot and other AI tools
  // This makes the MCP server automatically available without manual configuration!
  const mcpProvider = vscode.lm.registerMcpServerDefinitionProvider(
    '8b-mcp-provider', // Must match the ID in package.json
    {
      // Provide the MCP server definitions
      async provideMcpServerDefinitions(): Promise<vscode.McpServerDefinition[]> {
        // Get the path to our compiled extension
        const extensionPath = context.extensionPath;
        const serverPath = path.join(extensionPath, 'out', 'mcp', 'server.js');

        // Return a single stdio-based MCP server definition
        return [
          new vscode.McpStdioServerDefinition(
            '8b-mcp', // Unique server ID
            'node', // Command to execute
            [serverPath], // Arguments (path to our server)
            {
              cwd: extensionPath, // Working directory
            }
          ),
        ];
      },

      // Resolve the server definition when it's about to start
      // This is where we could add authentication or user prompts if needed
      async resolveMcpServerDefinition(
        definition: vscode.McpServerDefinition
      ): Promise<vscode.McpServerDefinition> {
        console.log('8b-MCP server definition resolved for AI assistant');
        return definition;
      },
    }
  );

  // Add to subscriptions so it gets cleaned up on deactivation
  context.subscriptions.push(mcpProvider);

  // Register a command to test the extension is loaded
  const statusCommand = vscode.commands.registerCommand(
    '8b-mcp.showStatus',
    () => {
      vscode.window.showInformationMessage(
        '🎨 8b-MCP is running! Your AI assistant can now control your VSCode colors!'
      );
    }
  );

  context.subscriptions.push(statusCommand);

  // Show a welcome notification on first install (only once)
  const hasShownWelcome = context.globalState.get('8b-mcp.welcomeShown', false);
  if (!hasShownWelcome) {
    vscode.window
      .showInformationMessage(
        '🎨 8b-MCP installed! Your AI assistant (like GitHub Copilot) can now dynamically change your theme colors. Try asking: "Make my editor background dark blue"',
        'Got it!',
        'Show Tools'
      )
      .then((selection) => {
        if (selection === 'Show Tools') {
          vscode.commands.executeCommand('8b-mcp.showStatus');
        }
      });
    context.globalState.update('8b-mcp.welcomeShown', true);
  }
}

/**
 * Extension deactivation - called when VSCode unloads the extension
 */
export function deactivate() {
  console.log('8b-MCP extension is now deactivated');
}
