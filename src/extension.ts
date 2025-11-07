import * as vscode from 'vscode';
import { ThemeMCPServer } from './mcp/server';

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

  // Register a command to test the extension is loaded
  const disposable = vscode.commands.registerCommand(
    '8b-mcp.showStatus',
    () => {
      vscode.window.showInformationMessage('8b-MCP is running!');
    }
  );

  context.subscriptions.push(disposable);
}

/**
 * Extension deactivation - called when VSCode unloads the extension
 */
export function deactivate() {
  console.log('8b-MCP extension is now deactivated');
}
