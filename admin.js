// 1. CONEXIÓN A SUPABASE
const SUPABASE_URL = 'https://qhzvdndnzjlqoibsmfnj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoenZkbmRuempscW9pYnNtZm5qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1NTIzNzQsImV4cCI6MjEwNjEyODM3NH0.nGoonZHquvpmMuRuvqX16PS47kjaUWb36IiXlrDPrU0'; // Pon tu Anon Key real aquí


const dbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener('DOMContentLoaded', () => {
    verificarSesion();
});

// 2. VERIFICACIÓN DE SESIÓN (MODO SEGURO)
async function verificarSesion() {
    const vistaPortal = document.getElementById('vista-portal');
    const vistaAdmin = document.getElementById('vista-admin');
    const adminEmail = document.getElementById('admin-user-email');

    if (!vistaPortal || !vistaAdmin) return;

    const { data: { session } } = await dbClient.auth.getSession();

    if (session) {
        vistaPortal.style.display = 'none';
        vistaAdmin.style.display = 'block';
        if (adminEmail) adminEmail.textContent = session.user.email;
    } else {
        vistaPortal.style.display = 'block';
        vistaAdmin.style.display = 'none';
    }
}

// 3. AUTENTICACIÓN ADMIN
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

    if (!email || !password) return alert('Por favor, ingresa tu correo y contraseña');

    const { data, error } = await dbClient.auth.signInWithPassword({ email, password });

    if (error) {
        alert('Error al iniciar sesión: ' + error.message);
    } else {
        cerrarModalAdmin();
        verificarSesion();
    }
}

async function cerrarSesion() {
    await dbClient.auth.signOut();
    verificarSesion();
}

// 4. CONSULTA PÚBLICA DE CLIENTES (CORREGIDA)
async function consultarVehiculoCliente(event) {
    if (event) event.preventDefault();
    
    const inputMatricula = document.getElementById('input-matricula');
    if (!inputMatricula) return;
    
    const matricula = inputMatricula.value.trim();
    if (!matricula) return alert('Ingresa una matrícula');

    // Buscar vehículo y cliente asociado
    const { data: vehiculo, error } = await dbClient
        .from('vehiculos')
        .select('*, clientes(nombre, telefono)')
        .eq('matricula', matricula)
        .maybeSingle();

    if (error || !vehiculo) {
        return alert('No se encontró ningún vehículo registrado con esa matrícula.');
    }

    const infoDiv = document.getElementById('cliente-info-vehiculo');
    if (infoDiv) {
        infoDiv.innerHTML = `
            <p><strong>Cliente:</strong> ${vehiculo.clientes ? vehiculo.clientes.nombre : 'N/A'}</p>
            <p><strong>Vehículo:</strong> ${vehiculo.marca || ''} ${vehiculo.modelo || ''} (${vehiculo.ano || ''})</p>
            <p><strong>Kilometraje:</strong> ${vehiculo.kilometraje || 0} km</p>
            ${vehiculo.foto_url ? `<img src="${vehiculo.foto_url}" class="img-thumb" style="width:150px; height:auto; margin-top:10px; border-radius:8px;">` : ''}
        `;
    }

    // Buscar órdenes de trabajo
    const { data: ordenes } = await dbClient
        .from('ordenes_trabajo')
        .select('*')
        .eq('vehiculo_id', vehiculo.id)
        .order('fecha_ingreso', { ascending: false });

    const tbody = document.getElementById('tabla-cliente-historial');
    if (tbody) {
        tbody.innerHTML = '';
        (ordenes || []).forEach(o => {
            tbody.innerHTML += `
                <tr>
                    <td>${o.fecha_ingreso || '-'}</td>
                    <td>${o.motivo || '-'}</td>
                    <td>${o.trabajo_realizado || '-'}</td>
                    <td>${o.diagnostico || '-'}</td>
                </tr>
            `;
        });
    }

    const resultadoDiv = document.getElementById('resultado-cliente');
    if (resultadoDiv) resultadoDiv.style.display = 'block';
}