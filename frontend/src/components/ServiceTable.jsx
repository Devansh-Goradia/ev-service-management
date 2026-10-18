/**
 * ServiceTable — Reusable table component for displaying service records.
 *
 * Props:
 *   services    {Array}   — Array of service request objects
 *   showVehicle {boolean} — Whether to show the Vehicle column (default true)
 */
export default function ServiceTable({ services = [], showVehicle = true }) {
  if (services.length === 0) {
    return (
      <div className="empty-state">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
        <p>No service records found.</p>
      </div>
    );
  }

  return (
    <div className="table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            <th>Service ID</th>
            {showVehicle && <th>Vehicle</th>}
            <th>Service Type</th>
            <th>Preferred Date</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {services.map((svc, index) => {
            const sid = svc.service_id || svc.id || '';
            const vehicleText = svc.vehicle_manufacturer
              ? `${svc.vehicle_manufacturer} ${svc.vehicle_model || ''}`
              : svc.vehicle
              ? `${svc.vehicle.manufacturer} ${svc.vehicle.model}`
              : svc.vehicle_id
              ? String(svc.vehicle_id).substring(0, 8)
              : '—';
            const typeText =
              svc.service_type_name ||
              (svc.service_type ? (svc.service_type.service_name || svc.service_type.name) : '') ||
              svc.service_type_id ||
              '—';
            const dateVal = svc.requested_date || svc.preferred_date;

            return (
              <tr key={sid || index}>
                <td>
                  <span className="monospace">
                    {sid ? sid.substring(0, 8) : '—'}
                  </span>
                </td>
                {showVehicle && <td>{vehicleText}</td>}
                <td>{typeText}</td>
                <td>
                  {dateVal
                    ? new Date(dateVal).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    : '—'}
                </td>
                <td>
                  <StatusBadge status={svc.status} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Renders a colored status badge based on the status string.
 */
function StatusBadge({ status }) {
  const normalized = (status || 'unknown').toLowerCase().replace(/\s+/g, '_');

  const badgeClass = {
    pending: 'badge-pending',
    in_progress: 'badge-in-progress',
    'in progress': 'badge-in-progress',
    completed: 'badge-completed',
    cancelled: 'badge-cancelled',
  }[normalized] || 'badge-default';

  const label =
    status
      ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()
      : 'Unknown';

  return <span className={`badge ${badgeClass}`}>{label}</span>;
}
