import React, { useState, useMemo, useEffect } from 'react';
import './Dashboard.css';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../server/firebase';
import { mostrarCarga, ocultarCarga } from '../../resources/carga/carga';

function Dashboard() {
  const [allStudents, setAllStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()); // 0-11
  const [quincenaFilter, setQuincenaFilter] = useState('1'); // '1' = 1-15, '2' = 16-31
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('Todos'); // Todos, Pendientes, Pagados, Abonos
  const itemsPerPage = 10;

  // Generar lista de años disponibles (últimos 5 años y próximos 2)
  const currentYear = new Date().getFullYear();
  const yearsAvailable = Array.from({ length: 8 }, (_, i) => currentYear - 5 + i);

  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  // Formatear número
  const formatNumber = (num) => {
    if (!num && num !== 0) return '';
    return new Intl.NumberFormat('es-ES').format(num);
  };

  // Obtener estudiantes activos
  useEffect(() => {
    const fetchStudents = async () => {
      mostrarCarga();
      try {
        setLoading(true);
        const snapshot = await getDocs(collection(db, 'ESTUDIANTES_ACTIVOS'));
        const estudiantesData = [];
        const cursosRegistro = []; // Para guardar info de pagos iniciales

        snapshot.forEach((doc) => {
          const estudiante = doc.data();
          const cc = doc.id;

          // Procesar cada curso del estudiante
          if (estudiante.cursos) {
            Object.entries(estudiante.cursos).forEach(([cursoId, cursoData]) => {
              // Convertir timestamp de fechaRegistro
              let fechaRegistro = null;
              if (cursoData.fechaRegistro) {
                fechaRegistro = cursoData.fechaRegistro.toDate ? cursoData.fechaRegistro.toDate() : new Date(cursoData.fechaRegistro);
              }

              // Si es financiado, procesar cada cuota
              if (cursoData.tipoPago === 'FINANCIADO' && cursoData.cuotas) {
                // Guardar info del pago inicial
                if (cursoData.pagoInicial > 0 && fechaRegistro) {
                  cursosRegistro.push({
                    cc,
                    nombre: estudiante.nombreCompleto || '',
                    celular: estudiante.celular || '',
                    correo: estudiante.correo || '',
                    tipo: 'PAGO_INICIAL',
                    valor: cursoData.pagoInicial,
                    fechaPago: fechaRegistro,
                    curso: cursoId,
                    cuotaKey: 'Pago Inicial',
                    estado: 'PAGADO', // El pago inicial siempre se recibe al registrar
                    responsable: '-',
                    factura: '-',
                    responsableRegistro: cursoData.responsableRegistro || '-'
                  });
                }

                // Procesar cada cuota
                Object.entries(cursoData.cuotas).forEach(([cuotaKey, cuota]) => {
                  // Convertir timestamp de Firebase a Date
                  let fechaPago = null;
                  if (cuota.fecha) {
                    fechaPago = cuota.fecha.toDate ? cuota.fecha.toDate() : new Date(cuota.fecha);
                  }

                  // fila representando el estado actual de la cuota (pendiente o pagada)
                  // when a cuota is fully pagada the stored valor may be 0, which
                  // hides the amount from the dashboard. Instead, derive the display
                  // value from the sum of abonos if present. Also tag tipo for clarity.
                  let displayValue = cuota.valor || 0;
                  let tipoRegistro = undefined;
                  if (cuota.estado === 'PAGADO') {
                    // if we've got abonos recorded, use their total as the amount
                    if ((!displayValue || displayValue === 0) && cuota.abonos && cuota.abonos.length > 0) {
                      displayValue = cuota.abonos.reduce((a, b) => a + (b.valor || 0), 0);
                    }
                    // if there were abonos this is effectively a payment event
                    if (cuota.abonos && cuota.abonos.length > 0) {
                      tipoRegistro = 'PAGO_TOTAL';
                    }
                  }

                  estudiantesData.push({
                    cc,
                    nombre: estudiante.nombreCompleto || '',
                    celular: estudiante.celular || '',
                    correo: estudiante.correo || '',
                    curso: cursoId,
                    valorCuota: displayValue,
                    estado: cuota.estado || 'PENDIENTE',
                    fechaPago,
                    cuotaKey,
                    responsable: cuota.responsable || '-',
                    factura: cuota.factura || '-',
                    responsableRegistro: cursoData.responsableRegistro || '-',
                    ...(tipoRegistro ? { tipo: tipoRegistro } : {})
                  });

                  // agregar registros de abonos individuales si existen
                  if (cuota.abonos && Array.isArray(cuota.abonos)) {
                    cuota.abonos.forEach((abono, idx) => {
                      let fechaAbono = abono.fecha;
                      if (fechaAbono && fechaAbono.toDate) {
                        fechaAbono = fechaAbono.toDate();
                      }

                      estudiantesData.push({
                        cc,
                        nombre: estudiante.nombreCompleto || '',
                        celular: estudiante.celular || '',
                        correo: estudiante.correo || '',
                        curso: cursoId,
                        valorCuota: abono.valor || 0,
                        estado: 'ABONO',
                        tipo: 'ABONO',
                        fechaPago: fechaAbono,
                        cuotaKey: `${cuotaKey} - Abono ${idx + 1}`,
                        responsable: abono.responsable || '-',
                        factura: abono.factura || '-',
                        responsableRegistro: cursoData.responsableRegistro || '-'
                      });
                    });
                  }
                });
              } else if (cursoData.tipoPago === 'TOTAL') {
                // Si es pago total, crear una sola entrada
                estudiantesData.push({
                  cc,
                  nombre: estudiante.nombreCompleto || '',
                  celular: estudiante.celular || '',
                  correo: estudiante.correo || '',
                  curso: cursoId,
                  valorCuota: cursoData.pagoTotal || 0,
                  estado: 'PAGADO',
                  tipo: 'PAGO_TOTAL',
                  fechaPago: fechaRegistro,
                  cuotaKey: 'Pago Total',
                  responsable: '-',
                  factura: '-',
                  responsableRegistro: cursoData.responsableRegistro || '-'
                });
              }
            });
          }
        });

        setAllStudents([...estudiantesData, ...cursosRegistro]);
      } catch (error) {
        console.error('Error al cargar estudiantes:', error);
      } finally {
        setLoading(false);        ocultarCarga();      }
    };

    fetchStudents();
  }, []);

  // Determinar quincena
  const getQuincena = (fecha) => {
    if (!fecha || !(fecha instanceof Date)) return null;
    const dia = fecha.getDate();
    return dia <= 15 ? 1 : 2;
  };

  // Obtener mes y año de la quincena seleccionada
  const getQuincenaPeriod = (quincena) => {
    const year = selectedYear;
    const month = selectedMonth;

    if (quincena === 1) {
      return {
        inicio: new Date(year, month, 1),
        fin: new Date(year, month, 15)
      };
    } else {
      return {
        inicio: new Date(year, month, 16),
        fin: new Date(year, month + 1, 0)
      };
    }
  };

  // Filtrar por quincena seleccionada
  const filteredByQuincena = useMemo(() => {
    const quincena = parseInt(quincenaFilter);
    const period = getQuincenaPeriod(quincena);
    const searchLower = searchTerm.toLowerCase();

    return allStudents.filter((s) => {
      if (!s.fechaPago || !(s.fechaPago instanceof Date)) return false;

      // Verificar que la fecha esté dentro del rango de la quincena
      const inRange = s.fechaPago >= period.inicio && s.fechaPago <= period.fin;
      if (!inRange) return false;

      // Aplicar filtro de búsqueda si existe
      if (searchLower) {
        const matchesSearch = (
          (s.cc && s.cc.toLowerCase().includes(searchLower)) ||
          (s.nombre && s.nombre.toLowerCase().includes(searchLower)) ||
          (s.celular && s.celular.toLowerCase().includes(searchLower)) ||
          (s.correo && s.correo.toLowerCase().includes(searchLower))
        );
        if (!matchesSearch) return false;
      }

      // Aplicar filtro de tipo/estado de pago
      switch (paymentFilter) {
        case 'Pendientes':
          return s.estado === 'PENDIENTE';
        case 'Pagados':
          return s.estado === 'PAGADO';
        case 'Abonos':
          return s.tipo === 'ABONO';
        default: // Todos
          return true;
      }
    });
  }, [allStudents, quincenaFilter, selectedYear, selectedMonth, searchTerm, paymentFilter]);

  // Paginación
  const totalPages = Math.ceil(filteredByQuincena.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const paginatedStudents = filteredByQuincena.slice(startIdx, startIdx + itemsPerPage);

  // Calcular estadísticas para las tarjetas de la parte superior.
  // Se basan en los registros que actualmente se muestran tras aplicar todos los
  // filtros (quincena, búsqueda y tipo/estado de pago). De esta forma los valores
  // cambian automáticamente cuando el usuario cambia la opción de "Todos/Pendientes/...".
  const stats = useMemo(() => {
    const quincena = parseInt(quincenaFilter);
    const period = getQuincenaPeriod(quincena);

    // suma de todos los valores mostrados en la tabla
    const totalVisible = filteredByQuincena.reduce((acc, s) => {
      const amt = (s.valorCuota !== undefined && s.valorCuota !== null)
        ? s.valorCuota
        : ((s.valor !== undefined && s.valor !== null) ? s.valor : 0);
      return acc + amt;
    }, 0);

    let totalARecibir = 0;
    let totalRecibido = 0;

    if (paymentFilter === 'Todos') {
      // calculo original con distinción entre abonos/deuda/recibido
      filteredByQuincena.forEach((s) => {
        const amount = (s.valorCuota !== undefined && s.valorCuota !== null)
          ? s.valorCuota
          : ((s.valor !== undefined && s.valor !== null) ? s.valor : 0);

        if (s.tipo !== 'ABONO') {
          totalARecibir += amount;
        }
        if (
          s.tipo === 'PAGO_INICIAL' ||
          s.tipo === 'PAGO_TOTAL' ||
          s.tipo === 'ABONO' ||
          s.estado === 'PAGADO'
        ) {
          totalRecibido += amount;
        }
      });
    } else if (paymentFilter === 'Pendientes') {
      totalARecibir = totalVisible;
      totalRecibido = 0;
    } else {
      // Pagados o Abonos: todo lo visible ya está recibido
      totalARecibir = totalVisible;
      totalRecibido = totalVisible;
    }

    return {
      totalARecibir,
      totalRecibido,
      fechaInicio: period.inicio,
      fechaFin: period.fin
    };
  }, [filteredByQuincena, quincenaFilter, paymentFilter]);

  // Formatear rango de fechas
  const formatDateRange = (inicio, fin) => {
    const formatDate = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    return `${formatDate(inicio)} - ${formatDate(fin)}`;
  };

  // Formatear una sola fecha
  const formatSingleDate = (fecha) => {
    if (!fecha || !(fecha instanceof Date)) return '-';
    return `${String(fecha.getDate()).padStart(2, '0')}/${String(fecha.getMonth() + 1).padStart(2, '0')}/${fecha.getFullYear()}`;
  };

  return (
    <div className="content-card">
      <h2>ESTUDIANTES ACTIVOS</h2>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-gray-300)' }}>
          Cargando estudiantes...
        </div>
      ) : (
        <>
          <div className="filter-row">
            <label style={{ color: 'var(--color-gray-300)' }}>Año:</label>
            <select value={selectedYear} onChange={(e) => {
              setSelectedYear(parseInt(e.target.value));
              setCurrentPage(1);
            }}>
              {yearsAvailable.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>

            <label style={{ color: 'var(--color-gray-300)' }}>Mes:</label>
            <select value={selectedMonth} onChange={(e) => {
              setSelectedMonth(parseInt(e.target.value));
              setCurrentPage(1);
            }}>
              {months.map((month, idx) => (
                <option key={idx} value={idx}>
                  {month}
                </option>
              ))}
            </select>

            <label style={{ color: 'var(--color-gray-300)' }}>Quincena:</label>
            <select value={quincenaFilter} onChange={(e) => {
              setQuincenaFilter(e.target.value);
              setCurrentPage(1);
            }}>
              <option value="1">Quincena 1 (1 - 15)</option>
              <option value="2">Quincena 2 (16 - 31)</option>
            </select>

            <label style={{ color: 'var(--color-gray-300)' }}>Mostrar:</label>
            <select value={paymentFilter} onChange={(e) => {
              setPaymentFilter(e.target.value);
              setCurrentPage(1);
            }}>
              <option value="Todos">Todos</option>
              <option value="Pendientes">Pendientes</option>
              <option value="Pagados">Pagados</option>
              <option value="Abonos">Abonos</option>
            </select>
          </div>

          <div className="filter-row" style={{ marginTop: '15px' }}>
            <label style={{ color: 'var(--color-gray-300)' }}>Buscar (CC, Nombre, Celular, Correo):</label>
            <input
              type="text"
              placeholder="Ingrese cédula, nombre, celular o correo..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                flex: 1,
                background: 'var(--color-gray-700)',
                color: 'var(--color-gray-50)',
                border: '1px solid var(--color-gray-700)',
                padding: '8px 10px',
                borderRadius: 'var(--border-radius-sm)'
              }}
            />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setCurrentPage(1);
                }}
                style={{
                  background: 'var(--color-gray-500)',
                  color: '#f1f5f9',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: 'var(--border-radius-sm)',
                  cursor: 'pointer'
                }}
              >
                Limpiar
              </button>
            )}
          </div>

          {/* ESTADÍSTICAS */}
          <div className="stats-container">
            <div className="stat-card">
              <div className="stat-label">Total a Recibir</div>
              <div className="stat-period">{formatDateRange(stats.fechaInicio, stats.fechaFin)}</div>
              <div className="stat-value">${formatNumber(stats.totalARecibir)}</div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Total Recibido</div>
              <div className="stat-period">{formatDateRange(stats.fechaInicio, stats.fechaFin)}</div>
              <div className="stat-value" style={{ color: '#10b981' }}>${formatNumber(stats.totalRecibido)}</div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Diferencia</div>
              <div className="stat-period">{formatDateRange(stats.fechaInicio, stats.fechaFin)}</div>
              <div className="stat-value" style={{ color: stats.totalARecibir - stats.totalRecibido > 0 ? '#f59e0b' : '#10b981' }}>
                ${formatNumber(stats.totalARecibir - stats.totalRecibido)}
              </div>
            </div>
          </div>

          <div style={{ overflowX: 'auto', marginTop: '25px' }}>
            <table className="operations-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>CC</th>
                  <th>Nombre</th>
                  <th>Celular</th>
                  <th>Correo</th>
                  <th>Curso</th>
                  <th>Cuota</th>
                  <th>Valor</th>
                  <th>Estado</th>
                  <th>Fecha Pago</th>
                  <th>Responsable Registro</th>
                </tr>
              </thead>
              <tbody>
                {paginatedStudents.length === 0 && (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '20px' }}>
                      No hay estudiantes en esta quincena.
                    </td>
                  </tr>
                )}
                {paginatedStudents.map((s, idx) => (
                  <tr key={idx}>
                    <td>{s.cc}</td>
                    <td>{s.nombre}</td>
                    <td>{s.celular}</td>
                    <td>{s.correo}</td>
                    <td>{s.curso}</td>
                    <td>
                      {s.tipo === 'PAGO_INICIAL' ? 'Pago Inicial' : s.cuotaKey}
                    </td>
                    <td>${formatNumber(s.valorCuota || s.valor)}</td>
                    <td>
                      <span className={`estado-badge estado-${s.estado.toLowerCase()}`}>
                        {s.estado}
                      </span>
                    </td>
                    <td>{formatSingleDate(s.fechaPago)}</td>
                    <td>{(s.tipo === 'PAGO_INICIAL' || s.tipo === 'PAGO_TOTAL') ? (s.responsableRegistro || '-') : (s.responsable || '-')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* PAGINACIÓN */}
          {totalPages > 1 && (
            <div className="pagination-container">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="pagination-btn"
              >
                ← Anterior
              </button>

              <div className="pagination-info">
                Página {currentPage} de {totalPages}
              </div>

              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="pagination-btn"
              >
                Siguiente →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Dashboard;
