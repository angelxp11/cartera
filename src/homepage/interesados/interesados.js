import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../server/firebase';
import * as XLSX from 'xlsx';
import './interesados.css';

function Interesados({ userRole }) {
  const [interesados, setInteresados] = useState([]); // ahora será un array de objetos {email, name}
  const [asesores, setAsesores] = useState([]); // ahora será un array de objetos {email, name}
  const [asesoresMap, setAsesoresMap] = useState({}); // mapa email -> name
  const [assigning, setAssigning] = useState(null); // id del interesado y usuario que se está asignando
  const [loadingInteresados, setLoadingInteresados] = useState(true);
  const [errorInteresados, setErrorInteresados] = useState('');
  const [filtroAsesor, setFiltroAsesor] = useState('todos'); // 'todos', 'asignados', 'no-asignados'

  useEffect(() => {
    if (userRole !== 'ADMINISTRADORES') {
      setLoadingInteresados(false);
      return;
    }

    const fetchInteresados = async () => {
      try {
        // La colección en Firestore es INTERESADOS (mayúsculas)
        let querySnapshot = await getDocs(collection(db, 'INTERESADOS'));
        if (querySnapshot.empty) {
          // fallback por si existiera en minúsculas
          querySnapshot = await getDocs(collection(db, 'interesados'));
        }

        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setInteresados(data);
      } catch (error) {
        console.error('Error fetching interesados:', error);
        setErrorInteresados('Error al obtener interesados. Revisa consola y reglas Firestore.');
      } finally {
        setLoadingInteresados(false);
      }
    };

    const fetchAsesores = async () => {
      try {
        const docRef = doc(db, 'ADMINISTRADORES', 'ASESOR');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          const emails = Object.keys(data);
          const map = {};
          
          emails.forEach(email => {
            map[email] = data[email].name || email.split('@')[0];
          });
          
          setAsesores(emails);
          setAsesoresMap(map);
        }
      } catch (_error) {
        // Ocultar mensaje de error en consola por permisos no críticos.
        // Si falla permisos, permitimos operación sin select de asesor
        setAsesores([]);
        setAsesoresMap({});
      }
    };

    fetchInteresados();
    fetchAsesores();
  }, [userRole]);

  const handleExport = () => {
    const data = [];

    interesados.forEach(interesado => {
      const fecha = interesado.fecha ? new Date(interesado.fecha.seconds * 1000) : new Date();
      const fechaStr = `${fecha.getDate()} ${fecha.toLocaleString('es-ES', { month: 'long' })} ${fecha.getFullYear()}`;

      Object.entries(interesado).forEach(([key, value]) => {
        if (key === 'fecha' || key === 'creado' || key === 'id') {
          return;
        }

        if (typeof value === 'object' && value !== null) {
          const row = {
            'Fecha': fechaStr,
            'Nombre': value.nombre || 'Dato no registrado',
            'Teléfono': value.telefono || 'Dato no registrado',
            'Correo': value.correo || 'Dato no registrado',
            'Asesor Asignado': value.asesorasignado ? (asesoresMap[value.asesorasignado] || value.asesorasignado) : 'No asignado'
          };
          data.push(row);
        }
      });
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Interesados');
    XLSX.writeFile(wb, 'interesados.xlsx');
  };

  const handleAssign = async (interesadoId, userKey, asesorEmail) => {
    const asesorName = asesoresMap[asesorEmail] || asesorEmail;
    const confirmMessage = `¿Estás seguro de asignar a ${asesorName} como asesor para este interesado?`;
    
    if (!window.confirm(confirmMessage)) {
      return; // Si el usuario cancela, no hacer nada
    }

    try {
      // Obtener el documento actual
      const docRef = doc(db, 'INTERESADOS', interesadoId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const currentData = docSnap.data();
        // Actualizar el campo específico dentro del mapa del usuario
        const updatedData = {
          ...currentData,
          [userKey]: {
            ...currentData[userKey],
            asesorasignado: asesorEmail
          }
        };
        
        await updateDoc(docRef, updatedData);
        
        // Actualizar el estado local
        setInteresados(prev => prev.map(int => 
          int.id === interesadoId 
            ? { 
                ...int, 
                [userKey]: {
                  ...int[userKey],
                  asesorasignado: asesorEmail
                }
              } 
            : int
        ));
        setAssigning(null);
      }
    } catch (error) {
      console.error('Error assigning asesor:', error);
      alert('Error al asignar asesor. Inténtalo de nuevo.');
    }
  };

  // Calcular estadísticas de asignación
  const calcularEstadisticas = () => {
    let asignados = 0;
    let noAsignados = 0;

    interesados.forEach(interesado => {
      Object.entries(interesado).forEach(([key, value]) => {
        if (key !== 'fecha' && key !== 'creado' && key !== 'id' && typeof value === 'object' && value !== null) {
          if (value.asesorasignado) {
            asignados++;
          } else {
            noAsignados++;
          }
        }
      });
    });

    return { asignados, noAsignados, total: asignados + noAsignados };
  };

  // Filtrar interesados según el filtro seleccionado
  const filtrarInteresados = () => {
    if (filtroAsesor === 'todos') return interesados;

    return interesados.map(interesado => {
      // Filtrar solo los usuarios que cumplan con el criterio
      const usuariosFiltrados = Object.entries(interesado).filter(([key, value]) => {
        if (key === 'fecha' || key === 'creado' || key === 'id') return true; // mantener propiedades del documento
        if (typeof value !== 'object' || value === null) return false;

        if (filtroAsesor === 'asignados') {
          return value.asesorasignado;
        } else if (filtroAsesor === 'no-asignados') {
          return !value.asesorasignado;
        }
        return true;
      });

      // Si no hay usuarios que cumplan el filtro (solo propiedades del documento), no incluir
      const tieneUsuariosFiltrados = usuariosFiltrados.some(([key, value]) =>
        key !== 'fecha' && key !== 'creado' && key !== 'id' &&
        typeof value === 'object' && value !== null
      );

      if (!tieneUsuariosFiltrados) return null;

      // Reconstruir el objeto con la estructura correcta
      return Object.fromEntries(usuariosFiltrados);
    }).filter(Boolean);
  };

  if (userRole !== 'ADMINISTRADORES') {
    return <div>No tienes permisos para ver esta sección.</div>;
  }

  if (loadingInteresados) {
    return <div className="interesados-container"><p>Cargando interesados...</p></div>;
  }

  if (errorInteresados) {
    return <div className="interesados-container"><p>{errorInteresados}</p></div>;
  }

  if (interesados.length === 0) {
    return <div className="interesados-container"><h2>Interesados</h2><p>No hay interesados registrados.</p></div>;
  }

  const { asignados, noAsignados, total } = calcularEstadisticas();
  const interesadosFiltrados = filtrarInteresados();

  return (
    <div className="interesados-container">
      <div className="interesados-header">
        <h2>Interesados</h2>
        <button className="export-btn" onClick={handleExport}>
          Exportar a Excel
        </button>
      </div>

      {/* Estadísticas y Filtros */}
      <div className="filtro-section">
        <div className="estadisticas">
          <span className="stat-item">
            <strong>Total:</strong> {total}
          </span>
          <span className="stat-item asignados">
            <strong>Asignados:</strong> {asignados}
          </span>
          <span className="stat-item no-asignados">
            <strong>No Asignados:</strong> {noAsignados}
          </span>
        </div>

        <div className="filtro-buttons">
          <button
            className={`filtro-btn ${filtroAsesor === 'todos' ? 'active' : ''}`}
            onClick={() => setFiltroAsesor('todos')}
          >
            Todos ({total})
          </button>
          <button
            className={`filtro-btn ${filtroAsesor === 'asignados' ? 'active' : ''}`}
            onClick={() => setFiltroAsesor('asignados')}
          >
            Asignados ({asignados})
          </button>
          <button
            className={`filtro-btn ${filtroAsesor === 'no-asignados' ? 'active' : ''}`}
            onClick={() => setFiltroAsesor('no-asignados')}
          >
            No Asignados ({noAsignados})
          </button>
        </div>
      </div>

      <div className="interesados-grid">
        {interesadosFiltrados.map(interesado => {
          const fecha = interesado.fecha ? new Date(interesado.fecha.seconds * 1000) : new Date();
          const dia = fecha.getDate();
          const mes = fecha.toLocaleString('es-ES', { month: 'long' });
          const año = fecha.getFullYear();

          // Obtener todos los campos de tipo mapa (usuarios)
          const usuarios = Object.entries(interesado).filter(([key, value]) =>
            key !== 'fecha' && key !== 'creado' && key !== 'id' &&
            typeof value === 'object' && value !== null
          );

          return (
            <div key={interesado.id} className="interesado-card">
              <div className="card-header">
                <span className="fecha">{dia} {mes} {año}</span>
              </div>
              <div className="card-body">
                {usuarios.map(([key, value], index) => (
                  <div key={key}>
                    <div className="usuario-section">
                      <p><strong>Nombre:</strong> {value.nombre || 'Dato no registrado'}</p>
                      <p><strong>Teléfono:</strong> {value.telefono || 'Dato no registrado'}</p>
                      <p><strong>Correo:</strong> {value.correo || 'Dato no registrado'}</p>
                      <button
                        className="assign-btn"
                        onClick={() => setAssigning(assigning === `${interesado.id}-${key}` ? null : `${interesado.id}-${key}`)}
                      >
                        Asignar Asesor
                      </button>
                      {assigning === `${interesado.id}-${key}` && (
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              handleAssign(interesado.id, key, e.target.value);
                            }
                          }}
                          defaultValue=""
                        >
                          <option value="">Seleccionar Asesor</option>
                          {asesores.map(email => (
                            <option key={email} value={email}>{asesoresMap[email] || email}</option>
                          ))}
                        </select>
                      )}
                      {value.asesorasignado && (
                        <p><strong>Asesor Asignado:</strong> {asesoresMap[value.asesorasignado] || value.asesorasignado}</p>
                      )}
                    </div>
                    {index < usuarios.length - 1 && <hr className="usuario-divider" />}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

 }
export default Interesados;
