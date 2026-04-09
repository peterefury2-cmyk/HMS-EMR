export const QUEUE_NAMES = {
  NOTIFICATIONS: 'notifications',
  LAB_RESULTS: 'lab-results',
  APPOINTMENT_REMINDERS: 'appointment-reminders',
  BILLING: 'billing',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
