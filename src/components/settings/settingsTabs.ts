export type SettingsTabId = 'general' | 'guardrails' | 'security';

export interface SettingsTabDefinition {
  id: SettingsTabId;
  label: string;
}

export const DEFAULT_SETTINGS_TAB: SettingsTabId = 'general';

export const SETTINGS_TABS: SettingsTabDefinition[] = [
  { id: 'general', label: 'General' },
  { id: 'guardrails', label: 'Guardrails' },
  { id: 'security', label: 'Security' },
];

export function isValidSettingsTab(value?: string | null): value is SettingsTabId {
  if (!value) return false;
  return SETTINGS_TABS.some((tab) => tab.id === value);
}

export function normalizeSettingsTab(value?: string | null): SettingsTabId | null {
  if (!value) return null;
  const cleaned = value.trim().toLowerCase();
  if (isValidSettingsTab(cleaned)) {
    return cleaned;
  }
  return null;
}