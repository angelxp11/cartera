import React, { useState, useEffect } from 'react';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../server/firebase';
import { mostrarCarga, ocultarCarga } from '../resources/carga/carga';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../server/firebase';
import Sidebar from '../sidebar/Sidebar';
import Dashboard from './dasboard/dashboard';
import AggEstudiante from './aggestudiante/aggestudiante';
import Cursos from './cursos/cursos';
import Financiamiento from './financiamiento/financiamiento';
import Interesados from './interesados/interesados';
import './Homepage.css';

function Homepage({ userEmail, userRole, onLogout }) {
  const [isOpen, setIsOpen] = useState(true);
  const [view, setView] = useState('dashboard');
  const [userName, setUserName] = useState('');

  const [students, setStudents] = useState([
    {
      cc: '12345678',
      nombre: 'Juan Pérez',
      celular: '3001112222',
      correo: 'juan@example.com',
      valorTotal: '1500.00',
      pagoInicial: '500.00',
      pendiente: '1000.00',
      estado: 'Activo',
      grado: '10',
      fechaInicio: '2026-02-01',
      fechaPago: '2026-02-15',
    },
  ]);

  // Obtener el nombre del administrador desde Firestore
  useEffect(() => {
    let unsubscribeAuth = null;

    const fetchAdminName = async () => {
      mostrarCarga();
      try {
        const adminDocRef = doc(db, 'ADMINISTRADORES', userRole);
        const adminDocSnap = await getDoc(adminDocRef);
        if (adminDocSnap.exists()) {
          const adminData = adminDocSnap.data();
          if (adminData && adminData[userEmail]) {
            let name = adminData[userEmail].name || userEmail.split('@')[0];
            // Capitalizar la primera letra y limpiar espacios
            name = name.trim().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            setUserName(name);
            return;
          }
        }
        // Fallback: usar la parte del email antes del @
        setUserName(userEmail.split('@')[0]);
      } catch (err) {
        console.error('Error fetching admin name:', err);
        // Fallback: usar la parte del email antes del @
        setUserName(userEmail.split('@')[0]);
      } finally {
        ocultarCarga();
      }
    };

    if (!userEmail) return undefined;

    // Si el usuario ya está autenticado en el cliente, podemos leer el doc.
    if (auth && auth.currentUser) {
      fetchAdminName();
    } else {
      // Si aún no hay currentUser, esperar al evento de auth
      unsubscribeAuth = onAuthStateChanged(auth, (user) => {
        if (user) {
          fetchAdminName();
        }
      });
    }

    return () => {
      if (unsubscribeAuth) unsubscribeAuth();
    };
  }, [userEmail]);

  const addStudent = (s) => setStudents((arr) => [s, ...arr]);

  const toggleSidebar = () => setIsOpen((s) => !s);

  return (
    <div className="homepage-container" style={{ paddingLeft: isOpen ? '250px' : '80px', transition: 'padding-left var(--transition-normal)' }}>
      <Sidebar userEmail={userEmail} userRole={userRole} onLogout={onLogout} isOpen={isOpen} toggleSidebar={toggleSidebar} onNavigate={setView} activeView={view} />
      <div className="homepage-content">
        <header className="homepage-header">
          <h1>¡Bienvenido, {userName}!</h1>
          <p>Usuario: {userEmail}</p>
        </header>
        <main className="homepage-main">
          {view === 'dashboard' && <Dashboard students={students} />}
          {view === 'add' && <AggEstudiante onAdd={addStudent} userName={userName} />}
          {view === 'courses' && <Cursos />}
          {view === 'financiamiento' && <Financiamiento userName={userName} />}
          {view === 'interesados' && <Interesados userRole={userRole} />}
        </main>
      </div>
    </div>
  );
}

export default Homepage;
