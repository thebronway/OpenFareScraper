export const DEFAULT_GUARDRAILS = {
  minJitterMs: 4000,
  maxJitterMs: 9000,
  settleDelayMs: 2500,
  maxRequestsPerHour: 20,
  maxRequestsPerDay: 150,
  cooldownMinutes: 60,
  browserRecycleScrapes: 100,
} as const;

export interface GuardrailValues {
  minJitterMs: number;
  maxJitterMs: number;
  settleDelayMs: number;
  maxRequestsPerHour: number;
  maxRequestsPerDay: number;
  cooldownMinutes: number;
  browserRecycleScrapes: number;
}