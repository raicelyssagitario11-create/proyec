// --- MOCK DE DATOS (Simulación de Supabase PostgreSQL) ---
// Los IDs son mockeados y autoincrementales para la simulación
let nextClientId = 3;
let nextProjectId = 4;
let nextPaymentId = 5;
let MOCK_DATA = {
    admin: { email: 'admin@mock.com', password: 'password' }, // Simulación de Supabase Auth
    clients: [
        { id: 'cli_001', name: 'Innovatech Solutions', email: 'innovatech@example.com' },
        { id: 'cli_002', name: 'Global Dynamics Corp', email: 'global@example.com' },
    ],
    projects: [
        { id: 'proj_001', clientId: 'cli_001', name: 'System Migration Phase 1', status: 'Activo', budget: 15000, balance: 3000 },
        { id: 'proj_002', clientId: 'cli_001', name: 'Mobile App Development', status: 'Cerrado', budget: 10000, balance: 0 },
        { id: 'proj_003', clientId: 'cli_002', name: 'Q3 Marketing Campaign', status: 'Activo', budget: 8000, balance: 4000 },
    ],
    payments: [
        { id: 'pay_001', projectId: 'proj_001', date: '2025-01-15', amount: 5000, type: 'Inicial' },
        { id: 'pay_002', projectId: 'proj_001', date: '2025-02-28', amount: 7000, type: 'Hito 1' },
        { id: 'pay_003', projectId: 'proj_002', date: '2025-05-01', amount: 10000, type: 'Total' },
        { id: 'pay_004', projectId: 'proj_003', date: '2025-07-20', amount: 4000, type: 'Inicial' },
    ],
    tokens: [
        { token: 'TKN-ABC-123', clientId: 'cli_001', expires_at: Date.now() + 86400000 }, // Válido por 24h
        { token: 'TKN-XYZ-456', clientId: 'cli_002', expires_at: Date.now() - 3600000 }, // Expirado
    ],
    logs: [
        { timestamp: Date.now(), action: 'ADMIN_INIT', detail: 'Sistema de reportes iniciado' },
    ]
};

// --- ESTADO DE LA APLICACIÓN ---
const state = {
    currentView: 'login', // 'login', 'admin', 'client'
    clientData: null, // Datos del cliente si está en la vista 'client'
    isAdminAuthenticated: false,
    adminSubView: 'clients', // 'clients', 'projects', 'payments', 'logs'
    message: ''
};

// --- UTILIDADES GLOBALES ---

/** Muestra un mensaje en un modal (reemplazo seguro para alert()) */
function showMessage(title, content) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-content').innerHTML = content;
    document.getElementById('message-modal').classList.remove('hidden');
}

/** Formatea un número como moneda */
const formatCurrency = (amount) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount);

/** Genera un ID único (simulación de UUID) */
const generateId = (prefix) => `${prefix}_${Math.random().toString(36).substring(2, 9)}`;

/** Guarda una acción en los logs */
function logAction(action, detail) {
    MOCK_DATA.logs.unshift({ timestamp: Date.now(), action, detail });
    // Limitar logs a 50
    if (MOCK_DATA.logs.length > 50) {
        MOCK_DATA.logs.pop();
    }
    renderApp(); // Para que el Admin Panel lo muestre automáticamente
}

/** Cambia la vista de la aplicación y re-renderiza */
function setView(view, data = null) {
    state.currentView = view;
    state.clientData = data;
    renderApp();
}

// --- MOCK DE FUNCIONES DE BACKEND (EDGE FUNCTIONS) ---

