-- ============================================
-- Esquema para Supabase (Postgres)
-- Sitio de taller: carga de datos de vehículos
-- ============================================

-- Extensión para generar UUIDs
create extension if not exists "pgcrypto";

-- Tabla de vehículos
create table vehicles (
  id uuid primary key default gen_random_uuid(),
  plate text not null unique,          -- patente/matrícula (usada para que el cliente busque su vehículo)
  brand text,                          -- marca
  model text,                          -- modelo
  client_name text,                    -- nombre del cliente
  mileage integer not null default 0,  -- kilometraje actual
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tabla de servicios / registros de mantenimiento
create table services (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  service_type text not null,          -- ej: 'Cambio de aceite de motor', 'Cambio de aceite de caja', 'Service general'
  service_date date not null default current_date,
  km_at_service integer not null,      -- kilometraje al momento del servicio
  next_km integer,                     -- kilometraje sugerido para el próximo cambio
  observations text,                   -- observación / lo que hay que revisar a futuro
  created_at timestamptz not null default now()
);

-- Índices útiles
create index idx_services_vehicle_id on services(vehicle_id);
create index idx_vehicles_plate on vehicles(plate);

-- ============================================
-- Row Level Security (RLS)
-- ============================================
alter table vehicles enable row level security;
alter table services enable row level security;

-- Lectura pública (el cliente busca por patente, con la anon key)
create policy "Lectura publica de vehiculos"
  on vehicles for select
  using (true);

create policy "Lectura publica de servicios"
  on services for select
  using (true);

-- Escritura SOLO para usuarios autenticados (vos, desde el panel de admin)
create policy "Admin puede insertar vehiculos"
  on vehicles for insert
  to authenticated
  with check (true);

create policy "Admin puede actualizar vehiculos"
  on vehicles for update
  to authenticated
  using (true);

create policy "Admin puede insertar servicios"
  on services for insert
  to authenticated
  with check (true);

create policy "Admin puede actualizar servicios"
  on services for update
  to authenticated
  using (true);

create policy "Admin puede borrar servicios"
  on services for delete
  to authenticated
  using (true);
