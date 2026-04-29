import { CRM_AUTH_ENDPOINT, getCrmToken } from './crm.js';

const runtimeEnv = import.meta.env ?? {};

export const CRM_API_BASE_URL = runtimeEnv.VITE_CRM_API_BASE_URL || '';
export const CRM_API_PREFIX = runtimeEnv.VITE_CRM_API_PREFIX || '/api/crm';

export const CRM_API_RESOURCES = {
  branches: '/branches',
  receipts: '/receipts',
  leads: '/leads',
  customers: '/customers',
  appointments: '/appointments',
  services: '/services',
  staff: '/staff',
  payments: '/payments',
  reports: '/reports',
};

const joinPath = (left, right) => {
  if (!left) return right;
  if (!right) return left;
  return `${left.replace(/\/$/, '')}/${right.replace(/^\//, '')}`;
};

const buildUrl = (path, query) => {
  const base = joinPath(CRM_API_BASE_URL, joinPath(CRM_API_PREFIX, path));
  const origin = globalThis?.window?.location?.origin || 'http://127.0.0.1';
  const url = new URL(base, origin);

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });
  }

  return url.toString();
};

const readPayload = async (response) => {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return response.json();
  }

  return response.text();
};

const unwrapCollection = (payload, resourceName) => {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];

  const candidates = [
    payload.data,
    payload.items,
    payload.results,
    payload.records,
    payload[resourceName],
  ];

  const match = candidates.find(Array.isArray);
  return Array.isArray(match) ? match : [];
};

const buildAuthUrl = () => {
  const endpoint = String(CRM_AUTH_ENDPOINT || '').trim() || '/api/crm/auth/login';

  if (/^https?:\/\//i.test(endpoint)) {
    return endpoint;
  }

  const origin = globalThis?.window?.location?.origin || 'http://127.0.0.1';
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return new URL(normalizedEndpoint, origin).toString();
};

const fetchJson = async (url, requestInit) => {
  let response;

  try {
    response = await fetch(url, requestInit);
  } catch (fetchError) {
    const error = new Error('The CRM service could not be reached.');
    error.status = 0;
    error.code = 'CRM_NETWORK_UNAVAILABLE';
    error.cause = fetchError;
    throw error;
  }

  const payload = await readPayload(response);

  if (!response.ok) {
    const message =
      (payload && typeof payload === 'object' && (payload.message || payload.error || payload.detail)) ||
      (typeof payload === 'string' && payload) ||
      `CRM request failed (${response.status})`;
    const error = new Error(message);
    error.status = response.status;
    error.code =
      payload && typeof payload === 'object'
        ? payload.code || null
        : null;
    if (!error.code && response.status >= 500) {
      error.code = 'CRM_SERVICE_UNAVAILABLE';
    }
    error.payload = payload;
    throw error;
  }

  return payload;
};

export const crmApiRequest = async (path, { method = 'GET', body, query, headers = {}, token = getCrmToken() } = {}) => {
  const requestInit = {
    method,
    headers: {
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  };

  return fetchJson(buildUrl(path, query), requestInit);
};

export const crmHealthCheck = async () => {
  try {
    const response = await fetch(buildUrl('/health'), {
      headers: { Accept: 'application/json' },
    });

    const payload = await readPayload(response);

    return {
      ok: response.ok,
      status: response.status,
      payload,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error,
    };
  }
};

export const crmLogin = async (credentials, options = {}) => {
  const { headers = {}, ...requestOptions } = options;

  return fetchJson(buildAuthUrl(), {
    ...requestOptions,
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(credentials),
  });
};

export const crmList = async (resourceName, options = {}) => {
  const payload = await crmApiRequest(CRM_API_RESOURCES[resourceName], options);
  return unwrapCollection(payload, resourceName);
};

export const crmGetOne = async (resourceName, id, options = {}) => {
  return crmApiRequest(joinPath(CRM_API_RESOURCES[resourceName], id), options);
};

export const crmCreate = async (resourceName, body, options = {}) => {
  return crmApiRequest(CRM_API_RESOURCES[resourceName], { ...options, method: 'POST', body });
};

export const crmUpdate = async (resourceName, id, body, options = {}) => {
  return crmApiRequest(joinPath(CRM_API_RESOURCES[resourceName], id), { ...options, method: 'PATCH', body });
};

export const crmDelete = async (resourceName, id, options = {}) => {
  return crmApiRequest(joinPath(CRM_API_RESOURCES[resourceName], id), { ...options, method: 'DELETE' });
};

export const normalizeCollection = (payload, resourceName) => unwrapCollection(payload, resourceName);

export const crmGetSettings = async (options = {}) => {
  return crmApiRequest('/settings', options);
};

export const crmSaveSettings = async (body, options = {}) => {
  return crmApiRequest('/settings', { ...options, method: 'PUT', body });
};
