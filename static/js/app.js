/**
 * Banco de Horas - IPAJM
 * JavaScript Moderno
 */

// ===================================
// Login System
// ===================================

const VALID_USER = 'Thiago';
const VALID_PASSWORD = '1234';

function initLogin() {
    const loginContainer = document.getElementById('login-container');
    const appContainer = document.getElementById('app-container');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    
    // Verificar se já está logado
    if (sessionStorage.getItem('isLoggedIn') === 'true') {
        loginContainer.style.display = 'none';
        appContainer.style.display = 'flex';
        initApp();
        return;
    }
    
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const user = document.getElementById('login-user').value.trim();
        const password = document.getElementById('login-password').value;
        
        if (user === VALID_USER && password === VALID_PASSWORD) {
            // Login bem-sucedido
            sessionStorage.setItem('isLoggedIn', 'true');
            sessionStorage.setItem('userName', user);
            
            loginContainer.style.opacity = '0';
            loginContainer.style.transition = 'opacity 0.3s ease';
            
            setTimeout(() => {
                loginContainer.style.display = 'none';
                appContainer.style.display = 'flex';
                appContainer.style.opacity = '0';
                
                setTimeout(() => {
                    appContainer.style.transition = 'opacity 0.3s ease';
                    appContainer.style.opacity = '1';
                    initApp();
                }, 50);
            }, 300);
        } else {
            // Login falhou
            loginError.textContent = 'Usuário ou senha incorretos';
            loginError.classList.add('show');
            
            document.getElementById('login-password').value = '';
            document.getElementById('login-password').focus();
            
            setTimeout(() => {
                loginError.classList.remove('show');
            }, 3000);
        }
    });
}

// Inicializar login quando a página carregar
document.addEventListener('DOMContentLoaded', initLogin);


function initModernUI() {
    if (window.lucide) {
        window.lucide.createIcons();
    }

    document.querySelectorAll('.stat-card, .data-section, .btn, .icon-btn').forEach((element) => {
        element.addEventListener('mouseenter', () => element.classList.add('ui-float'));
        element.addEventListener('mouseleave', () => element.classList.remove('ui-float'));
    });
}

// ===================================
// Zoom Control
// ===================================

let currentZoom = parseInt(localStorage.getItem('appZoom')) || 100;

function initZoom() {
    applyZoom(currentZoom);
    
    document.getElementById('btn-zoom-in').addEventListener('click', () => {
        if (currentZoom < 150) {
            currentZoom += 10;
            applyZoom(currentZoom);
        }
    });
    
    document.getElementById('btn-zoom-out').addEventListener('click', () => {
        if (currentZoom > 70) {
            currentZoom -= 10;
            applyZoom(currentZoom);
        }
    });
}

function applyZoom(level) {
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.style.zoom = `${level}%`;
    }
    localStorage.setItem('appZoom', level);
    document.getElementById('zoom-level').textContent = `${level}%`;
}

// ===================================
// API Helper
// ===================================

