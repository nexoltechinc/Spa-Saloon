import { createHarness } from '../tests/integration/crmRuntime.js';
import { runOperationalReadinessCheck } from '../tests/integration/crmOperationalCheck.js';

const harness = createHarness();

try {
  console.log('Starting Spa Saloon CRM smoke test...');
  await harness.prepare();
  console.log(`API: ${harness.baseUrl}`);
  console.log(`Mode: ${harness.verificationMode}`);
  if (harness.verificationMode === 'full') {
    console.log(`Database: ${harness.databaseName}`);
  } else {
    console.log(`Database blocker: ${harness.databaseStartupError?.message || String(harness.databaseStartupError || 'Unavailable')}`);
  }

  const result = await runOperationalReadinessCheck(harness, {
    logger: (message) => console.log(`- ${message}`),
  });

  console.log(`Smoke test complete: ${JSON.stringify(result)}`);
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await harness.shutdown();
}
