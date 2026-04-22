const OverdueFollowUpBlock = ({ rows, formatDate, onAction }) => {
  return (
    <section className="crm-followup-card">
      <header className="crm-followup-head">
        <div>
          <p className="crm-payments-kicker">Follow-Up Intelligence</p>
          <h3>Overdue and Partial Balances</h3>
        </div>
      </header>

      {rows.length === 0 ? (
        <p className="crm-followup-empty">All open balances are up to date. Follow-up tasks will appear here when needed.</p>
      ) : (
        <div className="crm-followup-list">
          {rows.slice(0, 4).map((row) => (
            <article key={row.id} className="crm-followup-item">
              <div>
                <strong>{row.customerName}</strong>
                <p>{row.id} - {row.agingBucket}</p>
              </div>
              <div className="crm-followup-meta">
                <span>Last: {row.followUp?.lastFollowUpDate ? formatDate(row.followUp.lastFollowUpDate) : 'Not logged'}</span>
                <span>Next: {row.followUp?.nextFollowUpDue ? formatDate(row.followUp.nextFollowUpDue) : 'Schedule now'}</span>
                <span>Owner: {row.followUp?.assignedTo || 'Front Desk'}</span>
              </div>
              <div className="crm-followup-actions">
                <button type="button" className="crm-payments-secondary-btn" onClick={() => onAction('sendFollowUp', row)}>
                  Send Follow-Up
                </button>
                <button type="button" className="crm-payments-ghost-btn" onClick={() => onAction('logContact', row)}>
                  Log Contact Attempt
                </button>
                <button type="button" className="crm-payments-ghost-btn" onClick={() => onAction('scheduleFollowUp', row)}>
                  Schedule Follow-Up
                </button>
                <button type="button" className="crm-payments-ghost-btn" onClick={() => onAction('markContacted', row)}>
                  Mark Contacted
                </button>
                <button type="button" className="crm-payments-ghost-btn" onClick={() => onAction('openCustomer', row)}>
                  Open Customer
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

export default OverdueFollowUpBlock;