const API = {
    async get(url) {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
    },
    async post(url, data) {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
    },
    async put(url, data) {
        const response = await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
    },
    async delete(url) {
        const response = await fetch(url, { method: 'DELETE' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
    }
};

// ===================================
// Toast Notifications
// ===================================

function showToast(type, title, message) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    
    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ===================================
// Utility Functions
// ===================================

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR');
}

function formatTime(timeStr) {
    if (!timeStr) return '-';
    return timeStr.substring(0, 5);
}

function calcularHoras(entrada, saida) {
    if (!entrada || !saida) return '00:00';
    const [h1, m1] = entrada.split(':').map(Number);
    const [h2, m2] = saida.split(':').map(Number);
    let minutos = (h2 * 60 + m2) - (h1 * 60 + m1);
    if (minutos < 0) minutos += 24 * 60;
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    return `${String(horas).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

function dobrarHoras(horaStr) {
    if (!horaStr) return '00:00';
    const [h, m] = horaStr.split(':').map(Number);
    const totalMinutos = (h * 60 + m) * 2;
    const horas = Math.floor(totalMinutos / 60);
    const mins = totalMinutos % 60;
    return `${String(horas).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

function calcularPrazo(dataStr) {
    if (!dataStr) return '-';
    const data = new Date(dataStr);
    data.setMonth(data.getMonth() + 6);
    return data.toLocaleDateString('pt-BR');
}

function getStatusPrazo(prazoStr) {
    if (!prazoStr) return { class: 'neutral', text: '-' };
    const prazo = new Date(prazoStr);
    const hoje = new Date();
    const diff = Math.floor((prazo - hoje) / (1000 * 60 * 60 * 24));
    
    if (diff < 0) return { class: 'expired', text: 'Expirado' };
    if (diff <= 30) return { class: 'pending', text: `${diff} dias` };
    return { class: 'active', text: 'OK' };
}

function somarHoras(listaHoras) {
    let totalMinutos = 0;
    listaHoras.forEach(h => {
        if (h && h.includes(':')) {
            const [horas, mins] = h.split(':').map(Number);
            totalMinutos += horas * 60 + mins;
        }
    });
    const horas = Math.floor(totalMinutos / 60);
    const mins = totalMinutos % 60;
    return `${String(horas).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

function getInitials(name) {
    if (!name) return '--';
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

function getSaldoClass(saldo) {
    if (!saldo || saldo === '-' || saldo === '00:00') return 'neutral';
    const [h] = saldo.split(':').map(Number);
    if (h > 0) return 'positive';
    if (h < 0) return 'negative';
    return 'neutral';
}

function truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// ===================================
// Data State
// ===================================

let servidores = [];
let registros = [];
let setores = new Set();
let currentPage = 1;
const perPage = 20;

// ===================================
// Data Loading
// ===================================

async function loadData() {
    try {
        // Carregar servidores
        const srvData = await API.get('/api/servidores');
        servidores = srvData;
        
        // Carregar registros
        const regData = await API.get('/api/dias-trabalhados');
        registros = regData;
        
        // Extrair setores únicos
        setores = new Set(servidores.map(s => s.setor).filter(Boolean));
        
        // Atualizar badges
        document.getElementById('badge-servidores').textContent = servidores.length;
        document.getElementById('badge-registros').textContent = registros.length;
        
        // Preencher selects de setores
        populateSetorFilters();
        
        // Preencher selects de servidores
        populateServidorSelects();
        
        // Atualizar estatísticas
        updateStats();
        
        // Atualizar tabelas
        renderRecentRecords();
        renderServidores();
        renderRegistros();
        
        // Calcular alertas de prazo
        calcularAlertas();
        
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        showToast('error', 'Erro', 'Não foi possível carregar os dados');
    }
}

function populateSetorFilters() {
    const selects = ['filter-setor', 'filter-setor-srv'];
    selects.forEach(id => {
        const select = document.getElementById(id);
        if (select) {
            select.innerHTML = '<option value="">Todos</option>';
            setores.forEach(setor => {
                select.innerHTML += `<option value="${setor}">${setor}</option>`;
            });
        }
    });
}

function populateServidorSelects() {
    const selects = ['consulta-select', 'reg-servidor'];
    selects.forEach(id => {
        const select = document.getElementById(id);
        if (select) {
            select.innerHTML = '<option value="">Selecione um servidor...</option>';
            servidores.sort((a, b) => a.nome.localeCompare(b.nome)).forEach(srv => {
                select.innerHTML += `<option value="${srv.nf}">${srv.nome} (${srv.nf})</option>`;
            });
        }
    });
}

function updateStats() {
    document.getElementById('stat-servidores').textContent = servidores.length;
    document.getElementById('stat-registros').textContent = registros.length;
    
    // Calcular totais
    const horasTrab = somarHoras(registros.map(r => r.h_trabalhada));
    const horasDireito = somarHoras(registros.map(r => r.h_direito));
    const horasGozadas = somarHoras(registros.map(r => r.horas_descontadas).filter(Boolean));
    
    // Calcular saldo
    const [ht, mt] = horasDireito.split(':').map(Number);
    const [hg, mg] = horasGozadas.split(':').map(Number);
    const saldoMin = (ht * 60 + mt) - (hg * 60 + mg);
    const saldoH = Math.floor(Math.abs(saldoMin) / 60);
    const saldoM = Math.abs(saldoMin) % 60;
    const saldo = `${saldoMin < 0 ? '-' : ''}${String(saldoH).padStart(2, '0')}:${String(saldoM).padStart(2, '0')}`;
    
    document.getElementById('stat-horas-trabalhadas').textContent = horasTrab;
    document.getElementById('stat-horas-direito').textContent = horasDireito;
    document.getElementById('stat-horas-gozadas').textContent = horasGozadas || '00:00';
    document.getElementById('stat-saldo').textContent = saldo;
}

// ===================================
// Render Functions
// ===================================

function renderRecentRecords() {
    const tbody = document.getElementById('tbody-recentes');
    const recent = [...registros].sort((a, b) => 
        new Date(b.dia_trabalhado) - new Date(a.dia_trabalhado)
    ).slice(0, 10);
    
    if (recent.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="14" class="text-center" style="padding: 2rem;">
                    Nenhum registro encontrado
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = recent.map(r => `
        <tr>
            <td class="cell-nf">${r.nf}</td>
            <td class="cell-name" title="${r.nome || ''}">${r.nome || '-'}</td>
            <td><span class="cell-setor">${r.setor || '-'}</span></td>
            <td class="cell-date">${formatDate(r.dia_trabalhado)}</td>
            <td class="cell-time">${formatTime(r.entrada)}</td>
            <td class="cell-time">${formatTime(r.saida)}</td>
            <td><span class="cell-hours positive">${r.h_trabalhada || '-'}</span></td>
            <td><span class="cell-hours neutral">${r.h_direito || '-'}</span></td>
            <td class="cell-date">${formatDate(r.prazo_max)}</td>
            <td class="cell-date">${r.dias_gozados || '-'}</td>
            <td><span class="cell-hours ${r.horas_descontadas ? 'negative' : 'neutral'}">${r.horas_descontadas || '-'}</span></td>
            <td><span class="cell-hours ${getSaldoClass(r.saldo)}">${r.saldo || '-'}</span></td>
            <td class="cell-obs" title="${r.observacao || ''}">${truncateText(r.observacao, 20) || '-'}</td>
            <td class="table-actions">
                <button class="btn-icon edit" onclick="editarRegistro(${r.id})" title="Editar"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                <button class="btn-icon delete" onclick="confirmarExclusao(${r.id})" title="Excluir"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
            </td>
        </tr>
    `).join('');
    
    document.getElementById('showing-count').textContent = recent.length;
    document.getElementById('total-count').textContent = registros.length;
}

function renderRegistros(page = 1) {
    const tbody = document.getElementById('tbody-registros');
    
    // Aplicar filtros
    let filtered = [...registros];
    
    const setorFilter = document.getElementById('filter-setor').value;
    const dataInicio = document.getElementById('filter-data-inicio').value;
    const dataFim = document.getElementById('filter-data-fim').value;
    const servidorFilter = document.getElementById('filter-servidor').value.toLowerCase();
    
    if (setorFilter) {
        filtered = filtered.filter(r => r.setor === setorFilter);
    }
    if (dataInicio) {
        filtered = filtered.filter(r => r.dia_trabalhado >= dataInicio);
    }
    if (dataFim) {
        filtered = filtered.filter(r => r.dia_trabalhado <= dataFim);
    }
    if (servidorFilter) {
        filtered = filtered.filter(r => 
            r.nf.toLowerCase().includes(servidorFilter) || 
            (r.nome && r.nome.toLowerCase().includes(servidorFilter))
        );
    }
    
    // Ordenar por data decrescente
    filtered.sort((a, b) => new Date(b.dia_trabalhado) - new Date(a.dia_trabalhado));
    
    // Paginação
    const total = filtered.length;
    const totalPages = Math.ceil(total / perPage);
    const start = (page - 1) * perPage;
    const paginated = filtered.slice(start, start + perPage);
    
    if (paginated.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="14" class="text-center" style="padding: 2rem;">
                    Nenhum registro encontrado
                </td>
            </tr>
        `;
    } else {
        tbody.innerHTML = paginated.map(r => {
            const status = getStatusPrazo(r.prazo_max);
            return `
                <tr>
                    <td class="cell-nf">${r.nf}</td>
                    <td class="cell-name" title="${r.nome || ''}">${r.nome || '-'}</td>
                    <td><span class="cell-setor">${r.setor || '-'}</span></td>
                    <td class="cell-date">${formatDate(r.dia_trabalhado)}</td>
                    <td class="cell-time">${formatTime(r.entrada)}</td>
                    <td class="cell-time">${formatTime(r.saida)}</td>
                    <td><span class="cell-hours positive">${r.h_trabalhada || '-'}</span></td>
                    <td><span class="cell-hours neutral">${r.h_direito || '-'}</span></td>
                    <td class="cell-date">${formatDate(r.prazo_max)}</td>
                    <td class="cell-date">${r.dias_gozados || '-'}</td>
                    <td><span class="cell-hours ${r.horas_descontadas ? 'negative' : 'neutral'}">${r.horas_descontadas || '-'}</span></td>
                    <td><span class="cell-hours ${getSaldoClass(r.saldo)}">${r.saldo || '-'}</span></td>
                    <td class="cell-obs" title="${r.observacao || ''}">${truncateText(r.observacao, 20) || '-'}</td>
                    <td class="table-actions">
                        <button class="btn-icon edit" onclick="editarRegistro(${r.id})" title="Editar"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                        <button class="btn-icon delete" onclick="confirmarExclusao(${r.id})" title="Excluir"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
                    </td>
                </tr>
            `;
        }).join('');
    }
    
    document.getElementById('reg-showing').textContent = paginated.length;
    document.getElementById('reg-total').textContent = total;
    
    renderPagination('pagination-registros', page, totalPages, (p) => {
        currentPage = p;
        renderRegistros(p);
    });
}

function renderServidores(page = 1) {
    const tbody = document.getElementById('tbody-servidores');
    
    // Aplicar filtros
    let filtered = [...servidores];
    
    const setorFilter = document.getElementById('filter-setor-srv').value;
    const buscaFilter = document.getElementById('filter-busca-srv').value.toLowerCase();
    
    if (setorFilter) {
        filtered = filtered.filter(s => s.setor === setorFilter);
    }
    if (buscaFilter) {
        filtered = filtered.filter(s => 
            s.nf.toLowerCase().includes(buscaFilter) || 
            s.nome.toLowerCase().includes(buscaFilter)
        );
    }
    
    // Ordenar por nome
    filtered.sort((a, b) => a.nome.localeCompare(b.nome));
    
    // Paginação
    const total = filtered.length;
    const totalPages = Math.ceil(total / perPage);
    const start = (page - 1) * perPage;
    const paginated = filtered.slice(start, start + perPage);
    
    if (paginated.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center" style="padding: 2rem;">
                    Nenhum servidor encontrado
                </td>
            </tr>
        `;
    } else {
        tbody.innerHTML = paginated.map(s => {
            // Calcular horas do servidor
            const regsServidor = registros.filter(r => r.nf === s.nf);
            const horasTrab = somarHoras(regsServidor.map(r => r.h_trabalhada));
            const horasDireito = somarHoras(regsServidor.map(r => r.h_direito));
            const horasGozadas = somarHoras(regsServidor.map(r => r.horas_descontadas).filter(Boolean));
            
            const [hd, md] = horasDireito.split(':').map(Number);
            const [hg, mg] = horasGozadas.split(':').map(Number);
            const saldoMin = (hd * 60 + md) - (hg * 60 + mg);
            const saldoH = Math.floor(Math.abs(saldoMin) / 60);
            const saldoM = Math.abs(saldoMin) % 60;
            const saldo = `${saldoMin < 0 ? '-' : ''}${String(saldoH).padStart(2, '0')}:${String(saldoM).padStart(2, '0')}`;
            const saldoClass = saldoMin >= 0 ? 'positive' : 'negative';
            
            return `
                <tr>
                    <td class="cell-nf">${s.nf}</td>
                    <td class="cell-name">${s.nome}</td>
                    <td><span class="cell-setor">${s.setor || '-'}</span></td>
                    <td><span class="cell-hours neutral">${horasTrab}</span></td>
                    <td><span class="cell-hours ${saldoClass}">${saldo}</span></td>
                    <td class="table-actions">
                        <button class="btn-icon view" onclick="consultarServidor('${s.nf}')" title="Ver detalhes"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/></svg></button>
                        <button class="btn-icon edit" onclick="editarServidor('${s.nf}')" title="Editar"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                        <button class="btn-icon delete" onclick="confirmarExclusaoServidor('${s.nf}')" title="Excluir"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
                    </td>
                </tr>
            `;
        }).join('');
    }
    
    document.getElementById('srv-showing').textContent = paginated.length;
    document.getElementById('srv-total').textContent = total;
    
    renderPagination('pagination-servidores', page, totalPages, (p) => {
        renderServidores(p);
    });
}

function renderPagination(containerId, currentPage, totalPages, onPageChange) {
    const container = document.getElementById(containerId);
    if (!container || totalPages <= 1) {
        if (container) container.innerHTML = '';
        return;
    }
    
    let html = `
        <button class="pagination-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="(${onPageChange})(${currentPage - 1})">‹</button>
    `;
    
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            html += `<button class="pagination-btn ${i === currentPage ? 'active' : ''}" onclick="(${onPageChange})(${i})">${i}</button>`;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            html += `<span style="padding: 0 0.5rem;">...</span>`;
        }
    }
    
    html += `
        <button class="pagination-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="(${onPageChange})(${currentPage + 1})">›</button>
    `;
    
    container.innerHTML = html;
}

// ===================================
// Consulta por Servidor
// ===================================

async function consultarServidor(nf) {
    const servidor = servidores.find(s => s.nf === nf);
    if (!servidor) {
        showToast('error', 'Erro', 'Servidor não encontrado');
        return;
    }
    
    // Mostrar resultado
    document.getElementById('consulta-resultado').classList.remove('hidden');
    document.getElementById('consulta-empty').classList.add('hidden');
    
    // Preencher dados
    document.getElementById('servidor-avatar').textContent = getInitials(servidor.nome);
    document.getElementById('servidor-nome').textContent = servidor.nome;
    document.getElementById('servidor-nf').textContent = servidor.nf;
    document.getElementById('servidor-setor').textContent = servidor.setor || '-';
    
    // Calcular estatísticas
    const regsServidor = registros.filter(r => r.nf === nf);
    const horasTrab = somarHoras(regsServidor.map(r => r.h_trabalhada));
    const horasDireito = somarHoras(regsServidor.map(r => r.h_direito));
    const horasGozadas = somarHoras(regsServidor.map(r => r.horas_descontadas).filter(Boolean));
    
    const [hd, md] = horasDireito.split(':').map(Number);
    const [hg, mg] = horasGozadas.split(':').map(Number);
    const saldoMin = (hd * 60 + md) - (hg * 60 + mg);
    const saldoH = Math.floor(Math.abs(saldoMin) / 60);
    const saldoM = Math.abs(saldoMin) % 60;
    const saldo = `${saldoMin < 0 ? '-' : ''}${String(saldoH).padStart(2, '0')}:${String(saldoM).padStart(2, '0')}`;
    
    document.getElementById('srv-horas-trab').textContent = horasTrab;
    document.getElementById('srv-horas-direito').textContent = horasDireito;
    document.getElementById('srv-horas-gozadas').textContent = horasGozadas || '00:00';
    document.getElementById('srv-saldo').textContent = saldo;
    document.getElementById('srv-saldo').className = `value ${saldoMin >= 0 ? 'positive' : 'negative'}`;
    
    // Renderizar histórico
    const tbody = document.getElementById('tbody-historico');
    const sortedRegs = regsServidor.sort((a, b) => new Date(b.dia_trabalhado) - new Date(a.dia_trabalhado));
    
    if (sortedRegs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="11" class="text-center">Nenhum registro encontrado</td></tr>`;
    } else {
        tbody.innerHTML = sortedRegs.map(r => `
            <tr>
                <td class="cell-date">${formatDate(r.dia_trabalhado)}</td>
                <td class="cell-time">${formatTime(r.entrada)}</td>
                <td class="cell-time">${formatTime(r.saida)}</td>
                <td><span class="cell-hours positive">${r.h_trabalhada || '-'}</span></td>
                <td><span class="cell-hours neutral">${r.h_direito || '-'}</span></td>
                <td class="cell-date">${formatDate(r.prazo_max)}</td>
                <td class="cell-date">${r.dias_gozados || '-'}</td>
                <td><span class="cell-hours ${r.horas_descontadas ? 'negative' : 'neutral'}">${r.horas_descontadas || '-'}</span></td>
                <td><span class="cell-hours ${getSaldoClass(r.saldo)}">${r.saldo || '-'}</span></td>
                <td class="cell-obs" title="${r.observacao || ''}">${truncateText(r.observacao, 20) || '-'}</td>
                <td class="table-actions">
                    <button class="btn-icon edit" onclick="editarRegistro(${r.id})" title="Editar"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                    <button class="btn-icon delete" onclick="confirmarExclusao(${r.id})" title="Excluir"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
                </td>
            </tr>
        `).join('');
    }
    
    // Navegar para página de consulta
    navigateTo('consulta');
}

// ===================================
// Modal Functions
// ===================================

function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
}

// ===================================
// CRUD Operations
// ===================================

async function salvarRegistro() {
    const nf = document.getElementById('reg-servidor').value;
    const data = document.getElementById('reg-data').value;
    const entrada = document.getElementById('reg-entrada').value;
    const saida = document.getElementById('reg-saida').value;
    
    if (!nf || !data || !entrada || !saida) {
        showToast('warning', 'Atenção', 'Preencha todos os campos obrigatórios');
        return;
    }
    
    const servidor = servidores.find(s => s.nf === nf);
    
    const registro = {
        nf: nf,
        nome: servidor?.nome || '',
        setor: servidor?.setor || '',
        dia_trabalhado: data,
        entrada: entrada,
        saida: saida
    };
    
    try {
        await API.post('/api/dias-trabalhados', registro);
        showToast('success', 'Sucesso', 'Registro adicionado com sucesso');
        closeModal('modal-registro');
        document.getElementById('form-registro').reset();
        await loadData();
    } catch (error) {
        console.error(error);
        showToast('error', 'Erro', 'Não foi possível salvar o registro');
    }
}

async function salvarServidor() {
    const nf = document.getElementById('srv-nf').value;
    const nome = document.getElementById('srv-nome').value;
    const setor = document.getElementById('srv-setor').value;
    
    if (!nf || !nome || !setor) {
        showToast('warning', 'Atenção', 'Preencha todos os campos obrigatórios');
        return;
    }
    
    try {
        await API.post('/api/servidores', { nf, nome, setor });
        showToast('success', 'Sucesso', 'Servidor cadastrado com sucesso');
        closeModal('modal-servidor');
        document.getElementById('form-servidor').reset();
        await loadData();
    } catch (error) {
        console.error(error);
        showToast('error', 'Erro', 'Não foi possível salvar o servidor');
    }
}

function editarRegistro(id) {
    const registro = registros.find(r => r.id === id);
    if (!registro) return;
    
    document.getElementById('edit-reg-id').value = id;
    document.getElementById('edit-reg-servidor').value = `${registro.nome} (${registro.nf})`;
    document.getElementById('edit-reg-data').value = registro.dia_trabalhado;
    document.getElementById('edit-reg-entrada').value = registro.entrada;
    document.getElementById('edit-reg-saida').value = registro.saida;
    document.getElementById('edit-reg-htrab').value = registro.h_trabalhada || '';
    document.getElementById('edit-reg-hdireito').value = registro.h_direito || '';
    document.getElementById('edit-reg-prazo').value = formatDate(registro.prazo_max);
    document.getElementById('edit-reg-dias-gozados').value = registro.dias_gozados || '';
    document.getElementById('edit-reg-h-descontadas').value = registro.horas_descontadas || '';
    document.getElementById('edit-reg-saldo').value = registro.saldo || '';
    document.getElementById('edit-reg-observacao').value = registro.observacao || '';
    
    openModal('modal-editar-registro');
}

async function atualizarRegistro() {
    const id = document.getElementById('edit-reg-id').value;
    const data = document.getElementById('edit-reg-data').value;
    const entrada = document.getElementById('edit-reg-entrada').value;
    const saida = document.getElementById('edit-reg-saida').value;
    const diasGozados = document.getElementById('edit-reg-dias-gozados').value;
    const horasDescontadas = document.getElementById('edit-reg-h-descontadas').value;
    const observacao = document.getElementById('edit-reg-observacao').value;
    
    if (!data || !entrada || !saida) {
        showToast('warning', 'Atenção', 'Preencha todos os campos obrigatórios');
        return;
    }
    
    try {
        await API.put(`/api/dias-trabalhados/${id}`, {
            dia_trabalhado: data,
            entrada: entrada,
            saida: saida,
            dias_gozados: diasGozados,
            horas_descontadas: horasDescontadas,
            observacao: observacao
        });
        showToast('success', 'Sucesso', 'Registro atualizado com sucesso');
        closeModal('modal-editar-registro');
        await loadData();
    } catch (error) {
        console.error(error);
        showToast('error', 'Erro', 'Não foi possível atualizar o registro');
    }
}

function confirmarExclusao(id) {
    if (confirm('Tem certeza que deseja excluir este registro?')) {
        excluirRegistro(id);
    }
}

async function excluirRegistro(id) {
    try {
        await API.delete(`/api/dias-trabalhados/${id}`);
        showToast('success', 'Sucesso', 'Registro excluído com sucesso');
        closeAllModals();
        await loadData();
    } catch (error) {
        console.error(error);
        showToast('error', 'Erro', 'Não foi possível excluir o registro');
    }
}

function confirmarExclusaoServidor(nf) {
    if (confirm('Tem certeza que deseja excluir este servidor? Todos os registros relacionados serão mantidos.')) {
        excluirServidor(nf);
    }
}

async function excluirServidor(nf) {
    try {
        const servidor = servidores.find(s => s.nf === nf);
        if (servidor) {
            await API.delete(`/api/servidores/${servidor.id}`);
            showToast('success', 'Sucesso', 'Servidor excluído com sucesso');
            closeAllModals();
            await loadData();
        }
    } catch (error) {
        console.error(error);
        showToast('error', 'Erro', 'Não foi possível excluir o servidor');
    }
}

// ===================================
// Editar Servidor
// ===================================

function editarServidor(nf) {
    const servidor = servidores.find(s => s.nf === nf);
    if (!servidor) {
        showToast('error', 'Erro', 'Servidor não encontrado');
        return;
    }
    
    document.getElementById('edit-srv-id').value = servidor.id;
    document.getElementById('edit-srv-nf').value = servidor.nf;
    document.getElementById('edit-srv-nome').value = servidor.nome;
    document.getElementById('edit-srv-setor').value = servidor.setor || '';
    
    openModal('modal-editar-servidor');
}

async function atualizarServidor() {
    const id = document.getElementById('edit-srv-id').value;
    const nf = document.getElementById('edit-srv-nf').value;
    const nome = document.getElementById('edit-srv-nome').value;
    const setor = document.getElementById('edit-srv-setor').value;
    
    if (!nf || !nome || !setor) {
        showToast('warning', 'Atenção', 'Preencha todos os campos obrigatórios');
        return;
    }
    
    try {
        await API.put(`/api/servidores/${id}`, { nf, nome, setor });
        showToast('success', 'Sucesso', 'Servidor atualizado com sucesso');
        closeModal('modal-editar-servidor');
        await loadData();
    } catch (error) {
        console.error(error);
        showToast('error', 'Erro', 'Não foi possível atualizar o servidor');
    }
}

function excluirServidorDoModal() {
    const nf = document.getElementById('edit-srv-nf').value;
    if (confirm('Tem certeza que deseja excluir este servidor?')) {
        excluirServidor(nf);
    }
}

// ===================================
// Navigation
// ===================================

function navigateTo(pageId) {
    // Esconder todas as páginas
    document.querySelectorAll('.page').forEach(p => {
        p.classList.remove('active');
        p.classList.add('hidden');
    });
    
    // Mostrar página selecionada
    const page = document.getElementById(`page-${pageId}`);
    if (page) {
        page.classList.remove('hidden');
        page.classList.add('active');
    }
    
    // Atualizar nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === pageId) {
            item.classList.add('active');
        }
    });
    
    // Atualizar título
    const titles = {
        dashboard: 'Dashboard',
        consulta: 'Consulta por Servidor',
        registros: 'Dias Trabalhados',
        servidores: 'Servidores',
        calendario: 'Calendário de Prazos',
        backup: 'Backup & Restauração'
    };
    document.getElementById('page-title').textContent = titles[pageId] || 'Dashboard';
    document.getElementById('breadcrumb-current').textContent = titles[pageId] || 'Dashboard';
    
    // Renderizar calendário se for a página
    if (pageId === 'calendario') {
        renderCalendario();
    }
}

