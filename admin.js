const SUPABASE_URL = 'https://qhzvdndnzjlqoibsmfnj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoenZkbmRuempscW9pYnNtZm5qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1NTIzNzQsImV4cCI6MjEwNjEyODM3NH0.nGoonZHquvpmMuRuvqX16PS47kjaUWb36IiXlrDPrU0';

const dbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let listaOrdenesGlobal = [];

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
        
        cargarOrdenesAdmin();
    } else {
        if (vistaPortal) vistaPortal.style.display = 'block';
        if (vistaAdmin) vistaAdmin.style.display = 'none';
        if (btnLoginModal) btnLoginModal.style.display = 'inline-block';
        if (btnLogoutHead) btnLogoutHead.style.display = 'none';
    }
}

function cambiarPestanaAdmin(pestana) {
    const reg = document.getElementById('pestana-registro');
    const hist = document.getElementById('pestana-historial');
    const btnReg = document.getElementById('btn-tab-registro');
    const btnHist = document.getElementById('btn-tab-historial');

    if (pestana === 'registro') {
        if (reg) reg.style.display = 'block';
        if (hist) hist.style.display = 'none';
        if (btnReg) btnReg.className = 'btn-primary';
        if (btnHist) btnHist.className = 'btn-secondary';
    } else {
        if (reg) reg.style.display = 'none';
        if (hist) hist.style.display = 'block';
        if (btnReg) btnReg.className = 'btn-secondary';
        if (btnHist) btnHist.className = 'btn-primary';
        cargarOrdenesAdmin();
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

function cerrarModalEditar() {
    const modal = document.getElementById('modal-editar-orden');
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

// CONSULTA DE CLIENTE: MUESTRA EL HISTORIAL COMPLETO
async function consultarVehiculoCliente(event) {
    if (event) event.preventDefault();
    const matricula = document.getElementById('input-matricula').value.trim().toUpperCase();
    if (!matricula) return;

    try {
        const { data: vehiculos, error: errVehiculo } = await dbClient
            .from('vehiculos')
            .select('*, clientes(nombre, telefono)')
            .eq('matricula', matricula);

        if (errVehiculo) {
            console.error("Error al buscar vehículo:", errVehiculo);
            alert('Ocurrió un error al consultar la base de datos.');
            return;
        }

        if (!vehiculos || vehiculos.length === 0) {
            alert('No se encontró ningún vehículo registrado con esa matrícula.');
            document.getElementById('resultado-cliente').style.display = 'none';
            return;
        }

        const primerVehiculo = vehiculos[0];
        const vehiculoIds = vehiculos.map(v => v.id);

        document.getElementById('cliente-info-vehiculo').innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div><strong>👤 Cliente:</strong> ${primerVehiculo.clientes ? primerVehiculo.clientes.nombre : 'N/A'}</div>
                <div><strong>📞 Teléfono:</strong> ${primerVehiculo.clientes ? primerVehiculo.clientes.telefono || 'N/A' : 'N/A'}</div>
                <div><strong>🚘 Vehículo:</strong> ${primerVehiculo.marca || ''} ${primerVehiculo.modelo || ''}</div>
                <div><strong>🆔 Matrícula:</strong> <span style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-weight: bold;">${primerVehiculo.matricula}</span></div>
                <div style="grid-column: span 2;"><strong>🔍 Nº de Chasis / VIN:</strong> ${primerVehiculo.chasis || 'N/A'}</div>
            </div>
        `;

        const { data: ordenes, error: errOrdenes } = await dbClient
            .from('ordenes_trabajo')
            .select('*')
            .in('vehiculo_id', vehiculoIds)
            .order('fecha_ingreso', { ascending: false });

        if (errOrdenes) console.error("Error al buscar historial:", errOrdenes);

        const tbody = document.getElementById('tabla-cliente-historial');
        tbody.innerHTML = '';

        if (!ordenes || ordenes.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="padding: 12px; text-align: center;">No hay historial registrado para este vehículo.</td></tr>`;
        } else {
            ordenes.forEach(o => {
                let fotosHtml = 'Sin foto';
                if (o.fotos && o.fotos.length > 0) {
                    fotosHtml = o.fotos.map(url => `
                        <div style="margin: 5px 0;">
                            <a href="${url}" target="_blank">
                                <img src="${url}" style="max-width: 140px; max-height: 100px; object-fit: cover; border-radius: 8px; border: 2px solid #0d47a1; box-shadow: 0 2px 5px rgba(0,0,0,0.2);" title="Ver imagen completa" />
                            </a>
                        </div>
                    `).join('');
                }

                tbody.innerHTML += `
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 10px;">${o.fecha_ingreso || '-'}</td>
                        <td style="padding: 10px;">${o.kilometraje || '-'} km</td>
                        <td style="padding: 10px;">${o.motivo || '-'}</td>
                        <td style="padding: 10px;">${o.dtc || '-'}</td>
                        <td style="padding: 10px;"><strong>${o.trabajo_realizado || '-'}</strong></td>
                        <td style="padding: 10px;">${o.observaciones || '-'}</td>
                        <td style="padding: 10px;">${fotosHtml}</td>
                    </tr>
                `;
            });
        }

        document.getElementById('resultado-cliente').style.display = 'block';

    } catch (err) {
        console.error("Error en la consulta:", err);
        alert("Ocurrió un error inesperado al realizar la búsqueda.");
    }
}

// GUARDAR REGISTRO SIN BLOQUEO DE MATRÍCULA
async function guardarOrdenAdmin(event) {
    if (event) event.preventDefault();

    const nombre = document.getElementById('admin-nombre-cliente').value.trim();
    const telefono = document.getElementById('admin-telefono').value.trim();
    const matricula = document.getElementById('admin-matricula').value.trim().toUpperCase();
    const vehiculoDetalle = document.getElementById('admin-vehiculo').value.trim();
    const chasis = document.getElementById('admin-chasis').value.trim();
    const kilometraje = document.getElementById('admin-kilometraje').value.trim();
    const motivo = document.getElementById('admin-motivo').value.trim();
    const dtc = document.getElementById('admin-dtc').value.trim();
    const observaciones = document.getElementById('admin-observaciones').value.trim();
    const inputFotos = document.getElementById('admin-fotos');

    try {
        let fotosUrls = [];
        if (inputFotos && inputFotos.files.length > 0) {
            for (let i = 0; i < inputFotos.files.length; i++) {
                const file = inputFotos.files[i];
                const fileName = `${Date.now()}_${file.name}`;
                
                const { data: fileData, error: fileError } = await dbClient.storage
                    .from('fotos_vehiculos')
                    .upload(fileName, file);

                if (!fileError && fileData) {
                    const { data: publicUrlData } = dbClient.storage
                        .from('fotos_vehiculos')
                        .getPublicUrl(fileName);
                    if (publicUrlData) fotosUrls.push(publicUrlData.publicUrl);
                }
            }
        }

        // Buscar si ya existe un registro de este vehículo
        let { data: vehiculoExistente } = await dbClient
            .from('vehiculos')
            .select('id')
            .eq('matricula', matricula)
            .limit(1)
            .maybeSingle();

        let vehiculoId = null;

        if (vehiculoExistente) {
            vehiculoId = vehiculoExistente.id;
        } else {
            const { data: cliente, error: errCliente } = await dbClient
                .from('clientes')
                .insert([{ nombre: nombre, telefono: telefono }])
                .select()
                .single();

            if (errCliente) throw errCliente;

            const { data: nuevoVehiculo, error: errVehiculo } = await dbClient
                .from('vehiculos')
                .insert([{ 
                    cliente_id: cliente.id, 
                    matricula: matricula, 
                    marca: vehiculoDetalle,
                    modelo: vehiculoDetalle,
                    chasis: chasis
                }])
                .select()
                .single();

            if (errVehiculo) throw errVehiculo;
            vehiculoId = nuevoVehiculo.id;
        }

        const { error: errOrden } = await dbClient
            .from('ordenes_trabajo')
            .insert([{ 
                vehiculo_id: vehiculoId, 
                motivo: motivo, 
                trabajo_realizado: 'Pendiente de revisión',
                fecha_ingreso: new Date().toISOString().split('T')[0],
                kilometraje: kilometraje,
                dtc: dtc,
                observaciones: observaciones,
                fotos: fotosUrls
            }]);

        if (errOrden) throw errOrden;

        alert('¡Registro guardado exitosamente!');
        document.getElementById('form-nueva-orden').reset();
        cargarOrdenesAdmin();

    } catch (error) {
        console.error("Error al guardar:", error);
        alert('Error al guardar en Supabase: ' + error.message);
    }
}

async function cargarOrdenesAdmin() {
    const tbody = document.getElementById('tabla-admin-ordenes');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="9" style="padding: 15px; text-align: center;">Cargando lista de vehículos...</td></tr>';

    try {
        const { data: ordenes, error } = await dbClient
            .from('ordenes_trabajo')
            .select('*, vehiculos(*, clientes(*))')
            .order('id', { ascending: false });

        if (error) throw error;

        listaOrdenesGlobal = ordenes || [];
        tbody.innerHTML = '';

        if (!ordenes || ordenes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" style="padding: 15px; text-align: center;">No hay vehículos registrados en la base de datos.</td></tr>';
            return;
        }

        ordenes.forEach(o => {
            const v = o.vehiculos || {};
            const c = v.clientes || {};

            let fotosHtml = 'Sin foto';
            if (o.fotos && o.fotos.length > 0) {
                fotosHtml = o.fotos.map(url => `
                    <a href="${url}" target="_blank">
                        <img src="${url}" style="width: 70px; height: 50px; object-fit: cover; border-radius: 4px; border: 1px solid #cbd5e1;" title="Ampliar" />
                    </a>
                `).join('');
            }

            tbody.innerHTML += `
                <tr style="border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 8px;"><strong>${c.nombre || 'N/A'}</strong><br><small>${c.telefono || ''}</small></td>
                    <td style="padding: 8px;"><span style="background: #e2e8f0; padding: 2px 5px; border-radius: 4px; font-weight: bold;">${v.matricula || '-'}</span></td>
                    <td style="padding: 8px;">${v.marca || '-'}</td>
                    <td style="padding: 8px;">${o.kilometraje || '-'}</td>
                    <td style="padding: 8px;">${o.motivo || '-'}</td>
                    <td style="padding: 8px;">${o.trabajo_realizado || '-'}</td>
                    <td style="padding: 8px;">${o.observaciones || '-'}</td>
                    <td style="padding: 8px;">${fotosHtml}</td>
                    <td style="padding: 8px; text-align: center;">
                        <button style="background: #2563eb; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; margin-bottom: 3px;" onclick="abrirModalEditar('${o.id}')">✏️ Editar</button>
                        <button style="background: #dc2626; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer;" onclick="eliminarOrdenAdmin('${o.id}')">🗑️ Borrar</button>
                    </td>
                </tr>
            `;
        });

    } catch (err) {
        console.error("Error al cargar lista:", err);
        tbody.innerHTML = '<tr><td colspan="9" style="padding: 15px; text-align: center; color: red;">Error al obtener datos.</td></tr>';
    }
}

function abrirModalEditar(ordenId) {
    const orden = listaOrdenesGlobal.find(o => String(o.id) === String(ordenId));
    if (!orden) return;

    document.getElementById('edit-orden-id').value = orden.id;
    document.getElementById('edit-fecha').value = orden.fecha_ingreso || '';
    document.getElementById('edit-kilometraje').value = orden.kilometraje || '';
    document.getElementById('edit-motivo').value = orden.motivo || '';
    document.getElementById('edit-dtc').value = orden.dtc || '';
    document.getElementById('edit-trabajo').value = orden.trabajo_realizado || '';
    document.getElementById('edit-observaciones').value = orden.observaciones || '';

    document.getElementById('modal-editar-orden').style.display = 'flex';
}

async function actualizarOrdenCompleta(event) {
    if (event) event.preventDefault();

    const ordenId = document.getElementById('edit-orden-id').value;
    const fecha = document.getElementById('edit-fecha').value;
    const kilometraje = document.getElementById('edit-kilometraje').value;
    const motivo = document.getElementById('edit-motivo').value;
    const dtc = document.getElementById('edit-dtc').value;
    const trabajo = document.getElementById('edit-trabajo').value;
    const observaciones = document.getElementById('edit-observaciones').value;

    try {
        const { error } = await dbClient
            .from('ordenes_trabajo')
            .update({
                fecha_ingreso: fecha,
                kilometraje: kilometraje,
                motivo: motivo,
                dtc: dtc,
                trabajo_realizado: trabajo,
                observaciones: observaciones
            })
            .eq('id', ordenId);

        if (error) throw error;

        alert('¡Registro actualizado exitosamente!');
        cerrarModalEditar();
        cargarOrdenesAdmin();

    } catch (err) {
        alert('Error al actualizar registro: ' + err.message);
    }
}

async function eliminarOrdenAdmin(ordenId) {
    if (!confirm("¿Estás seguro de que deseas eliminar este registro?")) return;

    try {
        const { error } = await dbClient
            .from('ordenes_trabajo')
            .delete()
            .eq('id', ordenId);

        if (error) throw error;

        alert('¡Registro eliminado!');
        cargarOrdenesAdmin();
    } catch (err) {
        alert('Error al eliminar: ' + err.message);
    }
}