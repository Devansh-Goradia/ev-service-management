import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Car, ClipboardList, Clock, CheckCircle, PlusCircle } from 'lucide-react';
import { getDashboardStats, getMe, getServices } from '../services/api.js';
import ServiceTable from '../components/ServiceTable.jsx';

export default function Home() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [user, setUser] = useState(null);
  const [recentServices, setRecentServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError('');
      try {
        // Fetch all data in parallel
        const [statsData, userData, servicesData] = await Promise.all([
          getDashboardStats().catch(() => null),
          getMe().catch(() => null),
          getServices().catch(() => []),
        ]);

        setStats(statsData);
        setUser(userData);
        // Show only 5 most recent
        const servicesList = Array.isArray(servicesData) ? servicesData : [];
        setRecentServices(servicesList.slice(0, 5));
      } catch (err) {
        setError(err.message || 'Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="spinner-overlay" style={{ minHeight: '60vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  const firstName = user?.full_name?.split(' ')[0] || 'there';

  // Derive counts from stats or services fallback
  const totalVehicles = stats?.total_vehicles ?? stats?.vehicles ?? '—';
  const totalServices = stats?.total_services ?? stats?.services ?? recentServices.length ?? '—';
  const pendingCount =
    stats?.pending_services ??
    stats?.pending ??
    recentServices.filter((s) => (s.status || '').toLowerCase() === 'pending').length;
  const completedCount =
    stats?.completed_services ??
    stats?.completed ??
    recentServices.filter((s) => (s.status || '').toLowerCase() === 'completed').length;

  return (
    <div className="page-container">
      {/* Error */}
      {error && (
        <div className="alert alert--error" role="alert">
          {error}
        </div>
      )}

      {/* Header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Good day, {firstName}! 👋</h1>
          <p>Here&apos;s an overview of your EV service activity.</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => navigate('/book-service')}
        >
          <PlusCircle size={16} />
          Book New Service
        </button>
      </div>

      {/* Stat Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--blue">
            <Car size={22} />
          </div>
          <div>
            <div className="stat-card__value">{totalVehicles}</div>
            <div className="stat-card__label">Total Vehicles</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--purple">
            <ClipboardList size={22} />
          </div>
          <div>
            <div className="stat-card__value">{totalServices}</div>
            <div className="stat-card__label">Total Services</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--yellow">
            <Clock size={22} />
          </div>
          <div>
            <div className="stat-card__value">{pendingCount}</div>
            <div className="stat-card__label">Pending</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--green">
            <CheckCircle size={22} />
          </div>
          <div>
            <div className="stat-card__value">{completedCount}</div>
            <div className="stat-card__label">Completed</div>
          </div>
        </div>
      </div>

      {/* Recent Services */}
      <div className="card">
        <div className="card-header">
          <h2>Recent Service Requests</h2>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => navigate('/services')}
          >
            View All
          </button>
        </div>
        <ServiceTable services={recentServices} showVehicle />
      </div>
    </div>
  );
}
