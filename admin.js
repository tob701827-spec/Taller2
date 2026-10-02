// Configuración de Supabase
const SUPABASE_URL = "https://qhzvdndnzjlqoibsmfnj.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoenZkbmRuempscW9pYnNtZm5qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1NTIzNzQsImV4cCI6MjEwNjEyODM3NH0.nGoonZHquvpmMuRuvqX16PS47kjaUWb36IiXlrDPrU0";

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let vehiculoActual = null;

// Inicialización de fechas
document.addEventListener("DOMContentLoaded", () => {
  const hoy = new Date().toISOString().split('T')[0];
  document.getElementById("t-entry-date").value = hoy;
});

// Búsqueda por Matrícula
async function buscarPorMatricula() {
  const plate = document.getElementById("global-search").value.trim().toUpperCase();
  if (!plate) return;

  mostrarEstado("Buscando...", "info");

  const { data: vehiculo, error } = await db
    .from("vehicles")
    .select("*")
    .eq("plate", plate)
    .single();

  if (error || !vehiculo) {
    mostrarEstado("No se encontró ningún vehículo registrado con esa matrícula.", "error");
    vehiculoActual = null;
    limpiarFormularioCampos();
    return;
  }

  vehiculoActual = vehiculo;
  
  // Cargar datos del vehículo en el formulario
  document.getElementById("v-client").value = vehiculo.client_name || "";
  document.getElementById("v-phone").value = vehiculo.phone || "";
  document.getElementById("v-plate").value = vehiculo.plate || "";
  document.getElementById("v-motor").value = vehiculo.motor || "";
  document.getElementById("v-brand").value = vehiculo.brand || "";
  document.getElementById("v-km").value = vehiculo.mileage || "";
  document.getElementById("v-model").value = vehiculo.model || "";
  document.getElementById("v-vin").value = vehiculo.vin || "";
  document.getElementById("v-year").value = vehiculo.year || "";

  document.getElementById("t-km").value = vehiculo.mileage || "";

  mostrarEstado("Vehículo cargado correctamente.", "success");
  cargarHistorial(vehiculo.id);
}

// Cargar Historial
async function cargarHistorial(vehicleId) {
  const { data: servicios, error } = await db
    .from("services")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .order("entry_date", { ascending: false });

  const tbody = document.getElementById("history-table-body");
  tbody.innerHTML = "";

  if (error || !servicios || servicios.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="empty-msg">Sin historial registrado para este vehículo.</td></tr>`;
    return;
  }

  servicios.forEach(s => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${s.entry_date || '-'}</td>
      <td>${s.delivery_date || '-'}</td>
      <td>${s.km_at_service ? s.km_at_service + ' km' : '-'}</td>
      <td><strong>${s.reason || s.service_type || ''}</strong> ${s.diagnosis ? '- ' + s.diagnosis : ''}</td>
    `;
    tbody.appendChild(tr);
  });
}

// Guardar datos del Vehículo y Trabajo Realizado
async function guardarTodo() {
  const plate = document.getElementById("v-plate").value.trim().toUpperCase();
  if (!plate) {
    mostrarEstado("La matrícula es obligatoria.", "error");
    return;
  }

  const payloadVehiculo = {
    plate: plate,
    client_name: document.getElementById("v-client").value.trim(),
    phone: document.getElementById("v-phone").value.trim(),
    motor: document.getElementById("v-motor").value.trim(),
    brand: document.getElementById("v-brand").value.trim(),
    mileage: Number(document.getElementById("v-km").value) || 0,
    model: document.getElementById("v-model").value.trim(),
    vin: document.getElementById("v-vin").value.trim(),
    year: document.getElementById("v-year").value.trim()
  };

  mostrarEstado("Guardando...", "info");

  // Upsert del vehículo
  const { data: vData, error: vError } = await db
    .from("vehicles")
    .upsert(payloadVehiculo, { onConflict: 'plate' })
    .select()
    .single();

  if (vError) {
    mostrarEstado("Error al guardar el vehículo: " + vError.message, "error");
    return;
  }

  vehiculoActual = vData;

  // Guardar el servicio / trabajo realizado
  const payloadServicio = {
    vehicle_id: vehiculoActual.id,
    entry_date: document.getElementById("t-entry-date").value || new Date().toISOString().split('T')[0],
    delivery_date: document.getElementById("t-delivery-date").value || null,
    km_at_service: Number(document.getElementById("t-km").value) || payloadVehiculo.mileage,
    reason: document.getElementById("t-reason").value,
    diagnosis: document.getElementById("t-diagnosis").value.trim(),
    service_type: document.getElementById("t-work").value.trim(),
    observations: document.getElementById("t-obs").value.trim()
  };

  const { error: sError } = await db.from("services").insert(payloadServicio);

  if (sError) {
    mostrarEstado("Error al guardar el trabajo: " + sError.message, "error");
    return;
  }

  mostrarEstado("¡Datos y trabajo guardados con éxito!", "success");
  cargarHistorial(vehiculoActual.id);
}

function limpiarFormulario() {
  document.querySelectorAll("input, select, textarea").forEach(el => el.value = "");
  document.getElementById("t-entry-date").value = new Date().toISOString().split('T')[0];
  document.getElementById("history-table-body").innerHTML = `<tr><td colspan="4" class="empty-msg">Ingrese una matrícula para consultar el historial.</td></tr>`;
  mostrarEstado("", "");
  vehiculoActual = null;
}

function limpiarFormularioCampos() {
  document.querySelectorAll(".card input, .card select, .card textarea").forEach(el => el.value = "");
  document.getElementById("t-entry-date").value = new Date().toISOString().split('T')[0];
}

function mostrarEstado(msg, tipo) {
  const statusEl = document.getElementById("status-msg");
  statusEl.textContent = msg;
  statusEl.className = "status-msg " + tipo;
}