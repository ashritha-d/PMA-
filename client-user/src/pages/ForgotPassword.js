import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiMail, FiLock, FiEye, FiEyeOff, FiArrowLeft, FiCheckCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const ForgotPassword = () => {
  const [step, setStep] = useState(1); // 1=email, 2=otp, 3=new password, 4=done
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success('OTP sent to your email!');
      setStep(2);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = (e) => {
    e.preventDefault();
    if (otp.length !== 6) { toast.error('Enter the 6-digit OTP'); return; }
    setStep(3);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setStep(4);
    } catch (err) {
      toast.error(err.message);
      if (err.message.toLowerCase().includes('expired') || err.message.toLowerCase().includes('invalid')) {
        setStep(2);
      }
    } finally {
      setLoading(false);
    }
  };

  const stepLabel = ['', 'Enter Email', 'Enter OTP', 'New Password', 'Done'];

  return (
    <div className="auth-page">
      <div style={{ width: '100%', padding: '0 24px' }}>
        <div className="auth-card">
          {/* Logo */}
          <div className="auth-logo">
            <div style={{ fontSize: '2rem', fontFamily: 'Playfair Display, serif', fontWeight: 700, color: 'var(--primary)' }}>
              Prop<span style={{ color: 'var(--secondary)' }}>Manage</span>
            </div>
          </div>

          {/* Step indicators */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
            {[1, 2, 3].map(s => (
              <div key={s} style={{
                width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700,
                background: step > s ? 'var(--primary)' : step === s ? 'var(--primary)' : '#e5e7eb',
                color: step >= s ? 'white' : '#9ca3af',
                transition: 'all 0.3s'
              }}>{s}</div>
            ))}
          </div>

          <h2 className="auth-title" style={{ textAlign: 'center' }}>
            {step === 4 ? 'All Done!' : 'Reset Password'}
          </h2>
          <p className="auth-subtitle" style={{ textAlign: 'center', marginBottom: 28 }}>
            {step === 1 && "Enter your registered email to receive an OTP"}
            {step === 2 && `We sent a 6-digit OTP to ${email}`}
            {step === 3 && "Create a new password for your account"}
            {step === 4 && "Your password has been reset successfully"}
          </p>

          {/* ── STEP 1: Email ── */}
          {step === 1 && (
            <form onSubmit={handleSendOTP}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div style={{ position: 'relative' }}>
                  <FiMail style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                  <input
                    className="form-input" style={{ paddingLeft: 40 }}
                    type="email" required placeholder="you@example.com"
                    value={email} onChange={e => setEmail(e.target.value)}
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: 8 }} disabled={loading}>
                {loading ? 'Sending OTP...' : 'Send OTP'}
              </button>
            </form>
          )}

          {/* ── STEP 2: OTP ── */}
          {step === 2 && (
            <form onSubmit={handleVerifyOTP}>
              <div className="form-group">
                <label className="form-label">6-Digit OTP</label>
                <input
                  className="form-input"
                  style={{ textAlign: 'center', fontSize: '1.6rem', letterSpacing: 12, fontWeight: 700 }}
                  type="text" inputMode="numeric" maxLength={6} required
                  placeholder="······"
                  value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                />
                <p style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginTop: 6, textAlign: 'center' }}>
                  OTP expires in 10 minutes.{' '}
                  <button type="button" onClick={() => { setStep(1); setOtp(''); }}
                    style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem', padding: 0 }}>
                    Resend
                  </button>
                </p>
              </div>
              <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: 8 }}>
                Verify OTP
              </button>
              <button type="button" onClick={() => setStep(1)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--gray-500)', cursor: 'pointer', margin: '12px auto 0', fontSize: '0.9rem' }}>
                <FiArrowLeft /> Back
              </button>
            </form>
          )}

          {/* ── STEP 3: New Password ── */}
          {step === 3 && (
            <form onSubmit={handleResetPassword}>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <div style={{ position: 'relative' }}>
                  <FiLock style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                  <input
                    className="form-input" style={{ paddingLeft: 40, paddingRight: 40 }}
                    type={showPass ? 'text' : 'password'} required minLength={6}
                    placeholder="Min. 6 characters"
                    value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--gray-400)', cursor: 'pointer' }}>
                    {showPass ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <div style={{ position: 'relative' }}>
                  <FiLock style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                  <input
                    className="form-input" style={{ paddingLeft: 40, paddingRight: 40 }}
                    type={showConfirm ? 'text' : 'password'} required
                    placeholder="Repeat password"
                    value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                    style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--gray-400)', cursor: 'pointer' }}>
                    {showConfirm ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>
              <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: 8 }} disabled={loading}>
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          )}

          {/* ── STEP 4: Done ── */}
          {step === 4 && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <FiCheckCircle size={36} color="#059669" />
              </div>
              <p style={{ color: '#555', marginBottom: 28 }}>
                Your password has been updated. You can now log in with your new password.
              </p>
              <button className="btn btn-primary btn-full" onClick={() => navigate('/login')}>
                Go to Login
              </button>
            </div>
          )}

          {step !== 4 && (
            <p style={{ textAlign: 'center', marginTop: 24, fontSize: '0.9rem', color: 'var(--gray-500)' }}>
              Remember your password? <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>Sign In</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
