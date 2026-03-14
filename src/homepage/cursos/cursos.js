import React, { useState, useEffect } from 'react';
import './Cursos.css';
import { collection, getDocs, setDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../server/firebase';
import { mostrarCarga, ocultarCarga } from '../../resources/carga/carga';

function Cursos() {
  const [courses, setCourses] = useState([]);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');

  const courseTypes = [
    'CONVALIDACION',
    'HOME SCHOOL',
    'TECNICOS LABORALES',
    'PROGRAMAS MIXTOS',
  ];

  const [form, setForm] = useState({
    nombre: '',
    valor: '',
    estudiantesActivos: '0',
    description: '',
    tipoCurso: ''
  });

  // 🔹 Formatear ID tipo DESARROLLO_WEB_2026
  const formatId = (text) => {
    return text
      .toUpperCase()
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^A-Z0-9_]/g, '');
  };

  // 🔹 Formatear moneda visualmente
  const formatCurrency = (value) => {
    if (!value) return '';
    return new Intl.NumberFormat('es-CO').format(value);
  };

  // 🔹 Quitar formato moneda
  const unformatCurrency = (value) => {
    return value.replace(/\./g, '').replace(/[^0-9]/g, '');
  };

  useEffect(() => {
    const fetchCourses = async () => {
      mostrarCarga();
      try {
        const snapshot = await getDocs(collection(db, 'CURSOS'));
        setCourses(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      } finally {
        ocultarCarga();
      }
    };
    fetchCourses();
  }, []);

  const startAdd = () => {
    setEditing(null);
    setError('');
    setForm({
      nombre: '',
      valor: '',
      estudiantesActivos: '0',
      description: '',
      tipoCurso: ''
    });
  };

  const startEdit = (c) => {
    setEditing(c.id);
    setError('');
    setForm({
      nombre: c.nombre,
      valor: formatCurrency(c.valor),
      estudiantesActivos: String(c.estudiantesActivos || 0),
      description: c.description,
      tipoCurso: c.tipoCurso || ''
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'nombre') {
      // Solo letras, números y espacios
      const clean = value.replace(/[^a-zA-Z0-9\s]/g, '');
      setForm((prev) => ({ ...prev, nombre: clean.toUpperCase() }));
    }

    if (name === 'valor') {
      const numeric = unformatCurrency(value);
      setForm((prev) => ({
        ...prev,
        valor: formatCurrency(numeric)
      }));
    }

    if (name === 'estudiantesActivos') {
      const numeric = value.replace(/[^0-9]/g, '');
      setForm((prev) => ({ ...prev, estudiantesActivos: numeric }));
    }

    if (name === 'description') {
      setForm((prev) => ({
        ...prev,
        description: value.toUpperCase()
      }));
    }

    if (name === 'tipoCurso') {
      setForm((prev) => ({
        ...prev,
        tipoCurso: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    mostrarCarga();

    // 🔴 VALIDACIONES
    if (!form.nombre.trim()) {
      ocultarCarga();
      return setError('EL NOMBRE DEL CURSO ES OBLIGATORIO');
    }

    if (!/^[A-Z0-9\s]+$/.test(form.nombre)) {
      return setError('EL NOMBRE SOLO PUEDE SER ALFANUMÉRICO');
    }

    if (!form.valor) {
      return setError('EL VALOR DEL CURSO ES OBLIGATORIO');
    }

    if (!form.description.trim()) {
      return setError('LA DESCRIPCIÓN ES OBLIGATORIA');
    }

    if (!form.tipoCurso || !courseTypes.includes(form.tipoCurso)) {
      ocultarCarga();
      return setError('EL TIPO DE CURSO ES OBLIGATORIO');
    }

    const idCurso = formatId(form.nombre);

    const payload = {
      nombre: form.nombre.trim(),
      valor: parseInt(unformatCurrency(form.valor), 10),
      estudiantesActivos: parseInt(form.estudiantesActivos || '0', 10),
      description: form.description.trim(),
      tipoCurso: form.tipoCurso
    };

    if (editing && editing !== idCurso) {
      await deleteDoc(doc(db, 'CURSOS', editing));
    }

    await setDoc(doc(db, 'CURSOS', idCurso), payload);

    const snapshot = await getDocs(collection(db, 'CURSOS'));
    setCourses(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));

    startAdd();
    ocultarCarga();
  };

  const handleDelete = async (id) => {
    mostrarCarga();
    try {
      await deleteDoc(doc(db, 'CURSOS', id));
      setCourses((arr) => arr.filter((c) => c.id !== id));
    } finally {
      ocultarCarga();
    }
  };

  return (
    <div className="content-card">
      <h2>MIS CURSOS</h2>

      {error && (
        <div style={{ color: 'red', marginBottom: 10 }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input
          name="nombre"
          value={form.nombre}
          onChange={handleChange}
          placeholder="NOMBRE DEL CURSO"
        />

        <div style={{ display: 'flex', alignItems: 'center' }}>
        
          <input
            name="valor"
            value={form.valor}
            onChange={handleChange}
            placeholder="0"
            style={{ width: 120 }}
          />
        </div>

        <input
          name="estudiantesActivos"
          value={form.estudiantesActivos}
          onChange={handleChange}
          placeholder="ESTUDIANTES"
          style={{ width: 120 }}
        />

        <input
          name="description"
          value={form.description}
          onChange={handleChange}
          placeholder="DESCRIPCIÓN"
          style={{ flex: '1 0 200px' }}
        />

        <select
          name="tipoCurso"
          value={form.tipoCurso}
          onChange={handleChange}
          style={{ width: 220 }}
        >
          <option value="" disabled>
            SELECCIONAR TIPO DE CURSO
          </option>
          {courseTypes.map((tipo) => (
            <option key={tipo} value={tipo}>{tipo}</option>
          ))}
        </select>

        <button type="submit">
          {editing ? 'GUARDAR' : 'CREAR'}
        </button>

        <button type="button" onClick={startAdd} className="red-button">
          LIMPIAR
        </button>
      </form>

      <ul className="course-list">
        {courses.map((c) => (
          <li key={c.id} className="course-item">
            <div>
              <strong>{c.nombre}</strong>
              <div>
                {c.estudiantesActivos} ALUMNOS – $
                {new Intl.NumberFormat('es-CO').format(c.valor)}
              </div>
              <div>TIPO: {c.tipoCurso || 'CONVALIDACION'}</div>
              <div>{c.description}</div>
            </div>

            <div>
              <button onClick={() => startEdit(c)}>EDITAR</button>
              <button type="button" onClick={() => handleDelete(c.id)} className="red-button">ELIMINAR</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Cursos;