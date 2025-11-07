import * as vscode from 'vscode';
import * as path from 'path';
import { BridgeServer } from './bridge/server';

let bridgeServer: BridgeServer | undefined;

/**
 * Extension activation - called when VSCode loads the extension
 * This happens on startup (onStartupFinished activation event)
 */
export async function activate(context: vscode.ExtensionContext) {
  console.log('8b-Theme-MCP extension is now active');

  // Initialize HTTP bridge server in extension host
  // This runs in the parent process and handles HTTP requests from MCP server (child)
  bridgeServer = new BridgeServer();
  console.log('8b-Theme-MCP bridge server initialized');

  // Register MCP server provider for automatic discovery by GitHub Copilot and other AI tools
  // This makes the MCP server automatically available without manual configuration!
  const mcpProvider = vscode.lm.registerMcpServerDefinitionProvider(
    '8b-theme-mcp-provider', // Must match the ID in package.json
    {
      // Provide the MCP server definitions
      async provideMcpServerDefinitions(): Promise<vscode.McpServerDefinition[]> {
        // Start bridge server and get port
        const bridgePort = await bridgeServer!.start();

        // Get the path to our compiled extension
        const extensionPath = context.extensionPath;
        // IMPORTANT: Point to standalone.js (runs as separate process with HTTP bridge)
        const serverPath = path.join(extensionPath, 'out', 'mcp', 'standalone.js');

        // Return a single stdio-based MCP server definition
        return [
          new vscode.McpStdioServerDefinition(
            '8b-theme-mcp', // Unique server ID (label)
            'node', // Command to execute
            [serverPath], // Arguments (path to our standalone server)
            {
              // Pass bridge port to child process
              BRIDGE_PORT: String(bridgePort)
            }
          ),
        ];
      },

      // Resolve the server definition when it's about to start
      // This is where we could add authentication or user prompts if needed
      async resolveMcpServerDefinition(
        definition: vscode.McpServerDefinition
      ): Promise<vscode.McpServerDefinition> {
        console.log('8b-Theme-MCP server definition resolved for AI assistant');
        return definition;
      },
    }
  );

  // Add to subscriptions so it gets cleaned up on deactivation
  context.subscriptions.push(mcpProvider);

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
export async function deactivate() {
  console.log('8b-Theme-MCP extension is now deactivated');

  // Stop bridge server
  if (bridgeServer) {
    await bridgeServer.stop();
    bridgeServer = undefined;
  }
}