// ===================================
// Calendário e Notificações
// ===================================

let currentCalendarMonth = new Date().getMonth();
let currentCalendarYear = new Date().getFullYear();
let alertasData = [];

function initCalendario() {
    document.getElementById('btn-prev-month')?.addEventListener('click', () => {
        currentCalendarMonth--;
        if (currentCalendarMonth < 0) {
            currentCalendarMonth = 11;
            currentCalendarYear--;
        }
        renderCalendario();
    });
    
    document.getElementById('btn-next-month')?.addEventListener('click', () => {
        currentCalendarMonth++;
        if (currentCalendarMonth > 11) {
            currentCalendarMonth = 0;
            currentCalendarYear++;
        }
        renderCalendario();
    });
    
    document.getElementById('btn-hoje')?.addEventListener('click', () => {
        currentCalendarMonth = new Date().getMonth();
        currentCalendarYear = new Date().getFullYear();
        renderCalendario();
    });
    
    // Notification bell toggle
    const bell = document.getElementById('notification-bell');
    bell?.addEventListener('click', (e) => {
        e.stopPropagation();
        bell.classList.toggle('active');
    });
    
    document.addEventListener('click', () => {
        document.getElementById('notification-bell')?.classList.remove('active');
    });
}

function calcularAlertas() {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    alertasData = [];
    
    registros.forEach(r => {
        if (!r.prazo_max) return;
        
        const prazoDate = parseDate(r.prazo_max);
        if (!prazoDate) return;
        
        const diffTime = prazoDate.getTime() - hoje.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // Alertar se faltam 15 dias ou menos
        if (diffDays <= 15 && diffDays >= 0) {
            const servidor = servidores.find(s => s.nf === r.nf);
            
            // Só adicionar se tiver nome do servidor
            if (!servidor?.nome) return;
            
            alertasData.push({
                id: r.id,
                nf: r.nf,
                nome: servidor.nome,
                setor: servidor.setor || '-',
                prazo_max: r.prazo_max,
                prazoDate: prazoDate,
                diasRestantes: diffDays,
                tipo: diffDays <= 7 ? 'urgent' : 'warning'
            });
        }
    });
    
    // Ordenar por dias restantes
    alertasData.sort((a, b) => a.diasRestantes - b.diasRestantes);
    
    // Atualizar badges
    const count = alertasData.length;
    const badgeAlertas = document.getElementById('badge-alertas');
    const bellBadge = document.getElementById('bell-badge');
    
    if (badgeAlertas) {
        badgeAlertas.textContent = count;
        badgeAlertas.style.display = count > 0 ? 'flex' : 'none';
    }
    
    if (bellBadge) {
        bellBadge.textContent = count;
        bellBadge.setAttribute('data-count', count);
        bellBadge.style.display = count > 0 ? 'flex' : 'none';
    }
    
    // Atualizar dropdown de notificações
    renderNotifications();
}

