import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import { adminLogin } from '../api/admin';
import Alert from '../components/Alert';
import Spinner from '../components/Spinner';

export default function AdminLogin() {
  const { admin, login } = useAdminAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (admin) navigate('/admin/dashboard', { replace: true });
  }, [admin, navigate]);

  const validate = () => {
    const e = {};
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Enter a valid email.';
    if (form.password.length < 6) e.password = 'Password must be at least 6 characters.';
    return e;
  };

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setErrors((prev) => ({ ...prev, [e.target.name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSubmitting(true);
    setError('');
    try {
      const data = await adminLogin(form.email, form.password);
      login(data.token, data.admin);
      navigate('/admin/dashboard', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-wrapper">
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-card__header">
            <span className="auth-card__icon">⬡</span>
            <h1>Admin Login</h1>
            <p>Sign in to access the HotelPro dashboard</p>
          </div>

          {error && <Alert type="error" message={error} onClose={() => setError('')} />}

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email" name="email" type="email"
                placeholder="admin@hotelpro.com"
                value={form.email} onChange={handleChange}
                className={errors.email ? 'input--error' : ''}
                autoComplete="email"
              />
              {errors.email && <span className="field-error">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password" name="password" type="password"
                placeholder="••••••••"
                value={form.password} onChange={handleChange}
                className={errors.password ? 'input--error' : ''}
                autoComplete="current-password"
              />
              {errors.password && <span className="field-error">{errors.password}</span>}
            </div>

            <button type="submit" className="btn btn--primary btn--full btn--lg" disabled={submitting}>
              {submitting ? <><Spinner size="sm" /> Signing in…</> : 'Sign In'}
            </button>
          </form>

          <div className="auth-card__help">
            <p>
              <strong>First time?</strong> Create an admin account via the backend seed script or 
              use the <code>POST /api/admin/seed</code> endpoint to seed rooms, then create your 
              admin account through MongoDB Atlas directly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
