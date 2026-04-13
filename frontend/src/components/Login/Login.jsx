import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './Login.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login, register, error, clearError } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    clearError();
    setLoading(true);

    try {
      const success = await login(email, password);
      setLoading(false);

      if (success) {
        console.log('✅ Login exitoso, redirigiendo...');
        navigate('/dashboard');
      } else {
        console.error('❌ Login falló');
      }
    } catch (err) {
      console.error('❌ Error en login:', err);
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    clearError();
    setLoading(true);

    const success = await register(email, password, firstName, lastName);
    setLoading(false);

    if (success) {
      navigate('/dashboard');
    }
  };

  const handleToggleMode = () => {
    setIsRegistering(!isRegistering);
    clearError();
    setEmail('');
    setPassword('');
    setFirstName('');
    setLastName('');
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">🌿</div>
          <h1>Sistema de Gestión de Flotilla</h1>
          <p className="login-subtitle">Control Operativo Ecológico</p>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        {!isRegistering ? (
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label htmlFor="email">Correo Electrónico</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@verdemex.com"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Contraseña</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg login-btn"
              disabled={loading}
            >
              {loading ? <span className="loading"></span> : 'Iniciar Sesión'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister}>
            <div className="form-group">
              <label htmlFor="firstName">Nombre</label>
              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Juan"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="lastName">Apellido</label>
              <input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Pérez"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email-reg">Correo Electrónico</label>
              <input
                id="email-reg"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@verdemex.com"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password-reg">Contraseña (min 6 caracteres)</label>
              <input
                id="password-reg"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                minLength="6"
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg login-btn"
              disabled={loading}
            >
              {loading ? <span className="loading"></span> : 'Registrarse'}
            </button>
          </form>
        )}

        <div className="login-footer">
          <p>
            {isRegistering ? '¿Ya tienes cuenta? ' : '¿No tienes cuenta? '}
            <button
              type="button"
              className="link-btn"
              onClick={handleToggleMode}
              disabled={loading}
            >
              {isRegistering ? 'Inicia Sesión' : 'Regístrate'}
            </button>
          </p>
        </div>
      </div>

      <div className="login-decorative">
        <div className="leaf leaf-1">🍃</div>
        <div className="leaf leaf-2">🍂</div>
        <div className="leaf leaf-3">🌱</div>
      </div>
    </div>
  );
}
