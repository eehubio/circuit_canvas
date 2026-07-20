import type { ComponentType } from 'react';

export interface CircuitCanvasPluginManifest {
  id: string;
  name: string;
  version: string;
  entryLabel: string;
  description: string;
  capabilities: string[];
}

export interface CircuitCanvasPlugin {
  manifest: CircuitCanvasPluginManifest;
  Modal?: ComponentType<Record<string, never>>;
}

const plugins = new Map<string, CircuitCanvasPlugin>();

export function registerPlugin(plugin: CircuitCanvasPlugin) {
  plugins.set(plugin.manifest.id, plugin);
}

export function listPlugins(): CircuitCanvasPlugin[] {
  return [...plugins.values()];
}

export function getPlugin(id: string): CircuitCanvasPlugin | undefined {
  return plugins.get(id);
}
