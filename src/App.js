import React, { useState, useEffect } from 'react';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { auth } from './server/firebase';
import './App.css';
import Login from './login/Login';
import Homepage from './homepage/Homepage';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(true);

  // Escuchar cambios en el estado de autenticación
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserEmail(user.email);
        setIsAuthenticated(true);
      } else {
        setUserEmail('');
        setIsAuthenticated(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = (email) => {
    setUserEmail(email);
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUserEmail('');
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
        <Homepage userEmail={userEmail} onLogout={handleLogout} />
      )}
    </div>
  );
}

export default App;
