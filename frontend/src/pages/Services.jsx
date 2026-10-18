import { useState, useEffect } from 'react';
import { getServices } from '../services/api.js';
import ServiceTable from '../components/ServiceTable.jsx';

const FILTERS = ['All', 'Pending', 'In Progress', 'Completed'];

export default function Services() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');

  useEffect(() => {
    async function fetchServices() {
      setLoading(true);
      setError('');
      try {
        const data = await getServices();
        setServices(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.message || 'Failed to load service records.');
      } finally {
        setLoading(false);
      }
    }
    fetchServices();
  }, []);

  /** Normalize a status string to lower-case for comparison. */
  function normalizeStatus(status) {
    return (status || '').toLowerCase().replace(/[\s_-]+/g, ' ').trim();
  }

  function matchesFilter(svc) {
    if (activeFilter === 'All') return true;
    return normalizeStatus(svc.status) === activeFilter.toLowerCase();
  }

  const filtered = services.filter(matchesFilter);

  /** Count services per filter label. */
  function countFor(label) {
    if (label === 'All') return services.length;
    return services.filter(
      (s) => normalizeStatus(s.status) === label.toLowerCase()
    ).length;
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <h1>Service Records</h1>
        <p>A full history of all your service requests.</p>
      </div>

      {/* Error */}
      {error && (
        <div className="alert alert--error" role="alert">
          {error}
        </div>
      )}

      {/* Filter bar */}
      <div className="filter-bar">
        {FILTERS.map((label) => (
          <button
            key={label}
            className={`filter-btn${activeFilter === label ? ' filter-btn--active' : ''}`}
            onClick={() => setActiveFilter(label)}
          >
            {label}
            <span
              style={{
                marginLeft: '0.35rem',
                background: activeFilter === label ? 'rgba(255,255,255,0.25)' : '#f3f4f6',
                color: activeFilter === label ? 'inherit' : '#6b7280',
                borderRadius: '12px',
                padding: '0 6px',
                fontSize: '0.72rem',
                fontWeight: 700,
              }}
            >
              {countFor(label)}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="spinner-overlay">
          <div className="spinner" />
        </div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <ServiceTable services={filtered} showVehicle />
        </div>
      )}
    </div>
  );
}
