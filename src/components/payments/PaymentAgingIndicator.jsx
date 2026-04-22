const bucketTone = {
  'Due Today': 'today',
  '1-3 Days Overdue': 'warning',
  '4-7 Days Overdue': 'alert',
  '8+ Days Overdue': 'critical',
  Current: 'neutral',
};

const PaymentAgingIndicator = ({ bucket, daysOverdue, balanceRemaining }) => {
  const tone = bucketTone[bucket] || 'neutral';

  if (!balanceRemaining || balanceRemaining <= 0) {
    return <span className="crm-aging-chip crm-aging-chip-settled">Settled</span>;
  }

  const detail = daysOverdue > 0 ? `${daysOverdue}d overdue` : 'Due today';

  return (
    <span className={`crm-aging-chip crm-aging-chip-${tone}`} title={bucket}>
      {detail}
    </span>
  );
};

export default PaymentAgingIndicator;
