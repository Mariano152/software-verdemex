import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './Login.css';

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login, error, clearError } = useAuth();

  const handleLogin = async (event) => {
    event.preventDefault();
    clearError();
    setLoading(true);

    try {
      const authUser = await login(identifier, password);
      if (authUser) {
        const nextPath = authUser.role === 'conductor' ? '/profile' : '/dashboard';
        navigate(nextPath);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">🌿</div>
          <h1>Sistema de Gestion de Flotilla</h1>
          <p className="login-subtitle">Control Operativo Ecologico</p>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="identifier">Usuario o correo</label>
            <input
              id="identifier"
              type="text"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder="admin o admin@verdemex.local"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Contrasena</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="********"
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg login-btn"
            disabled={loading}
          >
            {loading ? <span className="loading"></span> : 'Iniciar sesion'}
          </button>
        </form>
      </div>

      <div className="login-decorative">
        <div className="leaf leaf-1">🍃</div>
        <div className="leaf leaf-2">🍂</div>
        <div className="leaf leaf-3">🌱</div>
      </div>
    </div>
  );
}