/** MOCK: POST a /get-client-data (Valida el token y devuelve datos) */
async function fetchClientData(token) {
    return new Promise((resolve) => {
        setTimeout(() => { // Simula latencia de red
            const now = Date.now();
            const tokenEntry = MOCK_DATA.tokens.find(t => t.token === token);

            if (!tokenEntry) {
                logAction('ACCESS_DENIED', `Intento de acceso con token inválido: ${token}`);
                return resolve({ success: false, status: 404, message: 'Token no encontrado o inválido.' });
            }

            if (tokenEntry.expires_at < now) {
                logAction('ACCESS_DENIED', `Token expirado para cliente: ${tokenEntry.clientId}`);
                return resolve({ success: false, status: 403, message: 'El enlace de acceso ha expirado (más de 24 horas).' });
            }

            const client = MOCK_DATA.clients.find(c => c.id === tokenEntry.clientId);
            if (!client) {
                return resolve({ success: false, status: 404, message: 'Cliente asociado al token no encontrado.' });
            }

            const clientProjects = MOCK_DATA.projects.filter(p => p.clientId === client.id);
            const clientPayments = MOCK_DATA.payments.filter(p => clientProjects.some(proj => proj.id === p.projectId));

            logAction('CLIENT_ACCESS', `Acceso concedido al cliente: ${client.name}`);

            resolve({
                success: true,
                status: 200,
                data: {
                    client,
                    projects: clientProjects,
                    payments: clientPayments
                }
            });
        }, 500);
    });
}

/** MOCK: POST a /generate-client-link (Genera un token temporal) */
async function generateTokenLink(clientId) {
    // Elimina tokens antiguos para este cliente para mantener la limpieza
    MOCK_DATA.tokens = MOCK_DATA.tokens.filter(t => t.clientId !== clientId || t.expires_at < Date.now());

    const newToken = `TKN-${generateId('ACC')}`.toUpperCase();
    const expiresAt = Date.now() + 86400000; // 24 horas
    MOCK_DATA.tokens.push({ token: newToken, clientId, expires_at: expiresAt });

    logAction('LINK_GENERATED', `Enlace temporal creado para el cliente: ${clientId}`);

    // URL completa para el cliente (simulación de Vercel/dominio)
    const link = `${window.location.origin}${window.location.pathname}?token=${newToken}`;
    return link;
}

// --- LÓGICA DE GESTIÓN (CRUD MOCK - ADMIN) ---

function addClient() {
    const name = document.getElementById('new-client-name').value.trim();
    const email = document.getElementById('new-client-email').value.trim();

    if (!name || !email) {
        showMessage('Error', 'Por favor, complete el nombre y el email del cliente.');
        return;
    }

    const newClient = {
        id: generateId('cli'),
        name: name,
        email: email
    };

    MOCK_DATA.clients.push(newClient);
    logAction('CLIENT_CREATE', `Cliente creado: ${name}`);
    showMessage('Éxito', `Cliente **${name}** agregado correctamente.`);
    // Limpiar formulario y re-renderizar
    document.getElementById('new-client-name').value = '';
    document.getElementById('new-client-email').value = '';
    renderApp();
}

function addProject() {
    const form = document.getElementById('new-project-form');
    const clientId = form['new-project-client'].value;
    const name = form['new-project-name'].value.trim();
    const budget = parseFloat(form['new-project-budget'].value) || 0;
    const status = form['new-project-status'].value;

    if (!clientId || !name || budget <= 0) {
        showMessage('Error', 'Revise todos los campos. El presupuesto debe ser mayor a 0.');
        return;
    }

    const newProject = {
        id: generateId('proj'),
        clientId: clientId,
        name: name,
        status: status,
        budget: budget,
        balance: budget // Al inicio, el balance es igual al presupuesto
    };

    MOCK_DATA.projects.push(newProject);
    logAction('PROJECT_CREATE', `Proyecto creado: ${name} (Cliente: ${clientId})`);
    showMessage('Éxito', `Proyecto **${name}** agregado correctamente. Balance inicial: ${formatCurrency(budget)}`);
    form.reset();
    renderApp();
}

