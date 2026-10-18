import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Pencil, LogOut, Mail, Phone, Car } from 'lucide-react';
import { getUserProfile, updateUserProfile, getVehicles } from '../services/api.js';

export default function Account() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [vehicleCount, setVehicleCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ full_name: '', phone: '' });
  const [editErrors, setEditErrors] = useState({ full_name: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    setLoading(true);
    setError('');
    try {
      const [profileData, vehiclesData] = await Promise.all([
        getUserProfile(),
        getVehicles().catch(() => []),
      ]);
      setProfile(profileData);
      setVehicleCount(Array.isArray(vehiclesData) ? vehiclesData.length : 0);
    } catch (err) {
      setError(err.message || 'Failed to load profile.');
    } finally {
      setLoading(false);
    }
  }

  function startEditing() {
    setEditForm({
      full_name: profile?.full_name || '',
      phone: profile?.phone || '',
    });
    setEditErrors({ full_name: '', phone: '' });
    setSaveError('');
    setSaveSuccess('');
    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
    setEditForm({ full_name: '', phone: '' });
    setEditErrors({ full_name: '', phone: '' });
    setSaveError('');
  }

  function handleEditChange(e) {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
    setEditErrors((prev) => ({ ...prev, [name]: '' }));
    setSaveError('');
  }

  function validateEdit() {
    const newErrors = { full_name: '', phone: '' };
    let valid = true;

    if (!editForm.full_name.trim()) {
      newErrors.full_name = 'Full name is required.';
      valid = false;
    }
    if (!editForm.phone.trim()) {
      newErrors.phone = 'Phone number is required.';
      valid = false;
    }

    setEditErrors(newErrors);
    return valid;
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!validateEdit()) return;

    setSaving(true);
    setSaveError('');
    setSaveSuccess('');
    try {
      const updated = await updateUserProfile({
        full_name: editForm.full_name.trim(),
        phone: editForm.phone.trim(),
      });
      setProfile((prev) => ({ ...prev, ...updated }));
      setSaveSuccess('Profile updated successfully.');
      setEditing(false);
    } catch (err) {
      setSaveError(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  }

  function handleSignOut() {
    localStorage.removeItem('ev_token');
    navigate('/', { replace: true });
  }

  if (loading) {
    return (
      <div className="spinner-overlay" style={{ minHeight: '60vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="page-container page-container--narrow">
      <div className="page-header">
        <h1>My Account</h1>
        <p>View and manage your profile information.</p>
      </div>

      {error && (
        <div className="alert alert--error" role="alert">
          {error}
        </div>
      )}
      {saveSuccess && (
        <div className="alert alert--success" role="alert">
          {saveSuccess}
        </div>
      )}

      {/* Profile card */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        {/* Avatar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            marginBottom: '1.5rem',
          }}
        >
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              background: '#eff6ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#2563eb',
              flexShrink: 0,
            }}
          >
            <User size={28} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.15rem', color: '#1f2937' }}>
              {profile?.full_name || '—'}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>EV Owner</div>
          </div>
        </div>

        {/* Profile fields */}
        {!editing ? (
          <>
            <div className="divider" />
            <InfoRow icon={<Mail size={16} />} label="Email" value={profile?.email || '—'} />
            <InfoRow icon={<Phone size={16} />} label="Phone" value={profile?.phone || '—'} />
            <InfoRow
              icon={<Car size={16} />}
              label="Vehicles Registered"
              value={vehicleCount}
            />

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button className="btn btn-secondary" onClick={startEditing}>
                <Pencil size={15} />
                Edit Profile
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="divider" />

            {saveError && (
              <div className="alert alert--error" role="alert">
                {saveError}
              </div>
            )}

            <form onSubmit={handleSave} noValidate>
              <div className="form-group">
                <label htmlFor="full_name" className="form-label">
                  Full Name
                </label>
                <input
                  id="full_name"
                  name="full_name"
                  type="text"
                  className={`form-input${editErrors.full_name ? ' form-input--error' : ''}`}
                  value={editForm.full_name}
                  onChange={handleEditChange}
                  disabled={saving}
                />
                {editErrors.full_name && (
                  <span className="field-error">{editErrors.full_name}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="phone" className="form-label">
                  Phone Number
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  className={`form-input${editErrors.phone ? ' form-input--error' : ''}`}
                  value={editForm.phone}
                  onChange={handleEditChange}
                  disabled={saving}
                />
                {editErrors.phone && (
                  <span className="field-error">{editErrors.phone}</span>
                )}
              </div>

              {/* Read-only email */}
              <div className="form-group">
                <label className="form-label" style={{ color: '#9ca3af' }}>
                  Email (cannot be changed)
                </label>
                <input
                  type="email"
                  className="form-input"
                  value={profile?.email || ''}
                  readOnly
                  disabled
                  style={{ background: '#f9fafb', color: '#9ca3af' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <span className="spinner spinner--sm" />
                      Saving…
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={cancelEditing}
                  disabled={saving}
                >
                  Cancel
                </button>
              </div>
            </form>
          </>
        )}
      </div>

      {/* Danger zone */}
      <div className="card" style={{ borderColor: '#fecaca' }}>
        <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1f2937', marginBottom: '0.5rem' }}>
          Sign Out
        </h2>
        <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
          You will be returned to the welcome screen.
        </p>
        <button className="btn btn-danger" onClick={handleSignOut}>
          <LogOut size={15} />
          Sign Out
        </button>
      </div>
    </div>
  );
}

/** Small helper for displaying a profile field row. */
function InfoRow({ icon, label, value }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.65rem 0',
        borderBottom: '1px solid #f3f4f6',
      }}
    >
      <span style={{ color: '#9ca3af', flexShrink: 0 }}>{icon}</span>
      <span style={{ fontSize: '0.8rem', color: '#9ca3af', width: 140, flexShrink: 0 }}>
        {label}
      </span>
      <span style={{ fontWeight: 500, color: '#1f2937' }}>{value}</span>
    </div>
  );
}
