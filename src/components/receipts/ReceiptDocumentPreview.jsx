import ReceiptStatusBadge from './ReceiptStatusBadge';

const formatMoney = (value) =>
  `$${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const ReceiptDocumentPreview = ({ receipt, formatDateTime }) => {
  if (!receipt) return null;

  const lineItems = Array.isArray(receipt.lineItems) && receipt.lineItems.length > 0 ? receipt.lineItems : [];

  return (
    <article className="crm-receipts-preview-card">
      <header className="crm-receipts-preview-head">
        <div className="crm-receipts-preview-brand">
          <div className="crm-receipts-preview-mark" aria-hidden="true">
            {receipt.logoInitials || 'RS'}
          </div>
          <div>
            <p>{receipt.businessName || 'Receipt'}</p>
            <h3>{receipt.branchName || 'Main Branch'}</h3>
            {receipt.receiptQuote ? <span>{receipt.receiptQuote}</span> : null}
          </div>
        </div>

        <div className="crm-receipts-preview-status">
          <ReceiptStatusBadge status={receipt.receiptStatus || 'Pending'} />
          <ReceiptStatusBadge status={receipt.paymentStatus || 'Pending'} compact />
        </div>
      </header>

      <div className="crm-receipts-preview-contact">
        <div>
          <p>Business</p>
          <strong>{receipt.businessLegalName || receipt.businessName || 'Premium Spa'}</strong>
        </div>
        <div>
          <p>Address</p>
          <strong>{receipt.businessAddress || '-'}</strong>
        </div>
        <div>
          <p>Contact</p>
          <strong>
            {receipt.businessPhone || '-'}
            {receipt.businessEmail ? ` | ${receipt.businessEmail}` : ''}
          </strong>
        </div>
        {receipt.businessWebsite ? (
          <div>
            <p>Website</p>
            <strong>{receipt.businessWebsite}</strong>
          </div>
        ) : null}
      </div>

      <section className="crm-receipts-preview-meta">
        <article>
          <p>Receipt Number</p>
          <strong>{receipt.receiptNumber || 'Pending'}</strong>
        </article>
        <article>
          <p>Receipt Date</p>
          <strong>{formatDateTime(receipt.issuedAt || receipt.paymentDate)}</strong>
        </article>
        <article>
          <p>Cashier</p>
          <strong>{receipt.cashierName || receipt.generatedBy || 'Front Desk'}</strong>
        </article>
        <article>
          <p>Customer</p>
          <strong>{receipt.customerName || 'Guest'}</strong>
        </article>
        <article>
          <p>Customer Phone</p>
          <strong>{receipt.customerPhone || 'Not available'}</strong>
        </article>
        <article>
          <p>Appointment</p>
          <strong>{receipt.appointmentId || 'Unlinked'}</strong>
        </article>
        <article>
          <p>Checkout</p>
          <strong>{receipt.checkoutId || 'Unlinked'}</strong>
        </article>
        <article>
          <p>Payment Method</p>
          <strong>{receipt.method || 'Cash'}</strong>
        </article>
      </section>

      <section className="crm-receipts-preview-items">
        <header className="crm-receipts-preview-section-head">
          <div>
            <p>Itemized Receipt</p>
            <h4>Services and add-ons included in this checkout</h4>
          </div>
          <span>{lineItems.length} line{lineItems.length === 1 ? '' : 's'}</span>
        </header>

        <div className="crm-receipts-preview-items-head">
          <span>Item</span>
          <span>Qty</span>
          <span>Unit</span>
          <span>Discount</span>
          <span>Subtotal</span>
        </div>

        <div className="crm-receipts-preview-items-list">
          {(lineItems.length > 0
            ? lineItems
            : [
                {
                  name: receipt.serviceName || 'Spa Service',
                  category: 'Service',
                  quantity: 1,
                  unitPrice: receipt.totalAmount || 0,
                  discountAmount: 0,
                  subtotal: receipt.totalAmount || 0,
                },
              ]
          ).map((item, index) => (
            <article className="crm-receipts-preview-item" key={`${item.name}-${index}`}>
              <div>
                <strong>{item.name}</strong>
                <span>{item.category || 'Service'}</span>
              </div>
              <p>{item.quantity}</p>
              <p>{formatMoney(item.unitPrice)}</p>
              <p>{formatMoney(item.discountAmount || 0)}</p>
              <p>{formatMoney(item.subtotal || 0)}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="crm-receipts-preview-totals">
        <div className="crm-receipts-preview-totals-grid">
          <article>
            <p>Subtotal</p>
            <strong>{formatMoney(receipt.subtotal || 0)}</strong>
          </article>
          <article>
            <p>Discount</p>
            <strong>{formatMoney(receipt.discountAmount || 0)}</strong>
          </article>
          <article>
            <p>Tax</p>
            <strong>{formatMoney(receipt.taxAmount || 0)}</strong>
          </article>
          <article className="crm-receipts-preview-totals-strong">
            <p>Total</p>
            <strong>{formatMoney(receipt.totalAmount || 0)}</strong>
          </article>
          <article>
            <p>Amount Received</p>
            <strong>{formatMoney(receipt.amountReceived || 0)}</strong>
          </article>
          <article className={receipt.balanceRemaining > 0 ? 'crm-receipts-preview-totals-alert' : ''}>
            <p>Balance Remaining</p>
            <strong>{formatMoney(receipt.balanceRemaining || 0)}</strong>
          </article>
        </div>

        <div className="crm-receipts-preview-delivery">
          <article>
            <p>Receipt Status</p>
            <strong>{receipt.receiptStatus || 'Pending'}</strong>
          </article>
          <article>
            <p>Payment Status</p>
            <strong>{receipt.paymentStatus || 'Pending'}</strong>
          </article>
          <article>
            <p>Delivery State</p>
            <strong>
              {[
                receipt.printedAt ? 'Printed' : null,
                receipt.emailedAt ? 'Emailed' : null,
                receipt.downloadedAt ? 'Downloaded' : null,
              ]
                .filter(Boolean)
                .join(' | ') || 'Pending'}
            </strong>
          </article>
        </div>
      </section>

      <footer className="crm-receipts-preview-footer">
        <strong>Thank you for visiting {receipt.businessName || 'our spa'}.</strong>
        <p>{receipt.receiptQuote || 'We appreciate your trust and look forward to welcoming you again.'}</p>
        <span>
          {receipt.notes || 'Receipt data is controlled and linked to the finalized payment record.'}
        </span>
      </footer>
    </article>
  );
};

export default ReceiptDocumentPreview;


