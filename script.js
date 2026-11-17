const DB_KEY = 'pro7_orgbuilder_free_db_v1';

function getDB() {
  const raw = localStorage.getItem(DB_KEY);
  if (raw) {
    try { return JSON.parse(raw); } catch(e){}
  }
  return { users: [], companies: [], departments: [], positions: [] };
}

function saveDB(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

let currentUser = null;
let activeCompanyId = null;

function switchAuthTab(tab) {
  ['login', 'register', 'backup'].forEach(t => {
    document.getElementById('tab' + t.charAt(0).toUpperCase() + t.slice(1)).classList.toggle('active', t === tab);
  });
  document.getElementById('loginForm').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('registerForm').style.display = tab === 'register' ? 'block' : 'none';
  document.getElementById('backupForm').style.display = tab === 'backup' ? 'block' : 'none';
  document.getElementById('authMsg').innerHTML = '';
}

function handleRegister(e) {
  e.preventDefault();
  const db = getDB();
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim().toLowerCase();
  const pass = document.getElementById('regPass').value;

  if (db.users.some(u => u.email === email)) {
    document.getElementById('authMsg').innerHTML = '<div class="alert" style="background:#fee2e2;color:#991b1b">E-mail já cadastrado.</div>';
    return;
  }

  const user = { id: 'u_' + Math.random(), full_name: name, email, pass };
  db.users.push(user);
  saveDB(db);
  startSession(user);
}

function handleLogin(e) {
  e.preventDefault();
  const db = getDB();
  const email = document.getElementById('loginEmail').value.trim().toLowerCase();
  const pass = document.getElementById('loginPass').value;

  const user = db.users.find(u => u.email === email && u.pass === pass);
  if (!user) {
    document.getElementById('authMsg').innerHTML = '<div class="alert" style="background:#fee2e2;color:#991b1b">E-mail ou senha incorretos.</div>';
    return;
  }
  startSession(user);
}

function startSession(user) {
  currentUser = user;
  document.getElementById('authScreen').style.display = 'none';
  document.getElementById('appShell').classList.add('active');
  document.getElementById('curUserName').textContent = user.full_name;
  renderCompanies();
}

function logout() {
  currentUser = null;
  activeCompanyId = null;
  document.getElementById('appShell').classList.remove('active');
  document.getElementById('authScreen').style.display = 'grid';
}

function navigate(viewId) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-' + viewId).classList.add('active');
  document.getElementById('pageTitle').textContent = viewId === 'companies' ? 'Gestão de Empresas' : (viewId === 'workspace' ? 'Espaço de Trabalho da Clínica' : 'Central de Backup');
  if (viewId === 'companies') renderCompanies();
  if (viewId === 'workspace') renderWorkspace();
}

function createCompany(e) {
  e.preventDefault();
  const db = getDB();
  const comp = {
    id: 'c_' + Math.random(),
    name: document.getElementById('cName').value.trim(),
    cityState: document.getElementById('cCityState').value.trim(),
    elaboratedBy: document.getElementById('cElab').value.trim()
  };
  db.companies.push(comp);
  saveDB(db);
  e.target.reset();
  renderCompanies();
}

function renderCompanies() {
  const db = getDB();
  const container = document.getElementById('companiesList');
  if (db.companies.length === 0) {
    container.innerHTML = '<p style="color:var(--muted);text-align:center;padding:20px">Nenhuma clínica cadastrada.</p>';
    return;
  }
  container.innerHTML = `<table>
    <thead><tr><th>Clínica</th><th>Cidade / UF</th><th>Elaborado por</th><th>Ações</th></tr></thead>
    <tbody>
      ${db.companies.map(c => `<tr>
        <td><strong>${c.name}</strong></td>
        <td>${c.cityState}</td>
        <td>${c.elaboratedBy}</td>
        <td><button class="btn btn-primary btn-sm" onclick="selectCompany('${c.id}')">Acessar Workspace</button></td>
      </tr>`).join('')}
    </tbody>
  </table>`;
}

function selectCompany(cId) {
  activeCompanyId = cId;
  const db = getDB();
  const c = db.companies.find(x => x.id === cId);
  document.getElementById('activeCompanyBadge').textContent = c.name;
  document.getElementById('wsCompanyName').textContent = c.name;
  navigate('workspace');
}

function renderWorkspace() {
  const db = getDB();
  const depts = db.departments.filter(d => d.companyId === activeCompanyId);
  const positions = db.positions.filter(p => p.companyId === activeCompanyId);

  document.getElementById('wsKpis').innerHTML = `
    <div class="card" style="margin:0"><span>Setores</span><strong style="font-size:20px">${depts.length}</strong></div>
    <div class="card" style="margin:0"><span>Cargos Cadastrados</span><strong style="font-size:20px">${positions.length}</strong></div>
  `;

  document.getElementById('pDeptSelect').innerHTML = depts.map(d => `<option value="${d.id}">${d.name}</option>`).join('');

  document.getElementById('deptList').innerHTML = depts.length === 0 ? '<span style="color:var(--muted)">Nenhum setor.</span>' : depts.map(d => `<div style="padding:6px;border-bottom:1px solid var(--border)"><b>${d.name}</b></div>`).join('');
  document.getElementById('posList').innerHTML = positions.length === 0 ? '<span style="color:var(--muted)">Nenhum cargo.</span>' : positions.map(p => `<div style="padding:6px;border-bottom:1px solid var(--border)"><b>${p.title}</b> <span class="badge">${p.scenario}</span></div>`).join('');
}

function createDepartment(e) {
  e.preventDefault();
  const db = getDB();
  db.departments.push({
    id: 'd_' + Math.random(),
    companyId: activeCompanyId,
    name: document.getElementById('dName').value.trim()
  });
  saveDB(db);
  e.target.reset();
  renderWorkspace();
}

function createPosition(e) {
  e.preventDefault();
  const db = getDB();
  db.positions.push({
    id: 'p_' + Math.random(),
    companyId: activeCompanyId,
    title: document.getElementById('pTitle').value.trim(),
    departmentId: document.getElementById('pDeptSelect').value,
    scenario: document.getElementById('pScenario').value
  });
  saveDB(db);
  e.target.reset();
  renderWorkspace();
}

function exportSystemBackup() {
  const data = localStorage.getItem(DB_KEY) || '{}';
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pro7_backup_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
}

function importSystemBackup(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(evt) {
    try {
      JSON.parse(evt.target.result);
      localStorage.setItem(DB_KEY, evt.target.result);
      alert('Backup restaurado com sucesso! O sistema será recarregado.');
      location.reload();
    } catch(err) {
      alert('Arquivo de backup inválido.');
    }
  };
  reader.readAsText(file);
}
