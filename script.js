// Estado global da aplicação carregado do localStorage
let appData = JSON.parse(localStorage.getItem('pro7_orgbuilder_data')) || {
    companies: [
        { id: 'comp_1', name: 'Grupo Alfa Corporativo', segment: 'Indústria & Logística' }
    ],
    collaborators: [
        { id: 'col_1', companyId: 'comp_1', name: 'Carlos Eduardo', role: 'Diretor Presidente (CEO)', department: 'Diretoria Executiva', managerId: '', email: 'carlos@alfa.com' },
        { id: 'col_2', companyId: 'comp_1', name: 'Juliana Mendes', role: 'Gerente de DHO', department: 'Recursos Humanos', managerId: 'col_1', email: 'juliana@alfa.com' },
        { id: 'col_3', companyId: 'comp_1', name: 'Marcos Vinícius', role: 'Gerente Comercial', department: 'Comercial', managerId: 'col_1', email: 'marcos@alfa.com' }
    ]
};

function saveData() {
    localStorage.setItem('pro7_orgbuilder_data', JSON.stringify(appData));
    updateDashboardMetrics();
    populateCompanySelectors();
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    updateDashboardMetrics();
    populateCompanySelectors();
    renderCompaniesTable();
});

// Navegação por Abas
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));

    document.getElementById(`tab-${tabId}`).classList.add('active');
    event.currentTarget.classList.add('active');

    if (tabId === 'organogram') {
        loadOrganogramData();
    } else if (tabId === 'companies') {
        renderCompaniesTable();
    }
}

// Atualizar Métricas do Painel
function updateDashboardMetrics() {
    document.getElementById('stat-companies').innerText = appData.companies.length;
    document.getElementById('stat-collaborators').innerText = appData.collaborators.length;
    
    const depts = new Set(appData.collaborators.map(c => c.department));
    document.getElementById('stat-departments').innerText = depts.size;
}

// Preencher Seletor de Empresas
function populateCompanySelectors() {
    const selector = document.getElementById('company-selector');
    const currentVal = selector.value;
    selector.innerHTML = '<option value="">Selecione uma empresa...</option>';
    
    appData.companies.forEach(comp => {
        const opt = document.createElement('option');
        opt.value = comp.id;
        opt.textContent = `${comp.name} (${comp.segment})`;
        selector.appendChild(opt);
    });

    if (currentVal) selector.value = currentVal;
}

// Gestão de Empresas
function openCompanyModal() {
    document.getElementById('company-form').reset();
    document.getElementById('company-modal').style.display = 'flex';
}

function closeCompanyModal() {
    document.getElementById('company-modal').style.display = 'none';
}

function saveCompany(e) {
    e.preventDefault();
    const name = document.getElementById('company-name').value;
    const segment = document.getElementById('company-segment').value;

    const newCompany = {
        id: 'comp_' + Date.now(),
        name,
        segment
    };

    appData.companies.push(newCompany);
    saveData();
    closeCompanyModal();
    renderCompaniesTable();
}

function deleteCompany(companyId) {
    if (confirm('Tem certeza que deseja excluir esta empresa e todos os seus colaboradores vinculados?')) {
        appData.companies = appData.companies.filter(c => c.id !== companyId);
        appData.collaborators = appData.collaborators.filter(c => c.companyId !== companyId);
        saveData();
        renderCompaniesTable();
        document.getElementById('company-selector').value = '';
        loadOrganogramData();
    }
}