function renderNotifications() {
    const list = document.getElementById('notification-list');
    const countEl = document.getElementById('notification-count');
    
    if (!list) return;
    
    if (alertasData.length === 0) {
        list.innerHTML = `
            <div class="notification-empty">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                <p>Nenhum alerta de prazo</p>
            </div>
        `;
        countEl.textContent = '0 alertas';
        return;
    }
    
    countEl.textContent = `${alertasData.length} alerta${alertasData.length > 1 ? 's' : ''}`;
    
    list.innerHTML = alertasData.slice(0, 10).map(a => `
        <div class="notification-item ${a.tipo}" onclick="consultarServidor('${a.nf}')">
            <div class="notification-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 6v6l4 2"/>
                </svg>
            </div>
            <div class="notification-content">
                <div class="notification-title">${a.nome}</div>
                <div class="notification-desc">Prazo máx: ${formatDate(a.prazo_max)}</div>
                <div class="notification-time">${a.diasRestantes === 0 ? 'Vence hoje!' : `Vence em ${a.diasRestantes} dia${a.diasRestantes > 1 ? 's' : ''}`}</div>
            </div>
        </div>
    `).join('');
}

function renderCalendario() {
    const container = document.getElementById('calendario-days');
    const titleEl = document.getElementById('calendario-title');
    
    if (!container) return;
    
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                   'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    
    titleEl.textContent = `${meses[currentCalendarMonth]} ${currentCalendarYear}`;
    
    const hoje = new Date();
    const primeiroDia = new Date(currentCalendarYear, currentCalendarMonth, 1);
    const ultimoDia = new Date(currentCalendarYear, currentCalendarMonth + 1, 0);
    
    const startDay = primeiroDia.getDay();
    const totalDays = ultimoDia.getDate();
    
    // Dias do mês anterior
    const diasAnterior = new Date(currentCalendarYear, currentCalendarMonth, 0).getDate();
    
    let html = '';
    
    // Dias do mês anterior
    for (let i = startDay - 1; i >= 0; i--) {
        const dia = diasAnterior - i;
        html += `<div class="calendar-day other-month"><div class="day-number">${dia}</div></div>`;
    }
    
    // Dias do mês atual
    for (let dia = 1; dia <= totalDays; dia++) {
        const dataAtual = new Date(currentCalendarYear, currentCalendarMonth, dia);
        const isToday = dataAtual.toDateString() === hoje.toDateString();
        
        // Buscar eventos para este dia
        const eventos = getEventosNoDia(dataAtual);
        
        let eventosHtml = '';
        if (eventos.length > 0) {
            const maxShow = 3;
            eventos.slice(0, maxShow).forEach(e => {
                eventosHtml += `<div class="day-event ${e.tipo}" onclick="consultarServidor('${e.nf}')" title="${e.nome} - ${e.label}">${e.nome.split(' ')[0]}</div>`;
            });
            if (eventos.length > maxShow) {
                eventosHtml += `<div class="day-more">+${eventos.length - maxShow} mais</div>`;
            }
        }
        
        html += `
            <div class="calendar-day ${isToday ? 'today' : ''}">
                <div class="day-number">${dia}</div>
                <div class="day-events">${eventosHtml}</div>
            </div>
        `;
    }
    
    // Dias do próximo mês
    const totalCells = startDay + totalDays;
    const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let i = 1; i <= remaining; i++) {
        html += `<div class="calendar-day other-month"><div class="day-number">${i}</div></div>`;
    }
    
    container.innerHTML = html;
    
    // Renderizar lista de alertas
    renderAlertasList();
}

