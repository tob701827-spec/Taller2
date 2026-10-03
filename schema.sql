-- 1. Crear tabla de Clientes
CREATE TABLE IF NOT EXISTS clientes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre TEXT NOT NULL,
    telefono TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Crear tabla de Vehículos (incluye la foto_url)
CREATE TABLE IF NOT EXISTS vehiculos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
    matricula TEXT UNIQUE NOT NULL,
    marca TEXT NOT NULL,
    modelo TEXT NOT NULL,
    ano TEXT,
    kilometraje NUMERIC,
    foto_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Crear tabla de Órdenes de Trabajo / Historial
CREATE TABLE IF NOT EXISTS ordenes_trabajo (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vehiculo_id UUID REFERENCES vehiculos(id) ON DELETE CASCADE,
    fecha_ingreso DATE NOT NULL,
    fecha_entrega DATE,
    motivo TEXT NOT NULL,
    diagnostico TEXT,
    trabajo_realizado TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Crear el Bucket para almacenar las fotos de los vehículos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('vehiculos', 'vehiculos', true)
ON CONFLICT (id) DO NOTHING;

-- 5. Eliminar políticas antiguas para evitar duplicados y crearlas de nuevo
DROP POLICY IF EXISTS "Permitir subida pública de imágenes" ON storage.objects;
DROP POLICY IF EXISTS "Permitir lectura pública de imágenes" ON storage.objects;
DROP POLICY IF EXISTS "Permitir actualización de imágenes" ON storage.objects;
DROP POLICY IF EXISTS "Permitir eliminación de imágenes" ON storage.objects;

CREATE POLICY "Permitir subida pública de imágenes" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'vehiculos');

CREATE POLICY "Permitir lectura pública de imágenes" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'vehiculos');

CREATE POLICY "Permitir actualización de imágenes" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'vehiculos');

CREATE POLICY "Permitir eliminación de imágenes" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'vehiculos');
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordenes_trabajo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir lectura pública de vehículos" ON vehiculos FOR SELECT USING (true);
CREATE POLICY "Permitir lectura pública de clientes" ON clientes FOR SELECT USING (true);
CREATE POLICY "Permitir lectura pública de órdenes" ON ordenes_trabajo FOR SELECT USING (true);