function renderCompaniesTable() {
    const tbody = document.querySelector('#companies-table tbody');
    tbody.innerHTML = '';

    if (appData.companies.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">Nenhuma empresa cadastrada.</td></tr>`;
        return;
    }

    appData.companies.forEach(comp => {
        const count = appData.collaborators.filter(c => c.companyId === comp.id).length;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${comp.name}</strong></td>
            <td>${comp.segment}</td>
            <td>${count} colaboradores</td>
            <td>
                <button class="logout-btn" style="background:#fee2e2; color:var(--danger);" onclick="deleteCompany('${comp.id}')">Excluir</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Gestão de Colaboradores e Organograma
function loadOrganogramData() {
    const compId = document.getElementById('company-selector').value;
    const container = document.getElementById('tree-root-container');
    const emptyState = document.getElementById('canvas-empty');

    container.innerHTML = '';

    if (!compId) {
        emptyState.style.display = 'block';
        return;
    }

    const collabs = appData.collaborators.filter(c => c.companyId === compId);
    if (collabs.length === 0) {
        emptyState.style.display = 'block';
        emptyState.querySelector('p').textContent = 'Esta empresa ainda não possui colaboradores cadastrados. Clique em "Adicionar Colaborador".';
        return;
    }

    emptyState.style.display = 'none';
    buildTreeStructure(collabs, container);
}

// Construtor de Árvore Hierárquica em HTML (Fluxograma)
function buildTreeStructure(collabs, container) {
    // Identificar nós raiz (sem gestor ou gestor não existente na lista)
    const roots = collabs.filter(c => !c.managerId || !collabs.some(m => m.id === c.managerId));

    if (roots.length === 0) {
        container.innerHTML = '<p style="color:var(--danger)">Erro de estrutura: Ciclo hierárquico detectado ou nenhum topo definido.</p>';
        return;
    }

    const wrapperDiv = document.createElement('div');
    wrapperDiv.className = 'tree';
    const ul = document.createElement('ul');

    roots.forEach(root => {
        ul.appendChild(createNodeElement(root, collabs));
    });

    wrapperDiv.appendChild(ul);
    container.appendChild(wrapperDiv);
}

function createNodeElement(node, allCollabs) {
    const li = document.createElement('li');

    // Cartão visual
    const card = document.createElement('div');
    card.className = 'org-card';
    card.innerHTML = `
        <div class="card-header" title="${node.name}">${node.name}</div>
        <div class="card-role">${node.role}</div>
        <div class="card-dept">${node.department}</div>
        <div class="card-actions">
            <button onclick="editMember('${node.id}')" title="Editar"><i class="fa-solid fa-pen"></i></button>
            <button class="delete-btn" onclick="deleteMember('${node.id}')" title="Excluir"><i class="fa-solid fa-trash"></i></button>
        </div>
    `;
    li.appendChild(card);

    // Subordinados diretos
    const subordinates = allCollabs.filter(c => c.managerId === node.id);
    if (subordinates.length > 0) {
        const subUl = document.createElement('ul');
        subordinates.forEach(sub => {
            subUl.appendChild(createNodeElement(sub, allCollabs));
        });
        li.appendChild(subUl);
    }

    return li;
}

// Modais de Colaborador
function openMemberModal(memberId = null) {
    const compId = document.getElementById('company-selector').value;
    if (!compId) {
        alert('Selecione uma empresa antes de adicionar colaboradores.');
        return;
    }

    document.getElementById('member-form').reset();
    document.getElementById('member-id').value = '';

    // Preencher select de gestores
    const managerSelect = document.getElementById('member-manager');
    managerSelect.innerHTML = '<option value="">Nenhum (Topo / Diretor Geral)</option>';
    
    appData.collaborators
        .filter(c => c.companyId === compId && c.id !== memberId)
        .forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = `${c.name} - ${c.role}`;
            managerSelect.appendChild(opt);
        });

    if (memberId) {
        const member = appData.collaborators.find(c => c.id === memberId);
        if (member) {
            document.getElementById('member-id').value = member.id;
            document.getElementById('member-name').value = member.name;
            document.getElementById('member-role').value = member.role;
            document.getElementById('member-dept').value = member.department;
            document.getElementById('member-manager').value = member.managerId || '';
            document.getElementById('member-email').value = member.email || '';
        }
    }

    document.getElementById('member-modal').style.display = 'flex';
}

function closeMemberModal() {
    document.getElementById('member-modal').style.display = 'none';
}

function saveMember(e) {
    e.preventDefault();
    const compId = document.getElementById('company-selector').value;
    const id = document.getElementById('member-id').value;
    const name = document.getElementById('member-name').value;
    const role = document.getElementById('member-role').value;
    const department = document.getElementById('member-dept').value;
    const managerId = document.getElementById('member-manager').value;
    const email = document.getElementById('member-email').value;

    // Validação anti-loop simples
    if (id && managerId === id) {
        alert('Um colaborador não pode ser gestor de si mesmo.');
        return;
    }

    if (id) {
        // Edição
        const member = appData.collaborators.find(c => c.id === id);
        if (member) {
            member.name = name;
            member.role = role;
            member.department = department;
            member.managerId = managerId;
            member.email = email;
        }
    } else {
        // Criação
        const newMember = {
            id: 'col_' + Date.now(),
            companyId: compId,
            name,
            role,
            department,
            managerId,
            email
        };
        appData.collaborators.push(newMember);
    }

    saveData();
    closeMemberModal();
    loadOrganogramData();
}

function editMember(id) {
    openMemberModal(id);
}

function deleteMember(id) {
    if (confirm('Deseja excluir este colaborador? Os subordinados diretos passarão a ser órfãos e precisarão ser realocados.')) {
        appData.collaborators = appData.collaborators.filter(c => c.id !== id);
        // Realocar subordinados para raiz ou sem gestor
        appData.collaborators.forEach(c => {
            if (c.managerId === id) c.managerId = '';
        });
        saveData();
        loadOrganogramData();
    }
}

function renderChart() {
    loadOrganogramData();
}

function exportData() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `pro7_orgbuilder_backup_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

function handleLogout() {
    if (confirm('Deseja realmente encerrar a sessão?')) {
        alert('Sessão encerrada com sucesso.');
    }
}