function getEventosNoDia(data) {
    const eventos = [];
    const dataStr = data.toISOString().split('T')[0];
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    registros.forEach(r => {
        if (!r.prazo_max) return;
        
        const prazoDate = parseDate(r.prazo_max);
        if (!prazoDate) return;
        
        const prazoStr = prazoDate.toISOString().split('T')[0];
        const servidor = servidores.find(s => s.nf === r.nf);
        
        // Só mostrar se tiver nome do servidor
        if (!servidor?.nome) return;
        
        // Calcular dias restantes
        const diffTime = prazoDate.getTime() - hoje.getTime();
        const diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // Verificar prazo máximo - mostrar no calendário
        if (prazoStr === dataStr) {
            let tipo = 'normal';
            if (diasRestantes <= 7) tipo = 'urgent';
            else if (diasRestantes <= 15) tipo = 'warning';
            
            eventos.push({
                nf: r.nf,
                nome: servidor.nome,
                tipo: tipo,
                label: 'Prazo Máximo'
            });
        }
    });
    
    return eventos;
}

function parseDate(dateStr) {
    if (!dateStr) return null;
    
    // Tentar formato DD/MM/YYYY
    if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            return new Date(parts[2], parts[1] - 1, parts[0]);
        }
    }
    
    // Tentar formato YYYY-MM-DD
    if (dateStr.includes('-')) {
        return new Date(dateStr);
    }
    
    return null;
}

