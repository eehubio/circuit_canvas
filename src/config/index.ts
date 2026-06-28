/**
 * config/index.ts
 * 运行模式与环境配置。通过 Vite 环境变量 VITE_APP_MODE 切换。
 * demo | standalone | integrated —— 对应诊断第七节三种模式。
 */
import type { RunMode } from '../design-core/document/types';

export interface AppConfig {
  mode: RunMode;
  providers: {
    component: 'mock' | 'local-api' | 'ezplm';
    reference: 'mock' | 'local-api' | 'ezplm';
    project: 'local' | 'ezplm';
    ai: 'mock' | 'claude' | 'gateway';
    identity: 'demo' | 'local' | 'ezplm';
  };
  /** integrated/standalone 模式下的后端基址 */
  apiBaseUrl?: string;
}

const env = (import.meta as unknown as { env: Record<string, string | undefined> }).env ?? {};
const MODE = (env.VITE_APP_MODE as RunMode) || 'demo';
const API_BASE = env.VITE_API_BASE_URL;

const PRESETS: Record<RunMode, AppConfig> = {
  demo: {
    mode: 'demo',
    providers: { component: 'mock', reference: 'mock', project: 'local', ai: 'mock', identity: 'demo' },
  },
  standalone: {
    mode: 'standalone',
    providers: { component: 'local-api', reference: 'local-api', project: 'local', ai: 'claude', identity: 'local' },
    apiBaseUrl: API_BASE ?? '/api',
  },
  integrated: {
    mode: 'integrated',
    providers: { component: 'ezplm', reference: 'ezplm', project: 'ezplm', ai: 'gateway', identity: 'ezplm' },
    apiBaseUrl: API_BASE ?? 'https://www.ezplm.cn/api',
  },
};

export const appConfig: AppConfig = PRESETS[MODE] ?? PRESETS.demo;
