import { BridgeRequest, BridgeResponse, BridgeMethod } from './protocol';
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

  constructor() {
    this.vscodeConfig = new VSCodeConfig();
    this.setupIPC();
  }

  /**
   * Set up IPC message listener for requests from child process
   */
  private setupIPC() {
    // Note: In extension context, we don't directly listen to process.on('message')
    // because the extension host doesn't receive these messages.
    // Instead, the child process will be spawned by VSCode, and we'll need to
    // handle messages differently. This will be updated in the next task when we
    // modify extension.ts to actually spawn and manage the child process.

    // For now, this is the handler logic that will be called by the extension
    console.log('[BridgeServer] IPC server initialized');
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
   *
   * @param method - Bridge method name
   * @param params - Method parameters (already typed by BridgeRequest)
   * @returns Promise resolving to method result
   */
  private async callMethod(method: BridgeMethod, params: any): Promise<any> {
    switch (method) {
      case 'getCurrentColors':
        // No parameters needed - just get all colors
        return await this.vscodeConfig.getCurrentColors();

      case 'getColor':
        // Validate required parameter: key
        if (!params?.key) {
          throw new Error('Missing required parameter: key');
        }
        return await this.vscodeConfig.getColor(params.key);

      case 'setColor':
        // Validate required parameters: key and value
        if (!params?.key || !params?.value) {
          throw new Error('Missing required parameters: key, value');
        }
        await this.vscodeConfig.setColor(params.key, params.value);
        return { success: true };

      case 'setColors':
        // Validate required parameter: colors object
        if (!params?.colors) {
          throw new Error('Missing required parameter: colors');
        }
        await this.vscodeConfig.setColors(params.colors);
        return { success: true };

      case 'resetColor':
        // Validate required parameter: key
        if (!params?.key) {
          throw new Error('Missing required parameter: key');
        }
        await this.vscodeConfig.resetColor(params.key);
        return { success: true };

      case 'resetAllColors':
        // No parameters needed - reset everything
        await this.vscodeConfig.resetAllColors();
        return { success: true };

      default:
        // This should never happen thanks to TypeScript types, but just in case
        throw new Error(`Unknown bridge method: ${method}`);
    }
  }
}
