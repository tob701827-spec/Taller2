const SUPABASE_URL = 'https://qhzvdndnzjlqoibsmfnj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoenZkbmRuempscW9pYnNtZm5qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1NTIzNzQsImV4cCI6MjEwNjEyODM3NH0.nGoonZHquvpmMuRuvqX16PS47kjaUWb36IiXlrDPrU0';

const dbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let agrupadoVehiculosGlobal = {};

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

function cerrarModalHistorial() {
    const modal = document.getElementById('modal-historial-vehiculo');
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

// BÚSQUEDA DEL CLIENTE EN EL PORTAL PÚBLICO
async function consultarVehiculoCliente(event) {
    if (event) event.preventDefault();
    const matriculaInput = document.getElementById('input-matricula');
    if (!matriculaInput) return;

    const matricula = matriculaInput.value.trim().toUpperCase();
    if (!matricula) return;

    try {
        const { data: vehiculos, error: errVehiculo } = await dbClient
            .from('vehiculos')
            .select('*')
            .eq('matricula', matricula);

        if (errVehiculo) {
            alert('Error al buscar vehículo: ' + errVehiculo.message);
            return;
        }

        if (!vehiculos || vehiculos.length === 0) {
            alert('No se encontró ningún vehículo registrado con esa matrícula.');
            const resContainer = document.getElementById('resultado-cliente');
            if (resContainer) resContainer.style.display = 'none';
            return;
        }

        const primerVehiculo = vehiculos[0];
        const idsVehiculos = vehiculos.map(v => v.id);

        let clienteNombre = 'N/A';
        let clienteTelefono = 'N/A';

        if (primerVehiculo.cliente_id) {
            const { data: cliente } = await dbClient
                .from('clientes')
                .select('*')
                .eq('id', primerVehiculo.cliente_id)
                .maybeSingle();

            if (cliente) {
                clienteNombre = cliente.nombre || 'N/A';
                clienteTelefono = cliente.telefono || 'N/A';
            }
        }

        const textoVehiculo = primerVehiculo.marca === primerVehiculo.modelo 
            ? (primerVehiculo.marca || 'N/A') 
            : `${primerVehiculo.marca || ''} ${primerVehiculo.modelo || ''}`.trim() || 'N/A';

        const infoContainer = document.getElementById('cliente-info-vehiculo');
        if (infoContainer) {
            infoContainer.innerHTML = `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <div><strong> Cliente:</strong> ${clienteNombre}</div>
                    <div><strong> Teléfono:</strong> ${clienteTelefono}</div>
                    <div><strong> Vehículo:</strong> ${textoVehiculo}</div>
                    <div><strong> Matrícula:</strong> <span style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-weight: bold;">${primerVehiculo.matricula}</span></div>
                    <div style="grid-column: span 2;"><strong> Nº de Chasis / VIN:</strong> ${primerVehiculo.chasis || 'N/A'}</div>
                </div>
            `;
        }

        const { data: ordenes } = await dbClient
            .from('ordenes_trabajo')
            .select('*')
            .in('vehiculo_id', idsVehiculos)
            .order('fecha_ingreso', { ascending: false });

        const tbody = document.getElementById('tabla-cliente-historial');
        if (tbody) {
            tbody.innerHTML = '';

            if (!ordenes || ordenes.length === 0) {
                tbody.innerHTML = `<tr><td colspan="7" style="padding: 12px; text-align: center;">No hay historial registrado para este vehículo.</td></tr>`;
            } else {
                ordenes.forEach(o => {
                    let fotosHtml = 'Sin foto';
                    if (o.fotos && o.fotos.length > 0) {
                        fotosHtml = o.fotos.map(url => `
                            <a href="${url}" target="_blank">
                                <img src="${url}" style="max-width: 120px; max-height: 80px; object-fit: cover; border-radius: 6px; border: 1px solid #0d47a1;" />
                            </a>
                        `).join('');
                    }

                    tbody.innerHTML += `
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                            <td style="padding: 10px;"><strong> ${o.fecha_ingreso || '-'}</strong></td>
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
        }

        const resDiv = document.getElementById('resultado-cliente');
        if (resDiv) resDiv.style.display = 'block';

    } catch (err) {
        console.error("Error imprevisto:", err);
    }
}

// GUARDAR REGISTRO VINCULANDO O REUTILIZANDO MATRÍCULA
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

        let { data: vehiculosExistentes } = await dbClient
            .from('vehiculos')
            .select('id')
            .eq('matricula', matricula);

        let vehiculoId = null;

        if (vehiculosExistentes && vehiculosExistentes.length > 0) {
            vehiculoId = vehiculosExistentes[0].id;
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

        alert('¡Registro guardado con éxito!');
        document.getElementById('form-nueva-orden').reset();
        cargarOrdenesAdmin();

    } catch (error) {
        console.error("Error al guardar:", error);
        alert('Error al guardar en Supabase: ' + error.message);
    }
}

// CARGAR Y AGRUPAR ORDENES POR MATRÍCULA
async function cargarOrdenesAdmin() {
    const tbody = document.getElementById('tabla-admin-ordenes');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="6" style="padding: 15px; text-align: center;">Cargando lista de vehículos...</td></tr>';

    try {
        const { data: ordenes, error } = await dbClient
            .from('ordenes_trabajo')
            .select('*, vehiculos(*, clientes(*))')
            .order('fecha_ingreso', { ascending: false });

        if (error) throw error;

        agrupadoVehiculosGlobal = {};

        (ordenes || []).forEach(o => {
            const v = o.vehiculos || {};
            const c = v.clientes || {};
            const mat = v.matricula || 'SIN_MATRICULA';

            if (!agrupadoVehiculosGlobal[mat]) {
                agrupadoVehiculosGlobal[mat] = {
                    matricula: mat,
                    cliente: c.nombre || 'N/A',
                    telefono: c.telefono || '',
                    vehiculo: v.marca || v.modelo || 'N/A',
                    ordenes: []
                };
            }
            agrupadoVehiculosGlobal[mat].ordenes.push(o);
        });

        renderizarTablaAdmin(agrupadoVehiculosGlobal);

    } catch (err) {
        console.error("Error al cargar lista:", err);
        tbody.innerHTML = '<tr><td colspan="6" style="padding: 15px; text-align: center; color: red;">Error al obtener datos.</td></tr>';
    }
}

// DIBUJAR TABLA PRINCIPAL CON FILAS ÚNICAS
function renderizarTablaAdmin(agrupado) {
    const tbody = document.getElementById('tabla-admin-ordenes');
    if (!tbody) return;

    tbody.innerHTML = '';
    const llaves = Object.keys(agrupado);

    if (llaves.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="padding: 15px; text-align: center;">No hay vehículos registrados.</td></tr>';
        return;
    }

    llaves.forEach(mat => {
        const item = agrupado[mat];
        const ultimaOrden = item.ordenes[0] || {};
        const totalVisitas = item.ordenes.length;

        tbody.innerHTML += `
            <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 10px;"><strong>${item.cliente}</strong><br><small>${item.telefono}</small></td>
                <td style="padding: 10px;"><span style="background: #e2e8f0; padding: 3px 8px; border-radius: 4px; font-weight: bold;">${item.matricula}</span></td>
                <td style="padding: 10px;">${item.vehiculo}</td>
                <td style="padding: 10px;"> ${ultimaOrden.fecha_ingreso || 'N/A'}</td>
                <td style="padding: 10px;"><span style="background: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 12px; font-weight: bold;">${totalVisitas} registro(s)</span></td>
                <td style="padding: 10px; text-align: center;">
                    <button style="background: #0284c7; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: bold;" onclick="verHistorialModal('${item.matricula}')"> Ver Historial</button>
                </td>
            </tr>
        `;
    });
}

// FILTRAR VEHÍCULOS EN TIEMPO REAL
function filtrarVehiculosAdmin() {
    const input = document.getElementById('admin-buscador');
    if (!input) return;

    const texto = input.value.toLowerCase().trim();
    
    // Si el buscador está vacío, muestra la lista completa
    if (!texto) {
        renderizarTablaAdmin(agrupadoVehiculosGlobal);
        return;
    }

    // Filtrar los registros por matrícula o por nombre del cliente
    const filtrado = {};
    Object.keys(agrupadoVehiculosGlobal).forEach(mat => {
        const item = agrupadoVehiculosGlobal[mat];
        const clienteNombre = (item.cliente || '').toLowerCase();
        const matricula = (item.matricula || '').toLowerCase();

        if (matricula.includes(texto) || clienteNombre.includes(texto)) {
            filtrado[mat] = item;
        }
    });

    renderizarTablaAdmin(filtrado);
}

// ABRIR VENTANA CON EL HISTORIAL ORDENADO POR FECHAS
function verHistorialModal(matricula) {
    const item = agrupadoVehiculosGlobal[matricula];
    if (!item) return;

    document.getElementById('historial-modal-titulo').innerHTML = ` Historial: <strong>${item.matricula}</strong> - ${item.cliente}`;

    let html = `
        <div style="margin-bottom: 15px; background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 0.95rem;">
            <strong> Cliente:</strong> ${item.cliente} | <strong> Teléfono:</strong> ${item.telefono} | <strong> Vehículo:</strong> ${item.vehiculo}
        </div>
    `;

    item.ordenes.forEach((o) => {
        let fotosHtml = 'Sin fotografías';
        if (o.fotos && o.fotos.length > 0) {
            fotosHtml = o.fotos.map(url => `
                <a href="${url}" target="_blank">
                    <img src="${url}" style="width: 80px; height: 60px; object-fit: cover; border-radius: 4px; border: 1px solid #cbd5e1; margin-right: 5px;" />
                </a>
            `).join('');
        }

        html += `
            <div style="border: 1px solid #cbd5e1; border-radius: 8px; padding: 15px; margin-bottom: 12px; background: #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <div style="display: flex; justify-content: space-between; align-items: center; background: #f1f5f9; padding: 8px 12px; border-radius: 6px; margin-bottom: 10px;">
                    <span style="font-weight: bold; color: #0d47a1;"> Fecha: ${o.fecha_ingreso || 'N/A'}</span>
                    <span style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-size: 0.85rem;"><strong>Km:</strong> ${o.kilometraje || '-'}</span>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.9rem;">
                    <div><strong>Motivo / Falla:</strong> ${o.motivo || '-'}</div>
                    <div><strong>Códigos DTC:</strong> ${o.dtc || '-'}</div>
                    <div style="grid-column: span 2;"><strong>Trabajo Realizado:</strong> <span style="color: #2563eb; font-weight: bold;">${o.trabajo_realizado || '-'}</span></div>
                    <div style="grid-column: span 2;"><strong>Observaciones:</strong> ${o.observaciones || '-'}</div>
                    <div style="grid-column: span 2; margin-top: 5px;"><strong>Fotos:</strong><br>${fotosHtml}</div>
                </div>
                <div style="text-align: right; margin-top: 10px; border-top: 1px solid #f1f5f9; padding-top: 8px;">
                    <button style="background: #2563eb; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;" onclick="abrirModalEditar('${o.id}')"> Editar Registro</button>
                    <button style="background: #dc2626; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; margin-left: 5px;" onclick="eliminarOrdenAdmin('${o.id}')"> Borrar Registro</button>
                </div>
            </div>
        `;
    });

    document.getElementById('historial-modal-contenido').innerHTML = html;
    document.getElementById('modal-historial-vehiculo').style.display = 'flex';
}

function abrirModalEditar(ordenId) {
    let ordenEncontrada = null;

    Object.keys(agrupadoVehiculosGlobal).forEach(mat => {
        const o = agrupadoVehiculosGlobal[mat].ordenes.find(x => String(x.id) === String(ordenId));
        if (o) ordenEncontrada = o;
    });

    if (!ordenEncontrada) return;

    document.getElementById('edit-orden-id').value = ordenEncontrada.id;
    document.getElementById('edit-fecha').value = ordenEncontrada.fecha_ingreso || '';
    document.getElementById('edit-kilometraje').value = ordenEncontrada.kilometraje || '';
    document.getElementById('edit-motivo').value = ordenEncontrada.motivo || '';
    document.getElementById('edit-dtc').value = ordenEncontrada.dtc || '';
    document.getElementById('edit-trabajo').value = ordenEncontrada.trabajo_realizado || '';
    document.getElementById('edit-observaciones').value = ordenEncontrada.observaciones || '';

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

        alert('¡Registro actualizado con éxito!');
        cerrarModalEditar();
        cerrarModalHistorial();
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
        cerrarModalHistorial();
        cargarOrdenesAdmin();
    } catch (err) {
        alert('Error al eliminar: ' + err.message);
    }
}