function renderAlertasList() {
    const list = document.getElementById('alertas-list');
    const countEl = document.getElementById('alertas-count');
    
    if (!list) return;
    
    if (alertasData.length === 0) {
        list.innerHTML = `
            <div class="alertas-empty">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                <p>Nenhum prazo próximo de vencer</p>
            </div>
        `;
        countEl.textContent = '0 servidores com prazo próximo';
        return;
    }
    
    countEl.textContent = `${alertasData.length} servidor${alertasData.length > 1 ? 'es' : ''} com prazo próximo`;
    
    list.innerHTML = alertasData.map(a => `
        <div class="alerta-item ${a.tipo}" onclick="consultarServidor('${a.nf}')">
            <div class="alerta-icon">${a.nome.substring(0, 2).toUpperCase()}</div>
            <div class="alerta-info">
                <div class="alerta-nome">${a.nome}</div>
                <div class="alerta-nf">NF: ${a.nf} | ${a.setor}</div>
                <div class="alerta-prazo">Prazo máx: ${formatDate(a.prazo_max)}</div>
            </div>
            <div class="alerta-dias">
                <div class="alerta-dias-num">${a.diasRestantes}</div>
                <div class="alerta-dias-label">${a.diasRestantes === 1 ? 'dia' : 'dias'}</div>
            </div>
        </div>
    `).join('');
}

