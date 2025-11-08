/**
 * Standalone MCP Server - Entry point for separate process
 *
 * This file is the entry point when VSCode spawns the MCP server as a child process.
 * It MUST NOT import 'vscode' module since it runs outside the extension host.
 *
 * Instead, it uses BridgeClient to communicate with the extension host via HTTP,
 * which then calls VSCode APIs on our behalf.
 *
 * Architecture:
 * - VSCode spawns this as a child process when GitHub Copilot connects
 * - Communicates with Copilot via stdio (stdin/stdout) using MCP protocol
 * - Communicates with extension host via HTTP bridge on localhost
 * - Extension host makes actual VSCode API calls on our behalf
 *
 * Key Features:
 * - 5 MCP tools for theme color manipulation
 * - Color validation before setting values
 * - Semantic color groups for intuitive control
 * - Comprehensive error handling and logging
 *
 * This is spawned by the extension when GitHub Copilot requests the MCP server.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { BridgeClient } from '../bridge/client';
import { ColorManipulator } from '../colors/manipulation';
import * as colorGroupsData from '../../data/color-groups.json';
import { ColorGroups } from '../colors/groups';

/**
 * Main server initialization and startup
 *
 * Sets up:
 * 1. Bridge client (HTTP connection to extension host)
 * 2. Color utilities (no vscode dependency)
 * 3. MCP server with stdio transport
 * 4. Tool handlers for all 5 MCP tools
 */
async function main() {
  // Initialize bridge client (HTTP to extension host)
  // This will throw if BRIDGE_PORT env var is not set
  const bridge = new BridgeClient();

  // Initialize color utilities (no vscode dependency)
  const colorManipulator = new ColorManipulator();
  const colorGroups: ColorGroups = colorGroupsData as ColorGroups;

  // Create MCP server with metadata
  const server = new Server(
    {
      name: '8b-theme-mcp',
      version: '0.0.1',
    },
    {
      capabilities: {
        tools: {}, // We support tool calls
      },
    }
  );

  /**
   * List available tools
   *
   * Returns schema for all 5 tools:
   * 1. listColorGroups - List semantic color groups
   * 2. getColorsInGroup - Get all colors in a specific group
   * 3. setColor - Set a specific color key
   * 4. getColor - Get a specific color key value
   * 5. resetColors - Reset all color customizations
   */
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'listColorGroups',
        description: 'List available semantic color groups (editor, sidebar, chat, terminal, etc.) with descriptions',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'getColorsInGroup',
        description: 'Get all color keys and current values for a specific group (e.g., "editor", "sidebar")',
        inputSchema: {
          type: 'object',
          properties: {
            group: {
              type: 'string',
              description: 'Group name (e.g., "editor", "sidebar", "chat", "terminal")',
            },
          },
          required: ['group'],
        },
      },
      {
        name: 'setColor',
        description: 'Set a specific VSCode color key to a hex value (e.g., editor.background to #1a1a1a)',
        inputSchema: {
          type: 'object',
          properties: {
            key: {
              type: 'string',
              description: 'Color key (e.g., "editor.background", "sideBar.foreground")',
            },
            value: {
              type: 'string',
              description: 'Hex color value (e.g., "#ff00ff", "#1a1a1a")',
            },
          },
          required: ['key', 'value'],
        },
      },
      {
        name: 'getColor',
        description: 'Get the current value of a specific VSCode color key',
        inputSchema: {
          type: 'object',
          properties: {
            key: {
              type: 'string',
              description: 'Color key (e.g., "editor.background", "sideBar.foreground")',
            },
          },
          required: ['key'],
        },
      },
      {
        name: 'resetColors',
        description: 'Reset all color customizations to theme defaults (removes all workbench.colorCustomizations)',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ],
  }));

  /**
   * Handle tool calls
   *
   * Routes each tool to its implementation:
   * - listColorGroups: Returns semantic groups from color-groups.json
   * - getColorsInGroup: Uses bridge to get current colors from VSCode
   * - setColor: Validates color, then uses bridge to set via VSCode API
   * - getColor: Uses bridge to get value via VSCode API
   * - resetColors: Uses bridge to reset all via VSCode API
   */
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    switch (name) {
      case 'listColorGroups': {
        // Return semantic color groups with metadata
        // This doesn't need VSCode API - just returns static data
        const groups = Object.entries(colorGroups).map(([id, group]) => ({
          id,
          name: group.name,
          description: group.description,
          keyCount: group.keys.length,
          commonIntents: group.commonIntents,
        }));

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ groups }, null, 2),
            },
          ],
        };
      }

      case 'getColorsInGroup': {
        // Get all colors in a specific group with current values
        if (!args) throw new Error('Missing arguments for getColorsInGroup');
        const groupId = args.group as string;

        const group = colorGroups[groupId];
        if (!group) {
          throw new Error(`Unknown color group: ${groupId}. Available groups: ${Object.keys(colorGroups).join(', ')}`);
        }

        // Use bridge to get current colors from VSCode
        const currentColors = await bridge.getCurrentColors();
        const colors: Record<string, string | undefined> = {};

        // Map group keys to their current values
        for (const key of group.keys) {
          colors[key] = currentColors[key];
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  group: group.name,
                  description: group.description,
                  colors,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'setColor': {
        // Set a specific color key to a new value
        if (!args) throw new Error('Missing arguments for setColor');
        const key = args.key as string;
        const value = args.value as string;

        // Validate color format before sending to VSCode
        if (!colorManipulator.isValidColor(value)) {
          throw new Error(`Invalid color value: ${value}. Must be a valid hex color (e.g., "#ff00ff")`);
        }

        // Get old value via bridge (for logging/response)
        const oldValue = await bridge.getColor(key);

        // Set new color via bridge
        await bridge.setColor(key, value);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  key,
                  oldValue: oldValue || null,
                  newValue: value,
                  message: `Color '${key}' updated successfully`,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'getColor': {
        // Get the current value of a specific color key
        if (!args) throw new Error('Missing arguments for getColor');
        const key = args.key as string;

        // Get color via bridge
        const value = await bridge.getColor(key);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  key,
                  value: value || null,
                  isSet: value !== undefined,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'resetColors': {
        // Reset all color customizations to theme defaults
        await bridge.resetAllColors();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: 'All color customizations reset to theme defaults',
                },
                null,
                2
              ),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}. Available tools: listColorGroups, getColorsInGroup, setColor, getColor, resetColors`);
    }
  });

  // Start MCP server with stdio transport
  // This connects to GitHub Copilot via stdin/stdout
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log to stderr (stdout is used for MCP protocol)
  console.error('8b-Theme-MCP standalone server started via HTTP bridge');
  console.error(`Bridge URL: ${process.env.BRIDGE_PORT ? `http://127.0.0.1:${process.env.BRIDGE_PORT}` : 'NOT SET'}`);
}

/**
 * Run the server
 *
 * Catches fatal errors and exits with non-zero code to signal failure to parent process
 */
main().catch((error) => {
  console.error('Fatal error starting standalone MCP server:', error);
  process.exit(1);
});
