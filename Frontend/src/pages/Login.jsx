import { useState } from "react";
import { useNavigate ,useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";
import Icon from "../Components/Icon.jsx";
import "../styles/auth.css";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const location = useLocation();
  const [error, setError] = useState(location.state?.message || "");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // 1. State for visibility

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await login(form.email, form.password);
      if (result.success) {
        navigate("/dashboard", { replace: true });
      } else {
        setError(result.error || "Login failed");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-panel">
      <div className="auth-card">
        <div className="auth-brand">
          <h1>TechNova HRMS</h1>
          <p>Admin Portal</p>
        </div>

        <>
            <p className="auth-desc">
              Sign in to access the TechNova HRMS dashboard and administration
              tools.
            </p>
            {error && (
              <div className="alert alert-error">
                <Icon name="error" /> {error}
              </div>
            )}
            <form className="form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="Enter email"
                  required
                  autoFocus
                />
              </div>
              <div className="form-group-password-group"> {/* 2. Added wrapper class */}
                <label>Password</label>
                <input
                  type={showPassword ? "text" : "password"} // Dynamic input type
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Enter password"
                  required
                />
                {/* 4. Eye toggle button */}
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <Icon name={showPassword ? "eye_off" : "eye"} />
                </button>
              </div>
              <button
                type="submit"
                className="btn btn-primary btn-block"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner" /> Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>
            <div className="auth-hint">
              <p>Default: admin@gmail.com /123456</p>
            </div>
          </>
      </div>
    </div>
  );
}