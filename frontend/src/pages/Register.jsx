import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, UserPlus } from 'lucide-react';
import { register } from '../services/api.js';

const INITIAL_FORM = {
  full_name: '',
  email: '',
  phone: '',
  password: '',
  confirm_password: '',
};

const INITIAL_ERRORS = {
  full_name: '',
  email: '',
  phone: '',
  password: '',
  confirm_password: '',
};

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState(INITIAL_ERRORS);
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear field error on change
    setErrors((prev) => ({ ...prev, [name]: '' }));
    setApiError('');
  }

  function validate() {
    const newErrors = { ...INITIAL_ERRORS };
    let valid = true;

    if (!form.full_name.trim()) {
      newErrors.full_name = 'Full name is required.';
      valid = false;
    }

    if (!form.email.trim()) {
      newErrors.email = 'Email is required.';
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Please enter a valid email address.';
      valid = false;
    }

    if (!form.phone.trim()) {
      newErrors.phone = 'Phone number is required.';
      valid = false;
    }

    if (!form.password) {
      newErrors.password = 'Password is required.';
      valid = false;
    } else if (form.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters.';
      valid = false;
    }

    if (!form.confirm_password) {
      newErrors.confirm_password = 'Please confirm your password.';
      valid = false;
    } else if (form.password !== form.confirm_password) {
      newErrors.confirm_password = 'Passwords do not match.';
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setApiError('');
    try {
      const { full_name, email, phone, password } = form;
      const data = await register({ full_name, email, phone, password });
      // Store token returned by the API
      if (data.access_token) {
        localStorage.setItem('ev_token', data.access_token);
      } else if (data.token) {
        localStorage.setItem('ev_token', data.token);
      }
      navigate('/home', { replace: true });
    } catch (err) {
      setApiError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        {/* Logo */}
        <div className="auth-card__logo">
          <Zap size={22} />
          EV Service
        </div>

        <h1 className="auth-card__title">Create Your Account</h1>
        <p className="auth-card__subtitle">
          Register to manage your electric vehicles and track maintenance services.
        </p>

        {/* API Error */}
        {apiError && (
          <div className="alert alert--error" role="alert">
            {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Full Name */}
          <div className="form-group">
            <label htmlFor="full_name" className="form-label">
              Full Name
            </label>
            <input
              id="full_name"
              name="full_name"
              type="text"
              autoComplete="name"
              className={`form-input${errors.full_name ? ' form-input--error' : ''}`}
              placeholder="Jane Doe"
              value={form.full_name}
              onChange={handleChange}
              disabled={loading}
            />
            {errors.full_name && (
              <span className="field-error">{errors.full_name}</span>
            )}
          </div>

          {/* Email */}
          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              className={`form-input${errors.email ? ' form-input--error' : ''}`}
              placeholder="jane@example.com"
              value={form.email}
              onChange={handleChange}
              disabled={loading}
            />
            {errors.email && (
              <span className="field-error">{errors.email}</span>
            )}
          </div>

          {/* Phone */}
          <div className="form-group">
            <label htmlFor="phone" className="form-label">
              Phone Number
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              className={`form-input${errors.phone ? ' form-input--error' : ''}`}
              placeholder="+1 555 000 0000"
              value={form.phone}
              onChange={handleChange}
              disabled={loading}
            />
            {errors.phone && (
              <span className="field-error">{errors.phone}</span>
            )}
          </div>

          {/* Password */}
          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              className={`form-input${errors.password ? ' form-input--error' : ''}`}
              placeholder="At least 8 characters"
              value={form.password}
              onChange={handleChange}
              disabled={loading}
            />
            {errors.password && (
              <span className="field-error">{errors.password}</span>
            )}
          </div>

          {/* Confirm Password */}
          <div className="form-group">
            <label htmlFor="confirm_password" className="form-label">
              Confirm Password
            </label>
            <input
              id="confirm_password"
              name="confirm_password"
              type="password"
              autoComplete="new-password"
              className={`form-input${errors.confirm_password ? ' form-input--error' : ''}`}
              placeholder="Re-enter your password"
              value={form.confirm_password}
              onChange={handleChange}
              disabled={loading}
            />
            {errors.confirm_password && (
              <span className="field-error">{errors.confirm_password}</span>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={loading}
            style={{ marginTop: '0.5rem' }}
          >
            {loading ? (
              <>
                <span className="spinner spinner--sm" />
                Creating account…
              </>
            ) : (
              <>
                <UserPlus size={16} />
                Create Account
              </>
            )}
          </button>
        </form>

        <p className="auth-card__footer">
          Already have an account?{' '}
          <Link to="/login">Sign in here</Link>
        </p>
      </div>
    </div>
  );
}
