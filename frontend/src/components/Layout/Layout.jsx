import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './Layout.css';

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/vehicles', label: 'Vehículos', icon: '🚚' },
    { path: '/drivers', label: 'Conductores', icon: '👨‍✈️' },
    { path: '/orders', label: 'Pedidos', icon: '📦' },
    { path: '/analytics', label: 'Analytics', icon: '📈' },
    { path: '/users', label: 'Usuarios', icon: '👥' },
  ];

  return (
    <div className="layout">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="logo">
            <span className="logo-icon">🌿</span>
            {sidebarOpen && <span className="logo-text">Verdemex</span>}
          </div>
          <button
            className="toggle-sidebar"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className="nav-item"
              title={!sidebarOpen ? item.label : ''}
            >
              <span className="nav-icon">{item.icon}</span>
              {sidebarOpen && <span className="nav-label">{item.label}</span>}
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{user?.avatar}</div>
            {sidebarOpen && (
              <div className="user-details">
                <p className="user-name">{user?.name}</p>
                <p className="user-role">{user?.role}</p>
              </div>
            )}
          </div>
          {sidebarOpen && (
            <button className="btn btn-danger btn-sm" onClick={handleLogout}>
              Salir
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="main-content">
        {/* Header */}
        <header className="header">
          <div className="header-left">
            <h2>Sistema de Gestión de Flotilla</h2>
          </div>
          <div className="header-right">
            <span className="user-greeting">
              Bienvenido, {user?.name}
            </span>
            {!sidebarOpen && (
              <button className="btn btn-danger btn-sm" onClick={handleLogout}>
                Salir
              </button>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="page-content">
          {children}
        </main>
      </div>
    </div>
  );
}
