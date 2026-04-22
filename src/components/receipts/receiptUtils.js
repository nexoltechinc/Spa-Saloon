import { defaultReceiptSettings } from '../../config/receiptSettings';

const parseMoney = (value) => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const numeric = Number(value.replace(/[^0-9.-]/g, ''));
    return Number.isNaN(numeric) ? 0 : numeric;
  }
  return 0;
};

export const formatMoney = (value) =>
  `$${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export const formatDate = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const formatDateTime = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

export const toDateKey = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const normalizeKey = (value) => String(value || '').trim().toLowerCase();

export const deriveReceiptNumber = (paymentId, index = 0) =>
  `RCT-${String(paymentId || `LOCAL-${index + 1}`)
    .replace(/[^A-Za-z0-9]/g, '')
    .slice(-8)
    .padStart(8, '0')
    .toUpperCase()}`;

export const getReceiptStatusTone = (status = '') => {
  const normalized = String(status).toLowerCase();

  if (['generated', 'issued', 'printed', 'emailed', 'downloaded', 'paid'].includes(normalized)) return 'good';
  if (['partial', 'pending', 'receipt pending', 'receipt generated'].includes(normalized)) return 'warning';
  if (['overdue', 'void', 'cancelled', 'refunded', 'unpaid'].includes(normalized)) return 'alert';
  return 'neutral';
};

export const getDaysOverdue = (dueDate, balanceRemaining) => {
  if (balanceRemaining <= 0) return 0;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(dueDate || now);
  due.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((now.getTime() - due.getTime()) / 86400000));
};

export const getAgingBucket = (daysOverdue, balanceRemaining) => {
  if (balanceRemaining <= 0) return 'Current';
  if (daysOverdue === 0) return 'Due Today';
  if (daysOverdue <= 3) return '1-3 Days Overdue';
  if (daysOverdue <= 7) return '4-7 Days Overdue';
  return '8+ Days Overdue';
};

export const normalizeReceiptStatus = (payment = {}, delivery = {}) => {
  const raw = String(payment.receiptStatus || '').trim();
  const mapped = {
    issued: 'Generated',
    generated: 'Generated',
    pending: 'Pending',
    'not issued': 'Pending',
    'receipt generated': 'Generated',
    'receipt pending': 'Pending',
    printed: 'Printed',
    emailed: 'Emailed',
    downloaded: 'Downloaded',
    cancelled: 'Cancelled',
    canceled: 'Cancelled',
    void: 'Void',
    refunded: 'Refunded',
  };

  if (raw) {
    const normalized = mapped[raw.toLowerCase()];
    if (normalized) return normalized;
    return raw;
  }

  if (delivery.emailedAt) return 'Emailed';
  if (delivery.printedAt) return 'Printed';
  if (delivery.downloadedAt) return 'Downloaded';
  if (delivery.receiptGenerated) return 'Generated';
  return 'Pending';
};

export const buildReceiptBranding = (settings = defaultReceiptSettings) => {
  const profile = settings.profile || defaultReceiptSettings.profile;
  const branding = settings.branding || defaultReceiptSettings.branding || {};
  const businessName =
    profile.receiptDisplayName || profile.businessName || defaultReceiptSettings.profile.businessName;
  const branchName = profile.branchName || profile.locationName || 'Main Branch';
  const logoInitials = businessName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return {
    businessName,
    branchName,
    legalName: profile.legalName || '',
    contactEmail: profile.publicBookingEmail || profile.contactEmail || '',
    contactPhone: profile.publicBookingPhone || profile.contactPhone || '',
    address: profile.address || '',
    website: profile.website || '',
    taxId: profile.taxId || '',
    receiptQuote:
      branding.receiptHeaderQuote || settings.receiptQuote || defaultReceiptSettings.receiptQuote,
    receiptFooterText:
      branding.receiptFooterText ||
      settings.receiptFooterText ||
      defaultReceiptSettings.receiptFooterText,
    receiptNumberPrefix: branding.receiptNumberPrefix || 'RCT-',
    brandingLayout: branding.logoPlacement || settings.brandingLayout || defaultReceiptSettings.brandingLayout,
    logoPlacement: branding.logoPlacement || settings.brandingLayout || defaultReceiptSettings.brandingLayout,
    logoSize: branding.logoSize || 'medium',
    showAddressOnReceipt:
      branding.showAddressOnReceipt ?? defaultReceiptSettings.branding?.showAddressOnReceipt ?? true,
    showPhoneOnReceipt:
      branding.showPhoneOnReceipt ?? defaultReceiptSettings.branding?.showPhoneOnReceipt ?? true,
    showEmailOnReceipt:
      branding.showEmailOnReceipt ?? defaultReceiptSettings.branding?.showEmailOnReceipt ?? true,
    showWebsiteOnReceipt:
      branding.showWebsiteOnReceipt ?? defaultReceiptSettings.branding?.showWebsiteOnReceipt ?? false,
    showTaxIdOnReceipt:
      branding.showTaxIdOnReceipt ?? defaultReceiptSettings.branding?.showTaxIdOnReceipt ?? false,
    taxDisplayMode: branding.taxDisplayMode || 'Included',
    includeSocialHandles: Boolean(branding.includeSocialHandles ?? settings.includeSocialHandles),
    logoInitials: logoInitials || 'RS',
  };
};

const normalizeLineItem = (item = {}, fallback = {}) => {
  const quantity = Math.max(1, Number(item.quantity || 1));
  const unitPrice = parseMoney(item.unitPrice ?? item.price ?? fallback.unitPrice ?? 0);
  const discountAmount = parseMoney(item.discountAmount ?? item.discount ?? 0);
  const subtotalFromPayload = item.subtotal !== undefined ? parseMoney(item.subtotal) : null;
  const subtotal = subtotalFromPayload !== null ? subtotalFromPayload : Math.max(unitPrice * quantity - discountAmount, 0);

  return {
    name: item.name || item.serviceName || item.productName || fallback.name || 'Service',
    category: item.category || item.type || fallback.category || 'Service',
    quantity,
    unitPrice,
    discountAmount,
    subtotal,
    note: item.note || item.description || '',
  };
};

const buildFallbackLineItems = (payment = {}, serviceCatalog = []) => {
  const matchedService = serviceCatalog.find((service) =>
    normalizeKey(service.name) === normalizeKey(payment.serviceName),
  );

  const basePrice = parseMoney(
    payment.totalAmount ??
      payment.amountDue ??
      payment.total ??
      matchedService?.price ??
      payment.amountPaid ??
      0,
  );

  return [
    normalizeLineItem(
      {
        name: payment.serviceName || matchedService?.name || 'Spa Service',
        category: 'Service',
        quantity: 1,
        unitPrice: basePrice,
        subtotal: basePrice,
      },
      { name: payment.serviceName || 'Spa Service', category: 'Service', unitPrice: basePrice },
    ),
  ];
};

export const buildReceiptLineItems = (payment = {}, serviceCatalog = []) => {
  const rawItems = Array.isArray(payment.items)
    ? payment.items
    : Array.isArray(payment.lineItems)
      ? payment.lineItems
      : [];

  if (rawItems.length > 0) {
    return rawItems.map((item) =>
      normalizeLineItem(item, {
        name: payment.serviceName || 'Service',
        category: 'Service',
      }),
    );
  }

  return buildFallbackLineItems(payment, serviceCatalog);
};

const buildCustomerLookup = (lookups = {}, payment = {}) => {
  const directCustomer = lookups.customerById?.get(payment.customerId) || null;
  const byName = lookups.customerByName?.get(normalizeKey(payment.customerName)) || null;
  return directCustomer || byName || null;
};

const buildAppointmentLookup = (lookups = {}, payment = {}) => {
  return lookups.appointmentById?.get(payment.appointmentId) || null;
};

export const buildReceiptPreview = (payment = {}, lookups = {}, branding = buildReceiptBranding()) => {
  const customer = buildCustomerLookup(lookups, payment);
  const appointment = buildAppointmentLookup(lookups, payment);
  const serviceCatalog = lookups.serviceCatalog || [];
  const lineItems = buildReceiptLineItems(payment, serviceCatalog);
  const subtotalFromLines = lineItems.reduce((sum, item) => sum + parseMoney(item.subtotal), 0);
  const discountAmount = parseMoney(payment.discountAmount ?? payment.discount ?? 0);
  const taxAmount = parseMoney(payment.taxAmount ?? payment.tax ?? 0);
  const subtotal = payment.subtotal !== undefined ? parseMoney(payment.subtotal) : subtotalFromLines;
  const totalAmount = payment.totalAmount !== undefined
    ? parseMoney(payment.totalAmount)
    : Math.max(subtotal - discountAmount + taxAmount, 0);
  const amountReceived = parseMoney(payment.amountPaid ?? payment.amountReceived ?? payment.paidAmount ?? 0);
  const balanceRemaining = payment.balanceRemaining !== undefined
    ? parseMoney(payment.balanceRemaining)
    : Math.max(totalAmount - amountReceived, 0);
  const dueDate = payment.dueDate || payment.paymentDate || payment.createdAt || new Date().toISOString();
  const daysOverdue = getDaysOverdue(dueDate, balanceRemaining);
  const printedAt = payment.receiptPrintedAt || '';
  const emailedAt = payment.receiptEmailedAt || '';
  const downloadedAt = payment.receiptDownloadedAt || '';
  const receiptGenerated = Boolean(payment.receiptGenerated) || Boolean(payment.receiptNumber) || amountReceived > 0;
  const receiptStatus = normalizeReceiptStatus(payment, {
    printedAt,
    emailedAt,
    downloadedAt,
    receiptGenerated,
  });

  return {
    id: payment.id || payment.paymentId || `receipt-${Date.now()}`,
    receiptId: payment.linkedReceiptId || `receipt-${String(payment.id || payment.paymentId || Date.now()).toLowerCase()}`,
    receiptNumber: payment.receiptNumber || deriveReceiptNumber(payment.id || payment.paymentId),
    receiptStatus,
    receiptStatusTone: getReceiptStatusTone(receiptStatus),
    paymentStatus: payment.displayStatus || payment.status || (balanceRemaining > 0 ? (amountReceived > 0 ? 'Partial' : 'Unpaid') : 'Paid'),
    paymentId: payment.id || payment.paymentId || '',
    checkoutId: payment.checkoutId || payment.checkoutNumber || appointment?.checkoutId || appointment?.id || '',
    appointmentId: payment.appointmentId || appointment?.id || '',
    customerId: payment.customerId || customer?.id || '',
    customerName: customer?.name || payment.customerName || 'Guest',
    customerPhone: customer?.phone || payment.customerPhone || '',
    customerEmail: customer?.email || payment.customerEmail || '',
    businessName: branding.businessName,
    branchName: payment.branchName || appointment?.branchName || branding.branchName || 'Main Branch',
    businessLegalName: branding.legalName,
    businessEmail: branding.contactEmail,
    businessPhone: branding.contactPhone,
    businessAddress: branding.address,
    businessWebsite: branding.website,
    businessTaxId: branding.taxId,
    showAddressOnReceipt: branding.showAddressOnReceipt,
    showPhoneOnReceipt: branding.showPhoneOnReceipt,
    showEmailOnReceipt: branding.showEmailOnReceipt,
    showWebsiteOnReceipt: branding.showWebsiteOnReceipt,
    showTaxIdOnReceipt: branding.showTaxIdOnReceipt,
    receiptFooterText: branding.receiptFooterText,
    logoInitials: branding.logoInitials,
    brandingLayout: branding.brandingLayout,
    receiptQuote: branding.receiptQuote,
    generatedBy: payment.recordedBy || payment.cashier || payment.createdBy || 'Front Desk',
    cashierName: payment.recordedBy || payment.cashier || 'Front Desk',
    method: payment.method || payment.paymentMethod || 'Cash',
    paymentDate: payment.paymentDate || payment.createdAt || payment.issuedAt || new Date().toISOString(),
    dueDate,
    issuedAt: payment.receiptGeneratedAt || payment.paymentDate || payment.createdAt || new Date().toISOString(),
    printedAt,
    emailedAt,
    downloadedAt,
    lineItems,
    subtotal,
    discountAmount,
    taxAmount,
    totalAmount,
    amountReceived,
    balanceRemaining,
    daysOverdue,
    agingBucket: getAgingBucket(daysOverdue, balanceRemaining),
    followUp: payment.followUp || {},
    notes: payment.notes || '',
    deliveryState: {
      printed: Boolean(printedAt),
      emailed: Boolean(emailedAt),
      downloaded: Boolean(downloadedAt),
      generated: receiptGenerated,
    },
    appointmentSummary: appointment || null,
  };
};

const escapeHtml = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

export const buildPrintableReceiptMarkup = (receipt) => {
  const lineItems = Array.isArray(receipt?.lineItems) && receipt.lineItems.length > 0
    ? receipt.lineItems
    : [
        {
          name: receipt?.serviceName || 'Service',
          category: 'Service',
          quantity: 1,
          unitPrice: receipt?.totalAmount || 0,
          discountAmount: 0,
          subtotal: receipt?.totalAmount || 0,
        },
      ];

  const lineRows = lineItems
    .map(
      (item) => `
        <tr>
          <td>
            <strong>${escapeHtml(item.name)}</strong>
            <span>${escapeHtml(item.category || 'Service')}</span>
          </td>
          <td>${escapeHtml(item.quantity)}</td>
          <td>${formatMoney(item.unitPrice)}</td>
          <td>${formatMoney(item.discountAmount || 0)}</td>
          <td>${formatMoney(item.subtotal || 0)}</td>
        </tr>
      `,
    )
    .join('');

  return `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${escapeHtml(receipt?.receiptNumber || 'Receipt')}</title>
        <style>
          :root {
            color-scheme: light;
          }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 24px;
            background: linear-gradient(180deg, #faf7f1 0%, #f3eee4 100%);
            color: #302822;
            font-family: Manrope, Arial, sans-serif;
          }
          .sheet {
            max-width: 780px;
            margin: 0 auto;
            background: #fffdf8;
            border: 1px solid rgba(132, 121, 95, 0.18);
            border-radius: 24px;
            box-shadow: 0 20px 40px rgba(56, 43, 15, 0.08);
            overflow: hidden;
          }
          .sheet-head {
            display: flex;
            justify-content: space-between;
            gap: 20px;
            padding: 28px 28px 18px;
            border-bottom: 1px solid rgba(132, 121, 95, 0.12);
          }
          .brand {
            display: flex;
            gap: 14px;
            align-items: center;
          }
          .mark {
            width: 52px;
            height: 52px;
            border-radius: 18px;
            display: grid;
            place-items: center;
            background: linear-gradient(135deg, #8d721f 0%, #c1a350 100%);
            color: #fff;
            font-weight: 800;
            letter-spacing: 0.08em;
          }
          .brand p {
            margin: 0;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.18em;
            color: #a18445;
            font-weight: 800;
          }
          .brand h1 {
            margin: 4px 0 0;
            font-family: 'Playfair Display', Georgia, serif;
            font-size: 24px;
            font-weight: 400;
          }
          .brand span {
            display: block;
            margin-top: 3px;
            color: #6f6658;
            font-size: 13px;
          }
          .meta {
            text-align: right;
          }
          .meta strong {
            display: block;
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.16em;
            color: #a18445;
            margin-bottom: 4px;
          }
          .meta p {
            margin: 0;
            color: #635b50;
            font-size: 13px;
          }
          .panel {
            padding: 22px 28px;
            border-bottom: 1px solid rgba(132, 121, 95, 0.1);
          }
          .panel h2 {
            margin: 0 0 12px;
            font-family: 'Playfair Display', Georgia, serif;
            font-size: 20px;
            font-weight: 400;
          }
          .summary {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 12px;
          }
          .summary article {
            background: #fbf7ef;
            border-radius: 16px;
            border: 1px solid rgba(132, 121, 95, 0.12);
            padding: 12px 14px;
          }
          .summary p,
          .summary span,
          .summary strong {
            display: block;
            margin: 0;
          }
          .summary p {
            color: #958a76;
            text-transform: uppercase;
            letter-spacing: 0.12em;
            font-size: 10px;
            font-weight: 800;
          }
          .summary strong {
            margin-top: 5px;
            font-size: 14px;
            color: #302822;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          thead th {
            text-align: left;
            font-size: 11px;
            letter-spacing: 0.14em;
            text-transform: uppercase;
            color: #978a75;
            padding: 0 0 10px;
            border-bottom: 1px solid rgba(132, 121, 95, 0.12);
          }
          tbody td {
            padding: 14px 0;
            vertical-align: top;
            border-bottom: 1px solid rgba(132, 121, 95, 0.08);
            font-size: 14px;
          }
          tbody td span {
            display: block;
            margin-top: 4px;
            color: #877c6b;
            font-size: 12px;
          }
          .totals {
            margin-top: 12px;
            margin-left: auto;
            width: min(100%, 340px);
            display: grid;
            gap: 10px;
          }
          .totals article {
            display: flex;
            justify-content: space-between;
            gap: 20px;
            align-items: center;
            padding: 10px 0;
            border-bottom: 1px solid rgba(132, 121, 95, 0.08);
          }
          .totals article:last-child {
            border-bottom: 0;
          }
          .totals p {
            margin: 0;
            color: #847965;
            text-transform: uppercase;
            letter-spacing: 0.12em;
            font-size: 10px;
            font-weight: 800;
          }
          .totals strong {
            margin: 0;
            font-size: 15px;
          }
          .footer {
            padding: 18px 28px 26px;
            color: #645b4d;
            font-size: 13px;
          }
          .footer strong {
            display: block;
            margin-bottom: 8px;
            color: #2f2a24;
            font-size: 15px;
          }
          @media print {
            body {
              padding: 0;
              background: #fff;
            }
            .sheet {
              border: 0;
              box-shadow: none;
              border-radius: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="sheet">
          <header class="sheet-head">
            <div class="brand">
              <div class="mark">${escapeHtml(receipt?.logoInitials || 'RS')}</div>
              <div>
                <p>${escapeHtml(receipt?.businessName || 'Receipt')}</p>
                <h1>${escapeHtml(receipt?.branchName || 'Main Branch')}</h1>
                ${receipt?.showAddressOnReceipt && receipt?.businessAddress ? `<span>${escapeHtml(receipt.businessAddress || '')}</span>` : ''}
                ${[
                  receipt?.showPhoneOnReceipt && receipt?.businessPhone ? escapeHtml(receipt.businessPhone) : '',
                  receipt?.showEmailOnReceipt && receipt?.businessEmail ? escapeHtml(receipt.businessEmail) : '',
                  receipt?.showWebsiteOnReceipt && receipt?.businessWebsite ? escapeHtml(receipt.businessWebsite) : '',
                  receipt?.showTaxIdOnReceipt && receipt?.businessTaxId ? escapeHtml(receipt.businessTaxId) : '',
                ].filter(Boolean).length
                  ? `<span>${[
                      receipt?.showPhoneOnReceipt && receipt?.businessPhone ? escapeHtml(receipt.businessPhone) : '',
                      receipt?.showEmailOnReceipt && receipt?.businessEmail ? escapeHtml(receipt.businessEmail) : '',
                      receipt?.showWebsiteOnReceipt && receipt?.businessWebsite ? escapeHtml(receipt.businessWebsite) : '',
                      receipt?.showTaxIdOnReceipt && receipt?.businessTaxId ? escapeHtml(receipt.businessTaxId) : '',
                    ]
                      .filter(Boolean)
                      .join(' | ')}</span>`
                  : ''}
              </div>
            </div>
            <div class="meta">
              <strong>Receipt ${escapeHtml(receipt?.receiptNumber || '')}</strong>
              <p>${escapeHtml(formatDateTime(receipt?.issuedAt || receipt?.paymentDate || new Date().toISOString()))}</p>
              <p>${escapeHtml(receipt?.receiptStatus || 'Pending')}</p>
            </div>
          </header>
          <section class="panel">
            <h2>Transaction Summary</h2>
            <div class="summary">
              <article><p>Customer</p><strong>${escapeHtml(receipt?.customerName || 'Guest')}</strong></article>
              <article><p>Payment ID</p><strong>${escapeHtml(receipt?.paymentId || '-')}</strong></article>
              <article><p>Appointment</p><strong>${escapeHtml(receipt?.appointmentId || '-')}</strong></article>
            </div>
          </section>
          <section class="panel">
            <h2>Itemized Services</h2>
            <table>
              <thead>
                <tr>
                  <th style="width:40%">Item</th>
                  <th>Qty</th>
                  <th>Unit</th>
                  <th>Discount</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${lineRows}
              </tbody>
            </table>
            <div class="totals">
              <article><p>Subtotal</p><strong>${formatMoney(receipt?.subtotal || 0)}</strong></article>
              <article><p>Discount</p><strong>${formatMoney(receipt?.discountAmount || 0)}</strong></article>
              <article><p>Tax</p><strong>${formatMoney(receipt?.taxAmount || 0)}</strong></article>
              <article><p>Total</p><strong>${formatMoney(receipt?.totalAmount || 0)}</strong></article>
              <article><p>Received</p><strong>${formatMoney(receipt?.amountReceived || 0)}</strong></article>
              <article><p>Balance</p><strong>${formatMoney(receipt?.balanceRemaining || 0)}</strong></article>
            </div>
          </section>
          <footer class="footer">
            <strong>Thank you for visiting ${escapeHtml(receipt?.businessName || 'our spa')}.</strong>
            <div>${escapeHtml(
              receipt?.receiptFooterText ||
                receipt?.receiptQuote ||
                'We appreciate your trust and look forward to welcoming you again.',
            )}</div>
          </footer>
        </div>
      </body>
    </html>
  `;
};



