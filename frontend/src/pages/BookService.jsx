import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarCheck, CheckCircle, ClipboardList } from 'lucide-react';
import {
  getVehicles,
  getServiceTypes,
  createService,
} from '../services/api.js';

export default function BookService() {
  const navigate = useNavigate();

  const [vehicles, setVehicles] = useState([]);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError] = useState('');

  const [form, setForm] = useState({
    vehicle_id: '',
    service_type_id: '',
    preferred_date: '',
    description: '',
  });
  const [formErrors, setFormErrors] = useState({
    vehicle_id: '',
    service_type_id: '',
    preferred_date: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function loadSelects() {
      setLoadingData(true);
      setDataError('');
      try {
        const [vData, stData] = await Promise.all([
          getVehicles(),
          getServiceTypes(),
        ]);
        setVehicles(Array.isArray(vData) ? vData : []);
        setServiceTypes(Array.isArray(stData) ? stData : []);
      } catch (err) {
        setDataError(err.message || 'Failed to load form data. Please refresh.');
      } finally {
        setLoadingData(false);
      }
    }
    loadSelects();
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setFormErrors((prev) => ({ ...prev, [name]: '' }));
    setSubmitError('');
  }

  function validate() {
    const newErrors = { vehicle_id: '', service_type_id: '', preferred_date: '' };
    let valid = true;

    if (!form.vehicle_id) {
      newErrors.vehicle_id = 'Please select a vehicle.';
      valid = false;
    }
    if (!form.service_type_id) {
      newErrors.service_type_id = 'Please select a service type.';
      valid = false;
    }
    if (!form.preferred_date) {
      newErrors.preferred_date = 'Please choose a preferred date.';
      valid = false;
    }

    setFormErrors(newErrors);
    return valid;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setSubmitError('');
    try {
      const payload = {
        vehicle_id: form.vehicle_id,
        service_type_id: form.service_type_id,
        requested_date: form.preferred_date ? new Date(form.preferred_date).toISOString() : new Date().toISOString(),
        issue_description: form.description.trim() || undefined,
      };
      await createService(payload);
      setSuccess(true);
    } catch (err) {
      setSubmitError(err.message || 'Failed to book service. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // Today's date in YYYY-MM-DD for date picker min
  const today = new Date().toISOString().split('T')[0];

  if (loadingData) {
    return (
      <div className="spinner-overlay" style={{ minHeight: '60vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="page-container page-container--narrow" style={{ textAlign: 'center', paddingTop: '4rem' }}>
        <div style={{ marginBottom: '1.5rem', color: '#16a34a' }}>
          <CheckCircle size={64} strokeWidth={1.5} style={{ margin: '0 auto' }} />
        </div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          Service Booked!
        </h1>
        <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
          Your service request has been submitted successfully. We&apos;ll get
          in touch to confirm your appointment.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => navigate('/services')}>
            <ClipboardList size={16} />
            View Service Records
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/home')}>
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container page-container--narrow">
      <div className="page-header">
        <h1>Book a Service</h1>
        <p>Schedule a new service appointment for your vehicle.</p>
      </div>

      {dataError && (
        <div className="alert alert--error" role="alert">
          {dataError}
        </div>
      )}

      {vehicles.length === 0 && !dataError && (
        <div className="alert alert--info" role="alert">
          You have no vehicles in your garage. Please{' '}
          <a href="/garage">add a vehicle</a> before booking a service.
        </div>
      )}

      <div className="card">
        {submitError && (
          <div className="alert alert--error" role="alert">
            {submitError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Select Vehicle */}
          <div className="form-group">
            <label htmlFor="vehicle_id" className="form-label">
              Select Vehicle <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              id="vehicle_id"
              name="vehicle_id"
              className={`form-select${formErrors.vehicle_id ? ' form-select--error' : ''}`}
              value={form.vehicle_id}
              onChange={handleChange}
              disabled={submitting}
            >
              <option value="">— Choose a vehicle —</option>
              {vehicles.map((v, index) => {
                const vid = v.vehicle_id || v.id || '';
                return (
                  <option key={vid || index} value={vid}>
                    {v.manufacturer} {v.model} ({v.registration_number})
                  </option>
                );
              })}
            </select>
            {formErrors.vehicle_id && (
              <span className="field-error">{formErrors.vehicle_id}</span>
            )}
          </div>

          {/* Service Type */}
          <div className="form-group">
            <label htmlFor="service_type_id" className="form-label">
              Service Type <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              id="service_type_id"
              name="service_type_id"
              className={`form-select${formErrors.service_type_id ? ' form-select--error' : ''}`}
              value={form.service_type_id}
              onChange={handleChange}
              disabled={submitting}
            >
              <option value="">— Choose a service type —</option>
              {serviceTypes.map((st, index) => {
                const stid = st.service_type_id || st.id || '';
                const stname = st.service_name || st.name || '';
                return (
                  <option key={stid || index} value={stid}>
                    {stname}
                  </option>
                );
              })}
            </select>
            {formErrors.service_type_id && (
              <span className="field-error">{formErrors.service_type_id}</span>
            )}
          </div>

          {/* Preferred Date */}
          <div className="form-group">
            <label htmlFor="preferred_date" className="form-label">
              Preferred Date <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              id="preferred_date"
              name="preferred_date"
              type="date"
              min={today}
              className={`form-input${formErrors.preferred_date ? ' form-input--error' : ''}`}
              value={form.preferred_date}
              onChange={handleChange}
              disabled={submitting}
            />
            {formErrors.preferred_date && (
              <span className="field-error">{formErrors.preferred_date}</span>
            )}
          </div>

          {/* Description */}
          <div className="form-group">
            <label htmlFor="description" className="form-label">
              Description of Issue{' '}
              <span style={{ color: '#9ca3af', fontWeight: 400 }}>(optional)</span>
            </label>
            <textarea
              id="description"
              name="description"
              className="form-textarea"
              placeholder="Describe any symptoms or specific concerns about your vehicle…"
              value={form.description}
              onChange={handleChange}
              disabled={submitting}
              rows={4}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={submitting || vehicles.length === 0}
            style={{ marginTop: '0.5rem' }}
          >
            {submitting ? (
              <>
                <span className="spinner spinner--sm" />
                Booking…
              </>
            ) : (
              <>
                <CalendarCheck size={16} />
                Book Service
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
