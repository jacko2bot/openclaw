import type { OpenClawConfig } from "../config/config.js";
import {
  BUNDLED_LEGACY_PLUGIN_ID_ALIASES,
  BUNDLED_PROVIDER_PLUGIN_ID_ALIASES,
} from "./bundled-capability-metadata.js";
import {
  hasExplicitPluginConfig,
  isBundledChannelEnabledByChannelConfig,
  normalizePluginsConfigWithResolver,
  resolveEnableState as resolveEnableStateFromPolicy,
  resolveEffectiveEnableState as resolveEffectiveEnableStateFromPolicy,
  resolveEffectivePluginActivationState as resolveEffectivePluginActivationStateFromPolicy,
  resolveMemorySlotDecision,
  resolvePluginActivationState as resolvePluginActivationStateFromPolicy,
} from "./config-policy.js";
import type {
  NormalizedPluginsConfig,
  PluginActivationSource,
  PluginActivationState,
} from "./config-policy.js";
import type { PluginOrigin } from "./types.js";

export type { NormalizedPluginsConfig, PluginActivationSource, PluginActivationState };

export type PluginActivationConfigSource = {
  plugins: NormalizedPluginsConfig;
  rootConfig?: OpenClawConfig;
};

export function normalizePluginId(id: string): string {
  const trimmed = id.trim();
  return (
    BUNDLED_LEGACY_PLUGIN_ID_ALIASES[trimmed] ??
    BUNDLED_PROVIDER_PLUGIN_ID_ALIASES[trimmed] ??
    trimmed
  );
}

export const normalizePluginsConfig = (config?: OpenClawConfig["plugins"]) => {
  return normalizePluginsConfigWithResolver(config, normalizePluginId);
};

export function createPluginActivationSource(params: {
  config?: OpenClawConfig;
  plugins?: NormalizedPluginsConfig;
}): PluginActivationConfigSource {
  return {
    plugins: params.plugins ?? normalizePluginsConfig(params.config?.plugins),
    rootConfig: params.config,
  };
}

const hasExplicitMemorySlot = (plugins?: OpenClawConfig["plugins"]) =>
  Boolean(plugins?.slots && Object.prototype.hasOwnProperty.call(plugins.slots, "memory"));

const hasExplicitMemoryEntry = (plugins?: OpenClawConfig["plugins"]) =>
  Boolean(plugins?.entries && Object.prototype.hasOwnProperty.call(plugins.entries, "memory-core"));

export function applyTestPluginDefaults(
  cfg: OpenClawConfig,
  env: NodeJS.ProcessEnv = process.env,
): OpenClawConfig {
  if (!env.VITEST) {
    return cfg;
  }
  const plugins = cfg.plugins;
  const explicitConfig = hasExplicitPluginConfig(plugins);
  if (explicitConfig) {
    if (hasExplicitMemorySlot(plugins) || hasExplicitMemoryEntry(plugins)) {
      return cfg;
    }
    return {
      ...cfg,
      plugins: {
        ...plugins,
        slots: {
          ...plugins?.slots,
          memory: "none",
        },
      },
    };
  }

  return {
    ...cfg,
    plugins: {
      ...plugins,
      enabled: false,
      slots: {
        ...plugins?.slots,
        memory: "none",
      },
    },
  };
}

export function isTestDefaultMemorySlotDisabled(
  cfg: OpenClawConfig,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (!env.VITEST) {
    return false;
  }
  const plugins = cfg.plugins;
  if (hasExplicitMemorySlot(plugins) || hasExplicitMemoryEntry(plugins)) {
    return false;
  }
  return true;
}

type ResolveActivationParams = {
  id: string;
  origin: PluginOrigin;
  config: NormalizedPluginsConfig;
  rootConfig?: OpenClawConfig;
  enabledByDefault?: boolean;
  sourceConfig?: NormalizedPluginsConfig;
  sourceRootConfig?: OpenClawConfig;
  activationSource?: PluginActivationConfigSource;
  autoEnabledReason?: string;
};

function withActivationSource(params: ResolveActivationParams) {
  return {
    ...params,
    sourceConfig: params.sourceConfig ?? params.activationSource?.plugins,
    sourceRootConfig: params.sourceRootConfig ?? params.activationSource?.rootConfig,
  };
}

export function resolvePluginActivationState(
  params: ResolveActivationParams,
): PluginActivationState {
  return resolvePluginActivationStateFromPolicy(withActivationSource(params));
}

export function resolveEnableState(
  id: string,
  origin: PluginOrigin,
  config: NormalizedPluginsConfig,
  enabledByDefault?: boolean,
): { enabled: boolean; reason?: string } {
  return resolveEnableStateFromPolicy(id, origin, config, enabledByDefault);
}

export function resolveEffectiveEnableState(params: ResolveActivationParams): {
  enabled: boolean;
  reason?: string;
} {
  return resolveEffectiveEnableStateFromPolicy(withActivationSource(params));
}

export function resolveEffectivePluginActivationState(
  params: ResolveActivationParams,
): PluginActivationState {
  return resolveEffectivePluginActivationStateFromPolicy(withActivationSource(params));
}

export { isBundledChannelEnabledByChannelConfig, resolveMemorySlotDecision };
