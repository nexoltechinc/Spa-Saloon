import assert from 'node:assert/strict';
import { dbInfo } from './crmRuntime.js';

const clone = (value) => JSON.parse(JSON.stringify(value));

const futureIso = (hoursAhead = 24) => new Date(Date.now() + hoursAhead * 60 * 60 * 1000).toISOString();

const assertArrayContains = (array, predicate, message) => {
  assert.ok(Array.isArray(array), message);
  assert.ok(array.some(predicate), message);
};

const createExpiredToken = (email) => {
  const payload = {
    sub: email,
    email,
    role: 'admin',
    issuedAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    expiresAt: new Date(Date.now() - 1000 * 60).toISOString(),
  };

  return `${Buffer.from(JSON.stringify(payload)).toString('base64url')}.expired`;
};

const runAuthOnlyReadinessCheck = async (harness, { logger = () => {} } = {}) => {
  logger('Checking degraded CRM startup');
  const health = await harness.health();
  assert.equal(health.ok, false);
  assert.equal(health.status, 503);
  assert.equal(health.payload?.database?.state, 'degraded');

  logger('Checking degraded login response');
  await harness.clearToken();
  let degradedSession = null;

  try {
    degradedSession = await harness.login('admin@spa.local', 'ChangeMe123!');
  } catch (error) {
    assert.equal(error.status, 503);
    assert.ok(error.code === 'CRM_AUTH_BOOTING' || error.code === 'CRM_AUTH_SERVICE_UNAVAILABLE');
  }

  if (degradedSession) {
    assert.ok(degradedSession.token, 'Expected a degraded login token.');
    assert.equal(degradedSession.user.email, dbInfo.adminEmail);
    assert.equal(degradedSession.degraded, true);
    assert.equal(await harness.getToken(), degradedSession.token);
  }

  logger('Starting auth-only fallback server');
  await harness.startMockAuthServer();

  const healthyMock = await harness.health();
  assert.equal(healthyMock.ok, true);
  assert.equal(healthyMock.status, 200);

  logger('Checking login success');
  await harness.clearToken();
  const session = await harness.login();
  assert.ok(session.token, 'Expected an auth token from the mock login endpoint.');
  assert.equal(session.user.email, dbInfo.adminEmail);
  assert.equal(await harness.getToken(), session.token);

  logger('Checking invalid credentials');
  await harness.clearToken();
  await assert.rejects(
    harness.login('wrong@example.com', 'incorrect'),
    (error) => error.status === 401 && error.code === 'CRM_INVALID_CREDENTIALS',
  );

  logger('Checking session persistence');
  const persistentSession = await harness.login();
  await harness.simulateRefresh();
  assert.equal(await harness.getToken(), persistentSession.token);

  logger('Checking session storage path');
  await harness.setToken(persistentSession.token, false);
  await harness.simulateRefresh();
  assert.equal(await harness.getToken(), persistentSession.token);

  logger('Checking expired token cleanup');
  const { getCrmSession } = await harness.loadFrontendClient();
  await harness.setToken(createExpiredToken(dbInfo.adminEmail), true);
  assert.equal(getCrmSession(), null);
  assert.equal(await harness.getToken(), '');

  logger('Checking logout cleanup');
  await harness.login();
  await harness.clearToken();
  assert.equal(await harness.getToken(), '');

  return {
    mode: 'auth-only',
    databaseMode: harness.databaseMode,
    databaseStartupError: harness.databaseStartupError?.message || String(harness.databaseStartupError || ''),
  };
};

