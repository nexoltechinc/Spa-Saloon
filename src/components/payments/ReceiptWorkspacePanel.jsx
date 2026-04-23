import ReceiptPreviewPanel from '../ReceiptPreviewPanel';
import PaymentStatusBadge from './PaymentStatusBadge';

const formatMoney = (value) =>
  `$${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const ReceiptWorkspacePanel = ({
  selectedPayment,
  activeReceipt,
  recentReceipts,
  isReceiptBusy,
  onGenerateReceipt,
  onPrintReceipt,
  onDownloadReceipt,
  onEmailReceipt,
  onOpenCustomer,
  onOpenAppointment,
  onOpenReceiptHistory,
  onStartReceipt,
  receiptNotice,
  receiptError,
  loadError,
  formatDateTime,
}) => {
  const receiptStatus = selectedPayment?.receiptGenerated ? 'Receipt Generated' : 'Receipt Pending';

  return (
    <aside className="crm-payments-detail-card">
      <div className="crm-payments-detail-head">
        <p className="crm-payments-kicker">Receipt Workspace</p>
        <h3>{selectedPayment ? selectedPayment.customerName : 'Select a payment'}</h3>
        <p>
          {selectedPayment
            ? `${selectedPayment.id} - ${selectedPayment.appointmentId || 'Unlinked appointment'}`
            : 'Choose a payment row to manage receipts, then print, download, or email instantly.'}
        </p>
      </div>

      {loadError ? <p className="crm-payments-form-error">{loadError}</p> : null}
      {receiptNotice ? <p className="crm-receipt-notice">{receiptNotice}</p> : null}
      {receiptError ? <p className="crm-receipt-error">{receiptError}</p> : null}

      {selectedPayment ? (
        <>
          <section className="crm-receipt-workspace-summary">
            <header>
              <p>Receipt Workspace Header</p>
              <div className="crm-payment-status-stack">
                <PaymentStatusBadge status={selectedPayment.displayStatus} />
                <PaymentStatusBadge status={receiptStatus} />
              </div>
            </header>
            <div className="crm-receipt-workspace-grid">
              <div>
                <p>Customer</p>
                <strong>{selectedPayment.customerName}</strong>
              </div>
              <div>
                <p>Branch</p>
                <strong>{selectedPayment.branchName || 'Unassigned'}</strong>
              </div>
              <div>
                <p>Appointment</p>
                <strong>{selectedPayment.appointmentId || 'Unlinked'}</strong>
              </div>
              <div>
                <p>Amount Paid</p>
                <strong>{formatMoney(selectedPayment.amountPaid)}</strong>
              </div>
              <div>
                <p>Balance</p>
                <strong>{formatMoney(selectedPayment.balanceRemaining)}</strong>
              </div>
              <div>
                <p>Receipt Number</p>
                <strong>{selectedPayment.receiptNumber || 'Pending'}</strong>
              </div>
              <div>
                <p>Payment Time</p>
                <strong>{formatDateTime(selectedPayment.paymentDate)}</strong>
              </div>
            </div>
          </section>

          {activeReceipt ? <ReceiptPreviewPanel receipt={activeReceipt} /> : null}

          <section className="crm-receipt-actions-card">
            <p>Receipt Actions</p>
            <div className="crm-payments-actions">
              {!selectedPayment.receiptGenerated ? (
                <button
                  type="button"
                  className="crm-payments-primary-btn"
                  onClick={() => onGenerateReceipt(selectedPayment)}
                  disabled={isReceiptBusy}
                >
                  {isReceiptBusy ? 'Generating...' : 'Generate Receipt'}
                </button>
              ) : null}
              <button
                type="button"
                className="crm-payments-secondary-btn"
                onClick={() => onPrintReceipt(selectedPayment)}
                disabled={isReceiptBusy || !selectedPayment.receiptGenerated}
              >
                Print Receipt
              </button>
              <button
                type="button"
                className="crm-payments-secondary-btn"
                onClick={() => onDownloadReceipt(selectedPayment)}
                disabled={isReceiptBusy || !selectedPayment.receiptGenerated}
              >
                Download PDF
              </button>
              <button
                type="button"
                className="crm-payments-primary-btn"
                onClick={() => onEmailReceipt(selectedPayment)}
                disabled={isReceiptBusy || !selectedPayment.receiptGenerated}
              >
                Email Receipt
              </button>
              <button type="button" className="crm-payments-ghost-btn" onClick={() => onOpenAppointment(selectedPayment)}>
                Open Appointment
              </button>
              <button type="button" className="crm-payments-ghost-btn" onClick={() => onOpenCustomer(selectedPayment)}>
                Open Customer
              </button>
              <button type="button" className="crm-payments-ghost-btn" onClick={onOpenReceiptHistory}>
                Open Receipt History
              </button>
            </div>
          </section>
        </>
      ) : (
        <div className="crm-payments-empty crm-payments-empty-receipt">
          <h3>Receipt control center ready</h3>
          <p>Start a new payment receipt or pick any payment row to manage receipt actions.</p>
          <button type="button" className="crm-payments-primary-btn" onClick={onStartReceipt}>
            Start Receipt
          </button>
        </div>
      )}

      <section className="crm-receipt-recent-card">
        <header>
          <p>Recent Receipts</p>
          <button type="button" className="crm-payments-ghost-btn" onClick={onOpenReceiptHistory}>
            Receipt History
          </button>
        </header>
        {recentReceipts.length === 0 ? (
          <p className="crm-receipt-recent-empty">No receipts generated yet in this range.</p>
        ) : (
          <div className="crm-receipt-recent-list">
            {recentReceipts.slice(0, 5).map((receipt) => (
              <article key={receipt.id}>
                <div>
                  <strong>{receipt.receiptNumber || 'Pending Number'}</strong>
                  <span>{receipt.customerName}</span>
                </div>
                <div>
                  <p>{formatMoney(receipt.amountPaid)}</p>
                  <span>{receipt.receiptGeneratedAt ? formatDateTime(receipt.receiptGeneratedAt) : 'Pending'}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </aside>
  );
};

export default ReceiptWorkspacePanel;
