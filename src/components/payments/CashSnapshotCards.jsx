const CashSnapshotCards = ({ items }) => {
  return (
    <section className="crm-payments-cash-snapshot">
      <h3>Daily Cash Snapshot</h3>
      <div className="crm-payments-cash-grid">
        {items.map((item) => (
          <article key={item.label} className="crm-payments-cash-card">
            <p>{item.label}</p>
            <strong>{item.value}</strong>
            {item.note ? <span>{item.note}</span> : null}
          </article>
        ))}
      </div>
    </section>
  );
};

export default CashSnapshotCards;
