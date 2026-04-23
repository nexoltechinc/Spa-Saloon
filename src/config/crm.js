const runtimeEnv = import.meta.env ?? {};

export const CRM_AUTH_ENDPOINT = runtimeEnv.VITE_CRM_AUTH_ENDPOINT || '';

export const CRM_TOKEN_STORAGE_KEY = 'crm_token';

export const CRM_SESSION_STORAGE_KEY = 'crm_token_session';

export const getCrmToken = () =>
  localStorage.getItem(CRM_TOKEN_STORAGE_KEY) ||
  sessionStorage.getItem(CRM_SESSION_STORAGE_KEY) ||
  '';

export const setCrmToken = (token, persist = true) => {
  if (!token) return;

  if (persist) {
    localStorage.setItem(CRM_TOKEN_STORAGE_KEY, token);
    sessionStorage.removeItem(CRM_SESSION_STORAGE_KEY);
    return;
  }

  sessionStorage.setItem(CRM_SESSION_STORAGE_KEY, token);
  localStorage.removeItem(CRM_TOKEN_STORAGE_KEY);
};

export const clearCrmToken = () => {
  localStorage.removeItem(CRM_TOKEN_STORAGE_KEY);
  sessionStorage.removeItem(CRM_SESSION_STORAGE_KEY);
};
