import ServiceHealthBadge from './ServiceHealthBadge';

const ServicePerformanceSummary = ({ service, formatCurrency, formatDate, formatRelativeDate }) => {
  return (
    <div className="crm-service-performance-block">
      <div className="crm-service-performance-grid">
        <article>
          <p>Bookings This Week</p>
          <strong>{service.bookingsWeek}</strong>
        </article>
        <article>
          <p>Bookings This Month</p>
          <strong>{service.bookingsMonth}</strong>
        </article>
        <article>
          <p>Revenue Contribution</p>
          <strong>{formatCurrency(service.revenueMonth)}</strong>
        </article>
        <article>
          <p>Last Booked</p>
          <strong>{service.lastBooked ? formatDate(service.lastBooked) : 'No recent booking'}</strong>
        </article>
      </div>

      <div className="crm-service-performance-signals">
        {service.isTopPerformer ? <ServiceHealthBadge label={`Top ${service.popularityRank} Performer`} tone="good" /> : null}
        {service.lowUsage ? <ServiceHealthBadge label="Low Usage" tone="warning" /> : null}
        {!service.isTopPerformer && !service.lowUsage ? <ServiceHealthBadge label="Steady Usage" tone="neutral" /> : null}
      </div>

      <p className="crm-service-performance-caption">
        {service.lastBooked
          ? `Last booked ${formatRelativeDate(service.lastBooked)}. Monitor this service for staffing and promotion opportunities.`
          : 'No recent booking data available. Consider promotional positioning to restore visibility.'}
      </p>
    </div>
  );
};

export default ServicePerformanceSummary;