// ===================================
// Auto-calculate fields
// ===================================

function setupAutoCalculate() {
    // No modal de novo registro
    const regEntrada = document.getElementById('reg-entrada');
    const regSaida = document.getElementById('reg-saida');
    const regData = document.getElementById('reg-data');
    
    function updateCalc() {
        const entrada = regEntrada.value;
        const saida = regSaida.value;
        const data = regData.value;
        
        if (entrada && saida) {
            const htrab = calcularHoras(entrada, saida);
            const hdireito = dobrarHoras(htrab);
            document.getElementById('reg-htrab').value = htrab;
            document.getElementById('reg-hdireito').value = hdireito;
        }
        
        if (data) {
            document.getElementById('reg-prazo').value = calcularPrazo(data);
        }
    }
    
    regEntrada.addEventListener('change', updateCalc);
    regSaida.addEventListener('change', updateCalc);
    regData.addEventListener('change', updateCalc);
    
    // No modal de editar
    const editEntrada = document.getElementById('edit-reg-entrada');
    const editSaida = document.getElementById('edit-reg-saida');
    
    function updateEditCalc() {
        const entrada = editEntrada.value;
        const saida = editSaida.value;
        
        if (entrada && saida) {
            const htrab = calcularHoras(entrada, saida);
            const hdireito = dobrarHoras(htrab);
            document.getElementById('edit-reg-htrab').value = htrab;
            document.getElementById('edit-reg-hdireito').value = hdireito;
        }
    }
    
    editEntrada.addEventListener('change', updateEditCalc);
    editSaida.addEventListener('change', updateEditCalc);
}

