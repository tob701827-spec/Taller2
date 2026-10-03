// 1. CONEXIÓN A SUPABASE
const SUPABASE_URL = 'https://qhzvdndnzjlqoibsmfnj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoenZkbmRuempscW9pYnNtZm5qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1NTIzNzQsImV4cCI6MjEwNjEyODM3NH0.nGoonZHquvpmMuRuvqX16PS47kjaUWb36IiXlrDPrU0'; // Pon tu Anon Key real aquí

const dbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener('DOMContentLoaded', () => {
    const fechaSpan = document.getElementById('fecha-actual');
    if (fechaSpan) {
        fechaSpan.textContent = new Date().toLocaleDateString('es-ES', {
            weekday: 'long', year: 'numeric', month: 'short', day: 'numeric'
        });
    }
    verificarSesion();
});

// AUTENTICACIÓN Y VISTAS
async function registrarUsuario() {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    if (!email || !password) return alert('Completa correo y contraseña');

    const { data, error } = await dbClient.auth.signUp({ email, password });
    if (error) alert('Error: ' + error.message);
    else alert('Usuario registrado con éxito. Inicia sesión.');
}

async function iniciarSesion() {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    if (!email || !password) return alert('Completa correo y contraseña');

    const { data, error } = await dbClient.auth.signInWithPassword({ email, password });
    if (error) alert('Error de acceso: ' + error.message);
    else verificarSesion();
}

async function cerrarSesion() {
    await dbClient.auth.signOut();
    document.getElementById('vista-admin').style.display = 'none';
    document.getElementById('vista-portal').style.display = 'block';
}

async function verificarSesion() {
    const { data: { session } } = await dbClient.auth.getSession();
    if (session) {
        document.getElementById('vista-portal').style.display = 'none';
        document.getElementById('vista-admin').style.display = 'flex';
        document.getElementById('admin-user-email').textContent = session.user.email;
        cargarHistorial();
        cargarClientes();
        cargarVehiculos();
        cargarOrdenes();
    }
}

// CONSULTA PÚBLICA DE CLIENTE
async function consultarVehiculoCliente() {
    const matricula = document.getElementById('public-matricula').value.trim();
    if (!matricula) return alert('Ingresa una matrícula');

    const { data: vehiculo, error } = await dbClient
        .from('vehiculos')
        .select('*, clientes(nombre, telefono)')
        .eq('matricula', matricula)
        .single();

    if (error || !vehiculo) return alert('Vehículo no encontrado');

    const infoDiv = document.getElementById('cliente-info-vehiculo');
    infoDiv.innerHTML = `
        <p><strong>Cliente:</strong> ${vehiculo.clientes ? vehiculo.clientes.nombre : 'N/A'}</p>
        <p><strong>Vehículo:</strong> ${vehiculo.marca} ${vehiculo.modelo} (${vehiculo.ano || ''})</p>
        <p><strong>Kilometraje:</strong> ${vehiculo.kilometraje} km</p>
        ${vehiculo.foto_url ? `<img src="${vehiculo.foto_url}" class="img-thumb" style="width:150px;height:auto;">` : ''}
    `;

    const { data: ordenes } = await dbClient
        .from('ordenes_trabajo')
        .select('*')
        .eq('vehiculo_id', vehiculo.id)
        .order('fecha_ingreso', { ascending: false });

    const tbody = document.getElementById('tabla-cliente-historial');
    tbody.innerHTML = '';
    (ordenes || []).forEach(o => {
        tbody.innerHTML += `
            <tr>
                <td>${o.fecha_ingreso}</td>
                <td>${o.motivo}</td>
                <td>${o.trabajo_realizado}</td>
                <td>${o.diagnostico || '-'}</td>
            </tr>
        `;
    });

    document.getElementById('resultado-cliente').style.display = 'block';
}

// GUARDAR REGISTRO CON FOTO
async function guardarTodo(event) {
    event.preventDefault();
    try {
        const clienteNom = document.getElementById('v-cliente').value;
        const telefono = document.getElementById('v-telefono').value;
        const matricula = document.getElementById('v-matricula').value;
        const marca = document.getElementById('v-marca').value;
        const modelo = document.getElementById('v-modelo').value;
        const ano = document.getElementById('v-ano').value;
        const km = document.getElementById('v-km').value;
        const fotoInput = document.getElementById('v-foto');

        let fotoUrl = null;
        if (fotoInput.files.length > 0) {
            const file = fotoInput.files[0];
            const fileName = `${Date.now()}_${file.name}`;
            const { data: uploadData, error: uploadErr } = await dbClient.storage
                .from('vehiculos')
                .upload(fileName, file);

            if (!uploadErr) {
                const { data: publicData } = dbClient.storage.from('vehiculos').getPublicUrl(fileName);
                fotoUrl = publicData.publicUrl;
            }
        }

        let { data: cliente } = await dbClient.from('clientes').select('id').eq('nombre', clienteNom).single();
        if (!cliente) {
            const { data: nCli } = await dbClient.from('clientes').insert([{ nombre: clienteNom, telefono }]).select().single();
            cliente = nCli;
        }

        let { data: vehiculo } = await dbClient.from('vehiculos').select('id').eq('matricula', matricula).single();
        if (!vehiculo) {
            const { data: nVeh } = await dbClient.from('vehiculos').insert([{
                cliente_id: cliente.id, matricula, marca, modelo, ano, kilometraje: km, foto_url: fotoUrl
            }]).select().single();
            vehiculo = nVeh;
        } else if (fotoUrl) {
            await dbClient.from('vehiculos').update({ foto_url: fotoUrl, kilometraje: km }).eq('id', vehiculo.id);
        }

        await dbClient.from('ordenes_trabajo').insert([{
            vehiculo_id: vehiculo.id,
            fecha_ingreso: document.getElementById('t-ingreso').value,
            fecha_entrega: document.getElementById('t-entrega').value || null,
            motivo: document.getElementById('t-motivo').value,
            diagnostico: document.getElementById('t-diagnostico').value,
            trabajo_realizado: document.getElementById('t-trabajo').value
        }]);

        alert('Registro guardado exitosamente.');
        limpiarFormulario();
        cargarHistorial();
    } catch (err) {
        alert('Error al guardar: ' + err.message);
    }
}

