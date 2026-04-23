const toneByStatus = {
  Paid: 'good',
  Partial: 'warning',
  Unpaid: 'alert',
  Overdue: 'alert-strong',
  Refunded: 'muted',
  Cancelled: 'muted',
  'Receipt Generated': 'good',
  'Receipt Pending': 'warning',
  Generated: 'good',
  Issued: 'good',
  Printed: 'good',
  Downloaded: 'good',
  Emailed: 'good',
  Pending: 'warning',
  'Not Issued': 'warning',
  Void: 'muted',
};

const PaymentStatusBadge = ({ status }) => {
  const tone = toneByStatus[status] || 'neutral';
  return <span className={`crm-payment-pill crm-payment-pill-${tone}`}>{status}</span>;
};

export default PaymentStatusBadge;
