import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, LogIn } from 'lucide-react';
import { login } from '../services/api.js';

const INITIAL_FORM = { email: '', password: '' };
const INITIAL_ERRORS = { email: '', password: '' };

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState(INITIAL_ERRORS);
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
    setApiError('');
  }

  function validate() {
    const newErrors = { ...INITIAL_ERRORS };
    let valid = true;

    if (!form.email.trim()) {
      newErrors.email = 'Email is required.';
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Please enter a valid email address.';
      valid = false;
    }

    if (!form.password) {
      newErrors.password = 'Password is required.';
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
      const data = await login({ email: form.email, password: form.password });
      // Accept either access_token or token field
      const token = data.access_token || data.token;
      if (token) {
        localStorage.setItem('ev_token', token);
        navigate('/home', { replace: true });
      } else {
        setApiError('Login succeeded but no token was returned. Please try again.');
      }
    } catch (err) {
      setApiError(err.message || 'Invalid email or password. Please try again.');
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

        <h1 className="auth-card__title">Sign In to Your Account</h1>
        <p className="auth-card__subtitle">
          Enter your email and password to access your garage and service records.
        </p>

        {/* API Error */}
        {apiError && (
          <div className="alert alert--error" role="alert">
            {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
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

          {/* Password */}
          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              className={`form-input${errors.password ? ' form-input--error' : ''}`}
              placeholder="Your password"
              value={form.password}
              onChange={handleChange}
              disabled={loading}
            />
            {errors.password && (
              <span className="field-error">{errors.password}</span>
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
                Signing in…
              </>
            ) : (
              <>
                <LogIn size={16} />
                Sign In
              </>
            )}
          </button>
        </form>

        <p className="auth-card__footer">
          Don&apos;t have an account?{' '}
          <Link to="/register">Create one here</Link>
        </p>
      </div>
    </div>
  );
}
