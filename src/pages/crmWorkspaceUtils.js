export const normalizeText = (value, fallback = '') => {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
};

export const uniqueValues = (values = []) => Array.from(new Set(values.filter(Boolean)));

export const normalizeNumber = (value, fallback = 0) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number(String(value ?? '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const formatMoney = (value = 0) =>
  `$${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export const formatDate = (value, fallback = 'Not set') => {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const formatDateTime = (value, fallback = 'Not set') => {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

export const toDateKey = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
};

export const toLocalInput = (value) => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
};

export const toIsoFromLocalInput = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
};

export const daysBetween = (from, to = new Date()) => {
  const start = from instanceof Date ? from : new Date(from);
  const end = to instanceof Date ? to : new Date(to);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  const diff = end.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

const normalizeBranchName = (branch = {}) =>
  normalizeText(branch?.name || branch?.branchName || branch?.locationName || branch?.title || branch?.label);

const normalizeBranchId = (branch = {}) =>
  normalizeText(branch?.id || branch?._id || branch?.branchId || branch?.locationId || branch?.key).toLowerCase();

export const buildBranchLookup = (branches = []) => {
  const lookup = new Map();
  const names = new Set();

  branches.forEach((branch) => {
    const name = normalizeBranchName(branch);
    const id = normalizeBranchId(branch);

    if (name) {
      names.add(name);
      if (id) lookup.set(id, name);
      lookup.set(name.toLowerCase(), name);
    }
  });

  return {
    lookup,
    options: uniqueValues(['All Branches', ...names]),
  };
};

export const resolveBranchName = (record = {}, branchLookup = new Map()) => {
  const direct = normalizeBranchName({
    name: record.branchName,
    branchName: record.branchName,
    locationName: record.locationName,
    title: record.title,
    label: record.branchLabel,
  });
  if (direct) return direct;

  const branchField = normalizeText(record.branch || record.location || record.site || record.branchId || record.locationId || record.branchKey).toLowerCase();
  if (branchField && branchLookup.has(branchField)) {
    return branchLookup.get(branchField);
  }

  return '';
};

export const collectOptionValues = (records = [], keys = []) =>
  uniqueValues(
    records.flatMap((record) =>
      keys.map((key) => normalizeText(record?.[key])).filter(Boolean),
    ),
  );
