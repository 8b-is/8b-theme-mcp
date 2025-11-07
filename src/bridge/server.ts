import * as vscode from 'vscode';
import { BridgeRequest, BridgeResponse, BridgeMethod, isBridgeRequest, ConfigurationTarget } from './protocol';
import { VSCodeConfig } from '../vscode/config';

/**
 * BridgeServer - IPC server for extension host process
 *
 * Runs in the VSCode extension host (parent process). Receives IPC messages from
 * MCP server (child process), calls VSCode APIs via VSCodeConfig, and sends
 * responses back.
 *
 * This is the bridge that allows the standalone MCP server to access VSCode APIs
 * despite running in a separate process that doesn't have the 'vscode' module.
 *
 * Usage:
 *   const bridge = new BridgeServer();
 *   // Now child process can send IPC messages and get VSCode API responses
 */
export class BridgeServer {
  private vscodeConfig: VSCodeConfig;
  private messageHandler: ((message: any) => void) | null = null;

  constructor() {
    this.vscodeConfig = new VSCodeConfig();
    this.setupIPC();
  }

  /**
   * Set up IPC message listener for requests from child process
   *
   * When a child process is spawned with IPC enabled (stdio: ['pipe', 'pipe', 'pipe', 'ipc']),
   * the extension host CAN use process.on('message') to receive messages from the child.
   * This handler validates incoming requests and routes them to handleRequest().
   */
  private setupIPC() {
    // Create message handler that validates and processes requests
    this.messageHandler = async (message: any) => {
      // Validate that the message is a proper BridgeRequest
      if (!isBridgeRequest(message)) {
        console.error('[BridgeServer] Received invalid message:', message);
        return;
      }

      console.log(`[BridgeServer] Received request: ${message.method} (id: ${message.id})`);

      // Handle the request and send response back to child process
      const response = await this.handleRequest(message);

      // Send response back via IPC (process.send is available when spawned with IPC)
      if (process.send) {
        process.send(response);
      } else {
        console.error('[BridgeServer] process.send not available - child process may not be spawned with IPC');
      }
    };

    // Listen for messages from child process
    process.on('message', this.messageHandler);
    console.log('[BridgeServer] IPC server initialized and listening for messages');
  }

  /**
   * Convert protocol ConfigurationTarget string to VSCode ConfigurationTarget enum
   *
   * This maps the simple string types from our IPC protocol to VSCode's
   * actual ConfigurationTarget enum values.
   *
   * @param target - Configuration target string from protocol
   * @returns VSCode ConfigurationTarget enum value
   */
  private mapConfigurationTarget(target?: ConfigurationTarget): vscode.ConfigurationTarget {
    if (!target) {
      return vscode.ConfigurationTarget.Global;
    }

    switch (target) {
      case 'Global':
        return vscode.ConfigurationTarget.Global;
      case 'Workspace':
        return vscode.ConfigurationTarget.Workspace;
      case 'WorkspaceFolder':
        return vscode.ConfigurationTarget.WorkspaceFolder;
      default:
        console.warn(`[BridgeServer] Unknown target "${target}", defaulting to Global`);
        return vscode.ConfigurationTarget.Global;
    }
  }

  /**
   * Handle incoming IPC request from child process
   *
   * This method will be called by the extension when it receives a message
   * from the child process.
   *
   * @param request - Bridge request from child process
   * @returns Promise resolving to bridge response
   */
  async handleRequest(request: BridgeRequest): Promise<BridgeResponse> {
    try {
      // Call the method and get the result
      const result = await this.callMethod(request.method, request.params);

      // Return successful response with proper type
      return {
        id: request.id,
        result
      };
    } catch (error) {
      // Handle errors gracefully
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[BridgeServer] Error handling ${request.method}:`, errorMessage);

      return {
        id: request.id,
        error: errorMessage
      };
    }
  }

  /**
   * Route method call to appropriate VSCodeConfig method
   *
   * This is where we validate parameters and call the right VSCode API method.
   * Each case handles parameter validation before calling VSCodeConfig.
   * The optional 'target' parameter is mapped to VSCode's ConfigurationTarget enum.
   *
   * @param method - Bridge method name
   * @param params - Method parameters (already typed by BridgeRequest)
   * @returns Promise resolving to method result
   */
  private async callMethod(method: BridgeMethod, params: any): Promise<any> {
    switch (method) {
      case 'getCurrentColors':
        // No parameters needed - just get all colors
        // (target parameter ignored for getCurrentColors as it only reads)
        return await this.vscodeConfig.getCurrentColors();

      case 'getColor':
        // Validate required parameter: key
        if (!params?.key) {
          throw new Error('Missing required parameter: key');
        }
        // (target parameter ignored for getColor as it only reads)
        return await this.vscodeConfig.getColor(params.key);

      case 'setColor':
        // Validate required parameters: key and value
        if (!params?.key || !params?.value) {
          throw new Error('Missing required parameters: key, value');
        }
        // Map target string to VSCode ConfigurationTarget enum
        const setColorTarget = this.mapConfigurationTarget(params.target);
        await this.vscodeConfig.setColor(params.key, params.value, setColorTarget);
        return { success: true };

      case 'setColors':
        // Validate required parameter: colors object
        if (!params?.colors) {
          throw new Error('Missing required parameter: colors');
        }
        // Map target string to VSCode ConfigurationTarget enum
        const setColorsTarget = this.mapConfigurationTarget(params.target);
        await this.vscodeConfig.setColors(params.colors, setColorsTarget);
        return { success: true };

      case 'resetColor':
        // Validate required parameter: key
        if (!params?.key) {
          throw new Error('Missing required parameter: key');
        }
        // Map target string to VSCode ConfigurationTarget enum
        const resetColorTarget = this.mapConfigurationTarget(params.target);
        await this.vscodeConfig.resetColor(params.key, resetColorTarget);
        return { success: true };

      case 'resetAllColors':
        // No parameters needed - reset everything
        // Map target string to VSCode ConfigurationTarget enum
        const resetAllTarget = this.mapConfigurationTarget(params?.target);
        await this.vscodeConfig.resetAllColors(resetAllTarget);
        return { success: true };

      default:
        // This should never happen thanks to TypeScript types, but just in case
        throw new Error(`Unknown bridge method: ${method}`);
    }
  }

  /**
   * Clean up resources and remove IPC listener
   *
   * Call this when the extension is deactivated to prevent memory leaks
   * and ensure the message handler is properly removed.
   */
  dispose(): void {
    if (this.messageHandler) {
      process.off('message', this.messageHandler);
      this.messageHandler = null;
      console.log('[BridgeServer] IPC server disposed');
    }
  }
}
