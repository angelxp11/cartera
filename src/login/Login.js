import React, { useState } from 'react';
import { signInWithEmailAndPassword, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getDoc, doc } from 'firebase/firestore';
import { auth, db } from '../server/firebase';
import './Login.css';

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validación básica
    if (!email || !password) {
      setError('Por favor completa todos los campos');
      setLoading(false);
      return;
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Por favor ingresa un email válido');
      setLoading(false);
      return;
    }

    // Validar contraseña (mínimo 6 caracteres)
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      setLoading(false);
      return;
    }

    try {
      // Persistir la sesión en el navegador (permanece después de cerrar la pestaña)
      await setPersistence(auth, browserLocalPersistence);

      // Autenticar con Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Validar rol consultando Firestore
      let roleFound = 'ASESOR'; // Por defecto asesor

      // Primero verificar si es administrador
      const adminDocRef = doc(db, 'ADMINISTRADORES', 'ADMINISTRADORES');
      const adminDocSnap = await getDoc(adminDocRef);

      if (adminDocSnap.exists()) {
        const data = adminDocSnap.data();
        if (data && data[user.email]) {
          roleFound = 'ADMINISTRADORES';
        }
      }

      // Guardar credenciales y rol en localStorage
      localStorage.setItem('userEmail', user.email);
      localStorage.setItem('userRole', roleFound);

      // Si tiene rol, llamar a onLogin con el email y el rol
      onLogin(user.email, roleFound);
    } catch (err) {
      console.error('Error:', err);
      if (err.code === 'auth/user-not-found') {
        setError('Usuario no encontrado');
      } else if (err.code === 'auth/wrong-password') {
        setError('Contraseña incorrecta');
      } else if (err.code === 'auth/invalid-email') {
        setError('Email inválido');
      } else {
        setError('Error al iniciar sesión: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>Iniciar Sesión</h1>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ingresa tu contraseña"
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="btn-login" disabled={loading}>
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <p className="login-footer">
          ¿No tienes cuenta? <a href="#signup">Regístrate aquí</a>
        </p>
      </div>
    </div>
  );
}

export default Login;
