const SUPABASE_URL = 'https://qhzvdndnzjlqoibsmfnj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoenZkbmRuempscW9pYnNtZm5qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1NTIzNzQsImV4cCI6MjEwNjEyODM3NH0.nGoonZHquvpmMuRuvqX16PS47kjaUWb36IiXlrDPrU0';

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
        reg.style.display = 'block';
        hist.style.display = 'none';
        btnReg.className = 'btn-primary';
        btnHist.className = 'btn-secondary';
    } else {
        reg.style.display = 'none';
        hist.style.display = 'block';
        btnReg.className = 'btn-secondary';
        btnHist.className = 'btn-primary';
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
    const matricula = document.getElementById('input-matricula').value.trim().toUpperCase();
    if (!matricula) return;

    try {
        const { data: vehiculo, error: errVehiculo } = await dbClient
            .from('vehiculos')
            .select('*, clientes(nombre, telefono)')
            .eq('matricula', matricula)
            .maybeSingle();

        if (errVehiculo) {
            console.error("Error al buscar vehículo:", errVehiculo);
            alert('Ocurrió un error al consultar la base de datos.');
            return;
        }

        if (!vehiculo) {
            alert('No se encontró ningún vehículo registrado con esa matrícula.');
            document.getElementById('resultado-cliente').style.display = 'none';
            return;
        }

        document.getElementById('cliente-info-vehiculo').innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div><strong>👤 Cliente:</strong> ${vehiculo.clientes ? vehiculo.clientes.nombre : 'N/A'}</div>
                <div><strong>📞 Teléfono:</strong> ${vehiculo.clientes ? vehiculo.clientes.telefono || 'N/A' : 'N/A'}</div>
                <div><strong>🚘 Vehículo:</strong> ${vehiculo.marca || ''} ${vehiculo.modelo || ''}</div>
                <div><strong>🆔 Matrícula:</strong> <span style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-weight: bold;">${vehiculo.matricula}</span></div>
                <div style="grid-column: span 2;"><strong>🔍 Nº de Chasis / VIN:</strong> ${vehiculo.chasis || 'N/A'}</div>
            </div>
        `;

        const { data: ordenes, error: errOrdenes } = await dbClient
            .from('ordenes_trabajo')
            .select('*')
            .eq('vehiculo_id', vehiculo.id);

        if (errOrdenes) console.error("Error al buscar historial:", errOrdenes);

        const tbody = document.getElementById('tabla-cliente-historial');
        tbody.innerHTML = '';

        if (!ordenes || ordenes.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="padding: 12px; text-align: center;">No hay historial registrado para este vehículo.</td></tr>`;
        } else {
            ordenes.forEach(o => {
                let fotosHtml = 'Sin foto';
                if (o.fotos && o.fotos.length > 0) {
                    fotosHtml = o.fotos.map(url => `
                        <div style="margin: 5px 0;">
                            <a href="${url}" target="_blank">
                                <img src="${url}" style="max-width: 160px; max-height: 120px; object-fit: cover; border-radius: 8px; border: 2px solid #0d47a1; box-shadow: 0 2px 5px rgba(0,0,0,0.2);" title="Haz clic para ver imagen completa" />
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

        const { data: cliente, error: errCliente } = await dbClient
            .from('clientes')
            .insert([{ nombre: nombre, telefono: telefono }])
            .select()
            .single();

        if (errCliente) throw errCliente;

        const { data: vehiculo, error: errVehiculo } = await dbClient
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

        const { error: errOrden } = await dbClient
            .from('ordenes_trabajo')
            .insert([{ 
                vehiculo_id: vehiculo.id, 
                motivo: motivo, 
                trabajo_realizado: 'Pendiente de revisión',
                fecha_ingreso: new Date().toISOString().split('T')[0],
                kilometraje: kilometraje,
                dtc: dtc,
                observaciones: observaciones,
                fotos: fotosUrls
            }]);

        if (errOrden) throw errOrden;

        alert('¡Vehículo registrado con éxito!');
        document.getElementById('form-nueva-orden').reset();

    } catch (error) {
        console.error("Error al guardar:", error);
        alert('Error al guardar en Supabase: ' + error.message);
    }
}

async function cargarOrdenesAdmin() {
    const tbody = document.getElementById('tabla-admin-ordenes');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="8" style="padding: 15px; text-align: center;">Cargando lista de vehículos...</td></tr>';

    try {
        const { data: ordenes, error } = await dbClient
            .from('ordenes_trabajo')
            .select('*, vehiculos(*, clientes(*))')
            .order('id', { ascending: false });

        if (error) throw error;

        tbody.innerHTML = '';

        if (!ordenes || ordenes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="padding: 15px; text-align: center;">No hay vehículos registrados en la base de datos.</td></tr>';
            return;
        }

        ordenes.forEach(o => {
            const v = o.vehiculos || {};
            const c = v.clientes || {};

            let fotosHtml = 'Sin foto';
            if (o.fotos && o.fotos.length > 0) {
                fotosHtml = o.fotos.map(url => `
                    <a href="${url}" target="_blank">
                        <img src="${url}" style="width: 70px; height: 50px; object-fit: cover; border-radius: 4px; border: 1px solid #cbd5e1;" title="Haz clic para ampliar" />
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
                    <td style="padding: 8px;">${fotosHtml}</td>
                    <td style="padding: 8px; text-align: center;">
                        <button style="background: #2563eb; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; margin-bottom: 3px;" onclick="editarOrdenAdmin('${o.id}', '${o.trabajo_realizado || ''}')">✏️ Editar</button>
                        <button style="background: #dc2626; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer;" onclick="eliminarOrdenAdmin('${o.id}')">🗑️ Borrar</button>
                    </td>
                </tr>
            `;
        });

    } catch (err) {
        console.error("Error al cargar lista:", err);
        tbody.innerHTML = '<tr><td colspan="8" style="padding: 15px; text-align: center; color: red;">Error al obtener datos.</td></tr>';
    }
}

async function editarOrdenAdmin(ordenId, trabajoActual) {
    const nuevoTrabajo = prompt("Actualizar trabajo realizado / estado del vehículo:", trabajoActual);
    if (nuevoTrabajo === null) return;

    try {
        const { error } = await dbClient
            .from('ordenes_trabajo')
            .update({ trabajo_realizado: nuevoTrabajo })
            .eq('id', ordenId);

        if (error) throw error;

        alert('¡Orden actualizada correctamente!');
        cargarOrdenesAdmin();
    } catch (err) {
        alert('Error al actualizar: ' + err.message);
    }
}

async function eliminarOrdenAdmin(ordenId) {
    if (!confirm("¿Estás seguro de que deseas eliminar este registro del taller?")) return;

    try {
        const { error } = await dbClient
            .from('ordenes_trabajo')
            .delete()
            .eq('id', ordenId);

        if (error) throw error;

        alert('¡Registro eliminado de la base de datos!');
        cargarOrdenesAdmin();
    } catch (err) {
        alert('Error al eliminar: ' + err.message);
    }
}