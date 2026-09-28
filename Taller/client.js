// Mismas credenciales públicas (anon key) que admin.js.
// La anon key SOLO permite lectura para usuarios no logueados (ver schema.sql / RLS).
const SUPABASE_URL = "https://TU-PROYECTO.supabase.co";
const SUPABASE_ANON_KEY = "TU-ANON-KEY";

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function buscar() {
  const plate = document.getElementById("plate").value.trim().toUpperCase();
  const errorEl = document.getElementById("error");
  errorEl.textContent = "";

  const { data: vehiculo, error } = await db
    .from("vehicles")
    .select("*")
    .eq("plate", plate)
    .single();

  if (error || !vehiculo) {
    errorEl.textContent = "No se encontró ningún vehículo con esa patente.";
    document.getElementById("vehiculo-card").classList.add("hidden");
    document.getElementById("lista-servicios").innerHTML = "";
    return;
  }

  document.getElementById("vehiculo-card").classList.remove("hidden");
  document.getElementById("v-titulo").textContent =
    `${vehiculo.brand} ${vehiculo.model} — ${vehiculo.client_name}`;
  document.getElementById("v-km").textContent =
    `Kilometraje actual: ${vehiculo.mileage} km`;

  const { data: servicios } = await db
    .from("services")
    .select("*")
    .eq("vehicle_id", vehiculo.id)
    .order("service_date", { ascending: false });

  const cont = document.getElementById("lista-servicios");
  cont.innerHTML = "";

  (servicios || []).forEach(s => {
    const div = document.createElement("div");
    div.className = "service-item";
    div.innerHTML = `
      <div class="type">${s.service_type}</div>
      <div class="meta">${s.service_date} — ${s.km_at_service} km</div>
      ${s.observations ? `<div>${s.observations}</div>` : ""}
      ${s.next_km ? `<div class="next">Próximo cambio sugerido: ${s.next_km} km</div>` : ""}
    `;
    cont.appendChild(div);
  });
}
