const SUPABASE_URL = 'https://qhzvdndnzjlqoibsmfnj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoenZkbmRuempscW9pYnNtZm5qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1NTIzNzQsImV4cCI6MjEwNjEyODM3NH0.nGoonZHquvpmMuRuvqX16PS47kjaUWb36IiXlrDPrU0'; // Pon tu Anon Key real aquí


const dbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener('DOMContentLoaded', () => {
    verificarSesion();
});

async function verificarSesion() {
    const vistaPortal = document.getElementById('vista-portal');
    const vistaAdmin = document.getElementById('vista-admin');
    const adminEmail = document.getElementById('admin-user-email');
    const btnLoginModal = document.getElementById('btn-login-modal');
    const btnLogoutHead = document.getElementById('btn-logout-head');

    const { data: { session } } = await dbClient.auth.getSession();

    if (session) {
        if (vistaPortal) vistaPortal.style.display = 'none';
        if (vistaAdmin) vistaAdmin.style.display = 'block';
        if (adminEmail) adminEmail.textContent = session.user.email;
        if (btnLoginModal) btnLoginModal.style.display = 'none';
        if (btnLogoutHead) btnLogoutHead.style.display = 'inline-block';
    } else {
        if (vistaPortal) vistaPortal.style.display = 'block';
        if (vistaAdmin) vistaAdmin.style.display = 'none';
        if (btnLoginModal) btnLoginModal.style.display = 'inline-block';
        if (btnLogoutHead) btnLogoutHead.style.display = 'none';
    }
}

function abrirModalAdmin() {
    const modal = document.getElementById('modal-admin');
    if (modal) modal.style.display = 'flex';
}

function cerrarModalAdmin() {
    const modal = document.getElementById('modal-admin');
    if (modal) modal.style.display = 'none';
}

async function iniciarSesion(event) {
    if (event) event.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    const { data, error } = await dbClient.auth.signInWithPassword({ email, password });

    if (error) {
        alert('Error: ' + error.message);
    } else {
        cerrarModalAdmin();
        verificarSesion();
    }
}

async function cerrarSesion() {
    await dbClient.auth.signOut();
    verificarSesion();
}

async function consultarVehiculoCliente(event) {
    if (event) event.preventDefault();
    const matricula = document.getElementById('input-matricula').value.trim();
    if (!matricula) return;

    const { data: vehiculo } = await dbClient
        .from('vehiculos')
        .select('*, clientes(nombre, telefono)')
        .eq('matricula', matricula)
        .maybeSingle();

    if (!vehiculo) {
        alert('No se encontró ningún vehículo registrado con esa matrícula.');
        return;
    }

    document.getElementById('cliente-info-vehiculo').innerHTML = `
        <p><strong>Cliente:</strong> ${vehiculo.clientes ? vehiculo.clientes.nombre : 'N/A'}</p>
        <p><strong>Vehículo:</strong> ${vehiculo.marca || ''} ${vehiculo.modelo || ''}</p>
    `;

    const { data: ordenes } = await dbClient
        .from('ordenes_trabajo')
        .select('*')
        .eq('vehiculo_id', vehiculo.id);

    const tbody = document.getElementById('tabla-cliente-historial');
    tbody.innerHTML = '';
    (ordenes || []).forEach(o => {
        tbody.innerHTML += `
            <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 8px;">${o.fecha_ingreso || '-'}</td>
                <td style="padding: 8px;">${o.motivo || '-'}</td>
                <td style="padding: 8px;">${o.trabajo_realizado || '-'}</td>
                <td style="padding: 8px;">${o.diagnostico || '-'}</td>
            </tr>
        `;
    });

    document.getElementById('resultado-cliente').style.display = 'block';
}

async function guardarOrdenAdmin(event) {
    if (event) event.preventDefault();

    const nombre = document.getElementById('admin-nombre-cliente').value.trim();
    const telefono = document.getElementById('admin-telefono').value.trim();
    const matricula = document.getElementById('admin-matricula').value.trim().toUpperCase();
    const vehiculoDetalle = document.getElementById('admin-vehiculo').value.trim();
    const motivo = document.getElementById('admin-motivo').value.trim();

    try {
        // 1. Insertar el cliente en la tabla 'clientes'
        const { data: cliente, error: errCliente } = await dbClient
            .from('clientes')
            .insert([{ nombre: nombre, telefono: telefono }])
            .select()
            .single();

        if (errCliente) throw errCliente;

        // 2. Insertar el vehículo vinculado al cliente
        const { data: vehiculo, error: errVehiculo } = await dbClient
            .from('vehiculos')
            .insert([{ 
                cliente_id: cliente.id, 
                matricula: matricula, 
                marca: vehiculoDetalle,
                modelo: vehiculoDetalle 
            }])
            .select()
            .single();

        if (errVehiculo) throw errVehiculo;

        // 3. Crear la orden de trabajo para ese vehículo
        const { error: errOrden } = await dbClient
            .from('ordenes_trabajo')
            .insert([{ 
                vehiculo_id: vehiculo.id, 
                motivo: motivo, 
                trabajo_realizado: 'Pendiente de revisión',
                fecha_ingreso: new Date().toISOString().split('T')[0] 
            }]);