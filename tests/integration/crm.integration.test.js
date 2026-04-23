import test from 'node:test';
import { createHarness } from './crmRuntime.js';
import { runOperationalReadinessCheck } from './crmOperationalCheck.js';

test('Spa Saloon CRM operational readiness', async () => {
  const harness = createHarness();

  await harness.prepare();
  try {
    await runOperationalReadinessCheck(harness, { logger: () => {} });
  } finally {
    await harness.shutdown();
  }
});
