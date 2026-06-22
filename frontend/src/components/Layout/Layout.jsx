import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './Layout.css';

const SECTION_METADATA = [
  { match: '/gasoline', section: 'Gasolina', caption: 'Bitacora global de cargas, kilometrajes y documentos' },
  { match: '/maintenance', section: 'Mantenimiento', caption: 'Bitacora global de servicios y proximos cambios de aceite' },
  { match: '/vehicles', section: 'Vehiculos', caption: 'Gestion de flotilla, documentos y operacion diaria' },
  { match: '/drivers', section: 'Conductores', caption: 'Control de perfiles, desempeno y asignaciones' },
  { match: '/orders', section: 'Pedidos', caption: 'Seguimiento operativo y trazabilidad de entregas' },
  { match: '/analytics', section: 'Analytics', caption: 'Indicadores y visibilidad del negocio' },
  { match: '/users', section: 'Usuarios', caption: 'Administracion de accesos y perfiles internos' },
  { match: '/profile', section: 'Perfil', caption: 'Informacion de cuenta y preferencias' },
  { match: '/dashboard', section: 'Dashboard', caption: 'Resumen ejecutivo del sistema' }
];

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/gasoline', label: 'Gasolina', icon: '⛽' },
    { path: '/maintenance', label: 'Mantenimiento', icon: '🛠️' },
    { path: '/vehicles', label: 'Vehiculos', icon: '🚚' },
    { path: '/drivers', label: 'Conductores', icon: '👨‍✈️' },
    { path: '/orders', label: 'Pedidos', icon: '📦' },
    { path: '/analytics', label: 'Analytics', icon: '📈' },
    { path: '/users', label: 'Usuarios', icon: '👥' }
  ];

  const currentSection = SECTION_METADATA.find(({ match }) => location.pathname.startsWith(match)) || {
    section: 'Panel',
    caption: 'Administracion operativa de Verdemex'
  };

  const displayName = user?.name?.trim() || 'Admin';
  const displayRole = user?.role?.trim() || 'Administrador';
  const displayAvatar = user?.avatar || displayName.charAt(0).toUpperCase();

  return (
    <div className='layout'>
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className='sidebar-header'>
          <div className='logo'>
            <span className='logo-icon'>🌿</span>
            {sidebarOpen && (
              <div className='logo-copy'>
                <span className='logo-text'>Verdemex</span>
                <span className='logo-subtext'>Fleet OS</span>
              </div>
            )}
          </div>
          <button
            type='button'
            className='toggle-sidebar'
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? 'Colapsar menu lateral' : 'Expandir menu lateral'}
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>

        <nav className='sidebar-nav'>
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-item ${isActive ? 'active' : ''}`}
                title={!sidebarOpen ? item.label : ''}
              >
                <span className='nav-icon'>{item.icon}</span>
                {sidebarOpen && <span className='nav-label'>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className='sidebar-footer'>
          <div className='user-info'>
            <div className='user-avatar'>{displayAvatar}</div>
            {sidebarOpen && (
              <div className='user-details'>
                <p className='user-name'>{displayName}</p>
                <p className='user-role'>{displayRole}</p>
              </div>
            )}
          </div>
          <button className='sidebar-logout-btn' onClick={handleLogout}>
            <span>Salir</span>
          </button>
        </div>
      </aside>

      <div className='main-content'>
        <header className='header'>
          <div className='header-left'>
            <span className='header-eyebrow'>Sistema de Gestion de Flotilla</span>
            <h2>{currentSection.section}</h2>
            <p className='header-caption'>{currentSection.caption}</p>
          </div>
          <div className='header-right'>
            <div className='header-welcome'>
              <span className='welcome-label'>Bienvenido,</span>
              <strong className='welcome-name'>{displayName}</strong>
            </div>
            {!sidebarOpen && (
              <button className='sidebar-logout-btn compact' onClick={handleLogout}>
                <span>Salir</span>
              </button>
            )}
          </div>
        </header>

        <main className='page-content'>
          {children}
        </main>
      </div>
    </div>
  );
}
