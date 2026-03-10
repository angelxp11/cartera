import React, { useState } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../server/firebase';
import { mostrarCarga, ocultarCarga } from '../../resources/carga/carga';
import './financiamiento.css';

function Financiamiento({ userName }) {
  const [ccBuscar, setCcBuscar] = useState('');
  const [student, setStudent] = useState(null);
  const [courses, setCourses] = useState({});
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedCuotas, setSelectedCuotas] = useState([]); // allow multiple
  const [pagoAmount, setPagoAmount] = useState('');
  const [factura, setFactura] = useState('');

  // control which course cards are expanded for accordion
  const [expandedCourses, setExpandedCourses] = useState({});

  // helper to format numbers with thousands separators
  const formatNumber = (num) => {
    if (num === null || num === undefined || num === '') return '';
    // use spanish locale for commas as thousands separator
    return new Intl.NumberFormat('es-ES').format(num);
  };

  const unformatNumber = (str) => {
    if (!str && str !== 0) return '';
    return String(str).replace(/\./g, '').replace(/[^0-9]/g, '');
  };

  const searchStudent = async () => {
    if (!ccBuscar.trim()) return;

    mostrarCarga();
    try {
      const ref = doc(db, 'ESTUDIANTES_ACTIVOS', ccBuscar.trim());
      const snap = await getDoc(ref);

      if (snap.exists()) {
        const data = snap.data();
        setStudent(data);
        setCourses(data.cursos || {});
        setSelectedCourse(null);
        setSelectedCuotas([]);
        setPagoAmount('');
        setFactura('');
      } else {
        alert('Estudiante no encontrado');
        setStudent(null);
        setCourses({});
      }
    } catch (err) {
      console.error('Error searching student', err);
      alert('Error buscando el estudiante');
    } finally {
      ocultarCarga();
    }
  };

  const handlePayClick = (cursoId) => {
    setSelectedCourse(cursoId);
    setSelectedCuotas([]);
    setPagoAmount('');
    setFactura('');
  };

  const toggleCourse = (cursoId) => {
    setExpandedCourses((prev) => ({
      ...prev,
      [cursoId]: !prev[cursoId],
    }));
  };

  const pagarCuota = async () => {
    if (!selectedCourse || selectedCuotas.length === 0) return;
    mostrarCarga();

    const amountToPay = parseInt(unformatNumber(pagoAmount)) || 0;
    if (amountToPay <= 0) {
      alert('Ingrese un monto válido.');
      ocultarCarga();
      return;
    }

    const curso = courses[selectedCourse];
    // calculate total value of selected cuotas
    const totalSelected = selectedCuotas.reduce((acc, k) => {
      return acc + (curso.cuotas[k]?.valor || 0);
    }, 0);
    if (amountToPay > totalSelected) {
      alert(
        `El monto excede el total de las cuotas seleccionadas (${formatNumber(
          totalSelected
        )}). Se aplicará sólo hasta completar el total.`
      );
    }
    let remaining = amountToPay;
    const updates = {};
    let totalAbonado = 0;

    // process each selected cuota sequentially
    selectedCuotas.forEach((key) => {
      if (remaining <= 0) return;
      const cuota = curso.cuotas[key];
      if (!cuota || cuota.estado !== 'PENDIENTE') return;
      const origValor = cuota.valor || 0;
      const pago = Math.min(remaining, origValor);
      remaining -= pago;
      totalAbonado += pago;

      updates[`cursos.${selectedCourse}.cuotas.${key}.valor`] = origValor - pago;
      const abonoObj = {
        fecha: new Date(),
        valor: pago,
        responsable: userName || '',
        factura: factura || ''
      };
      updates[`cursos.${selectedCourse}.cuotas.${key}.abonos`] =
        [...(cuota.abonos || []), abonoObj];
      if (origValor - pago <= 0) {
        updates[`cursos.${selectedCourse}.cuotas.${key}.estado`] = 'PAGADO';
        updates[`cursos.${selectedCourse}.cuotas.${key}.responsable`] = userName || '';
        updates[`cursos.${selectedCourse}.cuotas.${key}.factura`] = factura || '';
      }
    });

    updates[`cursos.${selectedCourse}.saldoPendiente`] =
      (curso.saldoPendiente || 0) - totalAbonado;

    try {
      const ref = doc(db, 'ESTUDIANTES_ACTIVOS', ccBuscar.trim());
      await updateDoc(ref, updates);

      // update local state
      const updatedCourses = { ...courses };
      const newCurso = { ...updatedCourses[selectedCourse] };
      newCurso.saldoPendiente = (newCurso.saldoPendiente || 0) - totalAbonado;
      const newCuotas = { ...newCurso.cuotas };
      let rem = amountToPay;
      selectedCuotas.forEach((key) => {
        if (rem <= 0) return;
        const cuota = { ...newCuotas[key] };
        const origValor = cuota.valor || 0;
        const pago = Math.min(rem, origValor);
        rem -= pago;
        cuota.valor = origValor - pago;
        cuota.abonos = [...(cuota.abonos || []), {
          fecha: new Date(),
          valor: pago,
          responsable: userName || '',
          factura: factura || ''
        }];
        if (cuota.valor <= 0) {
          cuota.estado = 'PAGADO';
          cuota.responsable = userName || '';
          cuota.factura = factura || '';
        }
        newCuotas[key] = cuota;
      });
      newCurso.cuotas = newCuotas;
      updatedCourses[selectedCourse] = newCurso;

      setCourses(updatedCourses);
      setStudent({ ...student, cursos: updatedCourses });

      alert('Pago procesado correctamente');

      setSelectedCourse(null);
      setSelectedCuotas([]);
      setPagoAmount('');
      setFactura('');
    } catch (err) {
      console.error('Error paying cuota', err);
      alert('Error al procesar el pago');
    } finally {
      ocultarCarga();
    }
  };

  const pendingCuotasForCourse = (cursoId) => {
    const curso = courses[cursoId];
    if (!curso || !curso.cuotas) return [];

    return Object.entries(curso.cuotas)
      .filter(([, c]) => c.estado === 'PENDIENTE')
      .map(([k]) => k);
  };

  return (
    <div className="finan-wrapper">
      <h2>FINANCIAMIENTO</h2>

      <div className="finan-search-row">
        <input
          type="text"
          placeholder="Cédula del estudiante"
          value={ccBuscar}
          onChange={(e) => setCcBuscar(e.target.value)}
        />
        <button onClick={searchStudent}>Buscar</button>
      </div>

      {student && (
        <div className="finan-student-info">
          <p><strong>Estudiante:</strong> {student.nombreCompleto || ''}</p>
          <p><strong>Cédula:</strong> {ccBuscar}</p>
        </div>
      )}

      {Object.keys(courses).length > 0 && (
        <div className="finan-courses-list">
          <h3>Cursos del estudiante</h3>

          {Object.entries(courses).map(([id, curso]) => (
            <div
              key={id}
              className={`finan-course-card ${expandedCourses[id] ? 'expanded' : ''}`}
              onClick={() => toggleCourse(id)}
            >
              <p>
                <strong>Curso:</strong> {id}
              </p>
              <p>
                <strong>Tipo de pago:</strong> {curso.tipoPago}
              </p>

              {expandedCourses[id] && (
                <div className="finan-course-details" onClick={(e) => e.stopPropagation()}>
                  {curso.tipoPago === 'TOTAL' && (
                    <p>Pago total: ${formatNumber(curso.pagoTotal)}</p>
                  )}

                  {curso.tipoPago === 'FINANCIADO' && (
                    <>
                      <p>Pago inicial: ${formatNumber(curso.pagoInicial)}</p>
                      <p>Saldo pendiente: ${formatNumber(curso.saldoPendiente)}</p>
                      <p>Número cuotas: {curso.numeroCuotas}</p>

                      <ul className="finan-cuotas-list">
                        {Object.entries(curso.cuotas || {}).map(([key, c]) => (
                          <li
                            key={key}
                            className={c.estado === 'PAGADO' ? 'finan-pagada' : ''}
                          >
                            {key}: ${formatNumber(c.valor)} - {c.estado}
                            {c.abonos && c.abonos.length > 0 && (
                              <span> (abonos: ${formatNumber(
                                c.abonos.reduce((a, b) => a + (b.valor || 0), 0)
                              )})</span>
                            )}
                            {c.estado === 'PAGADO' && (
                              <span>
                                {' '} (Responsable: {c.responsable || '-'} |
                                Factura: {c.factura || '-'})
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>

                      {pendingCuotasForCourse(id).length > 0 && (
                        <button
                          onClick={() => handlePayClick(id)}
                          className="finan-btn-pay-cuota"
                        >
                          Pagar cuota
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* MODAL OVERLAY PARA PAGAR CUOTA */}
      {selectedCourse && (
        <div className="finan-modal-overlay" onClick={() => setSelectedCourse(null)}>
          <div className="finan-modal" onClick={(e) => e.stopPropagation()}>
            <div className="finan-modal-header">
              <h3>Pagar Cuota</h3>
              <button
                className="finan-modal-close"
                onClick={() => setSelectedCourse(null)}
              >
                ×
              </button>
            </div>

            <div className="finan-modal-body">
              <label className="finan-modal-label">
                <span>Seleccione cuota(s):</span>
                <div className="finan-cuota-selector">
                  {pendingCuotasForCourse(selectedCourse).map((k) => (
                    <div
                      key={k}
                      className={`finan-cuota-option ${
                        selectedCuotas.includes(k) ? 'selected' : ''
                      }`}
                      onClick={() => {
                        setSelectedCuotas((prev) => {
                          if (prev.includes(k)) {
                            return prev.filter((x) => x !== k);
                          }
                          return [...prev, k];
                        });
                      }}
                    >
                      <div className="finan-cuota-option-label">{k}</div>
                      <div className="finan-cuota-option-valor">
                        ${formatNumber(
                          courses[selectedCourse].cuotas[k].valor
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </label>

              <label className="finan-modal-label">
                <span>Monto a pagar / abonar:</span>
                <input
                  type="text"
                  value={pagoAmount}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const nums = unformatNumber(raw);
                    setPagoAmount(nums ? formatNumber(nums) : '');
                  }}
                  placeholder="0"
                />
              </label>
              {selectedCuotas.length > 0 && (
                <p style={{ fontSize: '13px', marginTop: '6px' }}>
                  Total seleccionado:{' '}
                  ${formatNumber(
                    selectedCuotas.reduce((acc, k) => {
                      const v = courses[selectedCourse].cuotas[k]?.valor || 0;
                      return acc + v;
                    }, 0)
                  )}
                </p>
              )}

              <label className="finan-modal-label">
                <span>Factura / referencia:</span>
                <input
                  type="text"
                  value={factura}
                  onChange={(e) => setFactura(e.target.value)}
                  placeholder="Ingrese número de factura"
                />
              </label>
            </div>

            <div className="finan-modal-footer">
              <button
                className="finan-modal-btn-cancel"
                onClick={() => setSelectedCourse(null)}
              >
                Cancelar
              </button>
              <button
                className="finan-modal-btn-confirm"
                onClick={pagarCuota}
                disabled={
                  selectedCuotas.length === 0 ||
                  !(parseInt(unformatNumber(pagoAmount)) > 0)
                }
              >
                Confirmar pago
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Financiamiento;