// ===================================
// Event Listeners
// ===================================

function initApp() {
    // Inicializar zoom
    initZoom();

    // Inicializar visual moderno
    initModernUI();
    
    // Inicializar calendário
    initCalendario();
    
    // Carregar dados
    loadData();
    
    // Setup auto-calculate
    setupAutoCalculate();
    
    // Navigation
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo(item.dataset.page);
        });
    });
    
    // Links que navegam
    document.querySelectorAll('[data-page]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo(link.dataset.page);
        });
    });
    
    // Modal close buttons
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
        btn.addEventListener('click', closeAllModals);
    });
    
    // Close modal on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeAllModals();
        });
    });
    
    // Botões de novo registro
    document.getElementById('btn-novo-registro').addEventListener('click', () => openModal('modal-registro'));
    document.getElementById('btn-novo-registro-page').addEventListener('click', () => openModal('modal-registro'));
    document.getElementById('btn-add-registro-servidor').addEventListener('click', () => {
        const nf = document.getElementById('servidor-nf').textContent;
        document.getElementById('reg-servidor').value = nf;
        openModal('modal-registro');
    });
    
    // Botão novo servidor
    document.getElementById('btn-novo-servidor').addEventListener('click', () => openModal('modal-servidor'));
    
    // Salvar registro
    document.getElementById('btn-salvar-registro').addEventListener('click', salvarRegistro);
    
    // Salvar servidor
    document.getElementById('btn-salvar-servidor').addEventListener('click', salvarServidor);
    
    // Atualizar registro
    document.getElementById('btn-atualizar-registro').addEventListener('click', atualizarRegistro);
    
    // Excluir registro do modal
    document.getElementById('btn-excluir-registro').addEventListener('click', () => {
        const id = document.getElementById('edit-reg-id').value;
        confirmarExclusao(parseInt(id));
    });
    
    // Atualizar servidor
    document.getElementById('btn-atualizar-servidor').addEventListener('click', atualizarServidor);
    
    // Excluir servidor do modal
    document.getElementById('btn-excluir-servidor-modal').addEventListener('click', excluirServidorDoModal);
    
    // Consulta por servidor
    document.getElementById('btn-consultar').addEventListener('click', () => {
        const nf = document.getElementById('consulta-nf').value || document.getElementById('consulta-select').value;
        if (nf) {
            consultarServidor(nf);
        } else {
            showToast('warning', 'Atenção', 'Digite um NF ou selecione um servidor');
        }
    });
    
    document.getElementById('consulta-select').addEventListener('change', function() {
        if (this.value) {
            document.getElementById('consulta-nf').value = '';
            consultarServidor(this.value);
        }
    });
    
    document.getElementById('consulta-nf').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            if (this.value) consultarServidor(this.value);
        }
    });
    
    // Filtros
    ['filter-setor', 'filter-data-inicio', 'filter-data-fim', 'filter-servidor'].forEach(id => {
        document.getElementById(id).addEventListener('change', () => renderRegistros(1));
        document.getElementById(id).addEventListener('input', () => renderRegistros(1));
    });
    
    ['filter-setor-srv', 'filter-busca-srv'].forEach(id => {
        document.getElementById(id).addEventListener('change', () => renderServidores(1));
        document.getElementById(id).addEventListener('input', () => renderServidores(1));
    });
    
    document.getElementById('btn-limpar-filtros').addEventListener('click', () => {
        document.getElementById('filter-setor').value = '';
        document.getElementById('filter-data-inicio').value = '';
        document.getElementById('filter-data-fim').value = '';
        document.getElementById('filter-servidor').value = '';
        renderRegistros(1);
    });
    
    // Refresh
    document.getElementById('btn-refresh').addEventListener('click', loadData);
    
    // Global search
    document.getElementById('global-search').addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && this.value) {
            consultarServidor(this.value);
        }
    });
    
    // Toggle sidebar (mobile)
    document.getElementById('toggle-sidebar').addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('open');
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeAllModals();
    });
}
