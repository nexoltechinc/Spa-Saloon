import assert from 'node:assert/strict';
import { dbInfo } from './crmRuntime.js';

const clone = (value) => JSON.parse(JSON.stringify(value));

const futureIso = (hoursAhead = 24) => new Date(Date.now() + hoursAhead * 60 * 60 * 1000).toISOString();

const assertArrayContains = (array, predicate, message) => {
  assert.ok(Array.isArray(array), message);
  assert.ok(array.some(predicate), message);
};

export const runOperationalReadinessCheck = async (harness, { logger = () => {} } = {}) => {
  logger('Checking migration chain');
  const migrations = await harness.queryMigrations();
  assert.deepEqual(migrations, [
    '001_core_schema',
    '002_seed_settings',
    '003_backfill_structured_resources',
    '004_services_structured',
  ]);

  logger('Checking auth gate');
  await harness.clearToken();
  await assert.rejects(harness.list('leads'), (error) => error.status === 401);

  logger('Logging in');
  const session = await harness.login();
  assert.ok(session.token, 'Expected an auth token from the login endpoint.');
  assert.equal(session.user.email, dbInfo.adminEmail);

  logger('Checking report resource');
  const reports = await harness.list('reports');
  assert.ok(reports.length > 0, 'Reports resource should return rows.');
  assertArrayContains(reports, (row) => row.id === 'report-active-branches', 'Reports should include active branch metrics.');
  assertArrayContains(reports, (row) => row.id === 'report-open-leads', 'Reports should include open lead metrics.');

  logger('Checking settings persistence');
  const initialSettings = clone(await harness.getSettings());
  const mutatedSettings = clone(initialSettings);
  const stamp = `Smoke ${Date.now()}`;
  mutatedSettings.profile.businessName = `${initialSettings.profile.businessName} ${stamp}`;
  mutatedSettings.branding.receiptHeaderQuote = `${initialSettings.branding.receiptHeaderQuote} (${stamp})`;
  mutatedSettings.branding.receiptFooterText = `${initialSettings.branding.receiptFooterText} (${stamp})`;

  const savedSettings = await harness.saveSettings(mutatedSettings);
  assert.equal(savedSettings.profile.businessName, mutatedSettings.profile.businessName);
  assert.equal(savedSettings.branding.receiptHeaderQuote, mutatedSettings.branding.receiptHeaderQuote);

  const cachedSettings = await harness.loadSettingsCache();
  assert.equal(cachedSettings.profile.businessName, mutatedSettings.profile.businessName);

  const liveSettings = await harness.getSettings();
  assert.equal(liveSettings.profile.businessName, mutatedSettings.profile.businessName);

  logger('Checking lead CRUD');
  const leadName = `Smoke Lead ${Date.now()}`;
  const lead = await harness.create('leads', {
    fullName: leadName,
    email: `lead-${Date.now()}@example.com`,
    phone: '+1 555 010 2000',
    source: 'Website Form',
    status: 'New',
    priority: 'High',
    ownerName: 'Front Desk',
    branchName: 'West Hollywood',
    serviceInterest: 'Signature Facial',
    budget: 320,
    lastContactAt: new Date().toISOString(),
    nextFollowUpAt: futureIso(12),
    notes: 'Created by smoke test.',
  });

  assert.ok(lead.id, 'Lead should have an id.');
  assert.equal(lead.fullName, leadName);

  const leadList = await harness.list('leads');
  assertArrayContains(leadList, (row) => row.id === lead.id, 'Lead should appear in list results.');

  const leadFetched = await harness.get('leads', lead.id);
  assert.equal(leadFetched.fullName, leadName);

  const leadUpdated = await harness.update('leads', lead.id, {
    ...leadFetched,
    status: 'Booked',
    priority: 'Normal',
    budget: 420,
    notes: 'Updated by smoke test.',
  });
  assert.equal(leadUpdated.status, 'Booked');
  assert.equal(leadUpdated.budget, 420);

  const leadAfterUpdate = await harness.get('leads', lead.id);
  assert.equal(leadAfterUpdate.status, 'Booked');
  assert.equal(leadAfterUpdate.budget, 420);

  logger('Checking appointment CRUD');
  const appointmentName = `Smoke Guest ${Date.now()}`;
  const appointment = await harness.create('appointments', {
    customerName: appointmentName,
    customerEmail: `guest-${Date.now()}@example.com`,
    phone: '+1 555 010 2100',
    serviceName: 'Hydra Glow Infusion',
    staffName: 'Elena',
    branchName: 'West Hollywood',
    appointmentAt: futureIso(36),
    durationMinutes: 75,
    status: 'Confirmed',
    paymentStatus: 'Partial',
    amountDue: 180,
    amountPaid: 60,
    balanceRemaining: 120,
    source: 'CRM',
    notes: 'Created by smoke test.',
  });

  assert.ok(appointment.id, 'Appointment should have an id.');
  assert.equal(appointment.customerName, appointmentName);

  const appointmentList = await harness.list('appointments');
  assertArrayContains(appointmentList, (row) => row.id === appointment.id, 'Appointment should appear in list results.');

  const appointmentFetched = await harness.get('appointments', appointment.id);
  assert.equal(appointmentFetched.customerName, appointmentName);
  assert.equal(appointmentFetched.balanceRemaining, 120);

  const appointmentUpdated = await harness.update('appointments', appointment.id, {
    ...appointmentFetched,
    status: 'Completed',
    paymentStatus: 'Paid',
    amountPaid: 180,
    balanceRemaining: 0,
    notes: 'Updated by smoke test.',
  });
  assert.equal(appointmentUpdated.status, 'Completed');
  assert.equal(appointmentUpdated.paymentStatus, 'Paid');
  assert.ok(appointmentUpdated.completedAt, 'Completed appointments should receive a completion timestamp.');

  const appointmentAfterUpdate = await harness.get('appointments', appointment.id);
  assert.equal(appointmentAfterUpdate.status, 'Completed');
  assert.equal(appointmentAfterUpdate.paymentStatus, 'Paid');
  assert.ok(appointmentAfterUpdate.completedAt);

  logger('Checking branch CRUD');
  const branchName = `Smoke Branch ${Date.now()}`;
  const branch = await harness.create('branches', {
    name: branchName,
    managerName: 'Smoke Manager',
    city: 'Los Angeles',
    state: 'CA',
    phone: '(323) 555-2200',
    email: `branch-${Date.now()}@example.com`,
    hours: '9:00 AM - 8:00 PM',
    status: 'Planning',
    active: false,
    rooms: 4,
    teamSize: 10,
    notes: 'Created by smoke test.',
  });

  assert.ok(branch.id, 'Branch should have an id.');
  assert.equal(branch.name, branchName);

  const branchList = await harness.list('branches');
  assertArrayContains(branchList, (row) => row.id === branch.id, 'Branch should appear in list results.');

  const branchFetched = await harness.get('branches', branch.id);
  assert.equal(branchFetched.name, branchName);

  const branchUpdated = await harness.update('branches', branch.id, {
    ...branchFetched,
    status: 'Open',
    active: true,
    city: 'West Hollywood',
    rooms: 5,
    teamSize: 12,
    notes: 'Updated by smoke test.',
  });
  assert.equal(branchUpdated.status, 'Open');
  assert.equal(branchUpdated.active, true);

  const branchAfterUpdate = await harness.get('branches', branch.id);
  assert.equal(branchAfterUpdate.status, 'Open');
  assert.equal(branchAfterUpdate.active, true);

  logger('Checking persistence after restart');
  await harness.restartDatabaseAndApi();
  await harness.login();

  const leadAfterRestart = await harness.get('leads', lead.id);
  assert.equal(leadAfterRestart.status, 'Booked');
  assert.equal(leadAfterRestart.budget, 420);

  const appointmentAfterRestart = await harness.get('appointments', appointment.id);
  assert.equal(appointmentAfterRestart.status, 'Completed');
  assert.equal(appointmentAfterRestart.paymentStatus, 'Paid');

  const branchAfterRestart = await harness.get('branches', branch.id);
  assert.equal(branchAfterRestart.status, 'Open');
  assert.equal(branchAfterRestart.active, true);

  const settingsAfterRestart = await harness.getSettings();
  assert.equal(settingsAfterRestart.profile.businessName, mutatedSettings.profile.businessName);
  assert.equal(settingsAfterRestart.branding.receiptHeaderQuote, mutatedSettings.branding.receiptHeaderQuote);

  const reportsAfterRestart = await harness.list('reports');
  assert.ok(reportsAfterRestart.length > 0, 'Reports should still be available after restart.');

  logger('Cleaning up smoke data');
  await harness.remove('appointments', appointment.id);
  await harness.remove('branches', branch.id);
  await harness.remove('leads', lead.id);
  await harness.saveSettings(initialSettings);

  const cleanedLeads = await harness.list('leads');
  assert.ok(!cleanedLeads.some((row) => row.id === lead.id), 'Lead should be removed during cleanup.');

  const cleanedBranches = await harness.list('branches');
  assert.ok(!cleanedBranches.some((row) => row.id === branch.id), 'Branch should be removed during cleanup.');

  const cleanedAppointments = await harness.list('appointments');
  assert.ok(!cleanedAppointments.some((row) => row.id === appointment.id), 'Appointment should be removed during cleanup.');

  const restoredSettings = await harness.getSettings();
  assert.equal(restoredSettings.profile.businessName, initialSettings.profile.businessName);

  return {
    leadId: lead.id,
    appointmentId: appointment.id,
    branchId: branch.id,
    databaseName: harness.databaseName,
  };
};
