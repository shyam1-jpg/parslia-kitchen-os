import { db } from "../db/schema.js";
import { PRODUCT_CATALOG, type PlanTier } from "../config/models.js";
import { FEATURE_FLAGS, type FeatureFlagState } from "../config/featureFlags.js";

export interface MaintenanceConfig {
  enabled: boolean;
  message: string;
}

export interface AnnouncementConfig {
  active: boolean;
  message: string;
}

export interface PricingConfig {
  proMonthlyGbp: number;
  enterpriseMonthlyGbp: number;
  proAnnualGbp?: number;
}

export function getConfigRaw(key: string): unknown {
  const row = db.prepare("SELECT value FROM site_config WHERE key = ?").get(key) as
    | { value: string }
    | undefined;
  if (!row) return undefined;
  try {
    return JSON.parse(row.value);
  } catch {
    return undefined;
  }
}

export function setConfigRaw(key: string, value: unknown, updatedBy?: string) {
  db.prepare(
    `INSERT INTO site_config (key, value, updated_by, updated_at)
     VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_by = excluded.updated_by, updated_at = datetime('now')`
  ).run(key, JSON.stringify(value), updatedBy ?? null);
}

export function getPlanLimits(plan: PlanTier) {
  const override = getConfigRaw(`plans.${plan}`) as Partial<(typeof PRODUCT_CATALOG.plans.free)> | undefined;
  return { ...PRODUCT_CATALOG.plans[plan], ...override };
}

export function getAllPlanLimits() {
  return {
    free: getPlanLimits("free"),
    pro: getPlanLimits("pro"),
    enterprise: getPlanLimits("enterprise"),
  };
}

export function getModelOverrides(): Record<string, { enabled?: boolean; tier?: PlanTier }> {
  return (getConfigRaw("models") as Record<string, { enabled?: boolean; tier?: PlanTier }>) ?? {};
}

export function getFeatureFlagOverrides(): Record<string, FeatureFlagState> {
  return (getConfigRaw("feature_flags") as Record<string, FeatureFlagState>) ?? {};
}

export function getMaintenance(): MaintenanceConfig {
  return (
    (getConfigRaw("maintenance") as MaintenanceConfig) ?? {
      enabled: false,
      message: "Libraix is undergoing maintenance. Please try again shortly.",
    }
  );
}

export function getAnnouncement(): AnnouncementConfig {
  return (getConfigRaw("announcement") as AnnouncementConfig) ?? { active: false, message: "" };
}

export function getPricing(): PricingConfig {
  return (
    (getConfigRaw("pricing") as PricingConfig) ?? {
      proMonthlyGbp: 9,
      enterpriseMonthlyGbp: 29,
    }
  );
}

export function getPublicRuntimeConfig() {
  return {
    maintenance: getMaintenance(),
    announcement: getAnnouncement(),
    pricing: getPricing(),
    plans: getAllPlanLimits(),
  };
}

export function getAdminConfigSnapshot() {
  return {
    plans: getAllPlanLimits(),
    modelOverrides: getModelOverrides(),
    featureFlagOverrides: getFeatureFlagOverrides(),
    maintenance: getMaintenance(),
    announcement: getAnnouncement(),
    pricing: getPricing(),
    catalogDefaults: {
      models: PRODUCT_CATALOG.models.map(({ providerModelId, ...m }) => ({ ...m, providerModelId })),
      featureFlags: FEATURE_FLAGS,
    },
  };
}
