
(() => {
  "use strict";
  const KEY = "pro7_orgbuilder_v1", SES = "pro7_orgbuilder_session";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const SC = { asis: "AS IS (atual)", tobe: "TO BE (planejada)" };

  /* ---------- Estado e persistência ---------- */
  function seed() {
    const c = uid(), mk = (name, role, dept, parentId) => ({ id: uid(), companyId: c, scenario: "asis", name, role, dept, email: "", parentId });
    const dir = mk("Ana Souza", "Diretora Geral", "Diretoria", null);
    const op = mk("Carlos Lima", "Gerente de Operações", "Operações", dir.id);
    const rh = mk("Marta Reis", "Gerente de RH", "DHO", dir.id);
    const sup = mk("João Alves", "Supervisor de Produção", "Operações", op.id);
    return { companies: [{ id: c, name: "Empresa Demo", segment: "Indústria" }], employees: [dir, op, rh, sup], cid: c, scenario: "asis", view: "dashboard" };
  }
  function load() {
    try { const d = JSON.parse(localStorage.getItem(KEY)); if (d && Array.isArray(d.companies) && Array.isArray(d.employees)) return d; } catch (e) { /* ignora */ }
    return seed();
  }
  let S = load(), editing = null;
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast("Não foi possível salvar no navegador."); } };

  const company = () => S.companies.find(c => c.id === S.cid);
  const emps = (cid = S.cid, sc = S.scenario) => S.employees.filter(e => e.companyId === cid && e.scenario === sc);
  const byId = id => S.employees.find(e => e.id === id);

  function toast(msg) {
    const t = $("#toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("show"), 2800);
  }
  function hue(str) { let h = 0; for (const ch of str.toLowerCase()) h = (h * 31 + ch.charCodeAt(0)) % 360; return h; }

  /* ---------- Hierarquia ---------- */
  // true se "candidate" está abaixo de "id" (evita ciclos)
  function isDescendant(id, candidate) {
    let cur = candidate, guard = 0;
    while (cur && guard++ < 1000) { if (cur === id) return true; cur = byId(cur)?.parentId; }
    return false;
  }
  function depth(list) {
    const map = new Map(list.map(e => [e.id, e]));
    let max = 0;
    list.forEach(e => { let d = 1, cur = e, g = 0; while (cur.parentId && map.has(cur.parentId) && g++ < 1000) { cur = map.get(cur.parentId); d++; } max = Math.max(max, d); });
    return max;
  }
  function treeHtml(list) {
    if (!list.length) return '<p class="empty">Nenhum colaborador neste cenário. Cadastre o primeiro no formulário abaixo.</p>';
    const ids = new Set(list.map(e => e.id)), kids = {}, roots = [];
    list.forEach(e => { if (e.parentId && ids.has(e.parentId)) (kids[e.parentId] ||= []).push(e); else roots.push(e); });
    const seen = new Set();
    const node = e => {
      if (seen.has(e.id)) return "";
      seen.add(e.id);
      const h = hue(e.dept), ch = (kids[e.id] || []).map(node).join("");
      return `<li><div class="node" tabindex="0" role="button" data-edit="${e.id}" style="--dept:hsl(${h} 65% 48%);--dept-text:hsl(${h} 55% 32%)" title="Clique para editar">
        <strong>${esc(e.name)}</strong><span>${esc(e.role)}</span><em>${esc(e.dept)}</em></div>${ch ? `<ul>${ch}</ul>` : ""}</li>`;
    };
    return `<ul>${roots.map(node).join("")}</ul>`;
  }

  /* ---------- Renderização ---------- */
  function render() {
    $$(".nav [data-view]").forEach(b => b.classList.toggle("active", b.dataset.view === S.view));
    $$(".view").forEach(v => v.classList.toggle("active", v.id === "view-" + S.view));
    renderDashboard(); renderCompanies(); renderOrg();
  }

  function renderDashboard() {
    const sectors = new Set(S.employees.map(e => e.companyId + "|" + e.dept.toLowerCase()));
    const cur = company();
    $("#stats").innerHTML = [
      [S.companies.length, "Empresas"], [S.employees.length, "Colaboradores (todos os cenários)"],
      [sectors.size, "Setores"], [cur ? depth(emps(cur.id, "asis")) : 0, "Níveis hierárquicos (AS IS)"]
    ].map(([n, l]) => `<div class="stat"><b>${n}</b><span>${l}</span></div>`).join("");
    $("#cmpCompany").textContent = cur ? `Empresa selecionada: ${cur.name}` : "Cadastre uma empresa para ver o comparativo.";
    if (!cur) { $("#cmpTable").innerHTML = ""; return; }
    const m = sc => {
      const l = emps(cur.id, sc), mg = new Set(l.map(e => e.parentId).filter(Boolean));
      return { n: l.length, s: new Set(l.map(e => e.dept.toLowerCase())).size, d: depth(l), g: mg.size, span: mg.size ? (l.filter(e => e.parentId).length / mg.size).toFixed(1) : "0" };
    };
    const a = m("asis"), t = m("tobe");
    const rows = [["Colaboradores", "n"], ["Setores", "s"], ["Níveis hierárquicos", "d"], ["Gestores", "g"], ["Média de subordinados por gestor", "span"]];
    $("#cmpTable").innerHTML = `<thead><tr><th>Indicador</th><th>AS IS</th><th>TO BE</th></tr></thead><tbody>${rows.map(([l, k]) => `<tr><td>${l}</td><td>${a[k]}</td><td>${t[k]}</td></tr>`).join("")}</tbody>`;
  }

  function renderCompanies() {
    $("#coTable").innerHTML = S.companies.length
      ? `<thead><tr><th>Empresa</th><th>Segmento</th><th>Colaboradores</th><th>Setores</th><th></th></tr></thead><tbody>${S.companies.map(c => {
        const all = S.employees.filter(e => e.companyId === c.id);
        const secs = [...new Set(all.map(e => e.dept))].sort();
        return `<tr><td><b>${esc(c.name)}</b></td><td>${esc(c.segment)}</td><td>${all.length}</td>
          <td>${secs.map(s => `<span class="chip">${esc(s)}</span>`).join("") || "—"}</td>
          <td class="r"><button class="btn sm" data-open="${c.id}">Abrir organograma</button> <button class="btn sm danger" data-delco="${c.id}">Excluir</button></td></tr>`;
      }).join("")}</tbody>`
      : '<tbody><tr><td class="empty">Nenhuma empresa cadastrada. Use o formulário ao lado.</td></tr></tbody>';
  }

  function renderOrg() {
    const sel = $("#companySel");
    sel.innerHTML = S.companies.map(c => `<option value="${c.id}" ${c.id === S.cid ? "selected" : ""}>${esc(c.name)}</option>`).join("") || "<option value=''>Sem empresas</option>";
    $$("[data-sc]").forEach(b => b.classList.toggle("active", b.dataset.sc === S.scenario));
    const list = emps();
    $("#tree").innerHTML = S.cid ? treeHtml(list) : '<p class="empty">Cadastre uma empresa em Empresas / Setores.</p>';
    $("#deptList").innerHTML = [...new Set(S.employees.filter(e => e.companyId === S.cid).map(e => e.dept))].map(d => `<option value="${esc(d)}">`).join("");
    fillManagers(list);
    $("#empTable").innerHTML = list.length
      ? `<thead><tr><th>Nome</th><th>Cargo</th><th>Setor</th><th>Responde a</th><th></th></tr></thead><tbody>${list.map(e => `<tr>
        <td><b>${esc(e.name)}</b><br><span class="muted" style="margin:0">${esc(e.email)}</span></td><td>${esc(e.role)}</td><td>${esc(e.dept)}</td>
        <td>${esc(byId(e.parentId)?.name || "—")}</td>
        <td class="r"><button class="btn sm" data-edit="${e.id}">Editar</button> <button class="btn sm danger" data-delemp="${e.id}">Excluir</button></td></tr>`).join("")}</tbody>`
      : '<tbody><tr><td class="empty">Sem colaboradores neste cenário.</td></tr></tbody>';
  }

  function fillManagers(list, keep) {
    const f = $("#empForm").elements.gestor, val = keep ?? f.value;
    f.innerHTML = '<option value="">Nenhum (topo da estrutura)</option>' +
      list.filter(e => e.id !== editing).map(e => `<option value="${e.id}">${esc(e.name)} — ${esc(e.role)}</option>`).join("");
    f.value = list.some(e => e.id === val && e.id !== editing) ? val : "";
  }

  /* ---------- Formulário de colaborador ---------- */
  function resetForm() {
    editing = null; $("#empForm").reset();
    $("#empFormTitle").textContent = "Novo colaborador";
    $("#empSubmit").textContent = "Adicionar colaborador";
    $("#empCancel").hidden = true; $("#empErr").hidden = true;
    fillManagers(emps(), "");
  }
  function startEdit(id) {
    const e = byId(id); if (!e) return;
    S.view = "org"; editing = id; render();
    const f = $("#empForm").elements;
    f.nome.value = e.name; f.cargo.value = e.role; f.setor.value = e.dept; f.email.value = e.email || "";
    fillManagers(emps(), e.parentId || "");
    $("#empFormTitle").textContent = "Editar colaborador";
    $("#empSubmit").textContent = "Salvar alterações";
    $("#empCancel").hidden = false;
    $("#empForm").scrollIntoView({ behavior: "smooth", block: "center" });
  }
  function formError(msg) { const p = $("#empErr"); p.textContent = msg; p.hidden = false; }

  $("#empForm").addEventListener("submit", ev => {
    ev.preventDefault();
    if (!S.cid) return formError("Cadastre uma empresa antes de adicionar colaboradores.");
    const f = ev.target.elements;
    const v = { name: f.nome.value.trim(), role: f.cargo.value.trim(), dept: f.setor.value.trim(), email: f.email.value.trim(), parentId: f.gestor.value || null };
    if (!v.name || !v.role || !v.dept) return formError("Preencha nome, cargo e setor.");
    if (!f.email.checkValidity()) return formError("Informe um e-mail válido ou deixe o campo vazio.");
    if (editing) {
      if (v.parentId === editing) return formError("Um colaborador não pode ser gestor de si mesmo.");
      if (isDescendant(editing, v.parentId)) return formError("Essa escolha cria um ciclo: o gestor selecionado já responde a este colaborador.");
      Object.assign(byId(editing), v); toast("Alterações salvas.");
    } else {
      S.employees.push({ id: uid(), companyId: S.cid, scenario: S.scenario, ...v }); toast("Colaborador adicionado.");
    }
    save(); resetForm(); render();
  });
  $("#empCancel").onclick = () => { resetForm(); };

  /* ---------- Ações delegadas ---------- */
  document.addEventListener("click", ev => {
    const t = ev.target.closest("[data-edit],[data-delemp],[data-delco],[data-open],[data-view],[data-sc]");
    if (!t) return;
    const d = t.dataset;
    if (d.view) { S.view = d.view; save(); render(); }
    else if (d.sc) { S.scenario = d.sc; editing = null; save(); resetForm(); render(); }
    else if (d.edit) startEdit(d.edit);
    else if (d.open) { S.cid = d.open; S.view = "org"; editing = null; save(); resetForm(); render(); }
    else if (d.delemp) {
      const e = byId(d.delemp), subs = S.employees.filter(x => x.parentId === e.id);
      const msg = subs.length
        ? `Excluir ${e.name}? Os ${subs.length} subordinado(s) direto(s) passarão a responder a ${byId(e.parentId)?.name || "ninguém (topo da estrutura)"}.`
        : `Excluir ${e.name}?`;
      if (!confirm(msg)) return;
      subs.forEach(x => x.parentId = e.parentId || null);
      S.employees = S.employees.filter(x => x.id !== e.id);
      if (editing === e.id) editing = null;
      save(); resetForm(); render(); toast("Colaborador excluído.");
    } else if (d.delco) {
      const c = S.companies.find(x => x.id === d.delco), n = S.employees.filter(x => x.companyId === c.id).length;
      if (!confirm(`Excluir a empresa "${c.name}" e seus ${n} colaborador(es), em todos os cenários? Esta ação não pode ser desfeita.`)) return;
      S.companies = S.companies.filter(x => x.id !== c.id);
      S.employees = S.employees.filter(x => x.companyId !== c.id);
      if (S.cid === c.id) S.cid = S.companies[0]?.id || null;
      editing = null; save(); resetForm(); render(); toast("Empresa excluída.");
    }
  });
  document.addEventListener("keydown", ev => {
    if ((ev.key === "Enter" || ev.key === " ") && ev.target.matches(".node")) { ev.preventDefault(); startEdit(ev.target.dataset.edit); }
  });

  $("#companySel").onchange = e => { S.cid = e.target.value || null; editing = null; save(); resetForm(); render(); };

  $("#coForm").addEventListener("submit", ev => {
    ev.preventDefault();
    const f = ev.target.elements, name = f.nome.value.trim(), segment = f.segmento.value.trim();
    if (!name || !segment) return toast("Informe nome e segmento.");
    if (S.companies.some(c => c.name.toLowerCase() === name.toLowerCase())) return toast("Já existe uma empresa com esse nome.");
    const c = { id: uid(), name, segment }; S.companies.push(c); S.cid = c.id;
    ev.target.reset(); save(); resetForm(); render(); toast("Empresa cadastrada.");
  });

  $("#copyScenario").onclick = () => {
    if (!S.cid) return toast("Selecione uma empresa.");
    const src = emps(S.cid, "asis");
    if (!src.length) return toast("O cenário AS IS está vazio.");
    if (emps(S.cid, "tobe").length && !confirm("O cenário TO BE atual será substituído por uma cópia do AS IS. Continuar?")) return;
    const map = new Map(src.map(e => [e.id, uid()]));
    S.employees = S.employees.filter(e => !(e.companyId === S.cid && e.scenario === "tobe"))
      .concat(src.map(e => ({ ...e, id: map.get(e.id), scenario: "tobe", parentId: e.parentId ? map.get(e.parentId) || null : null })));
    S.scenario = "tobe"; save(); resetForm(); render(); toast("AS IS copiado para TO BE.");
  };

  $("#exportJson").onclick = () => {
    const c = company(); if (!c) return toast("Selecione uma empresa.");
    const pack = sc => emps(c.id, sc).map(e => ({ id: e.id, nome: e.name, cargo: e.role, setor: e.dept, email: e.email, parent_id: e.parentId }));
    const data = { sistema: "PRO7 OrgBuilder", exportado_em: new Date().toISOString(), empresa: { nome: c.name, segmento: c.segment }, cenarios: { AS_IS: pack("asis"), TO_BE: pack("tobe") } };
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    a.download = `organograma-${c.name.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}.json`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast("JSON exportado.");
  };

  /* ---------- Login simples (demonstração) ---------- */
  function gate() {
    let user = null; try { user = localStorage.getItem(SES); } catch (e) { /* ignora */ }
    $("#login").hidden = !!user; $("#app").hidden = !user;
    if (user) { if (!S.view) S.view = "dashboard"; resetForm(); render(); }
  }
  $("#loginForm").addEventListener("submit", ev => {
    ev.preventDefault();
    try { localStorage.setItem(SES, ev.target.elements.user.value.trim()); } catch (e) { /* ignora */ }
    gate();
  });
  $("#logout").onclick = () => { try { localStorage.removeItem(SES); } catch (e) { /* ignora */ } $("#loginForm").reset(); gate(); };

  gate();
})();
