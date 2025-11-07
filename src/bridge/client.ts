/**
 * BridgeClient - IPC client for MCP server process
 *
 * Runs in the MCP server (child process). Sends IPC messages to parent process
 * (extension host) and waits for responses. Provides type-safe methods for each
 * VSCode API operation.
 *
 * Key Features:
 * - Generic type safety: BridgeRequest<M> and BridgeResponse<M> enforce correct param/result types
 * - Request/response tracking with unique IDs
 * - Configurable timeout using BRIDGE_REQUEST_TIMEOUT_MS constant
 * - Error handling for missing process.send (detects if not running as child process)
 * - Automatic cleanup of pending requests on timeout or completion
 *
 * Usage:
 *   const bridge = new BridgeClient();
 *   const colors = await bridge.getCurrentColors();
 *   await bridge.setColor('editor.background', '#000000');
 */

import {
  BridgeRequest,
  BridgeResponse,
  BridgeMethod,
  BridgeMethodParams,
  BridgeMethodResult,
  BRIDGE_REQUEST_TIMEOUT_MS,
  ConfigurationTarget,
} from './protocol';
import type { ColorMap } from '../colors/groups';

/**
 * Pending request tracking structure
 * Stores resolve/reject callbacks and timeout timer for each request
 */
interface PendingRequest<M extends BridgeMethod> {
  resolve: (result: BridgeMethodResult[M]) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
}

export class BridgeClient {
  private requestId = 0;
  private pendingRequests = new Map<string, PendingRequest<any>>();

  constructor() {
    this.setupIPC();
  }

  /**
   * Set up IPC message listener for responses from parent process
   *
   * Listens for BridgeResponse messages from the extension host and routes them
   * to the appropriate pending request handler.
   */
  private setupIPC(): void {
    // Listen for responses from parent (extension host)
    process.on('message', (response: BridgeResponse) => {
      const pending = this.pendingRequests.get(response.id);
      if (!pending) {
        console.error(`[BridgeClient] No pending request for ID: ${response.id}`);
        return;
      }

      // Clear timeout to prevent spurious timeout errors
      clearTimeout(pending.timer);

      // Resolve or reject based on response
      if (response.error) {
        pending.reject(new Error(response.error));
      } else {
        pending.resolve(response.result);
      }

      // Clean up pending request
      this.pendingRequests.delete(response.id);
    });
  }

  /**
   * Send IPC request to parent process and wait for response
   *
   * Type-safe generic method that enforces correct param and result types
   * based on the method being called.
   *
   * @param method - Bridge method name (type parameter M enforces correct types)
   * @param params - Method parameters (typed based on BridgeMethodParams[M])
   * @param timeout - Timeout in milliseconds (default: BRIDGE_REQUEST_TIMEOUT_MS = 30000)
   * @returns Promise that resolves with the typed result or rejects with error
   */
  private async call<M extends BridgeMethod>(
    method: M,
    params: BridgeMethodParams[M],
    timeout: number = BRIDGE_REQUEST_TIMEOUT_MS
  ): Promise<BridgeMethodResult[M]> {
    const id = `req-${this.requestId++}`;

    return new Promise((resolve, reject) => {
      // Set up timeout - reject if no response within timeout period
      const timer = setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`Bridge request timeout: ${method} (waited ${timeout}ms)`));
        }
      }, timeout);

      // Store pending request with typed callbacks
      this.pendingRequests.set(id, { resolve, reject, timer });

      // Create type-safe request using generic BridgeRequest<M>
      const request: BridgeRequest<M> = { id, method, params };

      // Verify process.send exists (indicates we're running as a child process)
      if (!process.send) {
        clearTimeout(timer);
        this.pendingRequests.delete(id);
        reject(new Error('process.send is not available - not running as child process?'));
        return;
      }

      // Send request to parent process
      // Note: process.send returns false if message couldn't be sent
      const sent = process.send(request);
      if (!sent) {
        clearTimeout(timer);
        this.pendingRequests.delete(id);
        reject(new Error('Failed to send IPC message - channel may be closed'));
      }
    });
  }

  /**
   * Get all current color customizations
   *
   * @param target - Optional configuration target (Global/Workspace/WorkspaceFolder)
   * @returns Promise resolving to map of color keys to hex values
   */
  async getCurrentColors(target?: ConfigurationTarget): Promise<ColorMap> {
    return this.call('getCurrentColors', { target });
  }

  /**
   * Get current value of a specific color key
   *
   * @param key - Color key (e.g., "editor.background")
   * @param target - Optional configuration target
   * @returns Promise resolving to hex color value or undefined if not set
   */
  async getColor(key: string, target?: ConfigurationTarget): Promise<string | undefined> {
    return this.call('getColor', { key, target });
  }

  /**
   * Set a specific color key to a new value
   *
   * @param key - Color key (e.g., "editor.background")
   * @param value - Hex color value (e.g., "#1a1a1a")
   * @param target - Optional configuration target
   * @returns Promise resolving when color is set
   */
  async setColor(key: string, value: string, target?: ConfigurationTarget): Promise<void> {
    return this.call('setColor', { key, value, target });
  }

  /**
   * Set multiple colors at once
   *
   * More efficient than calling setColor multiple times when updating many colors.
   *
   * @param colors - Map of color keys to hex values
   * @param target - Optional configuration target
   * @returns Promise resolving when all colors are set
   */
  async setColors(colors: ColorMap, target?: ConfigurationTarget): Promise<void> {
    return this.call('setColors', { colors, target });
  }

  /**
   * Reset a specific color to theme default
   *
   * Removes the color customization, allowing the active theme's value to show through.
   *
   * @param key - Color key (e.g., "editor.background")
   * @param target - Optional configuration target
   * @returns Promise resolving when color is reset
   */
  async resetColor(key: string, target?: ConfigurationTarget): Promise<void> {
    return this.call('resetColor', { key, target });
  }

  /**
   * Reset all color customizations
   *
   * Removes all workbench.colorCustomizations, restoring the active theme's defaults.
   *
   * @param target - Optional configuration target
   * @returns Promise resolving when all colors are reset
   */
  async resetAllColors(target?: ConfigurationTarget): Promise<void> {
    return this.call('resetAllColors', { target });
  }

  /**
   * Get the number of pending requests
   *
   * Useful for debugging and testing to verify all requests have completed.
   *
   * @returns Number of requests waiting for responses
   */
  getPendingRequestCount(): number {
    return this.pendingRequests.size;
  }

  /**
   * Clean up all pending requests
   *
   * Rejects all pending requests and clears timers. Useful when shutting down
   * or when the parent process is no longer responding.
   */
  cleanup(): void {
    for (const [id, pending] of this.pendingRequests.entries()) {
      clearTimeout(pending.timer);
      pending.reject(new Error('BridgeClient cleanup - request cancelled'));
    }
    this.pendingRequests.clear();
  }
}
