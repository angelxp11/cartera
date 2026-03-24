import React, { useState, useEffect } from 'react';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { getDoc, doc } from 'firebase/firestore';
import { auth, db } from './server/firebase';
import './App.css';
import Login from './login/Login';
import Homepage from './homepage/Homepage';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState('');
  const [loading, setLoading] = useState(true);

  // Escuchar cambios en el estado de autenticación
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserEmail(user.email);
        // Obtener rol consultando Firestore
        const roles = ['ADMINISTRADORES', 'ASESOR'];
        let roleFound = null;
        for (const role of roles) {
          const docRef = doc(db, role, role);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data && data[user.email]) {
              roleFound = role;
              break;
            }
          }
        }
        setUserRole(roleFound);
        setIsAuthenticated(true);
      } else {
        setUserEmail('');
        setUserRole('');
        setIsAuthenticated(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = (email, role) => {
    setUserEmail(email);
    setUserRole(role);
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUserEmail('');
      setUserRole('');
      setIsAuthenticated(false);
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: 'var(--color-gray-900)',
        color: 'var(--color-gray-50)'
      }}>
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <div className="App">
      {!isAuthenticated ? (
        <Login onLogin={handleLogin} />
      ) : (
        <Homepage userEmail={userEmail} userRole={userRole} onLogout={handleLogout} />
      )}
    </div>
  );
}

export default App;
