const formatMoney = (value) =>
  `$${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDateTime = (value) =>
  new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

const ReceiptPreviewPanel = ({ receipt }) => {
  if (!receipt) return null;

  return (
    <article className="crm-receipt-preview-panel">
      <header className="crm-receipt-preview-brand">
        <div>
          <p>{receipt.tenantName}</p>
          <h4>{receipt.tenantTagline}</h4>
          {receipt.receiptQuote ? <span className="crm-receipt-preview-quote">"{receipt.receiptQuote}"</span> : null}
        </div>
        <span className={`crm-receipt-status crm-receipt-status-${receipt.statusTone}`}>
          {receipt.status}
        </span>
      </header>

      {(receipt.companyLegalName ||
        receipt.companyEmail ||
        receipt.companyPhone ||
        receipt.companyAddress ||
        (receipt.companyWebsite && receipt.includeSocialHandles)) ? (
        <div className="crm-receipt-preview-company">
          {receipt.companyLegalName ? <p><strong>Legal:</strong> {receipt.companyLegalName}</p> : null}
          {receipt.companyEmail ? <p><strong>Email:</strong> {receipt.companyEmail}</p> : null}
          {receipt.companyPhone ? <p><strong>Phone:</strong> {receipt.companyPhone}</p> : null}
          {receipt.companyAddress ? <p><strong>Address:</strong> {receipt.companyAddress}</p> : null}
          {receipt.companyWebsite && receipt.includeSocialHandles ? <p><strong>Website:</strong> {receipt.companyWebsite}</p> : null}
        </div>
      ) : null}

      <div className="crm-receipt-preview-grid">
        <div>
          <p>Receipt No.</p>
          <strong>{receipt.number}</strong>
        </div>
        <div>
          <p>Issued</p>
          <strong>{formatDateTime(receipt.issuedAt)}</strong>
        </div>
        <div>
          <p>Payment ID</p>
          <strong>{receipt.paymentId}</strong>
        </div>
        <div>
          <p>Method</p>
          <strong>{receipt.method}</strong>
        </div>
        <div>
          <p>Customer</p>
          <strong>{receipt.customerName}</strong>
        </div>
        <div>
          <p>Appointment</p>
          <strong>{receipt.appointmentId || 'Unlinked'}</strong>
        </div>
      </div>

      <div className="crm-receipt-preview-line">
        <div>
          <p>Service</p>
          <strong>{receipt.serviceName}</strong>
        </div>
        <div>
          <p>Amount Due</p>
          <strong>{formatMoney(receipt.amountDue)}</strong>
        </div>
        <div>
          <p>Amount Paid</p>
          <strong>{formatMoney(receipt.amountPaid)}</strong>
        </div>
      </div>

      <footer className="crm-receipt-preview-total">
        <div>
          <p>Balance Remaining</p>
          <strong>{formatMoney(receipt.balanceRemaining)}</strong>
        </div>
        <div>
          <p>Total Captured</p>
          <strong>{formatMoney(receipt.amountPaid)}</strong>
        </div>
      </footer>
    </article>
  );
};

export default ReceiptPreviewPanel;