// CARGAR TABLAS
async function cargarHistorial() {
    const { data } = await dbClient
        .from('ordenes_trabajo')
        .select('*, vehiculos(matricula, marca, modelo, clientes(nombre))')
        .order('fecha_ingreso', { ascending: false });

    const tbody = document.getElementById('tabla-historial-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    (data || []).forEach(o => {
        tbody.innerHTML += `
            <tr>
                <td>${o.fecha_ingreso}</td>
                <td>${o.vehiculos ? o.vehiculos.matricula + ' - ' + o.vehiculos.marca : '-'}</td>
                <td>${o.vehiculos && o.vehiculos.clientes ? o.vehiculos.clientes.nombre : '-'}</td>
                <td>${o.trabajo_realizado}</td>
                <td>${o.diagnostico || '-'}</td>
                <td><button class="btn-secondary" onclick="abrirModalEditar('${o.id}', '${o.motivo}', '${o.diagnostico || ''}', '${o.trabajo_realizado}', '${o.fecha_entrega || ''}')">Editar</button></td>
            </tr>
        `;
    });
}

async function cargarVehiculos() {
    const { data } = await dbClient.from('vehiculos').select('*, clientes(nombre)');
    const tbody = document.getElementById('tabla-vehiculos-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    (data || []).forEach(v => {
        tbody.innerHTML += `
            <tr>
                <td>${v.foto_url ? `<img src="${v.foto_url}" class="img-thumb">` : 'Sin foto'}</td>
                <td>${v.matricula}</td>
                <td>${v.marca} ${v.modelo}</td>
                <td>${v.ano || '-'}</td>
                <td>${v.clientes ? v.clientes.nombre : '-'}</td>
                <td>${v.kilometraje}</td>
            </tr>
        `;
    });
}

async function cargarClientes() {
    const { data } = await dbClient.from('clientes').select('*');
    const tbody = document.getElementById('tabla-clientes-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    (data || []).forEach(c => {
        tbody.innerHTML += `<tr><td>${c.nombre}</td><td>${c.telefono || '-'}</td><td>-</td><td>-</td></tr>`;
    });
}

async function cargarOrdenes() {
    const { data } = await dbClient.from('ordenes_trabajo').select('*, vehiculos(matricula, marca)');
    const tbody = document.getElementById('tabla-ordenes-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    (data || []).forEach(o => {
        tbody.innerHTML += `
            <tr>
                <td>${o.fecha_ingreso}</td>
                <td>${o.vehiculos ? o.vehiculos.matricula : '-'}</td>
                <td>${o.motivo}</td>
                <td>${o.trabajo_realizado}</td>
                <td>${o.fecha_entrega || 'En proceso'}</td>
            </tr>
        `;
    });
}

// EDICIÓN EN MODAL
function abrirModalEditar(id, motivo, diagnostico, trabajo, entrega) {
    document.getElementById('edit-orden-id').value = id;
    document.getElementById('edit-motivo').value = motivo;
    document.getElementById('edit-diagnostico').value = diagnostico;
    document.getElementById('edit-trabajo').value = trabajo;
    document.getElementById('edit-entrega').value = entrega;
    document.getElementById('modal-editar').style.display = 'flex';
}

function cerrarModalEditar() {
    document.getElementById('modal-editar').style.display = 'none';
}

async function guardarEdicionOrden() {
    const id = document.getElementById('edit-orden-id').value;
    const motivo = document.getElementById('edit-motivo').value;
    const diagnostico = document.getElementById('edit-diagnostico').value;
    const trabajo_realizado = document.getElementById('edit-trabajo').value;
    const fecha_entrega = document.getElementById('edit-entrega').value || null;

    const { error } = await dbClient.from('ordenes_trabajo').update({
        motivo, diagnostico, trabajo_realizado, fecha_entrega
    }).eq('id', id);

    if (error) alert('Error al actualizar: ' + error.message);
    else {
        cerrarModalEditar();
        cargarHistorial();
    }
}

// NAVEGACIÓN DE PESTAÑAS
function navegarA(seccion, event) {
    if (event) event.preventDefault();
    document.querySelectorAll('.content-section').forEach(s => s.style.display = 'none');
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.getElementById(`seccion-${seccion}`).style.display = 'block';
}

function limpiarFormulario() {
    document.getElementById('form-registro').reset();
}