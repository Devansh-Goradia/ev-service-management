import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { PlusCircle, Pencil, Trash2, Car, Sparkles } from 'lucide-react';
import {
  getVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  getIndianEVManufacturers,
} from '../services/api.js';

const EMPTY_FORM = {
  manufacturer: '',
  model: '',
  registration_number: '',
  purchase_year: '',
};

const EMPTY_ERRORS = {
  manufacturer: '',
  model: '',
  registration_number: '',
  purchase_year: '',
};

export default function Garage() {
  const location = useLocation();
  const [vehicles, setVehicles] = useState([]);
  const [indianCatalog, setIndianCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState(EMPTY_ERRORS);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Delete state
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    fetchVehicles();
    loadCatalog();
  }, []);

  async function loadCatalog() {
    try {
      const data = await getIndianEVManufacturers();
      setIndianCatalog(Array.isArray(data) ? data : []);
    } catch {
      // fallback gracefully if catalog endpoint fails
    }
  }

  // Pre-fill form if directed from Indian EV catalog page
  useEffect(() => {
    if (location.state?.manufacturer) {
      setEditingId(null);
      setForm({
        manufacturer: location.state.manufacturer || '',
        model: location.state.model || '',
        registration_number: '',
        purchase_year: new Date().getFullYear().toString(),
      });
      setShowForm(true);
    }
  }, [location.state]);

  async function fetchVehicles() {
    setLoading(true);
    setError('');
    try {
      const data = await getVehicles();
      setVehicles(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load vehicles.');
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setFormErrors((prev) => ({ ...prev, [name]: '' }));
    setFormError('');
  }

  function validate() {
    const newErrors = { ...EMPTY_ERRORS };
    let valid = true;

    if (!form.manufacturer.trim()) {
      newErrors.manufacturer = 'Manufacturer is required.';
      valid = false;
    }
    if (!form.model.trim()) {
      newErrors.model = 'Model is required.';
      valid = false;
    }
    if (!form.registration_number.trim()) {
      newErrors.registration_number = 'Registration number is required.';
      valid = false;
    }
    if (!form.purchase_year) {
      newErrors.purchase_year = 'Purchase year is required.';
      valid = false;
    } else {
      const year = parseInt(form.purchase_year, 10);
      const currentYear = new Date().getFullYear();
      if (isNaN(year) || year < 1990 || year > currentYear + 1) {
        newErrors.purchase_year = `Year must be between 1990 and ${currentYear + 1}.`;
        valid = false;
      }
    }

    setFormErrors(newErrors);
    return valid;
  }

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormErrors(EMPTY_ERRORS);
    setFormError('');
    setShowForm(true);
  }

  function openEdit(vehicle) {
    const vid = vehicle.vehicle_id || vehicle.id;
    setEditingId(vid);
    setForm({
      manufacturer: vehicle.manufacturer || '',
      model: vehicle.model || '',
      registration_number: vehicle.registration_number || '',
      purchase_year: vehicle.purchase_year ? String(vehicle.purchase_year) : '',
    });
    setFormErrors(EMPTY_ERRORS);
    setFormError('');
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormErrors(EMPTY_ERRORS);
    setFormError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    setFormLoading(true);
    setFormError('');
    setSuccess('');
    try {
      const payload = {
        manufacturer: form.manufacturer.trim(),
        model: form.model.trim(),
        registration_number: form.registration_number.trim(),
        purchase_year: parseInt(form.purchase_year, 10),
      };

      if (editingId) {
        const updated = await updateVehicle(editingId, payload);
        setVehicles((prev) =>
          prev.map((v) => ((v.vehicle_id || v.id) === editingId ? updated : v))
        );
        setSuccess('Vehicle updated successfully.');
      } else {
        const created = await createVehicle(payload);
        setVehicles((prev) => [created, ...prev]);
        setSuccess('Vehicle added successfully.');
      }
      cancelForm();
    } catch (err) {
      setFormError(err.message || 'Failed to save vehicle.');
    } finally {
      setFormLoading(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Are you sure you want to delete this vehicle? This action cannot be undone.')) return;
    setDeletingId(id);
    setError('');
    setSuccess('');
    try {
      await deleteVehicle(id);
      setVehicles((prev) => prev.filter((v) => (v.vehicle_id || v.id) !== id));
      setSuccess('Vehicle deleted successfully.');
    } catch (err) {
      setError(err.message || 'Failed to delete vehicle.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="page-container">
      {/* Page header */}
      <div className="page-header flex-between">
        <div>
          <h1>My Garage</h1>
          <p>Manage your electric vehicles.</p>
        </div>
        {!showForm && (
          <button className="btn btn-primary" onClick={openAdd}>
            <PlusCircle size={16} />
            Add Vehicle
          </button>
        )}
      </div>

      {/* Global messages */}
      {error && (
        <div className="alert alert--error" role="alert">
          {error}
        </div>
      )}
      {success && (
        <div className="alert alert--success" role="alert">
          {success}
        </div>
      )}

      {/* Add / Edit Form */}
      {showForm && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header">
            <h2>{editingId ? 'Edit Vehicle' : 'Add New Vehicle'}</h2>
          </div>

          {formError && (
            <div className="alert alert--error" role="alert">
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '0 1rem',
              }}
            >
              {/* Manufacturer */}
              <div className="form-group">
                <label htmlFor="manufacturer" className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Manufacturer</span>
                  {indianCatalog.length > 0 && (
                    <span style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                      <Sparkles size={11} /> Indian EV Suggestions
                    </span>
                  )}
                </label>
                <input
                  id="manufacturer"
                  name="manufacturer"
                  type="text"
                  list="indian-manufacturers"
                  className={`form-input${formErrors.manufacturer ? ' form-input--error' : ''}`}
                  placeholder="e.g. Tata Motors, Mahindra, MG Motor"
                  value={form.manufacturer}
                  onChange={handleChange}
                  disabled={formLoading}
                />
                <datalist id="indian-manufacturers">
                  {indianCatalog.map((item) => (
                    <option key={item.manufacturer} value={item.manufacturer} />
                  ))}
                </datalist>
                {formErrors.manufacturer && (
                  <span className="field-error">{formErrors.manufacturer}</span>
                )}
              </div>

              {/* Model */}
              <div className="form-group">
                <label htmlFor="model" className="form-label">
                  Model
                </label>
                <input
                  id="model"
                  name="model"
                  type="text"
                  list="indian-models"
                  className={`form-input${formErrors.model ? ' form-input--error' : ''}`}
                  placeholder="e.g. Nexon EV, Punch EV, XUV400"
                  value={form.model}
                  onChange={handleChange}
                  disabled={formLoading}
                />
                <datalist id="indian-models">
                  {(
                    indianCatalog.find(
                      (item) => item.manufacturer.toLowerCase() === (form.manufacturer || '').toLowerCase().trim()
                    )?.models ||
                    indianCatalog.flatMap((item) => item.models)
                  ).map((m) => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
                {formErrors.model && (
                  <span className="field-error">{formErrors.model}</span>
                )}
              </div>

              {/* Registration Number */}
              <div className="form-group">
                <label htmlFor="registration_number" className="form-label">
                  Registration Number
                </label>
                <input
                  id="registration_number"
                  name="registration_number"
                  type="text"
                  className={`form-input${formErrors.registration_number ? ' form-input--error' : ''}`}
                  placeholder="e.g. ABC-1234"
                  value={form.registration_number}
                  onChange={handleChange}
                  disabled={formLoading}
                />
                {formErrors.registration_number && (
                  <span className="field-error">{formErrors.registration_number}</span>
                )}
              </div>

              {/* Purchase Year */}
              <div className="form-group">
                <label htmlFor="purchase_year" className="form-label">
                  Purchase Year
                </label>
                <input
                  id="purchase_year"
                  name="purchase_year"
                  type="number"
                  min="1990"
                  max={new Date().getFullYear() + 1}
                  className={`form-input${formErrors.purchase_year ? ' form-input--error' : ''}`}
                  placeholder={`e.g. ${new Date().getFullYear()}`}
                  value={form.purchase_year}
                  onChange={handleChange}
                  disabled={formLoading}
                />
                {formErrors.purchase_year && (
                  <span className="field-error">{formErrors.purchase_year}</span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={formLoading}
              >
                {formLoading ? (
                  <>
                    <span className="spinner spinner--sm" />
                    Saving…
                  </>
                ) : editingId ? (
                  'Save Changes'
                ) : (
                  <>
                    <PlusCircle size={16} />
                    Add Vehicle
                  </>
                )}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={cancelForm}
                disabled={formLoading}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Vehicles table */}
      {loading ? (
        <div className="spinner-overlay">
          <div className="spinner" />
        </div>
      ) : vehicles.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <Car size={48} />
            <p>No vehicles in your garage yet.</p>
            <button
              className="btn btn-primary"
              style={{ marginTop: '1rem' }}
              onClick={openAdd}
            >
              <PlusCircle size={16} />
              Add Your First Vehicle
            </button>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrapper" style={{ borderRadius: 12, border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Vehicle ID</th>
                  <th>Manufacturer</th>
                  <th>Model</th>
                  <th>Registration No.</th>
                  <th>Year</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map((vehicle, index) => {
                  const vid = vehicle.vehicle_id || vehicle.id || '';
                  return (
                    <tr key={vid || index}>
                      <td>
                        <span className="monospace">
                          {vid ? vid.substring(0, 8) : '—'}
                        </span>
                      </td>
                      <td>{vehicle.manufacturer}</td>
                      <td>{vehicle.model}</td>
                      <td>{vehicle.registration_number}</td>
                      <td>{vehicle.purchase_year}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => openEdit(vehicle)}
                            title="Edit vehicle"
                          >
                            <Pencil size={13} />
                            Edit
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDelete(vid)}
                            disabled={deletingId === vid}
                            title="Delete vehicle"
                          >
                            {deletingId === vid ? (
                              <span className="spinner spinner--sm" />
                            ) : (
                              <Trash2 size={13} />
                            )}
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
