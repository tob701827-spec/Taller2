--- Esquema actualizado para Supabase (Postgres)

create extension if not exists "pgcrypto";

-- 1. ELIMINAR TABLAS E ÍNDICES EXISTENTES (Para evitar el error 42P07)
drop table if exists services cascade;
drop table if exists vehicles cascade;

drop index if exists idx_services_vehicle_id;
drop index if exists idx_vehicles_plate;

-- 2. Tabla de vehículos con nuevos campos del formulario
create table vehicles (
    id uuid primary key default gen_random_uuid(),
    plate text not null unique,        -- Matrícula / Patente
    brand text,                        -- Marca
    model text,                        -- Modelo
    year text,                         -- Año
    client_name text,                  -- Nombre del cliente
    phone text,                        -- Teléfono
    motor text,                        -- Motor
    vin text,                          -- VIN / Chasis
    mileage integer not null default 0, -- Kilometraje actual
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 3. Tabla de servicios / órdenes de trabajo con nuevos campos
create table services (
    id uuid primary key default gen_random_uuid(),
    vehicle_id uuid not null references vehicles(id) on delete cascade,
    entry_date date not null default current_date, -- Fecha de ingreso
    delivery_date date,                            -- Fecha de entrega
    km_at_service integer not null,                -- Kilometraje al servicio
    reason text,                                   -- Motivo de ingreso
    diagnosis text,                                -- Diagnóstico
    service_type text,                             -- Trabajo realizado
    observations text,                             -- Observaciones
    created_at timestamptz not null default now()
);

-- 4. Índices
create index idx_services_vehicle_id on services(vehicle_id);
create index idx_vehicles_plate on vehicles(plate);

-- 5. Row Level Security (RLS)
alter table vehicles enable row level security;
alter table services enable row level security;

-- Limpieza de políticas previas por si existen
drop policy if exists "Lectura publica de vehiculos" on vehicles;
drop policy if exists "Lectura publica de servicios" on services;
drop policy if exists "Admin puede insertar vehiculos" on vehicles;
drop policy if exists "Admin puede actualizar vehiculos" on vehicles;
drop policy if exists "Admin puede insertar servicios" on services;
drop policy if exists "Admin puede actualizar servicios" on services;
drop policy if exists "Admin puede borrar servicios" on services;

-- Creación de políticas
create policy "Lectura publica de vehiculos" on vehicles for select using (true);
create policy "Lectura publica de servicios" on services for select using (true);

create policy "Admin puede insertar vehiculos" on vehicles for insert to authenticated with check (true);
create policy "Admin puede actualizar vehiculos" on vehicles for update to authenticated using (true);
create policy "Admin puede insertar servicios" on services for insert to authenticated with check (true);
create policy "Admin puede actualizar servicios" on services for update to authenticated using (true);
create policy "Admin puede borrar servicios" on services for delete to authenticated using (true);