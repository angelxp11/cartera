import React from 'react';
import './Sidebar.css';
import logo from '../resources/images/logo.png'; // larger logo used when sidebar expanded
import smallLogo from '../resources/images/logo512.png'; // 512x512 logo for collapsed state (public folder)  

function Sidebar({ userEmail, userRole, onLogout, isOpen, toggleSidebar, onNavigate, activeView }) {
  return (
    <aside className={`csb-container ${isOpen ? 'csb-open' : 'csb-closed'}`}>
      
      {/* HEADER */}
      <div className="csb-header">
        {/* logo replaces toggle button; clicking it toggles sidebar */}
        <img
          src={isOpen ? logo : smallLogo}
          alt="Logo"
          className="csb-logo csb-toggle-logo"
          onClick={toggleSidebar}
          style={{ cursor: 'pointer' }}
        />
      </div>

      {/* NAV */}
      <nav className="csb-nav" aria-label="Main navigation">
        {userRole === 'ADMINISTRADORES' && (
          <>
            <button
              type="button"
              className={`csb-nav-item ${activeView === 'dashboard' ? 'csb-active' : ''}`}
              onClick={() => onNavigate('dashboard')}
            >
              <span className="csb-nav-icon">📊</span>
              {isOpen && <span className="csb-nav-label">DASHBOARD</span>}
            </button>

            <button
              type="button"
              className={`csb-nav-item ${activeView === 'add' ? 'csb-active' : ''}`}
              onClick={() => onNavigate('add')}
            >
              <span className="csb-nav-icon">🧑‍🎓</span>
              {isOpen && <span className="csb-nav-label">AGREGAR ESTUDIANTE</span>}
            </button>

            <button
              type="button"
              className={`csb-nav-item ${activeView === 'courses' ? 'csb-active' : ''}`}
              onClick={() => onNavigate('courses')}
            >
              <span className="csb-nav-icon">📚</span>
              {isOpen && <span className="csb-nav-label">MIS CURSOS</span>}
            </button>

            <button
              type="button"
              className={`csb-nav-item ${activeView === 'financiamiento' ? 'csb-active' : ''}`}
              onClick={() => onNavigate('financiamiento')}
            >
              <span className="csb-nav-icon">💰</span>
              {isOpen && <span className="csb-nav-label">FINANCIAMIENTO</span>}
            </button>

            <button
              type="button"
              className={`csb-nav-item ${activeView === 'interesados' ? 'csb-active' : ''}`}
              onClick={() => onNavigate('interesados')}
            >
              <span className="csb-nav-icon">👥</span>
              {isOpen && <span className="csb-nav-label">INTERESADOS</span>}
            </button>
          </>
        )}

        {userRole === 'ASESOR' && (
          <button
            type="button"
            className={`csb-nav-item ${activeView === 'interesados' ? 'csb-active' : ''}`}
            onClick={() => onNavigate('interesados')}
          >
            <span className="csb-nav-icon">👥</span>
            {isOpen && <span className="csb-nav-label">INTERESADOS</span>}
          </button>
        )}

      </nav>

      {/* FOOTER */}
      <div className="csb-footer">
        {isOpen && (
          <div className="csb-user-info">
            <p className="csb-user-name">USUARIO</p>
            <p className="csb-user-email">{userEmail}</p>
          </div>
        )}

        <button className="csb-logout-btn" onClick={onLogout}>
          <span className="csb-nav-icon">🚪</span>
          {isOpen && <span className="csb-nav-label">CERRAR SESIÓN</span>}
        </button>
      </div>

    </aside>
  );
}

export default Sidebar;