export const runOperationalReadinessCheck = async (harness, { logger = () => {} } = {}) => {
  if (harness.verificationMode === 'auth-only') {
    return runAuthOnlyReadinessCheck(harness, { logger });
  }

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

  logger('Checking customer record CRUD');
  const customerName = `Smoke Customer ${Date.now()}`;
  const customer = await harness.create('customers', {
    id: `CUS-SMOKE-${Date.now()}`,
    fullName: customerName,
    name: customerName,
    email: `customer-${Date.now()}@example.com`,
    phone: '+1 555 010 2300',
    segment: 'Repeat Customer',
    status: 'Active',
    acquisitionSource: 'Website Form',
    createdAt: new Date().toISOString(),
    lastVisit: futureIso(-10),
    visitCount: 5,
    totalSpend: 860,
    loyaltyPoints: 120,
    favoriteService: 'Signature Facial',
    favoriteStaff: 'Elena',
    preferredTimes: 'Late afternoons',
    preferredChannel: 'Website',
    sensitivities: 'None reported',
    upcomingAppointment: {
      id: `APT-SMOKE-${Date.now()}`,
      dateTime: futureIso(48),
      service: 'Signature Facial',
      staff: 'Elena',
      status: 'Confirmed',
    },
    pendingBalance: 45,
    paymentHistory: [
      {
        id: `PAY-SMOKE-${Date.now()}`,
        date: futureIso(-6),
        amount: 120,
        method: 'Cash',
        service: 'Signature Facial',
        receiptNo: `RCPT-SMOKE-${Date.now()}`,
        status: 'Paid',
      },
    ],
    appointmentHistory: [
      {
        id: `APT-SMOKE-${Date.now()}`,
        dateTime: futureIso(48),
        service: 'Signature Facial',
        staff: 'Elena',
        status: 'Confirmed',
      },
    ],
    activityTimeline: [
      {
        id: `ACT-SMOKE-${Date.now()}`,
        type: 'Customer Created',
        at: new Date().toISOString(),
        actor: 'Front Desk',
        channel: 'CRM',
        outcome: 'Created',
        summary: 'Created by smoke test.',
      },
    ],
    notes: [
      {
        id: `NOTE-SMOKE-${Date.now()}`,
        at: new Date().toISOString(),
        author: 'Front Desk',
        text: 'Smoke test customer.',
      },
    ],
    membership: 'None',
    preferences: ['Signature Facial'],
  });

  assert.ok(customer.id, 'Customer should have an id.');
  assert.equal(customer.fullName, customerName);

  const customerList = await harness.list('customers');
  assertArrayContains(customerList, (row) => row.id === customer.id, 'Customer should appear in list results.');

  const customerFetched = await harness.get('customers', customer.id);
  assert.equal(customerFetched.fullName, customerName);
  assert.equal(customerFetched.upcomingAppointment?.service, 'Signature Facial');
  assert.ok(Array.isArray(customerFetched.paymentHistory) && customerFetched.paymentHistory.length > 0);

  const customerUpdated = await harness.update('customers', customer.id, {
    ...customerFetched,
    segment: 'VIP',
    status: 'Active',
    pendingBalance: 0,
    totalSpend: 980,
    loyaltyPoints: 240,
    notes: [
      ...(Array.isArray(customerFetched.notes) ? customerFetched.notes : []),
      {
        id: `NOTE-SMOKE-UPD-${Date.now()}`,
        at: new Date().toISOString(),
        author: 'Front Desk',
        text: 'Updated by smoke test.',
      },
    ],
  });
  assert.equal(customerUpdated.segment, 'VIP');

  const customerAfterUpdate = await harness.get('customers', customer.id);
  assert.equal(customerAfterUpdate.segment, 'VIP');
  assert.equal(customerAfterUpdate.pendingBalance, 0);

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

  logger('Checking public website booking bridge');
  const websiteCustomerName = `Website Guest ${Date.now()}`;
  const websiteCustomerEmail = `website-${Date.now()}@example.com`;
  const websiteBookingResponse = await fetch(new URL('/api/bookings', harness.baseUrl), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      customerName: websiteCustomerName,
      customerEmail: websiteCustomerEmail,
      phone: '+1 555 010 2201',
      serviceName: 'Signature Facial',
      staffName: 'Marcus',
      branchName: 'West Hollywood',
      appointmentAt: futureIso(48),
      durationMinutes: 60,
      amountDue: 220,
      amountPaid: 40,
      notes: 'Booked from website smoke test.',
      source: 'Website Form',
    }),
  });

  assert.equal(websiteBookingResponse.status, 201);
  const websiteBooking = await websiteBookingResponse.json();

  assert.ok(websiteBooking.customer?.id, 'Website booking should return a customer record.');
  assert.ok(websiteBooking.appointment?.id, 'Website booking should return an appointment record.');
  assert.equal(websiteBooking.customer.fullName, websiteCustomerName);
  assert.equal(websiteBooking.appointment.customerId, websiteBooking.customer.id);
  assert.equal(websiteBooking.appointment.source, 'Website');
  assert.equal(websiteBooking.customer.metadata?.bookedFromWebsite, true);
  assert.equal(websiteBooking.customer.upcomingAppointment?.service, 'Signature Facial');

  const websiteCustomerList = await harness.list('customers');
  assertArrayContains(websiteCustomerList, (row) => row.id === websiteBooking.customer.id, 'Website booking customer should appear in customer list.');

  const websiteAppointmentList = await harness.list('appointments');
  assertArrayContains(websiteAppointmentList, (row) => row.id === websiteBooking.appointment.id, 'Website booking appointment should appear in appointment list.');

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

  const customerAfterRestart = await harness.get('customers', customer.id);
  assert.equal(customerAfterRestart.fullName, customerName);
  assert.equal(customerAfterRestart.segment, 'VIP');
  assert.equal(customerAfterRestart.upcomingAppointment?.service, 'Signature Facial');
  assert.ok(Array.isArray(customerAfterRestart.notes) && customerAfterRestart.notes.length > 0);

  const websiteCustomerAfterRestart = await harness.get('customers', websiteBooking.customer.id);
  assert.equal(websiteCustomerAfterRestart.fullName, websiteCustomerName);
  assert.equal(websiteCustomerAfterRestart.metadata?.bookedFromWebsite, true);
  assert.equal(websiteCustomerAfterRestart.upcomingAppointment?.service, 'Signature Facial');

  const websiteAppointmentAfterRestart = await harness.get('appointments', websiteBooking.appointment.id);
  assert.equal(websiteAppointmentAfterRestart.customerId, websiteBooking.customer.id);
  assert.equal(websiteAppointmentAfterRestart.source, 'Website');

  const settingsAfterRestart = await harness.getSettings();
  assert.equal(settingsAfterRestart.profile.businessName, mutatedSettings.profile.businessName);
  assert.equal(settingsAfterRestart.branding.receiptHeaderQuote, mutatedSettings.branding.receiptHeaderQuote);

  const reportsAfterRestart = await harness.list('reports');
  assert.ok(reportsAfterRestart.length > 0, 'Reports should still be available after restart.');

  logger('Cleaning up smoke data');
  await harness.remove('appointments', appointment.id);
  await harness.remove('appointments', websiteBooking.appointment.id);
  await harness.remove('customers', websiteBooking.customer.id);
  await harness.remove('customers', customer.id);
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
    mode: 'full',
  };
};
