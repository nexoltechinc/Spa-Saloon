import ReceiptStatusBadge from './ReceiptStatusBadge';

const ReceiptHistoryList = ({
  receipts,
  selectedReceiptId,
  onSelectReceipt,
  onAction,
  scopeLabel,
  onToggleScope,
  scopeActive,
  formatDateTime,
  formatMoney,
}) => {
  return (
    <section className="crm-receipts-panel crm-receipts-history-panel">
      <header className="crm-receipts-panel-head crm-receipts-history-head">
        <div>
          <p className="crm-receipts-kicker">Receipt History</p>
          <h3>{scopeLabel || 'Recent Receipts'}</h3>
        </div>
        <div className="crm-receipts-history-controls">
          {onToggleScope ? (
            <button
              type="button"
              className={`crm-receipts-chip${scopeActive ? ' crm-receipts-chip-active' : ''}`}
              onClick={onToggleScope}
            >
              {scopeActive ? 'Customer Scope' : 'All Receipts'}
            </button>
          ) : null}
          <strong>{receipts.length}</strong>
        </div>
      </header>

      {receipts.length === 0 ? (
        <p className="crm-receipts-history-empty">
          No receipts match the current selection. Try broadening the filter or switch back to all receipts.
        </p>
      ) : (
        <div className="crm-receipts-history-list">
          {receipts.map((receipt) => {
            const isSelected = receipt.id === selectedReceiptId;

            return (
              <article
                key={receipt.id}
                className={`crm-receipts-history-item${isSelected ? ' crm-receipts-history-item-active' : ''}`}
                onClick={() => onSelectReceipt(receipt)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelectReceipt(receipt);
                  }
                }}
              >
                <div className="crm-receipts-history-item-main">
                  <div>
                    <strong>{receipt.receiptNumber || 'Pending receipt'}</strong>
                    <span>{receipt.customerName || 'Guest'}</span>
                  </div>
                  <div className="crm-receipts-history-item-amount">
                    <strong>{formatMoney(receipt.totalAmount || receipt.amountReceived || 0)}</strong>
                    <span>{formatDateTime(receipt.issuedAt || receipt.paymentDate)}</span>
                  </div>
                </div>

                <div className="crm-receipts-history-item-sub">
                  <span>
                    {receipt.paymentId || 'Unlinked payment'} | {receipt.method || 'Cash'}
                  </span>
                  <span>{receipt.checkoutId || receipt.appointmentId || 'No checkout reference'}</span>
                </div>

                <div className="crm-receipts-history-item-badges">
                  <ReceiptStatusBadge status={receipt.receiptStatus || 'Pending'} />
                  <ReceiptStatusBadge status={receipt.paymentStatus || 'Pending'} compact />
                  {receipt.printedAt ? <ReceiptStatusBadge status="Printed" compact /> : null}
                  {receipt.emailedAt ? <ReceiptStatusBadge status="Emailed" compact /> : null}
                  {receipt.downloadedAt ? <ReceiptStatusBadge status="Downloaded" compact /> : null}
                </div>

                <div
                  className="crm-receipts-history-item-actions"
                  onClick={(event) => event.stopPropagation()}
                >
                  <button type="button" className="crm-payments-ghost-btn" onClick={() => onAction('openPayment', receipt)}>
                    Open Payment
                  </button>
                  <button type="button" className="crm-payments-secondary-btn" onClick={() => onAction('print', receipt)}>
                    Print
                  </button>
                  <button type="button" className="crm-payments-secondary-btn" onClick={() => onAction('download', receipt)}>
                    Download
                  </button>
                  <button type="button" className="crm-payments-primary-btn" onClick={() => onAction('email', receipt)}>
                    Email
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default ReceiptHistoryList;


