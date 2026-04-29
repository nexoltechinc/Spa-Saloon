const runtimeEnv = import.meta.env ?? {};

const normalizeValue = (value) => String(value || '').trim();

const authEndpointValue = normalizeValue(runtimeEnv.VITE_CRM_AUTH_ENDPOINT);

export const CRM_AUTH_ENDPOINT = authEndpointValue || '/api/crm/auth/login';

export const CRM_AUTH_ENDPOINT_IS_DEFAULT = !authEndpointValue;

export const CRM_TOKEN_STORAGE_KEY = 'crm_token';

export const CRM_SESSION_STORAGE_KEY = 'crm_token_session';

const getStorage = (name) => {
  try {
    return globalThis?.[name] || null;
  } catch {
    return null;
  }
};

const readStorageValue = (storage, key) => {
  try {
    return storage?.getItem?.(key) || '';
  } catch {
    return '';
  }
};

const writeStorageValue = (storage, key, value) => {
  try {
    storage?.setItem?.(key, value);
  } catch {
    // Ignore storage failures in restricted browser environments.
  }
};

const removeStorageValue = (storage, key) => {
  try {
    storage?.removeItem?.(key);
  } catch {
    // Ignore storage failures in restricted browser environments.
  }
};

const decodeBase64Url = (value) => {
  const normalized = String(value || '').trim();
  if (!normalized) return '';

  const padded = normalized.replace(/-/g, '+').replace(/_/g, '/');
  const remainder = padded.length % 4;
  const base64 = remainder ? `${padded}${'='.repeat(4 - remainder)}` : padded;

  if (typeof atob === 'function') {
    return atob(base64);
  }

  const buffer = globalThis?.Buffer;
  if (buffer) {
    return buffer.from(base64, 'base64').toString('utf8');
  }

  return '';
};

export const decodeCrmToken = (token) => {
  const [encodedPayload, signature] = String(token || '').split('.');
  if (!encodedPayload || !signature) return null;

  try {
    return JSON.parse(decodeBase64Url(encodedPayload));
  } catch {
    return null;
  }
};

export const isCrmTokenValid = (token) => {
  const payload = decodeCrmToken(token);
  if (!payload || !payload.expiresAt) return false;

  const expiresAt = Date.parse(payload.expiresAt);
  if (Number.isNaN(expiresAt)) return false;

  return Date.now() <= expiresAt;
};

export const clearCrmToken = () => {
  const localStorageRef = getStorage('localStorage');
  const sessionStorageRef = getStorage('sessionStorage');

  removeStorageValue(localStorageRef, CRM_TOKEN_STORAGE_KEY);
  removeStorageValue(sessionStorageRef, CRM_SESSION_STORAGE_KEY);
};

export const setCrmToken = (token, persist = true) => {
  if (!token) {
    clearCrmToken();
    return;
  }

  const localStorageRef = getStorage('localStorage');
  const sessionStorageRef = getStorage('sessionStorage');

  if (persist) {
    writeStorageValue(localStorageRef, CRM_TOKEN_STORAGE_KEY, token);
    removeStorageValue(sessionStorageRef, CRM_SESSION_STORAGE_KEY);
    return;
  }

  writeStorageValue(sessionStorageRef, CRM_SESSION_STORAGE_KEY, token);
  removeStorageValue(localStorageRef, CRM_TOKEN_STORAGE_KEY);
};

export const getCrmToken = () => {
  const localStorageRef = getStorage('localStorage');
  const sessionStorageRef = getStorage('sessionStorage');
  const token =
    readStorageValue(localStorageRef, CRM_TOKEN_STORAGE_KEY) ||
    readStorageValue(sessionStorageRef, CRM_SESSION_STORAGE_KEY) ||
    '';

  if (!token) return '';

  if (!isCrmTokenValid(token)) {
    clearCrmToken();
    return '';
  }

  return token;
};

export const getCrmSession = () => {
  const token = getCrmToken();
  if (!token) return null;

  const payload = decodeCrmToken(token);
  if (!payload) return null;

  return {
    ...payload,
    token,
  };
};