function addPayment() {
    const form = document.getElementById('new-payment-form');
    const projectId = form['new-payment-project'].value;
    const amount = parseFloat(form['new-payment-amount'].value) || 0;
    const type = form['new-payment-type'].value;
    const date = new Date().toISOString().split('T')[0]; // Fecha actual

    const project = MOCK_DATA.projects.find(p => p.id === projectId);

    if (!projectId || !project || amount <= 0) {
        showMessage('Error', 'Revise el proyecto y el monto del pago.');
        return;
    }

    if (amount > project.balance) {
        showMessage('Advertencia', `El monto de pago (${formatCurrency(amount)}) excede el balance pendiente del proyecto (${formatCurrency(project.balance)}).`);
        // Continuar con el pago, ajustando el balance a 0
    }

    const newPayment = {
        id: generateId('pay'),
        projectId: projectId,
        date: date,
        amount: amount,
        type: type
    };

    // Actualizar el balance del proyecto
    project.balance = Math.max(0, project.balance - amount);
    if (project.balance === 0) {
        project.status = 'Cerrado'; // Marcar como cerrado si el balance llega a 0
    }

    MOCK_DATA.payments.push(newPayment);
    logAction('PAYMENT_CREATE', `Pago de ${formatCurrency(amount)} registrado para proyecto: ${project.name}`);
    showMessage('Éxito', `Pago de **${formatCurrency(amount)}** registrado. Balance actualizado: ${formatCurrency(project.balance)}`);
    form.reset();
    renderApp();
}

async function createClientLink(clientId) {
    const link = await generateTokenLink(clientId);
    const clientName = MOCK_DATA.clients.find(c => c.id === clientId).name;
    const content = `
        <p>Enlace temporal generado para **${clientName}**.</p>
        <input id="link-input" type="text" readonly value="${link}" class="w-full p-2 border border-gray-300 rounded-lg my-3 text-sm" />
        <button onclick="copyLink()" class="w-full bg-green-500 text-white p-3 rounded-lg font-semibold hover:bg-green-600 transition mt-2">Copiar Enlace</button>
    `;
    showMessage('Enlace Generado', content);
}

function copyLink() {
    const linkInput = document.getElementById('link-input');
    linkInput.select();
    document.execCommand('copy');
    showMessage('Copiado', 'El enlace de acceso temporal ha sido copiado al portapapeles.');
}

// --- FUNCIONES DE AUTENTICACIÓN Y RENDERIZADO PRINCIPAL ---

function handleAdminLogin() {
    const email = document.getElementById('admin-email').value;
    const password = document.getElementById('admin-password').value;

    if (email === MOCK_DATA.admin.email && password === MOCK_DATA.admin.password) {
        state.isAdminAuthenticated = true;
        logAction('ADMIN_LOGIN', 'Inicio de sesión exitoso.');
        setView('admin');
    } else {
        showMessage('Error de Autenticación', 'Credenciales inválidas. Por favor, intente de nuevo.');
        logAction('ADMIN_LOGIN_FAIL', 'Fallo en el intento de inicio de sesión.');
    }
}

function handleAdminLogout() {
    state.isAdminAuthenticated = false;
    logAction('ADMIN_LOGOUT', 'Cierre de sesión.');
    setView('login');
}

function printReport() {
    window.print();
}

// --- COMPONENTES DE VISTA ---

/** RENDER: Vista de Login */
function renderLogin() {
    return `
        <div class="flex items-center justify-center min-h-[80vh] print-area">
            <div class="w-full max-w-md bg-white p-8 rounded-xl shadow-lg border border-gray-200">
                <h1 class="text-3xl font-extrabold text-center text-gray-900 mb-6">
                    Acceso al Panel
                </h1>
                <p class="text-sm text-center text-gray-500 mb-6">
                    Ingrese las credenciales de administrador (Simulación de Supabase Auth).
                </p>
                <form onsubmit="event.preventDefault(); handleAdminLogin();">
                    <div class="mb-4">
                        <label for="admin-email" class="block text-sm font-medium text-gray-700">Email</label>
                        <input type="email" id="admin-email" value="admin@mock.com" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500" required>
                    </div>
                    <div class="mb-6">
                        <label for="admin-password" class="block text-sm font-medium text-gray-700">Contraseña</label>
                        <input type="password" id="admin-password" value="password" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500" required>
                    </div>
                    <button type="submit" class="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 transition duration-150 shadow-md">
                        Iniciar Sesión
                    </button>
                </form>
            </div>
        </div>
    `;
}

