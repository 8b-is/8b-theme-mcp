/**
 * IPC Protocol for VSCode API Bridge
 *
 * Simple JSON-RPC style messaging between MCP server (child) and extension (parent).
 * MCP server sends requests to extension via process.send(), extension responds same way.
 */

/**
 * Request from MCP server → Extension host
 */
export interface BridgeRequest {
  id: string;           // Unique request ID (e.g., "req-1", "req-2")
  method: BridgeMethod; // Method name to invoke
  params: any;          // Method parameters (optional)
}

/**
 * Response from Extension host → MCP server
 */
export interface BridgeResponse {
  id: string;        // Matches request.id
  result?: any;      // Success result (if no error)
  error?: string;    // Error message (if failed)
}

/**
 * Available bridge methods (map 1:1 to VSCodeConfig methods)
 */
export type BridgeMethod =
  | 'getCurrentColors'    // Get all color customizations
  | 'getColor'           // Get specific color value (params: { key: string })
  | 'setColor'           // Set specific color (params: { key: string, value: string })
  | 'setColors'          // Set multiple colors (params: { colors: Record<string, string> })
  | 'resetColor'         // Reset specific color (params: { key: string })
  | 'resetAllColors';    // Reset all customizations

/**
 * Type-safe parameter types for each method
 */
export interface BridgeMethodParams {
  getCurrentColors: void;
  getColor: { key: string };
  setColor: { key: string; value: string };
  setColors: { colors: Record<string, string> };
  resetColor: { key: string };
  resetAllColors: void;
}
