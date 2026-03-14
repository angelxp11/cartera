import React, { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../server/firebase';
import { mostrarCarga, ocultarCarga } from '../../../resources/carga/carga';
import './editarabonos.css';

function EditarAbonos({ editCuota, courses, ccBuscar, onClose, onUpdateCourses }) {
  const [abonos, setAbonos] = useState([]);

  useEffect(() => {
    if (editCuota && courses[editCuota.cursoId]?.cuotas[editCuota.cuotaKey]?.abonos) {
      setAbonos([...courses[editCuota.cursoId].cuotas[editCuota.cuotaKey].abonos]);
    }
  }, [editCuota, courses]);

  const handleAbonoChange = (index, field, value) => {
    const newAbonos = [...abonos];
    newAbonos[index] = { ...newAbonos[index], [field]: value };
    setAbonos(newAbonos);
  };

  const saveChanges = async () => {
    mostrarCarga();
    try {
      const cuota = courses[editCuota.cursoId].cuotas[editCuota.cuotaKey];
      const sumaActual = cuota.abonos ? cuota.abonos.reduce((sum, a) => sum + (a.valor || 0), 0) : 0;
      const valorOriginal = cuota.valor + sumaActual;
      const nuevaSuma = abonos.reduce((sum, a) => sum + (a.valor || 0), 0);
      const nuevoValor = Math.max(0, valorOriginal - nuevaSuma);
      const diferencia = nuevaSuma - sumaActual;

      const ref = doc(db, 'ESTUDIANTES_ACTIVOS', ccBuscar);
      const updates = {
        [`cursos.${editCuota.cursoId}.cuotas.${editCuota.cuotaKey}.abonos`]: abonos,
        [`cursos.${editCuota.cursoId}.cuotas.${editCuota.cuotaKey}.valor`]: nuevoValor,
        [`cursos.${editCuota.cursoId}.saldoPendiente`]: (courses[editCuota.cursoId].saldoPendiente || 0) - diferencia
      };
      // Update status based on nuevoValor
      if (nuevoValor <= 0) {
        updates[`cursos.${editCuota.cursoId}.cuotas.${editCuota.cuotaKey}.estado`] = 'PAGADO';
      } else {
        updates[`cursos.${editCuota.cursoId}.cuotas.${editCuota.cuotaKey}.estado`] = 'PENDIENTE';
      }
      await updateDoc(ref, updates);

      // Update local state
      const updatedCourses = { ...courses };
      updatedCourses[editCuota.cursoId].cuotas[editCuota.cuotaKey].abonos = abonos;
      updatedCourses[editCuota.cursoId].cuotas[editCuota.cuotaKey].valor = nuevoValor;
      updatedCourses[editCuota.cursoId].saldoPendiente = (courses[editCuota.cursoId].saldoPendiente || 0) - diferencia;
      if (nuevoValor <= 0) {
        updatedCourses[editCuota.cursoId].cuotas[editCuota.cuotaKey].estado = 'PAGADO';
      } else {
        updatedCourses[editCuota.cursoId].cuotas[editCuota.cuotaKey].estado = 'PENDIENTE';
      }
      onUpdateCourses(updatedCourses);

      alert('Abonos actualizados correctamente');
      onClose();
    } catch (err) {
      console.error('Error updating abonos', err);
      alert('Error al actualizar abonos');
    } finally {
      ocultarCarga();
    }
  };

  if (!editCuota) return null;

  return (
    <div className="finan-modal-overlay" onClick={onClose}>
      <div className="finan-modal" onClick={(e) => e.stopPropagation()}>
        <div className="finan-modal-header">
          <h3>Editar Abonos - Cuota {editCuota.cuotaKey.replace('Cuota ', '')}</h3>
          <button className="finan-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="finan-modal-body finan-modal-body-editarabonos">
          {abonos.map((abono, index) => (
            <div key={index} style={{ marginBottom: '10px' }}>
              <label>
                Valor:
                <input
                  type="text"
                  value={abono.valor || ''}
                  onChange={(e) => handleAbonoChange(index, 'valor', parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0)}
                />
              </label>
              <label>
                Responsable:
                <input
                  type="text"
                  value={abono.responsable || ''}
                  onChange={(e) => handleAbonoChange(index, 'responsable', e.target.value)}
                />
              </label>
              <label>
                Factura:
                <input
                  type="text"
                  value={abono.factura || ''}
                  onChange={(e) => handleAbonoChange(index, 'factura', e.target.value)}
                />
              </label>
            </div>
          ))}
        </div>
        <div className="finan-modal-footer">
          <button className="finan-modal-btn-cancel" onClick={onClose}>Cancelar</button>
          <button className="finan-modal-btn-confirm" onClick={saveChanges}>Guardar</button>
        </div>
      </div>
    </div>
  );
}

export default EditarAbonos;