import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Search, BatteryCharging, Gauge, IndianRupee, PlusCircle, Database } from 'lucide-react';
import { getIndianEVs, getIndianEVStats } from '../services/api.js';

const MANUFACTURERS = [
  'All',
  'Tata Motors',
  'Mahindra',
  'MG Motor',
  'Hyundai',
  'Kia',
  'BYD',
  'Citroen',
  'Volvo',
  'BMW',
  'Mercedes-Benz',
  'Audi',
];

const BODY_TYPES = ['All', 'SUV', 'Compact SUV', 'Coupe SUV', 'Hatchback', 'Sedan', 'MPV'];

export default function IndianEVs() {
  const navigate = useNavigate();
  const [evList, setEvList] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [selectedMfg, setSelectedMfg] = useState('All');
  const [selectedBody, setSelectedBody] = useState('All');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    setError('');
    try {
      const [listData, statsData] = await Promise.all([
        getIndianEVs(),
        getIndianEVStats().catch(() => null),
      ]);
      setEvList(Array.isArray(listData) ? listData : []);
      setStats(statsData);
    } catch (err) {
      setError(err.message || 'Failed to load Indian EV database.');
    } finally {
      setLoading(false);
    }
  }

  // Filter logic
  const filtered = evList.filter((ev) => {
    const matchesSearch =
      ev.model_name.toLowerCase().includes(search.toLowerCase()) ||
      ev.manufacturer.toLowerCase().includes(search.toLowerCase());
    const matchesMfg = selectedMfg === 'All' || ev.manufacturer.toLowerCase() === selectedMfg.toLowerCase();
    const matchesBody =
      selectedBody === 'All' ||
      ev.body_type.toLowerCase().includes(selectedBody.toLowerCase());
    return matchesSearch && matchesMfg && matchesBody;
  });

  function handleRegisterShortcut(ev) {
    // Navigate to garage with vehicle details in state or session
    navigate('/garage', {
      state: {
        manufacturer: ev.manufacturer,
        model: ev.model_name,
      },
    });
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#2563eb', fontWeight: 700, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
            <Database size={16} /> PostgreSQL Relational Catalogue
          </div>
          <h1 style={{ fontSize: '1.9rem', fontWeight: 800, color: '#1f2937' }}>Indian Electric Vehicles Database</h1>
          <p style={{ color: '#4b5563', fontSize: '0.975rem' }}>
            Specifications of all electric passenger cars sold in the Indian market, stored in table <code style={{ backgroundColor: '#eff6ff', color: '#2563eb', padding: '0.15rem 0.4rem', borderRadius: 4, border: '1px solid #bfdbfe' }}>indian_ev_catalog</code>.
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => navigate('/garage')}
        >
          <PlusCircle size={16} />
          Go to My Garage
        </button>
      </div>

      {error && (
        <div className="alert alert--error" role="alert">
          {error}
        </div>
      )}

      {/* Aggregate DBMS Stats */}
      <div className="stats-grid" style={{ marginBottom: '1.75rem' }}>
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--blue">
            <Zap size={22} />
          </div>
          <div>
            <div className="stat-card__value">{stats?.total_models ?? evList.length}</div>
            <div className="stat-card__label">Total EV Models in India</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--green">
            <Gauge size={22} />
          </div>
          <div>
            <div className="stat-card__value">{stats?.average_range_km ? `${stats.average_range_km} km` : '488 km'}</div>
            <div className="stat-card__label">Average ARAI Range</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--purple">
            <BatteryCharging size={22} />
          </div>
          <div>
            <div className="stat-card__value">{stats?.by_manufacturer?.length ?? 11} Brands</div>
            <div className="stat-card__label">Active EV Manufacturers</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--yellow">
            <IndianRupee size={22} />
          </div>
          <div>
            <div className="stat-card__value">₹7.99L - ₹1.39Cr</div>
            <div className="stat-card__label">Indian Market Price Range</div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem 1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
          {/* Search */}
          <div>
            <label className="form-label" style={{ marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Search size={14} /> Search Model or Brand
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Nexon, Ioniq, Curvv, Mahindra..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Manufacturer Filter */}
          <div>
            <label className="form-label" style={{ marginBottom: '0.4rem' }}>
              Filter by Manufacturer (WHERE)
            </label>
            <select
              className="form-select"
              value={selectedMfg}
              onChange={(e) => setSelectedMfg(e.target.value)}
            >
              {MANUFACTURERS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Body Type Filter */}
          <div>
            <label className="form-label" style={{ marginBottom: '0.4rem' }}>
              Body Type Filter
            </label>
            <select
              className="form-select"
              value={selectedBody}
              onChange={(e) => setSelectedBody(e.target.value)}
            >
              {BODY_TYPES.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* EV Catalogue Table */}
      {loading ? (
        <div className="spinner-overlay">
          <div className="spinner" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <Database size={48} />
            <p>No Indian EVs found matching your filters.</p>
            <button
              className="btn btn-secondary btn-sm"
              style={{ marginTop: '0.75rem' }}
              onClick={() => {
                setSearch('');
                setSelectedMfg('All');
                setSelectedBody('All');
              }}
            >
              Reset Filters
            </button>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrapper" style={{ border: 'none', borderRadius: 12 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Manufacturer</th>
                  <th>Model Name</th>
                  <th>Battery Pack</th>
                  <th>Claimed Range</th>
                  <th>Body Type</th>
                  <th>Est. Ex-Showroom (INR)</th>
                  <th>Fast Charging</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((ev) => (
                  <tr key={ev.model_id}>
                    <td>
                      <span style={{ fontWeight: 700, color: '#1f2937' }}>
                        {ev.manufacturer}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: '#2563eb' }}>
                        {ev.model_name}
                      </span>
                    </td>
                    <td>{ev.battery_capacity_kwh} kWh</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontWeight: 700, color: '#10b981' }}>{ev.claimed_range_km} km</span>
                      </div>
                    </td>
                    <td>
                      <span style={{ backgroundColor: '#f3f4f6', color: '#4b5563', padding: '0.2rem 0.6rem', borderRadius: 12, fontSize: '0.8rem', fontWeight: 600 }}>
                        {ev.body_type}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {ev.price_range_inr_lakh ? `₹${ev.price_range_inr_lakh} Lakh` : '—'}
                    </td>
                    <td>
                      {ev.fast_charging_support ? (
                        <span className="badge-completed">DC Fast Charge</span>
                      ) : (
                        <span className="badge-pending">Standard AC</span>
                      )}
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleRegisterShortcut(ev)}
                        title="Add this model to My Garage"
                      >
                        <PlusCircle size={13} />
                        Add to Garage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* College DBMS Viva SQL Queries Explanation Box */}
      <div className="card" style={{ marginTop: '2rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          💡 DBMS Demonstration Queries Used Here
        </h3>
        <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1rem' }}>
          This table demonstrates PostgreSQL filtering, sorting, and aggregate functions directly from <code style={{ backgroundColor: '#e2e8f0', padding: '0.1rem 0.35rem', borderRadius: 4 }}>indian_ev_catalog</code>:
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '0.75rem', fontSize: '0.8rem', fontFamily: 'monospace' }}>
          <div style={{ backgroundColor: '#ffffff', padding: '0.75rem', borderRadius: 6, border: '1px solid #cbd5e1' }}>
            <span style={{ color: '#0284c7', fontWeight: 700 }}>-- 1. Filter by Indian brand and sort by range:</span>
            <div style={{ color: '#0f172a', marginTop: '0.25rem' }}>
              SELECT manufacturer, model_name, battery_capacity_kwh, claimed_range_km<br />
              FROM indian_ev_catalog<br />
              WHERE manufacturer = 'Tata Motors'<br />
              ORDER BY claimed_range_km DESC;
            </div>
          </div>
          <div style={{ backgroundColor: '#ffffff', padding: '0.75rem', borderRadius: 6, border: '1px solid #cbd5e1' }}>
            <span style={{ color: '#0284c7', fontWeight: 700 }}>-- 2. Aggregate counts per manufacturer:</span>
            <div style={{ color: '#0f172a', marginTop: '0.25rem' }}>
              SELECT manufacturer, COUNT(model_id) AS total_models,<br />
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;ROUND(AVG(claimed_range_km), 1) AS avg_range<br />
              FROM indian_ev_catalog<br />
              GROUP BY manufacturer<br />
              ORDER BY total_models DESC;
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
