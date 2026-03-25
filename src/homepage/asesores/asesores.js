import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../server/firebase';
import './asesores.css';

function Asesores({ userEmail }) {
  const [interesados, setInteresados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchInteresados = async () => {
      try {
        // Traer todos los interesados
        let querySnapshot = await getDocs(collection(db, 'INTERESADOS'));
        if (querySnapshot.empty) {
          querySnapshot = await getDocs(collection(db, 'interesados'));
        }

        // Procesar datos y filtrar los asignados a este asesor
        const allInteresados = [];
        querySnapshot.docs.forEach(doc => {
          const docData = doc.data();
          
          // Iterar sobre las entradas del documento
          Object.entries(docData).forEach(([key, value]) => {
            if (typeof value === 'object' && value !== null && value.asesorasignado === userEmail) {
              allInteresados.push({
                id: doc.id,
                userKey: key,
                nombre: value.nombre || 'Sin nombre',
                telefono: value.telefono || 'Sin teléfono',
                correo: value.correo || 'Sin correo',
                asesorasignado: value.asesorasignado,
                fechaAsignacion: value.fechaAsignacion
              });
            }
          });
        });

        setInteresados(allInteresados);
      } catch (error) {
        console.error('Error fetching interesados:', error);
        setError('Error al obtener interesados.');
      } finally {
        setLoading(false);
      }
    };

    fetchInteresados();
  }, [userEmail]);

  if (loading) {
    return <div className="asesores-container"><p>Cargando...</p></div>;
  }

  if (error) {
    return <div className="asesores-container"><p className="error">{error}</p></div>;
  }

  return (
    <div className="asesores-container">
      <h1>Mis Interesados</h1>
      {interesados.length === 0 ? (
        <p className="no-data">No tienes interesados asignados</p>
      ) : (
        <table className="asesores-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Teléfono</th>
              <th>Correo</th>
              <th>Fecha de Asignación</th>
            </tr>
          </thead>
          <tbody>
            {interesados.map((interesado, idx) => (
              <tr key={idx}>
                <td>{interesado.nombre}</td>
                <td>{interesado.telefono}</td>
                <td>{interesado.correo}</td>
                <td>{interesado.fechaAsignacion ? new Date(interesado.fechaAsignacion).toLocaleDateString('es-CO') : 'No asignado'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default Asesores;
