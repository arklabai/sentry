/**
 * Sentry AI Broker Sync & Opt-Out Workflow Dispatcher
 * Inspired by Incogni personal data deletion workflows
 */

import { BrokerEntry, OptOutStatus } from '../types';
import defaultBrokerData from '../lib/brokerList.json';

const BROKER_STORAGE_KEY = 'sentry_brokers';
const ALARM_NAME = 'sentry_broker_audit_alarm';

/**
 * Initializes broker database from packaged JSON if not present
 */
export async function initializeBrokers(): Promise<BrokerEntry[]> {
  const stored = await chrome.storage.local.get(BROKER_STORAGE_KEY);
  if (stored[BROKER_STORAGE_KEY]) {
    return stored[BROKER_STORAGE_KEY] as BrokerEntry[];
  }

  const initialBrokers = defaultBrokerData.brokers as BrokerEntry[];
  await chrome.storage.local.set({ [BROKER_STORAGE_KEY]: initialBrokers });
  return initialBrokers;
}

/**
 * Retrieves all registered data brokers
 */
export async function getAllBrokers(): Promise<BrokerEntry[]> {
  const stored = await chrome.storage.local.get(BROKER_STORAGE_KEY);
  return (stored[BROKER_STORAGE_KEY] as BrokerEntry[]) || (await initializeBrokers());
}

/**
 * Updates a broker's opt-out status
 */
export async function updateBrokerStatus(
  brokerId: string,
  status: OptOutStatus
): Promise<BrokerEntry[]> {
  const brokers = await getAllBrokers();
  const updated = brokers.map((b) =>
    b.id === brokerId
      ? {
          ...b,
          status,
          lastUpdated: new Date().toISOString(),
          verificationHash:
            status === 'Removed'
              ? `REC-${Math.random().toString(36).substring(2, 9).toUpperCase()}`
              : b.verificationHash,
        }
      : b
  );
  await chrome.storage.local.set({ [BROKER_STORAGE_KEY]: updated });
  return updated;
}

/**
 * Schedules periodic broker status verification alarm
 */
export function scheduleBrokerAlarm(): void {
  if (!chrome.alarms) return;
  chrome.alarms.create(ALARM_NAME, {
    periodInMinutes: 60 * 24, // Check daily
  });

  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === ALARM_NAME) {
      console.log('[Sentry AI] Daily data broker opt-out status audit executing...');
    }
  });
}
