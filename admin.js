// ============================================
// Configuración de Supabase
// Reemplazá estos dos valores por los de tu proyecto
// (Supabase > Project Settings > API)
// ============================================
const SUPABASE_URL = "https://qhzvdndnzjlqoibsmfnj.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_T5F_0Wkj703XvQG0-xz9qQ_O-2dMKa";

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let vehiculoSeleccionado = null;

// ---------- Sesión ----------
async function checkSession() {
  const { data: { session } } = await db.auth.getSession();
  if (session) mostrarPanel();
}
checkSession();

async function login() {
  const email = document.getElementById("login-email").value;
  const pass = document.getElementById("login-pass").value;
  const { error } = await db.auth.signInWithPassword({ email, password: pass });
  if (error) {
    document.getElementById("login-error").textContent = "Error: " + error.message;
    return;
  }
  mostrarPanel();
}

async function logout() {
  await db.auth.signOut();
  location.reload();
}

function mostrarPanel() {
  document.getElementById("login-card").classList.add("hidden");
  document.getElementById("panel").classList.remove("hidden");
}

// ---------- Vehículos ----------
async function crearVehiculo() {
  const payload = {
    plate: document.getElementById("v-plate").value.trim().toUpperCase(),
    brand: document.getElementById("v-brand").value.trim(),
    model: document.getElementById("v-model").value.trim(),
    client_name: document.getElementById("v-client").value.trim(),
    mileage: Number(document.getElementById("v-km").value) || 0
  };
  const { error } = await db.from("vehicles").insert(payload);
  const msg = document.getElementById("v-msg");
  msg.textContent = error ? "Error: " + error.message : "Vehículo guardado ✔";
}

async function buscarVehiculo() {
  const plate = document.getElementById("s-plate").value.trim().toUpperCase();
  const { data, error } = await db.from("vehicles").select("*").eq("plate", plate).single();
  const found = document.getElementById("s-found");
  if (error || !data) {
    found.textContent = "No se encontró un vehículo con esa patente.";
    vehiculoSeleccionado = null;
    return;
  }
  vehiculoSeleccionado = data;
  found.textContent = `Encontrado: ${data.brand} ${data.model} — ${data.client_name} (km actual: ${data.mileage})`;
}

// ---------- Servicios ----------
async function crearServicio() {
  const errorEl = document.getElementById("s-error");
  const msgEl = document.getElementById("s-msg");
  errorEl.textContent = "";
  msgEl.textContent = "";

  if (!vehiculoSeleccionado) {
    errorEl.textContent = "Primero buscá y seleccioná un vehículo por patente.";
    return;
  }

  const km = Number(document.getElementById("s-km").value);

  const payload = {
    vehicle_id: vehiculoSeleccionado.id,
    service_type: document.getElementById("s-type").value,
    km_at_service: km,
    next_km: Number(document.getElementById("s-nextkm").value) || null,
    observations: document.getElementById("s-obs").value.trim()
  };

  const { error } = await db.from("services").insert(payload);
  if (error) {
    errorEl.textContent = "Error: " + error.message;
    return;
  }

  // Actualiza el kilometraje del vehículo si el nuevo dato es mayor
  if (km > vehiculoSeleccionado.mileage) {
    await db.from("vehicles").update({ mileage: km }).eq("id", vehiculoSeleccionado.id);
  }

  msgEl.textContent = "Servicio guardado ✔";
  document.getElementById("s-obs").value = "";
}