/** RENDER: Panel de Cliente (Solo Lectura) */
function renderClientDashboard(data) {
    const { client, projects, payments } = data;

    // Cálculos Totales
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalBudget = projects.reduce((sum, p) => sum + p.budget, 0);
    const totalPending = projects.reduce((sum, p) => sum + p.balance, 0);
    const totalProjectCount = projects.length;
    const activeProjectsCount = projects.filter(p => p.status === 'Activo').length;
    const progress = totalBudget > 0 ? ((totalPaid / totalBudget) * 100).toFixed(0) : 0;

    return `
        <div class="max-w-6xl mx-auto print-area">
            <header class="flex justify-between items-center mb-8 no-print">
                <h1 class="text-3xl font-extrabold text-gray-900">
                    Dashboard de Cliente
                </h1>
                <div class="flex space-x-3">
                    <button onclick="printReport()" class="bg-gray-200 text-gray-700 p-2 rounded-lg font-medium hover:bg-gray-300 transition flex items-center">
                         Generar PDF
                    </button>
                    <button onclick="setView('login')" class="bg-red-500 text-white p-2 rounded-lg font-medium hover:bg-red-600 transition">
                        Salir
                    </button>
                </div>
            </header>

            <div class="bg-white p-8 rounded-xl shadow-lg border border-gray-200">
                <!-- ENCABEZADO PARA IMPRESIÓN -->
                <div class="print-only mb-6">
                    <h1 class="text-2xl font-bold mb-1">Reporte Financiero: ${client.name}</h1>
                    <p class="text-sm text-gray-500">Fecha del Reporte: ${new Date().toLocaleDateString('es-ES')}</p>
                </div>
                <!-- FIN ENCABEZADO -->

                <h2 class="text-2xl font-bold mb-4 text-blue-600 border-b pb-2">
                    Estado Financiero de ${client.name}
                </h2>

                <!-- Indicadores Clave -->
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div class="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <p class="text-sm font-medium text-gray-500">Total Presupuestado</p>
                        <p class="text-2xl font-semibold text-gray-900">${formatCurrency(totalBudget)}</p>
                    </div>
                    <div class="p-4 bg-green-50 rounded-lg border border-green-200">
                        <p class="text-sm font-medium text-gray-500">Total Pagado</p>
                        <p class="text-2xl font-semibold text-green-600">${formatCurrency(totalPaid)}</p>
                    </div>
                    <div class="p-4 bg-red-50 rounded-lg border border-red-200">
                        <p class="text-sm font-medium text-gray-500">Total Pendiente</p>
                        <p class="text-2xl font-semibold text-red-600">${formatCurrency(totalPending)}</p>
                    </div>
                    <div class="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                        <p class="text-sm font-medium text-gray-500">Proyectos Activos</p>
                        <p class="text-2xl font-semibold text-gray-900">${activeProjectsCount} de ${totalProjectCount}</p>
                    </div>
                </div>

                <!-- Barra de Progreso -->
                <div class="mb-8">
                    <p class="text-lg font-medium text-gray-700 mb-2">Progreso General de Inversión (${progress}%)</p>
                    <div class="w-full bg-gray-200 rounded-full h-2.5">
                        <div class="bg-blue-600 h-2.5 rounded-full" style="width: ${progress}%;"></div>
                    </div>
                </div>

                <!-- Proyectos -->
                <h3 class="text-xl font-bold mb-4 text-gray-700">Proyectos Actuales e Históricos</h3>
                <div class="overflow-x-auto mb-8">
                    <table class="min-w-full divide-y divide-gray-200 rounded-lg overflow-hidden">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Proyecto</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Presupuesto</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pagado</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            ${projects.map(p => {
                                const paid = MOCK_DATA.payments.filter(pay => pay.projectId === p.id).reduce((sum, pay) => sum + pay.amount, 0);
                                const statusColor = p.status === 'Activo' ? 'text-green-600 bg-green-100' : 'text-gray-600 bg-gray-100';
                                return `
                                    <tr>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${p.name}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${formatCurrency(p.budget)}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${formatCurrency(paid)}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold text-red-600">${formatCurrency(p.balance)}</td>
                                        <td class="px-6 py-4 whitespace-nowrap">
                                            <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColor}">
                                                ${p.status}
                                            </span>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>

                <!-- Historial de Pagos -->
                <h3 class="text-xl font-bold mb-4 text-gray-700">Historial de Pagos</h3>
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200 rounded-lg overflow-hidden">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Proyecto</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo de Pago</th>
                                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            ${payments.map(p => {
                                const project = projects.find(proj => proj.id === p.projectId) || { name: 'N/A' };
                                return `
                                    <tr>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${p.date}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${project.name}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${p.type}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold">${formatCurrency(p.amount)}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

/** RENDER: Panel de Administración (CRUD y Logs) */
function renderAdminDashboard() {
    const clientOptions = MOCK_DATA.clients.map(c => `<option value="${c.id}">${c.name} (${c.email})</option>`).join('');
    const projectOptions = MOCK_DATA.projects.map(p => `<option value="${p.id}">${p.name} (${p.id})</option>`).join('');

    const renderSubView = () => {
        switch (state.adminSubView) {
            case 'clients':
                return renderAdminClients(clientOptions);
            case 'projects':
                return renderAdminProjects(clientOptions);
            case 'payments':
                return renderAdminPayments(projectOptions);
            case 'logs':
                return renderAdminLogs();
            default:
                return `<div class="p-8 text-center text-gray-500">Seleccione una opción del menú.</div>`;
        }
    };

    return `
        <div class="max-w-7xl mx-auto print-area">
            <header class="flex flex-col sm:flex-row justify-between items-center mb-8 pb-4 border-b border-gray-300 no-print">
                <h1 class="text-3xl font-extrabold text-gray-900 mb-4 sm:mb-0">
                    Panel Administrativo <span class="text-sm font-normal text-gray-500">(Supabase CRUD Mock)</span>
                </h1>
                <button onclick="handleAdminLogout()" class="bg-red-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-700 transition shadow-md">
                    Cerrar Sesión
                </button>
            </header>

            <!-- Navegación de Sub-vistas -->
            <div class="no-print mb-8">
                <nav class="flex space-x-1 p-1 bg-white rounded-xl shadow-inner border border-gray-200">
                    ${['clients', 'projects', 'payments', 'logs'].map(view => {
                        const title = { 'clients': 'Clientes', 'projects': 'Proyectos', 'payments': 'Pagos', 'logs': 'Auditoría (Logs)' }[view];
                        const isActive = state.adminSubView === view;
                        return `
                            <button onclick="state.adminSubView='${view}'; renderApp();"
                                    class="flex-1 py-2 px-4 text-sm font-medium rounded-lg transition ${isActive ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700 hover:bg-gray-100'}">
                                ${title}
                            </button>
                        `;
                    }).join('')}
                </nav>
            </div>

            <!-- Contenido de Sub-vista -->
            <div id="admin-sub-content" class="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                ${renderSubView()}
            </div>
        </div>
    `;
}

/** RENDER: Sub-vista Admin - Clientes */
function renderAdminClients(clientOptions) {
    return `
        <h2 class="text-2xl font-bold mb-6 text-gray-800">Gestión de Clientes y Acceso</h2>
        
        <!-- Formulario Nuevo Cliente -->
        <div class="mb-8 p-4 border border-blue-200 bg-blue-50 rounded-lg">
            <h3 class="text-lg font-semibold mb-3 text-blue-800">Crear Nuevo Cliente</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input type="text" id="new-client-name" placeholder="Nombre de la Empresa" class="p-2 border rounded-lg">
                <input type="email" id="new-client-email" placeholder="Email de Contacto" class="p-2 border rounded-lg">
                <button onclick="addClient()" class="bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition font-semibold">
                    Crear Cliente
                </button>
            </div>
        </div>

        <!-- Lista de Clientes -->
        <h3 class="text-xl font-bold mb-4 text-gray-700">Lista de Clientes (${MOCK_DATA.clients.length})</h3>
        <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider no-print">Acciones</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    ${MOCK_DATA.clients.map(c => `
                        <tr>
                            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${c.name}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${c.email}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-center no-print">
                                <button onclick="createClientLink('${c.id}')" class="text-indigo-600 hover:text-indigo-900 font-medium text-sm">
                                    Generar Link Acceso
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

/** RENDER: Sub-vista Admin - Proyectos */
function renderAdminProjects(clientOptions) {
    return `
        <h2 class="text-2xl font-bold mb-6 text-gray-800">Gestión de Proyectos</h2>

        <!-- Formulario Nuevo Proyecto -->
        <div class="mb-8 p-4 border border-green-200 bg-green-50 rounded-lg">
            <h3 class="text-lg font-semibold mb-3 text-green-800">Crear Nuevo Proyecto</h3>
            <form id="new-project-form" onsubmit="event.preventDefault(); addProject();" class="grid grid-cols-1 md:grid-cols-5 gap-4">
                <select name="new-project-client" class="p-2 border rounded-lg col-span-2" required>
                    <option value="">-- Seleccionar Cliente --</option>
                    ${clientOptions}
                </select>
                <input type="text" name="new-project-name" placeholder="Nombre del Proyecto" class="p-2 border rounded-lg col-span-1" required>
                <input type="number" name="new-project-budget" placeholder="Presupuesto Total" step="100" min="0" class="p-2 border rounded-lg" required>
                <select name="new-project-status" class="p-2 border rounded-lg">
                    <option value="Activo">Activo</option>
                    <option value="Cerrado">Cerrado</option>
                </select>
                <button type="submit" class="bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition font-semibold col-span-5 md:col-span-1">
                    Crear Proyecto
                </button>
            </form>
        </div>

        <!-- Lista de Proyectos -->
        <h3 class="text-xl font-bold mb-4 text-gray-700">Proyectos Registrados (${MOCK_DATA.projects.length})</h3>
        <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Proyecto</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Presupuesto</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance Pendiente</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    ${MOCK_DATA.projects.map(p => {
                        const client = MOCK_DATA.clients.find(c => c.id === p.clientId) || { name: 'N/A' };
                        const statusColor = p.status === 'Activo' ? 'text-green-600 bg-green-100' : 'text-gray-600 bg-gray-100';
                        return `
                            <tr>
                                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${p.name}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${client.name}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${formatCurrency(p.budget)}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold ${p.balance > 0 ? 'text-red-600' : 'text-gray-500'}">${formatCurrency(p.balance)}</td>
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColor}">
                                        ${p.status}
                                    </span>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

/** RENDER: Sub-vista Admin - Pagos */
function renderAdminPayments(projectOptions) {
    return `
        <h2 class="text-2xl font-bold mb-6 text-gray-800">Gestión de Pagos</h2>

        <!-- Formulario Nuevo Pago -->
        <div class="mb-8 p-4 border border-yellow-200 bg-yellow-50 rounded-lg">
            <h3 class="text-lg font-semibold mb-3 text-yellow-800">Registrar Nuevo Pago</h3>
            <form id="new-payment-form" onsubmit="event.preventDefault(); addPayment();" class="grid grid-cols-1 md:grid-cols-5 gap-4">
                <select name="new-payment-project" class="p-2 border rounded-lg col-span-2" required>
                    <option value="">-- Seleccionar Proyecto --</option>
                    ${projectOptions}
                </select>
                <input type="number" name="new-payment-amount" placeholder="Monto del Pago" step="100" min="1" class="p-2 border rounded-lg" required>
                <select name="new-payment-type" class="p-2 border rounded-lg">
                    <option value="Inicial">Pago Inicial</option>
                    <option value="Hito">Hito de Proyecto</option>
                    <option value="Total">Pago Final/Total</option>
                </select>
                <button type="submit" class="bg-yellow-600 text-white py-2 rounded-lg hover:bg-yellow-700 transition font-semibold col-span-5 md:col-span-1">
                    Registrar Pago
                </button>
            </form>
        </div>

        <!-- Historial de Pagos -->
        <h3 class="text-xl font-bold mb-4 text-gray-700">Historial de Pagos (${MOCK_DATA.payments.length})</h3>
        <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Proyecto</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                        <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    ${MOCK_DATA.payments.map(p => {
                        const project = MOCK_DATA.projects.find(proj => proj.id === p.projectId) || { name: 'N/A' };
                        return `
                            <tr>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${p.date}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${project.name}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${p.type}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold">${formatCurrency(p.amount)}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

/** RENDER: Sub-vista Admin - Logs */
function renderAdminLogs() {
    return `
        <h2 class="text-2xl font-bold mb-6 text-gray-800">Logs de Auditoría</h2>
        <p class="text-sm text-gray-500 mb-4">Registro de todas las acciones administrativas y de acceso (Simulación de la tabla 'logs').</p>
        <div class="space-y-3 max-h-96 overflow-y-auto p-4 bg-gray-50 rounded-lg border">
            ${MOCK_DATA.logs.map(log => `
                <div class="p-3 bg-white rounded-lg shadow-sm border border-gray-100 text-sm flex justify-between items-start">
                    <div class="flex-grow">
                        <span class="font-semibold text-gray-700">${new Date(log.timestamp).toLocaleString('es-ES')}</span>
                        <span class="mx-2 text-gray-400">|</span>
                        <span class="font-mono text-xs px-2 py-0.5 rounded-full ${log.action.includes('LOGIN') || log.action.includes('ACCESS_DENIED') ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}">${log.action}</span>
                    </div>
                    <p class="text-gray-600 ml-4 flex-shrink-0 max-w-[70%]">${log.detail}</p>
                </div>
            `).join('')}
        </div>
    `;
}

/** RENDER PRINCIPAL */
function renderApp() {
    const appDiv = document.getElementById('app');
    appDiv.innerHTML = ''; // Limpiar contenido previo

    if (state.currentView === 'login') {
        appDiv.innerHTML = renderLogin();
    } else if (state.currentView === 'admin') {
        appDiv.innerHTML = renderAdminDashboard();
    } else if (state.currentView === 'client' && state.clientData) {
        appDiv.innerHTML = renderClientDashboard(state.clientData);
    } else {
        // Caso por defecto: error o token inválido
        appDiv.innerHTML = `
            <div class="flex items-center justify-center min-h-[80vh]">
                <div class="text-center p-8 bg-white rounded-xl shadow-lg">
                    <h1 class="text-3xl font-bold text-red-600 mb-4">Acceso Denegado</h1>
                    <p class="text-gray-600 mb-6">${state.message || 'El token de acceso es inválido o ha expirado. Contacte a su administrador.'}</p>
                    <button onclick="setView('login')" class="bg-gray-200 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-300 transition">
                        Volver al Inicio
                    </button>
                </div>
            </div>
        `;
    }
}

// --- INICIALIZACIÓN DE LA APLICACIÓN ---

async function initializeApp() {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (token) {
        // Flujo de Acceso del Cliente: /dashboard.html?token={TOKEN}
        const loadingScreen = document.getElementById('app');
        loadingScreen.innerHTML = `
            <div class="flex flex-col items-center justify-center min-h-screen">
                <div class="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
                <p class="mt-4 text-lg text-gray-600">Validando token de acceso...</p>
            </div>
        `;
        
        const response = await fetchClientData(token); // Llama al MOCK de Edge Function

        if (response.success) {
            setView('client', response.data);
        } else {
            state.message = response.message;
            setView('error');
        }
    } else {
        // Flujo de Acceso del Administrador
        setView('login');
    }
}

window.onload = initializeApp;
