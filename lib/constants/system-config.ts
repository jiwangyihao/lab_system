// Constants for system configuration keys
// Separated from server actions to comply with Next.js 16 "use server" restrictions

export const SYSTEM_CONFIG_KEYS = {
  MAINTENANCE_CYCLE_DEFAULT: "MAINTENANCE_CYCLE_DEFAULT",
  RESERVATION_ADVANCE_DAYS: "RESERVATION_ADVANCE_DAYS",
  DISABLED_DATES: "DISABLED_DATES",
} as const;
