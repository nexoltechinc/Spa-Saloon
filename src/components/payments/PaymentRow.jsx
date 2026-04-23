import PaymentAgingIndicator from './PaymentAgingIndicator';
import PaymentStatusBadge from './PaymentStatusBadge';

const PaymentRow = ({ payment, active, formatMoney, formatDateTime, onSelect, onAction }) => {
  const receiptLabel = payment.receiptStatus || (payment.receiptGenerated ? 'Generated' : 'Pending');

  const handleRowSelect = () => {
    onSelect(payment);
  };

  return (
    <article
      className={`crm-payment-row${active ? ' crm-payment-row-active' : ''}`}
      role="button"
      tabIndex={0}
      onClick={handleRowSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleRowSelect();
        }
      }}
    >
      <div className="crm-payment-row-grid">
        <p className="crm-payment-id">{payment.id}</p>

        <div>
          <p className="crm-payment-name">{payment.customerName}</p>
          <p className="crm-payment-sub">
            {payment.recordedBy}
            {payment.branchName ? ` | ${payment.branchName}` : ''}
          </p>
        </div>

        <div>
          <p className="crm-payment-name">{payment.appointmentId || 'Unlinked'}</p>
          <p className="crm-payment-sub">{payment.appointmentCompleted ? 'Completed visit' : 'In progress'}</p>
        </div>

        <div>
          <p className="crm-payment-service">{payment.serviceName}</p>
          <p className="crm-payment-sub">{payment.notes || 'Front desk checkout'}</p>
        </div>

        <p className="crm-payment-amount">{formatMoney(payment.amountDue)}</p>
        <p className="crm-payment-amount">{formatMoney(payment.amountPaid)}</p>

        <div>
          <p className={`crm-payment-amount${payment.balanceRemaining > 0 ? ' crm-payment-amount-balance' : ''}`}>
            {formatMoney(payment.balanceRemaining)}
          </p>
          <PaymentAgingIndicator
            bucket={payment.agingBucket}
            daysOverdue={payment.daysOverdue}
            balanceRemaining={payment.balanceRemaining}
          />
        </div>

        <p className="crm-payment-method">{payment.method}</p>

        <div className="crm-payment-status-stack">
          <PaymentStatusBadge status={payment.displayStatus} />
          <PaymentStatusBadge status={receiptLabel} />
        </div>

        <div>
          <p className="crm-payment-date">{formatDateTime(payment.paymentDate)}</p>
          <p className="crm-payment-sub">Edited by {payment.editedBy || 'Not edited'}</p>
        </div>

        <div className="crm-payment-status-stack">
          <PaymentStatusBadge status={receiptLabel} />
          <p className="crm-payment-sub">{payment.receiptNumber || 'Pending number'}</p>
        </div>

        <div className="crm-payment-row-actions" onClick={(event) => event.stopPropagation()}>
          <button
            type="button"
            className="crm-payments-receipt-link"
            onClick={() => onAction('openReceipt', payment)}
          >
            {payment.receiptGenerated ? 'Open Receipt' : 'Generate'}
          </button>
          <details className="crm-payment-row-menu">
            <summary>Actions</summary>
            <div>
              <button type="button" onClick={() => onAction('viewPayment', payment)}>View Payment</button>
              <button type="button" onClick={() => onAction('recordBalance', payment)}>Record Balance</button>
              <button type="button" onClick={() => onAction('addPartial', payment)}>Add Partial Payment</button>
              <button type="button" onClick={() => onAction('markFullyPaid', payment)}>Mark Fully Paid</button>
              <button type="button" onClick={() => onAction('printReceipt', payment)}>Print Receipt</button>
              <button type="button" onClick={() => onAction('emailReceipt', payment)}>Email Receipt</button>
              <button type="button" onClick={() => onAction('openCustomer', payment)}>Open Customer</button>
              <button type="button" onClick={() => onAction('openAppointment', payment)}>Open Appointment</button>
            </div>
          </details>
        </div>
      </div>
    </article>
  );
};

export default PaymentRow;
