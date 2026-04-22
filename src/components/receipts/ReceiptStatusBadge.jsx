const toneByStatus = {
  Generated: 'good',
  Printed: 'good',
  Emailed: 'good',
  Downloaded: 'good',
  Paid: 'good',
  Partial: 'warning',
  Pending: 'warning',
  'Receipt Pending': 'warning',
  'Receipt Generated': 'good',
  Overdue: 'alert',
  Unpaid: 'alert',
  Void: 'muted',
  Cancelled: 'muted',
  Refunded: 'muted',
};

const ReceiptStatusBadge = ({ status, compact = false }) => {
  const tone = toneByStatus[status] || 'neutral';

  return (
    <span className={`crm-receipts-status-badge crm-receipts-status-badge-${tone}${compact ? ' crm-receipts-status-badge-compact' : ''}`}>
      {status}
    </span>
  );
};

export default ReceiptStatusBadge;
