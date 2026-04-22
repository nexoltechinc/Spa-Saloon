const AwaitingCheckoutQueue = ({ items, formatMoney, onRecordPayment, onOpenCheckout, onGenerateReceipt }) => {
  return (
    <section className="crm-awaiting-queue-card">
      <header className="crm-awaiting-queue-head">
        <div>
          <p className="crm-payments-kicker">Completed Appointments Awaiting Payment</p>
          <h3>Checkout Queue</h3>
        </div>
        <strong>{items.length}</strong>
      </header>

      {items.length === 0 ? (
        <p className="crm-awaiting-queue-empty">No completed visits are currently waiting for checkout.</p>
      ) : (
        <div className="crm-awaiting-queue-list">
          {items.slice(0, 5).map((item) => (
            <article key={item.id} className="crm-awaiting-queue-item">
              <div>
                <p>{item.customerName}</p>
                <span>
                  {item.appointmentId} - {item.serviceName}
                </span>
              </div>
              <div>
                <strong>{formatMoney(item.amountDue)}</strong>
                <span>{item.statusLabel}</span>
              </div>
              <div className="crm-awaiting-queue-actions">
                <button type="button" className="crm-payments-secondary-btn" onClick={() => onOpenCheckout(item)}>
                  Open Checkout
                </button>
                <button type="button" className="crm-payments-primary-btn" onClick={() => onRecordPayment(item)}>
                  Record Payment
                </button>
                <button type="button" className="crm-payments-ghost-btn" onClick={() => onGenerateReceipt(item)}>
                  Generate Receipt
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

export default AwaitingCheckoutQueue;
