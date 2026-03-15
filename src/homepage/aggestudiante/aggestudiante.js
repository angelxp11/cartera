import React, { useEffect, useState } from "react";
import "./aggestudiante.css";
import { collection, getDocs, setDoc, doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../server/firebase";
import { mostrarCarga, ocultarCarga } from "../../resources/carga/carga";

function AggEstudiantes({ userName }) {
  const [courses, setCourses] = useState([]);
  const [cronograma, setCronograma] = useState([]);
  const [mostrarSegundoCurso, setMostrarSegundoCurso] = useState(false);

  const courseTypes = [
    'CONVALIDACION',
    'HOME SCHOOL',
    'TECNICOS LABORALES',
    'PROGRAMAS MIXTOS'
  ];

  const [cursoFiltro1, setCursoFiltro1] = useState('ALL');
  const [cursoFiltro2, setCursoFiltro2] = useState('ALL');

  const [form, setForm] = useState({
    nombreCompleto: "",
    cursoId: "",
    cursoId2: "",
    valorCurso: "", // now entered manually as formatted string
    cc: "",
    celular: "",
    correo: "",
    tipoPago: "TOTAL",
    pagoInicial: "",
    numeroCuotas: "",
    pagoTotal: "",
    quincena: "15",
    // datos de fecha de registro
    useFechaActual: true,
    fechaRegistro: "" // formato yyyy-mm-dd para el input
  });

  const [activarForm, setActivarForm] = useState({
    ccBuscar: "",
    tipoEstudiante: "ACTIVOS",
    estudianteEncontrado: null,
    loading: false
  });

  // 🔹 FORMATEADORES
  const formatNumber = (value) => {
    if (!value && value !== 0) return "";
    return new Intl.NumberFormat("es-CO").format(value);
  };

  const unformatNumber = (value) => {
    return value.replace(/\./g, "").replace(/[^0-9]/g, "");
  };

  const formatDate = (date) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // 🔹 CARGAR CURSOS
  useEffect(() => {
    const fetchCourses = async () => {
      mostrarCarga();
      try {
        const snapshot = await getDocs(collection(db, "CURSOS"));
        setCourses(snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          tipoCurso: (d.data().tipoCurso || 'CONVALIDACION')
        })));
      } finally {
        ocultarCarga();
      }
    };
    fetchCourses();
  }, []);

  // 🔹 MANEJAR BLUR EN CC
  const handleCcBlur = async () => {
    const cc = form.cc.trim();
    if (!cc) return;

    mostrarCarga();
    try {
      const estudianteExistente = await buscarEstudiante(cc);
      if (estudianteExistente) {
        setForm(prevForm => ({
          ...prevForm,
          nombreCompleto: estudianteExistente.nombreCompleto,
          correo: estudianteExistente.correo,
          celular: estudianteExistente.celular,
          estudianteExistente: true
        }));
      } else {
        alert("Estudiante no encontrado.");
        setForm(prevForm => ({
          ...prevForm,
          estudianteExistente: false
        }));
      }
    } catch (error) {
      console.error("Error buscando estudiante:", error);
      alert("Error al buscar el estudiante.");
    } finally {
      ocultarCarga();
    }
  };

  // 🔹 BUSCAR ESTUDIANTE POR CC
  const buscarEstudiante = async (cc) => {
    if (!cc || cc.trim() === "") {
      return null;
    }
    try {
      const estudianteRef = doc(db, "ESTUDIANTES_ACTIVOS", cc);
      const docSnap = await getDoc(estudianteRef);
      return docSnap.exists() ? docSnap.data() : null;
    } catch (error) {
      console.error("Error al buscar estudiante:", error);
      return null;
    }
  };

  // 🔹 BUSCAR ESTUDIANTE PARA ACTIVAR/DESACTIVAR
  const buscarEstudianteActivar = async () => {
    const cc = activarForm.ccBuscar.trim();
    if (!cc) {
      alert("Ingrese la cédula del estudiante.");
      return;
    }

    mostrarCarga();
    setActivarForm((prev) => ({ ...prev, loading: true }));

    try {
      const coleccion = activarForm.tipoEstudiante === "ACTIVOS" ? "ESTUDIANTES_ACTIVOS" : "ESTUDIANTES_DESACTIVADOS";
      const estudianteRef = doc(db, coleccion, cc);
      const docSnap = await getDoc(estudianteRef);

      if (docSnap.exists()) {
        setActivarForm((prev) => ({
          ...prev,
          estudianteEncontrado: { id: cc, ...docSnap.data() }
        }));
      } else {
        alert(`Estudiante no encontrado en ${activarForm.tipoEstudiante === "ACTIVOS" ? "ACTIVOS" : "DESACTIVADOS"}.`);
        setActivarForm((prev) => ({
          ...prev,
          estudianteEncontrado: null
        }));
      }
    } catch (error) {
      console.error("Error buscando estudiante:", error);
      alert("Error al buscar el estudiante.");
    } finally {
      setActivarForm((prev) => ({ ...prev, loading: false }));
      ocultarCarga();
    }
  };

  // 🔹 ACTIVAR O DESACTIVAR ESTUDIANTE
  const cambiarEstadoEstudiante = async () => {
    if (!activarForm.estudianteEncontrado) return;

    mostrarCarga();
    const cc = activarForm.estudianteEncontrado.id;
    const esActivo = activarForm.tipoEstudiante === "ACTIVOS";
    const coleccionOrigen = esActivo ? "ESTUDIANTES_ACTIVOS" : "ESTUDIANTES_DESACTIVADOS";
    const coleccionDestino = esActivo ? "ESTUDIANTES_DESACTIVADOS" : "ESTUDIANTES_ACTIVOS";

    try {
      const estudianteRef = doc(db, coleccionOrigen, cc);
      const docSnap = await getDoc(estudianteRef);

      if (!docSnap.exists()) {
        alert("Documento no encontrado.");
        return;
      }

      const datos = docSnap.data();

      // Crear en la colección destino
      const nuevoRef = doc(db, coleccionDestino, cc);
      await setDoc(nuevoRef, datos);

      // Eliminar de la colección origen
      await deleteDoc(estudianteRef);

      const accion = esActivo ? "desactivado" : "activado";
      alert(`Estudiante ${accion} correctamente.`);

      // Limpiar formulario
      setActivarForm({
        ccBuscar: "",
        tipoEstudiante: "ACTIVOS",
        estudianteEncontrado: null,
        loading: false
      });
    } catch (error) {
      console.error("Error cambiando estado:", error);
      alert("Error al cambiar el estado del estudiante.");
    }
  };

  // 🔹 CAMBIOS
  const handleChange = (e) => {
    const { name, value } = e.target;

    // build next form state synchronously so we can react immediately
    let next = { ...form };

    if (name === "nombreCompleto") {
      next.nombreCompleto = value.toUpperCase();
    } else if (name === "cursoId") {
      // only store selection; valorCurso is entered manually
      next.cursoId = value;
    } else if (name === "cursoId2") {
      next.cursoId2 = value;
    } else if (name === "valorCurso") {
      const numeric = unformatNumber(value);
      next.valorCurso = numeric ? formatNumber(Number(numeric)) : "";
    } else if (name === "pagoInicial" || name === "numeroCuotas" || name === "pagoTotal") {
      const numeric = unformatNumber(value);
      next[name] = formatNumber(Number(numeric));
    } else if (name === "cc") {
      const digits = unformatNumber(value);
      next[name] = digits;
    } else if (name === "celular") {
      const digits = unformatNumber(value);
      next[name] = digits;
    } else if (name === "correo") {
      next.correo = value;
    } else if (name === "tipoPago" || name === "quincena") {
      next[name] = value;
      // if switching payment type, clear schedule preview
      if (name === "tipoPago") next.cronogramaCleared = true;
    }    // manejo de fecha de registro
    else if (name === "useFechaActual") {
      next.useFechaActual = e.target.checked;
      if (next.useFechaActual) {
        next.fechaRegistro = "";
      }
    } else if (name === "fechaRegistro") {
      next.fechaRegistro = value; // user picks custom date
    }
    setForm(next);

    // If user selected FINANCIADO and payment details are present, auto-generate preview
    if (
      next.tipoPago === "FINANCIADO" &&
      next.pagoInicial &&
      next.numeroCuotas &&
      next.quincena
    ) {
      generarCronograma(true, next);
    }
  };

  // 🔹 GENERAR CRONOGRAMA
  const generarCronograma = (skipValidation = false, providedForm = null) => {
    const useForm = providedForm || form;

    if (!skipValidation) {
      // Required validations
      if (!useForm.nombreCompleto || useForm.nombreCompleto.trim() === "") {
        alert("El nombre es obligatorio.");
        return;
      }

      if (!useForm.correo || useForm.correo.trim() === "") {
        alert("El correo es obligatorio.");
        return;
      }

      const emailRe = /^\S+@\S+\.\S+$/;
      if (!emailRe.test(useForm.correo)) {
        alert("Ingrese un correo válido.");
        return;
      }

      if (!useForm.cc || useForm.cc.trim() === "" || isNaN(parseInt(useForm.cc))) {
        alert("La cédula (cc) es obligatoria y debe ser numérica.");
        return;
      }

      if (!useForm.celular || useForm.celular.trim() === "" || isNaN(parseInt(useForm.celular))) {
        alert("El celular es obligatorio y debe ser numérico.");
        return;
      }
    }

    // For FINANCIADO flow
    if (useForm.tipoPago === "FINANCIADO") {
      const cuotas = parseInt(unformatNumber(useForm.numeroCuotas)) || 0;
      const pagoInicial = parseInt(unformatNumber(useForm.pagoInicial)) || 0;
      const valorCursoNum = parseInt(unformatNumber(useForm.valorCurso)) || 0;
      const saldo = valorCursoNum - pagoInicial;

      if (!cuotas || cuotas <= 0) {
        // If skipValidation (preview) and cuotas missing, just clear
        if (!skipValidation) alert("El número de cuotas debe ser mayor a 0.");
        return;
      }

      const valorCuota = Math.ceil(saldo / cuotas);
      // start from today or custom registro date
      const inicio = useForm.useFechaActual ? new Date() : parseLocalDate(useForm.fechaRegistro);
      let lista = [];

      // determine first payment date based on selected quincena and start date
      const diaPago = useForm.quincena === "15" ? 15 : 30;
      let primerMes = inicio.getMonth();
      let primerAnio = inicio.getFullYear();

      if (inicio.getDate() > diaPago) {
        // already past this month's payment day, move to next month
        primerMes += 1;
        if (primerMes > 11) {
          primerMes = 0;
          primerAnio += 1;
        }
      }

      for (let i = 0; i < cuotas; i++) {
        let mes = primerMes + i;
        let anio = primerAnio;
        if (mes > 11) {
          anio += Math.floor(mes / 12);
          mes = mes % 12;
        }
        // Get last day of month to clamp day if needed
        const firstOfMonth = new Date(anio, mes, 1);
        const daysInMonth = new Date(firstOfMonth.getFullYear(), firstOfMonth.getMonth() + 1, 0).getDate();
        const diaFinal = Math.min(diaPago, daysInMonth);
        let fecha = new Date(anio, mes, diaFinal);
        lista.push({ numero: i + 1, fecha, valor: valorCuota });
      }

      setCronograma(lista);
      return;
    }

    // For TOTAL flow: single payment (will be created when adding student)
    setCronograma([]);
  };

  // helper that adds months but clamps to end-of-month when needed
  const addMonthsSafe = (date, delta) => {
    const d = new Date(date);
    const day = d.getDate();
    const targetMonth = d.getMonth() + delta;
    const targetYear = d.getFullYear();
    // start at first of target month then set day with min(daysInMonth, day)
    const firstOfMonth = new Date(targetYear, targetMonth, 1);
    const daysInMonth = new Date(firstOfMonth.getFullYear(), firstOfMonth.getMonth() + 1, 0).getDate();
    firstOfMonth.setDate(Math.min(day, daysInMonth));
    return firstOfMonth;
  };

  // 🔹 AJUSTAR FECHA DE CUOTA (meses) individual
  const ajustarMesCuota = (indice, delta) => {
    setCronograma((prev) => {
      const nueva = [...prev];
      const cuota = nueva[indice];
      if (!cuota) return prev;
      cuota.fecha = addMonthsSafe(cuota.fecha, delta);
      return nueva;
    });
  };

  // 🔹 DESPLAZAR TODO EL CRONOGRAMA en meses (útil para ajustar primer pago)
  const shiftCronograma = (delta) => {
    setCronograma((prev) =>
      prev.map((c) => ({ ...c, fecha: addMonthsSafe(c.fecha, delta) }))
    );
  };

  // helper to create a local Date from yyyy-mm-dd string (avoid timezone shift)
  const parseLocalDate = (iso) => {
    if (!iso) return new Date();
    const parts = iso.split('-');
    return new Date(parts[0], parts[1] - 1, parts[2]);
  };

  const agregarEstudiante = async () => {
    mostrarCarga();
    try {
      // Validate course selection
    if (!form.cursoId || form.cursoId.trim() === "") {
      alert("Debe seleccionar un curso.");
      ocultarCarga();
      return;
    }

    // Validate common fields
    if (!form.nombreCompleto || form.nombreCompleto.trim() === "") {
      alert("El nombre es obligatorio.");
      ocultarCarga();
      return;
    }

    if (!form.correo || form.correo.trim() === "") {
      alert("El correo es obligatorio.");
      ocultarCarga();
      return;
    }

    const emailRe = /^\S+@\S+\.\S+$/;
    if (!emailRe.test(form.correo)) {
      alert("Ingrese un correo válido.");
      ocultarCarga();
      return;
    }

    if (!form.cc || form.cc.trim() === "" || isNaN(parseInt(form.cc))) {
      alert("La cédula (cc) es obligatoria y debe ser numérica.");
      ocultarCarga();
      return;
    }

    if (!form.celular || form.celular.trim() === "" || isNaN(parseInt(form.celular))) {
      alert("El celular es obligatorio y debe ser numérico.");
      ocultarCarga();
      return;
    }

    // si no usamos la fecha actual, validar la fecha personalizada
    if (!form.useFechaActual) {
      if (!form.fechaRegistro) {
        alert("La fecha de registro es obligatoria cuando no se usa la fecha de hoy.");
        ocultarCarga();
        return;
      }
      // intento de parsear
      const fechaSel = parseLocalDate(form.fechaRegistro);
      if (isNaN(fechaSel.getTime())) {
        alert("Ingrese una fecha de registro válida.");
        ocultarCarga();
        return;
      }
    }

    // Get selected course data (uno o combo)
    if (!form.cursoId || form.cursoId.trim() === "") {
      alert("Debe seleccionar al menos un curso.");
      ocultarCarga();
      return;
    }

    if (form.cursoId2 && form.cursoId2.trim() !== "" && form.cursoId2 === form.cursoId) {
      alert("El segundo curso no puede ser igual al primero.");
      ocultarCarga();
      return;
    }

    const selectedCourseIds = [form.cursoId];
    if (form.cursoId2 && form.cursoId2.trim() !== "") {
      selectedCourseIds.push(form.cursoId2);
    }

    const selectedCourses = selectedCourseIds
      .map((id) => courses.find((c) => c.id === id))
      .filter(Boolean);

    if (selectedCourses.length !== selectedCourseIds.length) {
      alert("Uno o más cursos seleccionados no existen.");
      ocultarCarga();
      return;
    }

    if (form.tipoPago === "TOTAL") {
      const pagoTotalNum = parseInt(unformatNumber(form.pagoTotal)) || 0;
      const valorCursoNum = parseInt(unformatNumber(form.valorCurso)) || 0;
      if (!pagoTotalNum || pagoTotalNum < valorCursoNum) {
        alert("Ingrese el pago total recibido (igual o mayor al valor del curso)." );
        ocultarCarga();
        return;
      }

      const cursosCantidad = selectedCourseIds.length;
      const pagoPorCurso = Math.round(pagoTotalNum / cursosCantidad);
      const facturaId = `FACT-${Date.now()}`;
      const mixtoId = cursosCantidad > 1 ? `MIX-${Date.now()}` : null;

      const estudianteRef = doc(db, "ESTUDIANTES_ACTIVOS", form.cc);
      const estudianteExistente = await getDoc(estudianteRef);
      const cursosExistentes = estudianteExistente.exists() ? estudianteExistente.data().cursos || {} : {};

      selectedCourses.forEach((curso, idx) => {
        const isPrincipal = !mixtoId || idx === 0;
        const cursoData = {
          cursoId: curso.id,
          nombreCurso: curso.nombre || '',
          tipoCurso: curso.tipoCurso || 'CONVALIDACION',
          tipoPago: "TOTAL",
          pagoTotal: isPrincipal ? pagoPorCurso : 0,
          valorCurso: 0,
          fechaRegistro: form.useFechaActual ? new Date() : parseLocalDate(form.fechaRegistro),
          responsableRegistro: userName || '',
          estado: isPrincipal ? "ACTIVO" : "INACTIVO",
          combo: !!mixtoId,
          cursosCombo: selectedCourseIds,
          facturaTotal: pagoTotalNum,
          facturaUnica: !!mixtoId,
          mixto: mixtoId,
          mixtoPrincipal: isPrincipal
        };

        if (mixtoId && !isPrincipal) {
          cursoData.pagoInicial = 0;
          cursoData.numeroCuotas = 0;
          cursoData.saldoPendiente = 0;
          cursoData.cuotas = {};
        }

        cursosExistentes[curso.id] = cursoData;
      });

      if (estudianteExistente.exists()) {
        await updateDoc(estudianteRef, { cursos: cursosExistentes });
      } else {
        await setDoc(estudianteRef, {
          nombreCompleto: form.nombreCompleto,
          correo: form.correo,
          celular: form.celular,
          cursos: cursosExistentes,
          status: "ACTIVO",
          fechaRegistro: form.useFechaActual ? new Date() : parseLocalDate(form.fechaRegistro)
        });
      }

      await Promise.all(selectedCourseIds.map(async (courseId) => {
        const cursoRef = doc(db, "CURSOS", courseId);
        const actual = courses.find((c) => c.id === courseId);
        const currentCount = (actual?.estudiantesActivos || 0) + 1;
        await updateDoc(cursoRef, { estudiantesActivos: currentCount });
      }));

      // store factura summary in student record
      const facturaInfo = {
        id: facturaId,
        cursos: selectedCourseIds,
        total: pagoTotalNum,
        tipoPago: "TOTAL",
        fecha: form.useFechaActual ? new Date() : parseLocalDate(form.fechaRegistro)
      };

      // No se crea registro de facturas en la colección de estudiante para cumplir requerimiento
      // show single-payment cronograma using registration date
      const inicio = form.useFechaActual ? new Date() : parseLocalDate(form.fechaRegistro);
      setCronograma([{ numero: 1, fecha: inicio, valor: pagoTotalNum }]);

      alert("Estudiante agregado exitosamente con pago total.");
      // Reset form
      setForm({
        nombreCompleto: "",
        cursoId: "",
        cursoId2: "",
        valorCurso: "",
        cc: "",
        celular: "",
        correo: "",
        tipoPago: "TOTAL",
        pagoInicial: "",
        numeroCuotas: "",
        pagoTotal: "",
        quincena: "15",
        useFechaActual: true,
        fechaRegistro: ""
      });
      setCronograma([]);
      setMostrarSegundoCurso(false);
      return;
    }

    // FINANCIADO: must have a generated cronograma
    if (form.tipoPago === "FINANCIADO") {
      if (!cronograma || cronograma.length === 0) {
        alert("Genere el cronograma antes de agregar el estudiante.");
        ocultarCarga();
        return;
      }

      // Calculate saldo pendiente (remaining balance)
      const valorCursoNum = parseInt(unformatNumber(form.valorCurso)) || 0;
      const pagoInicialNum = parseInt(unformatNumber(form.pagoInicial)) || 0;
      const saldoPendiente = valorCursoNum - pagoInicialNum;
      const numeroCuotasNum = parseInt(unformatNumber(form.numeroCuotas)) || 0;
      const facturaId = `FACT-${Date.now()}`;

      // Build cuotas map
      const cuotasMap = {};
      cronograma.forEach((cuota) => {
        cuotasMap[`Cuota ${cuota.numero}`] = {
          valor: cuota.valor,
          fecha: cuota.fecha,
          estado: "PENDIENTE"
        };
      });

      // Prepare course data with financing info for each selected course
      const estudianteRef = doc(db, "ESTUDIANTES_ACTIVOS", form.cc);
      const estudianteExistente = await getDoc(estudianteRef);
      const cursosExistentes = estudianteExistente.exists() ? estudianteExistente.data().cursos || {} : {};
      const mixtoId = selectedCourseIds.length > 1 ? `MIX-${Date.now()}` : null;

      selectedCourses.forEach((curso, idx) => {
        const isPrincipal = !mixtoId || idx === 0;

        let cursoData = {
          cursoId: curso.id,
          nombreCurso: curso.nombre || '',
          tipoCurso: curso.tipoCurso || 'CONVALIDACION',
          tipoPago: "FINANCIADO",
          pagoTotal: 0,
          pagoInicial: isPrincipal ? pagoInicialNum : 0,
          numeroCuotas: isPrincipal ? numeroCuotasNum : 0,
          pagarElDia: form.quincena,
          saldoPendiente: isPrincipal ? saldoPendiente : 0,
          cuotas: isPrincipal ? cuotasMap : {},
          fechaRegistro: form.useFechaActual ? new Date() : parseLocalDate(form.fechaRegistro),
          responsableRegistro: userName || '',
          estado: isPrincipal ? "ACTIVO" : "INACTIVO",
          combo: !!mixtoId,
          cursosCombo: selectedCourseIds,
          facturaTotal: valorCursoNum,
          facturaUnica: !!mixtoId,
          mixto: mixtoId,
          mixtoPrincipal: isPrincipal
        };

        if (!isPrincipal && mixtoId) {
          cursoData.pagoTotal = 0;
          cursoData.valorCurso = 0;
        }

        cursosExistentes[curso.id] = cursoData;
      });
      if (estudianteExistente.exists()) {
        await updateDoc(estudianteRef, { cursos: cursosExistentes });
      } else {
        await setDoc(estudianteRef, {
          nombreCompleto: form.nombreCompleto,
          correo: form.correo,
          celular: form.celular,
          cursos: cursosExistentes,
          status: "ACTIVO",
          fechaRegistro: form.useFechaActual ? new Date() : parseLocalDate(form.fechaRegistro)
        });
      }

      await Promise.all(selectedCourseIds.map(async (courseId) => {
        const cursoRef = doc(db, "CURSOS", courseId);
        const actual = courses.find((c) => c.id === courseId);
        const currentCount = (actual?.estudiantesActivos || 0) + 1;
        await updateDoc(cursoRef, { estudiantesActivos: currentCount });
      }));

      const facturaInfo = {
        id: facturaId,
        cursos: selectedCourseIds,
        total: valorCursoNum,
        tipoPago: "FINANCIADO",
        fecha: form.useFechaActual ? new Date() : parseLocalDate(form.fechaRegistro)
      };

      // No se crea registro de facturas en la colección de estudiante para cumplir requerimiento
      alert("Estudiante agregado exitosamente con financiamiento.");
      // Reset form
      setForm({
        nombreCompleto: "",
        cursoId: "",
        cursoId2: "",
        valorCurso: "",
        cc: "",
        celular: "",
        correo: "",
        tipoPago: "TOTAL",
        pagoInicial: "",
        numeroCuotas: "",
        pagoTotal: "",
        quincena: "15",
        useFechaActual: true,
        fechaRegistro: ""
      });
      setCronograma([]);
      setMostrarSegundoCurso(false);
      return;
    }
  } catch (error) {
      console.error("Error al guardar estudiante:", error);
      alert("Error al guardar el estudiante. Por favor intenta de nuevo.");
    } finally {
      ocultarCarga();
    }
  };

  return (
    <div className="content-card">
      <h2>AGREGAR ESTUDIANTE</h2>

      <div className="form-grid">
        <label className="field">
          <span className="label-text">CÉDULA (CC)</span>
          <input
            name="cc"
            value={form.cc}
            onChange={handleChange}
            onBlur={handleCcBlur}
            placeholder=""
            inputMode="numeric"
            required
          />
        </label>

        <label className="field">
          <span className="label-text">CORREO ELECTRÓNICO</span>
          <input
  name="correo"
  type="email"
  value={form.correo}
  onChange={(e) =>
    handleChange({
      target: {
        name: "correo",
        value: e.target.value.toLowerCase()
      }
    })
  }
  placeholder=""
  required
/>
        </label>

        <label className="field">
          <span className="label-text">CELULAR</span>
          <input
            name="celular"
            value={form.celular}
            onChange={handleChange}
            placeholder=""
            inputMode="numeric"
            required
          />
        </label>

        <label className="field">
          <span className="label-text">NOMBRE COMPLETO</span>
          <input
            name="nombreCompleto"
            value={form.nombreCompleto}
            onChange={handleChange}
            placeholder=""
          />
        </label>

        <label className="field">
          <span className="label-text">FILTRAR POR TIPO DE CURSO 1</span>
          <select
            value={cursoFiltro1}
            onChange={(e) => setCursoFiltro1(e.target.value)}
          >
            <option value="ALL">TODOS</option>
            {courseTypes.map((tipo) => (
              <option key={tipo} value={tipo}>{tipo}</option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="label-text">SELECCIONAR CURSO 1</span>
          <select name="cursoId" value={form.cursoId} onChange={handleChange}>
            <option value="">SELECCIONAR CURSO</option>
            {(cursoFiltro1 === 'ALL' ? courses : courses.filter((c) => c.tipoCurso === cursoFiltro1)).map((c) => (
              <option key={c.id} value={c.id}>
                {c.id} - {c.tipoCurso || 'CONVALIDACION'}
              </option>
            ))}
          </select>
        </label>

        <label className="field" style={{ alignItems: 'flex-end' }}>
          <button
            type="button"
            className="btn-centrado"
            onClick={() => setMostrarSegundoCurso(true)}
          >
            AGREGAR SEGUNDO CURSO
          </button>
        </label>

        {mostrarSegundoCurso && (
          <> 
            <label className="field">
              <span className="label-text">FILTRAR POR TIPO DE CURSO 2</span>
              <select
                value={cursoFiltro2}
                onChange={(e) => setCursoFiltro2(e.target.value)}
              >
                <option value="ALL">TODOS</option>
                {courseTypes.map((tipo) => (
                  <option key={tipo} value={tipo}>{tipo}</option>
                ))}
              </select>
            </label>

            <label className="field">
              <span className="label-text">SEGUNDO CURSO (COMBO)</span>
              <select name="cursoId2" value={form.cursoId2} onChange={handleChange}>
                <option value="">SELECCIONAR CURSO</option>
                {(cursoFiltro2 === 'ALL' ? courses : courses.filter((c) => c.tipoCurso === cursoFiltro2)).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.id} - {c.tipoCurso || 'CONVALIDACION'}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}

        {/* valor del curso manual */}
        <label className="field">
          <span className="label-text">VALOR DEL CURSO</span>
          <input
            name="valorCurso"
            value={form.valorCurso}
            onChange={handleChange}
            placeholder=""
          />
        </label>



        {/* Fecha de registro: usar hoy o custom */}
        <label className="field">
          <span className="label-text">
            <input
              type="checkbox"
              name="useFechaActual"
              checked={form.useFechaActual}
              onChange={handleChange}
            />{' '}
            USAR FECHA DE HOY
          </span>
        </label>
        {!form.useFechaActual && (
          <label className="field">
            <span className="label-text">FECHA DE REGISTRO</span>
            <input
              type="date"
              name="fechaRegistro"
              value={form.fechaRegistro}
              onChange={handleChange}
            />
          </label>
        )}

        <label className="field">
          <span className="label-text">TIPO DE PAGO</span>
          <select name="tipoPago" value={form.tipoPago} onChange={handleChange}>
            <option value="TOTAL">PAGO TOTAL</option>
            <option value="FINANCIADO">FINANCIADO</option>
          </select>
        </label>

        {form.tipoPago === "FINANCIADO" && (
          <>
            <label className="field">
              <span className="label-text">PAGO INICIAL</span>
              <input
                name="pagoInicial"
                value={form.pagoInicial}
                onChange={handleChange}
                placeholder=""
              />
            </label>

            <label className="field">
              <span className="label-text">NÚMERO DE CUOTAS</span>
              <input
                name="numeroCuotas"
                value={form.numeroCuotas}
                onChange={handleChange}
                placeholder=""
              />
            </label>

            <label className="field">
              <span className="label-text">PAGAR EL DÍA</span>
              <select name="quincena" value={form.quincena} onChange={handleChange}>
                <option value="15">PAGAR EL 15</option>
                <option value="30">PAGAR EL 30</option>
              </select>
            </label>

          </>
        )}

        {form.tipoPago === "TOTAL" && (
          <>
            <label className="field">
              <span className="label-text">PAGO TOTAL RECIBIDO</span>
              <input
                name="pagoTotal"
                value={form.pagoTotal}
                onChange={handleChange}
                placeholder=""
              />
            </label>

            <button 
  onClick={agregarEstudiante}
  className="btn-centrado"
>
  AGREGAR ESTUDIANTE
</button>
          </>
        )}

        {form.tipoPago === "FINANCIADO" && (
          <button 
  onClick={agregarEstudiante}
  className="btn-centrado"
>
  AGREGAR ESTUDIANTE
</button>
        )}
      </div>

      {/* ===== ACTIVAR / DESACTIVAR ESTUDIANTE ===== */}
      <div className="section-separator"></div>

      <div className="content-card" style={{ marginTop: "30px" }}>
        <h2>ACTIVAR O DESACTIVAR ESTUDIANTE</h2>

        <div className="form-grid">
          <label className="field">
            <span className="label-text">ESTADO</span>
            <div className="toggle-switch-container">
              <button
                className={`toggle-btn ${
                  activarForm.tipoEstudiante === "ACTIVOS" ? "active" : ""
                }`}
                onClick={() =>
                  setActivarForm((prev) => ({
                    ...prev,
                    tipoEstudiante: "ACTIVOS",
                    estudianteEncontrado: null
                  }))
                }
              >
                ACTIVOS
              </button>
              <button
                className={`toggle-btn ${
                  activarForm.tipoEstudiante === "DESACTIVADOS" ? "active" : ""
                }`}
                onClick={() =>
                  setActivarForm((prev) => ({
                    ...prev,
                    tipoEstudiante: "DESACTIVADOS",
                    estudianteEncontrado: null
                  }))
                }
              >
                DESACTIVADOS
              </button>
            </div>
          </label>

          <label className="field">
            <span className="label-text">CÉDULA DEL ESTUDIANTE</span>
            <input
              name="ccBuscar"
              value={activarForm.ccBuscar}
              onChange={(e) =>
                setActivarForm((prev) => ({
                  ...prev,
                  ccBuscar: e.target.value
                }))
              }
              placeholder=""
              inputMode="numeric"
            />
          </label>

          <button
            onClick={buscarEstudianteActivar}
            className="btn-centrado"
            disabled={activarForm.loading}
          >
            {activarForm.loading ? "BUSCANDO..." : "BUSCAR"}
          </button>
        </div>

        {activarForm.estudianteEncontrado && (
          <div className="estudiante-encontrado-card">
            <p>
              <strong>Estudiante:</strong> {activarForm.estudianteEncontrado.nombreCompleto}
            </p>
            <p>
              <strong>Cédula:</strong> {activarForm.estudianteEncontrado.id}
            </p>
            <p>
              <strong>Correo:</strong> {activarForm.estudianteEncontrado.correo}
            </p>
            <p>
              <strong>Estado actual:</strong>{" "}
              <span className={activarForm.tipoEstudiante === "ACTIVOS" ? "status-activo" : "status-desactivado"}>
                {activarForm.tipoEstudiante === "ACTIVOS" ? "ACTIVO" : "DESACTIVADO"}
              </span>
            </p>

            <button
              onClick={cambiarEstadoEstudiante}
              className={`btn-cambio-estado ${
                activarForm.tipoEstudiante === "ACTIVOS" ? "btn-desactivar" : "btn-activar"
              }`}
            >
              {activarForm.tipoEstudiante === "ACTIVOS" ? "DESACTIVAR" : "ACTIVAR"}
            </button>
          </div>
        )}
      </div>

      {cronograma.length > 0 && (
        <div className="cronograma-container">
          <h3>CRONOGRAMA DE PAGOS</h3>

          <div className="cronograma-controls" style={{ textAlign: 'center', marginBottom: '10px' }}>
            <button className="mes-btn" onClick={() => shiftCronograma(-1)} title="Trasladar todo un mes atrás">◀ Todo -1 mes</button>
            <button className="mes-btn" onClick={() => shiftCronograma(1)} title="Trasladar todo un mes adelante">Todo +1 mes ▶</button>
          </div>

          <div className="cronograma-grid">
            {cronograma.map((cuota, idx) => (
              <div key={cuota.numero} className="cuota-card">
                <div className="cuota-numero">
                  CUOTA {cuota.numero}
                </div>

                <div className="cuota-fecha">
                  {formatDate(cuota.fecha)}
                </div>

                <div className="cuota-valor">
                  ${formatNumber(cuota.valor)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default AggEstudiantes;