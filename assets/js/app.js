(function () {
  const api = window.sunoApi;
  const cfg = window.SUNO_CONFIG;

  const state = {
    user: null,
    suppliers: [],
    processes: [],
    shipments: [],
    payments: [],
    finimp: [],
    dashboard: null,
    view: 'dashboard'
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[ch]));
  const n = (value) => value === '' || value == null ? 0 : Number(value) || 0;
  const formatMoney = (value, currency = 'BRL') => value === '' || value == null ? '—' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency, maximumFractionDigits: 2 }).format(n(value));
  const formatNumber = (value) => value === '' || value == null ? '—' : new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(n(value));
  const dateOnly = (value) => value ? String(value).slice(0, 10) : '';
  const formatDate = (value) => {
    const d = dateOnly(value); if (!d) return '—';
    const [y,m,day] = d.split('-'); return `${day}/${m}/${y}`;
  };
  const daysFromToday = (value) => {
    const d = dateOnly(value); if (!d) return 99999;
    const t = new Date(); t.setHours(0,0,0,0);
    return Math.ceil((new Date(`${d}T00:00:00`) - t) / 86400000);
  };
  const processById = (id) => state.processes.find(x => x.id_processo === id);
  const shipmentById = (id) => state.shipments.find(x => x.id_embarque === id);
  const finimpById = (id) => state.finimp.find(x => x.id_finimp === id);

  const els = {
    loginView: $('#loginView'), appView: $('#appView'), loginForm: $('#loginForm'), loginInput: $('#loginInput'), passwordInput: $('#passwordInput'),
    loginMessage: $('#loginMessage'), loginButton: $('#loginButton'), demoHint: $('#demoHint'), togglePassword: $('#togglePassword'),
    sidebar: $('#sidebar'), mainContent: $('#mainContent'), pageTitle: $('#pageTitle'), pageEyebrow: $('#pageEyebrow'), userChip: $('#userChip'), sessionBadge: $('#sessionBadge'),
    logoutButton: $('#logoutButton'), refreshButton: $('#refreshButton'), mobileMenuButton: $('#mobileMenuButton'),
    modalBackdrop: $('#modalBackdrop'), modal: $('#modal'), modalTitle: $('#modalTitle'), modalEyebrow: $('#modalEyebrow'), modalBody: $('#modalBody'), modalClose: $('#modalClose'),
    toastContainer: $('#toastContainer'), loadingOverlay: $('#loadingOverlay')
  };

  function setLoading(on) { els.loadingOverlay.classList.toggle('hidden', !on); }
  function toast(message, type = '') {
    const el = document.createElement('div'); el.className = `toast ${type}`; el.textContent = message; els.toastContainer.appendChild(el);
    setTimeout(() => el.remove(), 3600);
  }
  function badge(status) {
    const s = String(status || '—');
    let cls = 'badge-neutral';
    if (['Pago','Recebido','Concluído','Fechado','Ativo','SIM'].includes(s)) cls = 'badge-success';
    else if (['Em andamento','Em trânsito','Embarcado','Em aberto','Nacionalização'].includes(s)) cls = 'badge-info';
    else if (['Previsto','Programado','Aguardando embarque','Embarque parcial','Recebimento parcial'].includes(s)) cls = 'badge-warning';
    else if (['Vencido','Cancelado','NÃO','Inativo'].includes(s)) cls = 'badge-danger';
    return `<span class="badge ${cls}">${escapeHtml(s)}</span>`;
  }
  function optionList(values, selected) {
    return values.map(v => `<option value="${escapeHtml(v)}" ${String(v) === String(selected ?? '') ? 'selected' : ''}>${escapeHtml(v)}</option>`).join('');
  }
  function processOptions(selected, allowEmpty = false) {
    return `${allowEmpty ? '<option value="">— Nenhum —</option>' : '<option value="">Selecione...</option>'}${state.processes.map(p => `<option value="${escapeHtml(p.id_processo)}" ${p.id_processo === selected ? 'selected' : ''}>${escapeHtml(p.nome_processo)}${p.codigo_processo ? ` • ${escapeHtml(p.codigo_processo)}` : ''}</option>`).join('')}`;
  }
  function supplierOptions(selected) {
    return `<option value="">Selecione...</option>${state.suppliers.filter(x => x.ativo !== 'NÃO').map(s => `<option value="${escapeHtml(s.nome)}" ${s.nome === selected ? 'selected' : ''}>${escapeHtml(s.nome)}</option>`).join('')}`;
  }
  function shipmentOptions(processId, selected) {
    const rows = state.shipments.filter(x => x.id_processo === processId);
    return `<option value="">— Processo inteiro —</option>${rows.map(s => `<option value="${s.id_embarque}" ${s.id_embarque === selected ? 'selected' : ''}>Embarque ${escapeHtml(s.sequencia)} • ${escapeHtml(s.status)}</option>`).join('')}`;
  }
  function finimpOptions(processId, selected) {
    const rows = state.finimp.filter(x => x.id_processo === processId);
    return `<option value="">— Não associado —</option>${rows.map(f => `<option value="${f.id_finimp}" ${f.id_finimp === selected ? 'selected' : ''}>${escapeHtml(f.banco)} • ${escapeHtml(f.numero_contrato || f.id_finimp)}</option>`).join('')}`;
  }

  function openModal(title, eyebrow, body, wide = false) {
    els.modalTitle.textContent = title;
    els.modalEyebrow.textContent = eyebrow || '';
    els.modalBody.innerHTML = body;
    els.modal.classList.toggle('modal-wide', wide);
    els.modalBackdrop.classList.remove('hidden');
    els.modalBackdrop.setAttribute('aria-hidden', 'false');
  }
  function closeModal() {
    els.modalBackdrop.classList.add('hidden');
    els.modalBackdrop.setAttribute('aria-hidden', 'true');
    els.modalBody.innerHTML = '';
    els.modal.classList.remove('modal-wide');
  }

  async function bootstrap() {
    setLoading(true);
    try {
      const data = await api.request('app.bootstrap');
      state.user = data.user;
      state.suppliers = data.suppliers || [];
      state.processes = data.processes || [];
      state.dashboard = data.dashboard || null;
      els.userChip.textContent = state.user?.nome || state.user?.login || 'Usuário';
      const session = api.getSession();
      els.sessionBadge.textContent = session?.expires_at ? `Sessão até ${new Date(session.expires_at).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}` : (cfg.DEMO_MODE ? 'Modo demonstração' : 'Sessão autenticada');
      els.loginView.classList.add('hidden'); els.appView.classList.remove('hidden');
      await renderView(state.view);
    } finally { setLoading(false); }
  }

  async function refreshBootstrap() {
    const data = await api.request('app.bootstrap');
    state.user = data.user; state.suppliers = data.suppliers || []; state.processes = data.processes || []; state.dashboard = data.dashboard || null;
  }

  function pageMeta(title, eyebrow) { els.pageTitle.textContent = title; els.pageEyebrow.textContent = eyebrow; }
  function setActiveNav(view) { $$('.nav-item').forEach(x => x.classList.toggle('active', x.dataset.view === view)); }

  async function renderView(view) {
    state.view = view; setActiveNav(view); els.sidebar.classList.remove('open');
    if (view === 'dashboard') return renderDashboard();
    if (view === 'processes') return renderProcesses();
    if (view === 'shipments') return renderShipments();
    if (view === 'payments') return renderPayments();
    if (view === 'finimp') return renderFinimp();
    if (view === 'suppliers') return renderSuppliers();
  }

  async function renderDashboard() {
    pageMeta('Dashboard', 'VISÃO GERAL');
    state.dashboard = await api.request('dashboard.get');
    const d = state.dashboard;
    const m = d.metrics || {};
    const upcomingPay = d.proximos_pagamentos || [];
    const upcomingShips = d.proximos_embarques || [];
    const openFin = d.finimp_vencimentos || [];
    els.mainContent.innerHTML = `
      <section class="kpi-grid">
        <div class="kpi-card"><div class="kpi-label">Processos ativos</div><div class="kpi-value">${m.processos_ativos || 0}</div><div class="kpi-note">Em andamento</div></div>
        <div class="kpi-card"><div class="kpi-label">Embarques em trânsito</div><div class="kpi-value">${m.embarques_em_transito || 0}</div><div class="kpi-note">Acompanhamento logístico</div></div>
        <div class="kpi-card"><div class="kpi-label">Pagamentos próximos 7 dias</div><div class="kpi-value">${m.pagamentos_7_dias || 0}</div><div class="kpi-note ${m.pagamentos_vencidos ? 'danger' : ''}">${m.pagamentos_vencidos || 0} vencido(s)</div></div>
        <div class="kpi-card"><div class="kpi-label">Previsto próximos 30 dias</div><div class="kpi-value" style="font-size:22px">${formatMoney(m.pagamentos_30_dias_valor || 0)}</div><div class="kpi-note">${m.finimp_abertos || 0} FINIMP em aberto</div></div>
      </section>
      <section class="grid-2">
        <div>
          <article class="panel">
            <header class="panel-header"><div><h3 class="panel-title">Próximos pagamentos</h3><p class="panel-subtitle">Eventos financeiros previstos e ainda não liquidados.</p></div><button class="button button-secondary" data-go="payments">Ver todos</button></header>
            <div class="panel-body">${renderPaymentList(upcomingPay)}</div>
          </article>
          <article class="panel">
            <header class="panel-header"><div><h3 class="panel-title">Próximos embarques</h3><p class="panel-subtitle">Programações e embarques ainda em andamento.</p></div><button class="button button-secondary" data-go="shipments">Ver todos</button></header>
            <div class="panel-body">${renderShipmentList(upcomingShips)}</div>
          </article>
        </div>
        <article class="panel">
          <header class="panel-header"><div><h3 class="panel-title">FINIMP</h3><p class="panel-subtitle">Operações abertas por vencimento.</p></div><button class="button button-secondary" data-go="finimp">Ver todos</button></header>
          <div class="panel-body">${renderFinimpList(openFin)}</div>
        </article>
      </section>`;
    $$('[data-go]', els.mainContent).forEach(b => b.addEventListener('click', () => renderView(b.dataset.go)));
  }

  function renderPaymentList(rows) {
    if (!rows.length) return '<div class="empty-state"><strong>Nenhum pagamento pendente.</strong>Os próximos eventos aparecerão aqui.</div>';
    return `<div class="list">${rows.map(x => { const p = processById(x.id_processo); const late = daysFromToday(x.data_prevista) < 0; return `<div class="list-item"><div><div class="list-primary">${escapeHtml(x.descricao || x.categoria)}</div><div class="list-secondary">${escapeHtml(p?.fornecedor || '')} • ${escapeHtml(p?.nome_processo || x.id_processo)} • ${formatDate(x.data_prevista)} ${late ? '• Vencido' : ''}</div></div><div class="list-value">${formatMoney(x.valor_brl || 0)}</div></div>`; }).join('')}</div>`;
  }
  function renderShipmentList(rows) {
    if (!rows.length) return '<div class="empty-state"><strong>Nenhum embarque pendente.</strong>As próximas programações aparecerão aqui.</div>';
    return `<div class="list">${rows.map(x => { const p = processById(x.id_processo); return `<div class="list-item"><div><div class="list-primary">Embarque ${escapeHtml(x.sequencia)} • ${escapeHtml(p?.fornecedor || '')}</div><div class="list-secondary">${escapeHtml(p?.nome_processo || x.id_processo)} • ${x.data_embarque ? `Embarcado ${formatDate(x.data_embarque)}` : `Previsto ${formatDate(x.data_prevista_embarque)}`} • ETA ${formatDate(x.eta)}</div></div><div>${badge(x.status)}</div></div>`; }).join('')}</div>`;
  }
  function renderFinimpList(rows) {
    if (!rows.length) return '<div class="empty-state"><strong>Nenhum FINIMP em aberto.</strong>Operações associadas a processos aparecerão aqui.</div>';
    return `<div class="list">${rows.map(x => { const p = processById(x.id_processo); return `<div class="list-item"><div><div class="list-primary">${escapeHtml(x.banco)} • ${escapeHtml(x.numero_contrato || x.id_finimp)}</div><div class="list-secondary">${escapeHtml(p?.nome_processo || '')}<br>Vencimento ${formatDate(x.vencimento)}</div></div><div class="list-value">${formatMoney(x.valor_brl || 0)}</div></div>`; }).join('')}</div>`;
  }

  async function renderProcesses() {
    pageMeta('Processos', 'GESTÃO DE IMPORTAÇÕES');
    state.processes = await api.request('process.list');
    els.mainContent.innerHTML = `
      <div class="toolbar"><input id="processSearch" class="search" placeholder="Buscar processo, fornecedor ou código..."><select id="processStatus" class="filter-select"><option value="">Todos os status</option>${optionList(['Em andamento','Concluído','Suspenso','Cancelado'])}</select><button id="newProcess" class="button button-primary">Novo processo</button></div>
      <div id="processCards"></div>`;
    const draw = () => {
      const q = $('#processSearch').value.trim().toLowerCase(), status = $('#processStatus').value;
      const rows = state.processes.filter(p => (!status || p.status === status) && (!q || [p.nome_processo,p.fornecedor,p.codigo_processo,p.responsavel].some(v => String(v||'').toLowerCase().includes(q))));
      $('#processCards').innerHTML = rows.length ? `<div class="process-card-grid">${rows.map(p => `<article class="process-card" data-process-id="${p.id_processo}"><div class="process-card-top"><span class="eyebrow">${escapeHtml(p.fornecedor || 'SEM FORNECEDOR')}</span>${badge(p.status)}</div><h3>${escapeHtml(p.nome_processo)}</h3><p>${escapeHtml(p.codigo_processo || 'Sem código')}</p><div class="process-meta"><div><span>Etapa</span><strong>${escapeHtml(p.etapa || '—')}</strong></div><div><span>Quantidade</span><strong>${formatNumber(p.quantidade_total)}</strong></div><div><span>Embarques</span><strong>${escapeHtml(p.qtd_embarques_previstos || 0)} previsto(s)</strong></div><div><span>Responsável</span><strong>${escapeHtml(p.responsavel || '—')}</strong></div></div></article>`).join('')}</div>` : '<div class="panel"><div class="empty-state"><strong>Nenhum processo encontrado.</strong>Ajuste os filtros ou cadastre um novo processo.</div></div>';
      $$('[data-process-id]', $('#processCards')).forEach(card => card.addEventListener('click', () => openProcessDetail(card.dataset.processId)));
    };
    $('#processSearch').addEventListener('input', draw); $('#processStatus').addEventListener('change', draw); $('#newProcess').addEventListener('click', () => openProcessForm()); draw();
  }

  async function renderShipments() {
    pageMeta('Embarques', 'CONTROLE LOGÍSTICO');
    state.shipments = await api.request('shipment.list');
    els.mainContent.innerHTML = `
      <div class="toolbar"><input id="shipmentSearch" class="search" placeholder="Buscar processo, BL ou container..."><select id="shipmentStatus" class="filter-select"><option value="">Todos os status</option>${optionList(['Programado','Embarcado','Em trânsito','Chegou','Nacionalização','Liberado','Recebido','Cancelado'])}</select><button id="newShipment" class="button button-primary">Novo embarque</button></div>
      <article class="panel"><div id="shipmentTable" class="panel-body flush"></div></article>`;
    const draw = () => {
      const q = $('#shipmentSearch').value.trim().toLowerCase(), status = $('#shipmentStatus').value;
      const rows = state.shipments.filter(s => { const p = processById(s.id_processo); return (!status || s.status === status) && (!q || [p?.nome_processo,p?.fornecedor,p?.codigo_processo,s.bl,s.container].some(v => String(v||'').toLowerCase().includes(q))); });
      $('#shipmentTable').innerHTML = rows.length ? `<div class="table-wrap"><table><thead><tr><th>Processo</th><th>Embarque</th><th>Status</th><th>Qtd.</th><th>Data embarque</th><th>ETA</th><th>BL</th><th></th></tr></thead><tbody>${rows.map(s => { const p = processById(s.id_processo); return `<tr><td><strong>${escapeHtml(p?.nome_processo || s.id_processo)}</strong><br><span class="text-muted">${escapeHtml(p?.fornecedor || '')}</span></td><td>${escapeHtml(s.sequencia)}</td><td>${badge(s.status)}</td><td>${formatNumber(s.quantidade)}</td><td>${formatDate(s.data_embarque || s.data_prevista_embarque)}</td><td>${formatDate(s.eta)}</td><td>${escapeHtml(s.bl || '—')}</td><td><button class="button button-secondary" data-edit-shipment="${s.id_embarque}">Editar</button></td></tr>`; }).join('')}</tbody></table></div>` : '<div class="empty-state"><strong>Nenhum embarque encontrado.</strong></div>';
      $$('[data-edit-shipment]').forEach(b => b.addEventListener('click', () => openShipmentForm(state.shipments.find(x => x.id_embarque === b.dataset.editShipment))));
    };
    $('#shipmentSearch').addEventListener('input', draw); $('#shipmentStatus').addEventListener('change', draw); $('#newShipment').addEventListener('click', () => openShipmentForm()); draw();
  }

  async function renderPayments() {
    pageMeta('Pagamentos', 'EVENTOS FINANCEIROS');
    state.payments = await api.request('payment.list');
    if (!state.shipments.length) state.shipments = await api.request('shipment.list');
    if (!state.finimp.length) state.finimp = await api.request('finimp.list');
    els.mainContent.innerHTML = `
      <div class="toolbar"><input id="paymentSearch" class="search" placeholder="Buscar processo, descrição ou documento..."><select id="paymentStatus" class="filter-select"><option value="">Todos os status</option>${optionList(['Previsto','Pago','Vencido','Cancelado'])}</select><button id="newPayment" class="button button-primary">Novo pagamento</button></div>
      <article class="panel"><div id="paymentTable" class="panel-body flush"></div></article>`;
    const draw = () => {
      const q = $('#paymentSearch').value.trim().toLowerCase(), status = $('#paymentStatus').value;
      const rows = [...state.payments].sort((a,b) => (b.data_realizada || b.data_prevista || '').localeCompare(a.data_realizada || a.data_prevista || '')).filter(e => { const p = processById(e.id_processo); const effectiveStatus = e.status === 'Previsto' && daysFromToday(e.data_prevista) < 0 ? 'Vencido' : e.status; return (!status || effectiveStatus === status) && (!q || [p?.nome_processo,p?.fornecedor,e.descricao,e.categoria,e.documento].some(v => String(v||'').toLowerCase().includes(q))); });
      $('#paymentTable').innerHTML = rows.length ? `<div class="table-wrap"><table><thead><tr><th>Data</th><th>Processo</th><th>Evento</th><th>Status</th><th class="text-right">Valor R$</th><th class="text-right">Valor US$</th><th></th></tr></thead><tbody>${rows.map(e => { const p = processById(e.id_processo); const effectiveStatus = e.status === 'Previsto' && daysFromToday(e.data_prevista) < 0 ? 'Vencido' : e.status; return `<tr><td class="nowrap">${formatDate(e.data_realizada || e.data_prevista)}</td><td><strong>${escapeHtml(p?.nome_processo || e.id_processo)}</strong><br><span class="text-muted">${escapeHtml(p?.fornecedor || '')}</span></td><td><strong>${escapeHtml(e.descricao || e.categoria)}</strong><br><span class="text-muted">${escapeHtml(e.categoria || '')}${e.id_embarque ? ` • Emb. ${escapeHtml(shipmentById(e.id_embarque)?.sequencia || '')}` : ''}${e.id_finimp ? ' • FINIMP' : ''}</span></td><td>${badge(effectiveStatus)}</td><td class="text-right nowrap">${formatMoney(e.valor_brl || 0)}</td><td class="text-right nowrap">${e.valor_usd ? formatMoney(e.valor_usd,'USD') : '—'}</td><td><button class="button button-secondary" data-edit-payment="${e.id_evento}">Editar</button></td></tr>`; }).join('')}</tbody></table></div>` : '<div class="empty-state"><strong>Nenhum pagamento encontrado.</strong></div>';
      $$('[data-edit-payment]').forEach(b => b.addEventListener('click', () => openPaymentForm(state.payments.find(x => x.id_evento === b.dataset.editPayment))));
    };
    $('#paymentSearch').addEventListener('input', draw); $('#paymentStatus').addEventListener('change', draw); $('#newPayment').addEventListener('click', () => openPaymentForm()); draw();
  }

  async function renderFinimp() {
    pageMeta('FINIMP', 'FINANCIAMENTO À IMPORTAÇÃO');
    state.finimp = await api.request('finimp.list');
    els.mainContent.innerHTML = `
      <div class="toolbar"><input id="finimpSearch" class="search" placeholder="Buscar banco, contrato ou processo..."><select id="finimpStatus" class="filter-select"><option value="">Todos os status</option>${optionList(['Em aberto','Liquidado','Cancelado'])}</select><button id="newFinimp" class="button button-primary">Novo FINIMP</button></div>
      <article class="panel"><div id="finimpTable" class="panel-body flush"></div></article>`;
    const draw = () => {
      const q = $('#finimpSearch').value.trim().toLowerCase(), status = $('#finimpStatus').value;
      const rows = state.finimp.filter(f => { const p = processById(f.id_processo); return (!status || f.status === status) && (!q || [f.banco,f.numero_contrato,p?.nome_processo,p?.fornecedor].some(v => String(v||'').toLowerCase().includes(q))); });
      $('#finimpTable').innerHTML = rows.length ? `<div class="table-wrap"><table><thead><tr><th>Processo associado</th><th>Banco / Contrato</th><th>Contratação</th><th>Vencimento</th><th>Status</th><th class="text-right">USD</th><th class="text-right">BRL</th><th></th></tr></thead><tbody>${rows.map(f => { const p = processById(f.id_processo); return `<tr><td><strong>${escapeHtml(p?.nome_processo || f.id_processo)}</strong><br><span class="text-muted">${escapeHtml(p?.fornecedor || '')}</span></td><td><strong>${escapeHtml(f.banco)}</strong><br><span class="text-muted">${escapeHtml(f.numero_contrato || 'Sem nº de contrato')}</span></td><td>${formatDate(f.data_contratacao)}</td><td>${formatDate(f.vencimento)}</td><td>${badge(f.status)}</td><td class="text-right nowrap">${f.valor_usd ? formatMoney(f.valor_usd,'USD') : '—'}</td><td class="text-right nowrap">${formatMoney(f.valor_brl || 0)}</td><td><button class="button button-secondary" data-edit-finimp="${f.id_finimp}">Editar</button></td></tr>`; }).join('')}</tbody></table></div>` : '<div class="empty-state"><strong>Nenhum FINIMP encontrado.</strong>Cadastre a operação e associe-a ao processo de importação.</div>';
      $$('[data-edit-finimp]').forEach(b => b.addEventListener('click', () => openFinimpForm(state.finimp.find(x => x.id_finimp === b.dataset.editFinimp))));
    };
    $('#finimpSearch').addEventListener('input', draw); $('#finimpStatus').addEventListener('change', draw); $('#newFinimp').addEventListener('click', () => openFinimpForm()); draw();
  }

  async function renderSuppliers() {
    pageMeta('Fornecedores', 'CADASTROS');
    state.suppliers = await api.request('supplier.list');
    els.mainContent.innerHTML = `<div class="toolbar"><input id="supplierSearch" class="search" placeholder="Buscar fornecedor..."><button id="newSupplier" class="button button-primary">Novo fornecedor</button></div><article class="panel"><div id="supplierTable" class="panel-body flush"></div></article>`;
    const draw = () => {
      const q = $('#supplierSearch').value.trim().toLowerCase(); const rows = state.suppliers.filter(s => !q || String(s.nome).toLowerCase().includes(q));
      $('#supplierTable').innerHTML = `<div class="table-wrap"><table><thead><tr><th>Fornecedor</th><th>Status</th><th>Observações</th><th></th></tr></thead><tbody>${rows.map(s => `<tr><td><strong>${escapeHtml(s.nome)}</strong></td><td>${badge(s.ativo === 'NÃO' ? 'Inativo' : 'Ativo')}</td><td>${escapeHtml(s.observacoes || '—')}</td><td><button class="button button-secondary" data-edit-supplier="${s.id_fornecedor}">Editar</button></td></tr>`).join('')}</tbody></table></div>`;
      $$('[data-edit-supplier]').forEach(b => b.addEventListener('click', () => openSupplierForm(state.suppliers.find(x => x.id_fornecedor === b.dataset.editSupplier))));
    };
    $('#supplierSearch').addEventListener('input', draw); $('#newSupplier').addEventListener('click', () => openSupplierForm()); draw();
  }

  async function openProcessDetail(id) {
    setLoading(true);
    try {
      const d = await api.request('process.get', { id_processo: id });
      state.shipments = mergeById(state.shipments, d.shipments || [], 'id_embarque');
      state.payments = mergeById(state.payments, d.payments || [], 'id_evento');
      state.finimp = mergeById(state.finimp, d.finimp || [], 'id_finimp');
      const p = d.process;
      const body = `
        <div class="detail-header"><div><span class="eyebrow">${escapeHtml(p.fornecedor || '')}</span><h3>${escapeHtml(p.nome_processo)}</h3><p>${escapeHtml(p.codigo_processo || 'Sem código')} • ${escapeHtml(p.responsavel || 'Sem responsável')}</p></div><div>${badge(p.status)}</div></div>
        <div class="detail-metrics"><div class="detail-metric"><span>Etapa</span><strong>${escapeHtml(p.etapa || '—')}</strong></div><div class="detail-metric"><span>Quantidade</span><strong>${formatNumber(p.quantidade_total)}</strong></div><div class="detail-metric"><span>Embarques</span><strong>${d.shipments.length} / ${escapeHtml(p.qtd_embarques_previstos || 0)}</strong></div><div class="detail-metric"><span>Compra</span><strong>${p.moeda === 'USD' ? formatMoney(p.valor_compra_usd || 0,'USD') : formatMoney(p.valor_compra_brl || 0)}</strong></div></div>
        <div class="tabs"><button class="tab-button active" data-tab="overview">Visão geral</button><button class="tab-button" data-tab="shipments">Embarques</button><button class="tab-button" data-tab="payments">Financeiro</button><button class="tab-button" data-tab="finimp">FINIMP</button><button class="tab-button" data-tab="history">Histórico</button></div>
        <div id="detailTab"></div>
        <div class="form-actions"><button class="button button-secondary" id="detailEditProcess">Editar processo</button><button class="button button-primary" id="detailNewPayment">Novo pagamento</button></div>`;
      openModal('Detalhes do processo', 'PROCESSO', body, true);
      const renderTab = (tab) => {
        const target = $('#detailTab');
        if (tab === 'overview') target.innerHTML = `<div class="grid-2"><div class="panel"><div class="panel-header"><div><h3 class="panel-title">Situação dos embarques</h3><p class="panel-subtitle">A etapa do processo é atualizada pelos embarques.</p></div></div><div class="panel-body">${processTimeline(d.shipments)}</div></div><div class="panel"><div class="panel-header"><div><h3 class="panel-title">Observações</h3></div></div><div class="panel-body"><p style="margin:0;line-height:1.6;color:#475569">${escapeHtml(p.observacoes || 'Sem observações.')}</p></div></div></div>`;
        if (tab === 'shipments') target.innerHTML = d.shipments.length ? `<div class="table-wrap"><table><thead><tr><th>Seq.</th><th>Status</th><th>Quantidade</th><th>Embarque</th><th>ETA</th><th>BL</th></tr></thead><tbody>${d.shipments.map(s => `<tr><td>${escapeHtml(s.sequencia)}</td><td>${badge(s.status)}</td><td>${formatNumber(s.quantidade)}</td><td>${formatDate(s.data_embarque || s.data_prevista_embarque)}</td><td>${formatDate(s.eta)}</td><td>${escapeHtml(s.bl || '—')}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty-state"><strong>Nenhum embarque cadastrado.</strong></div>';
        if (tab === 'payments') target.innerHTML = d.payments.length ? `<div class="table-wrap"><table><thead><tr><th>Data</th><th>Evento</th><th>Status</th><th class="text-right">Valor R$</th></tr></thead><tbody>${d.payments.map(e => `<tr><td>${formatDate(e.data_realizada || e.data_prevista)}</td><td><strong>${escapeHtml(e.descricao || e.categoria)}</strong><br><span class="text-muted">${escapeHtml(e.categoria || '')}</span></td><td>${badge(e.status === 'Previsto' && daysFromToday(e.data_prevista) < 0 ? 'Vencido' : e.status)}</td><td class="text-right">${formatMoney(e.valor_brl || 0)}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty-state"><strong>Nenhum evento financeiro cadastrado.</strong></div>';
        if (tab === 'finimp') target.innerHTML = d.finimp.length ? `<div class="list">${d.finimp.map(f => `<div class="list-item"><div><div class="list-primary">${escapeHtml(f.banco)} • ${escapeHtml(f.numero_contrato || f.id_finimp)}</div><div class="list-secondary">Contratação ${formatDate(f.data_contratacao)} • Vencimento ${formatDate(f.vencimento)} • ${formatMoney(f.valor_usd || 0,'USD')}</div></div><div>${badge(f.status)}</div></div>`).join('')}</div>` : '<div class="empty-state"><strong>Nenhum FINIMP associado.</strong>Cadastre uma operação e selecione este processo.</div>';
        if (tab === 'history') target.innerHTML = d.logs?.length ? `<div class="list">${d.logs.map(l => `<div class="list-item"><div><div class="list-primary">${escapeHtml(l.acao)} • ${escapeHtml(l.entidade)}</div><div class="list-secondary">${new Date(l.data_hora).toLocaleString('pt-BR')} • ${escapeHtml(l.login || '')}<br>${escapeHtml(l.detalhes || '')}</div></div></div>`).join('')}</div>` : '<div class="empty-state"><strong>Sem alterações registradas para este processo.</strong></div>';
      };
      $$('.tab-button', els.modalBody).forEach(b => b.addEventListener('click', () => { $$('.tab-button', els.modalBody).forEach(x => x.classList.remove('active')); b.classList.add('active'); renderTab(b.dataset.tab); }));
      $('#detailEditProcess').addEventListener('click', () => { closeModal(); openProcessForm(p); });
      $('#detailNewPayment').addEventListener('click', async () => { closeModal(); if (!state.shipments.some(s => s.id_processo === p.id_processo)) state.shipments = await api.request('shipment.list'); if (!state.finimp.some(f => f.id_processo === p.id_processo)) state.finimp = await api.request('finimp.list'); openPaymentForm({ id_processo: p.id_processo }); });
      renderTab('overview');
    } catch (e) { toast(e.message, 'error'); } finally { setLoading(false); }
  }

  function processTimeline(ships) {
    if (!ships.length) return '<div class="empty-state"><strong>Sem embarques cadastrados.</strong>A etapa poderá ser controlada manualmente até o primeiro embarque.</div>';
    const sorted = [...ships].sort((a,b) => n(a.sequencia)-n(b.sequencia));
    return `<div class="timeline">${sorted.map(s => { const done = s.status === 'Recebido'; const current = !done && s.status !== 'Programado'; return `<div class="timeline-item ${done ? 'done' : current ? 'current' : ''}"><div class="timeline-line"><div class="timeline-dot"></div><div class="timeline-stem"></div></div><div class="timeline-content"><strong>Embarque ${escapeHtml(s.sequencia)} — ${escapeHtml(s.status)}</strong><p>${s.data_embarque ? `Embarcado em ${formatDate(s.data_embarque)}` : `Previsto para ${formatDate(s.data_prevista_embarque)}`} • ETA ${formatDate(s.eta)}${s.quantidade ? ` • ${formatNumber(s.quantidade)} un.` : ''}</p></div></div>`; }).join('')}</div>`;
  }

  function mergeById(base, incoming, key) { const map = new Map(base.map(x => [x[key], x])); incoming.forEach(x => map.set(x[key], x)); return [...map.values()]; }

  function openProcessForm(record = {}) {
    const edit = !!record.id_processo;
    openModal(edit ? 'Editar processo' : 'Novo processo', 'PROCESSO', `<form id="processForm"><div class="form-grid">
      <label class="field span-2"><span>Nome do processo *</span><input name="nome_processo" required value="${escapeHtml(record.nome_processo || '')}" placeholder="Ex.: 2026-09 Módulos 630W"></label>
      <label class="field"><span>Fornecedor *</span><select name="fornecedor" required>${supplierOptions(record.fornecedor)}</select></label>
      <label class="field"><span>Código do processo</span><input name="codigo_processo" value="${escapeHtml(record.codigo_processo || '')}"></label>
      <label class="field"><span>Quantidade total</span><input name="quantidade_total" type="number" step="0.01" value="${escapeHtml(record.quantidade_total || '')}"></label>
      <label class="field"><span>Embarques previstos</span><input name="qtd_embarques_previstos" type="number" min="0" step="1" value="${escapeHtml(record.qtd_embarques_previstos ?? 1)}"></label>
      <label class="field"><span>Moeda</span><select name="moeda">${optionList(['USD','BRL'], record.moeda || 'USD')}</select></label>
      <label class="field"><span>Valor compra USD</span><input name="valor_compra_usd" type="number" step="0.01" value="${escapeHtml(record.valor_compra_usd || '')}"></label>
      <label class="field"><span>Valor compra BRL</span><input name="valor_compra_brl" type="number" step="0.01" value="${escapeHtml(record.valor_compra_brl || '')}"></label>
      <label class="field"><span>Status</span><select name="status">${optionList(['Em andamento','Concluído','Suspenso','Cancelado'], record.status || 'Em andamento')}</select></label>
      <label class="field"><span>Etapa inicial/manual</span><select name="etapa">${optionList(['Planejamento','Pedido confirmado','Produção','Aguardando embarque','Embarque parcial','Em trânsito','Chegada parcial','Nacionalização','Recebimento parcial','Recebido','Conferência / fechamento','Fechado'], record.etapa || 'Planejamento')}</select></label>
      <label class="field"><span>Responsável</span><input name="responsavel" value="${escapeHtml(record.responsavel || state.user?.nome || '')}"></label>
      <label class="field span-2"><span>Observações</span><textarea name="observacoes">${escapeHtml(record.observacoes || '')}</textarea></label>
    </div><div class="form-actions"><button type="button" class="button button-secondary" data-close>Cancelar</button><button class="button button-primary" type="submit">${edit ? 'Salvar alterações' : 'Criar processo'}</button></div></form>`);
    $('[data-close]', els.modalBody).addEventListener('click', closeModal);
    $('#processForm').addEventListener('submit', async e => {
      e.preventDefault(); const data = formObject(e.currentTarget, ['quantidade_total','qtd_embarques_previstos','valor_compra_usd','valor_compra_brl']); if (edit) data.id_processo = record.id_processo;
      await saveAndRefresh(edit ? 'process.update' : 'process.create', data, 'Processo salvo com sucesso.');
    });
  }

  function openShipmentForm(record = {}) {
    const edit = !!record.id_embarque; const currentProcess = record.id_processo || '';
    openModal(edit ? 'Editar embarque' : 'Novo embarque', 'EMBARQUE', `<form id="shipmentForm"><div class="form-grid">
      <label class="field span-2"><span>Processo *</span><select name="id_processo" required>${processOptions(currentProcess)}</select></label>
      <label class="field"><span>Sequência *</span><input name="sequencia" type="number" min="1" required value="${escapeHtml(record.sequencia || '')}" placeholder="1, 2, 3..."></label>
      <label class="field"><span>Quantidade</span><input name="quantidade" type="number" step="0.01" value="${escapeHtml(record.quantidade || '')}"></label>
      <label class="field"><span>Status</span><select name="status">${optionList(['Programado','Embarcado','Em trânsito','Chegou','Nacionalização','Liberado','Recebido','Cancelado'], record.status || 'Programado')}</select></label>
      <label class="field"><span>Previsão de embarque</span><input name="data_prevista_embarque" type="date" value="${dateOnly(record.data_prevista_embarque)}"></label>
      <label class="field"><span>Data de embarque</span><input name="data_embarque" type="date" value="${dateOnly(record.data_embarque)}"></label>
      <label class="field"><span>ETA / previsão chegada</span><input name="eta" type="date" value="${dateOnly(record.eta)}"></label>
      <label class="field"><span>Data chegada</span><input name="data_chegada" type="date" value="${dateOnly(record.data_chegada)}"></label>
      <label class="field"><span>Nacionalização</span><input name="data_nacionalizacao" type="date" value="${dateOnly(record.data_nacionalizacao)}"></label>
      <label class="field"><span>Liberação</span><input name="data_liberacao" type="date" value="${dateOnly(record.data_liberacao)}"></label>
      <label class="field"><span>Recebimento</span><input name="data_recebimento" type="date" value="${dateOnly(record.data_recebimento)}"></label>
      <label class="field"><span>BL</span><input name="bl" value="${escapeHtml(record.bl || '')}"></label>
      <label class="field"><span>Container(es)</span><input name="container" value="${escapeHtml(record.container || '')}"></label>
      <label class="field span-2"><span>Observações</span><textarea name="observacoes">${escapeHtml(record.observacoes || '')}</textarea></label>
    </div><div class="form-actions"><button type="button" class="button button-secondary" data-close>Cancelar</button><button class="button button-primary" type="submit">${edit ? 'Salvar alterações' : 'Criar embarque'}</button></div></form>`);
    $('[data-close]', els.modalBody).addEventListener('click', closeModal);
    $('#shipmentForm').addEventListener('submit', async e => { e.preventDefault(); const data = formObject(e.currentTarget, ['sequencia','quantidade']); if (edit) data.id_embarque = record.id_embarque; await saveAndRefresh(edit ? 'shipment.update' : 'shipment.create', data, 'Embarque salvo com sucesso.'); });
  }

  function openPaymentForm(record = {}) {
    const edit = !!record.id_evento;
    const renderForm = (processId) => `<form id="paymentForm"><div class="form-grid">
      <label class="field span-2"><span>Processo *</span><select id="paymentProcess" name="id_processo" required>${processOptions(processId)}</select></label>
      <label class="field"><span>Embarque associado</span><select id="paymentShipment" name="id_embarque">${shipmentOptions(processId, record.id_embarque)}</select></label>
      <label class="field"><span>FINIMP associado</span><select id="paymentFinimp" name="id_finimp">${finimpOptions(processId, record.id_finimp)}</select></label>
      <label class="field"><span>Categoria</span><select name="categoria">${optionList(['Parcela','Nacionalização','Frete','AFRMM','INMETRO','IOF','FINIMP','Juros','IR','Tarifa','Nota Fiscal','Variação cambial','SISCOMEX','Despachante','Outros'], record.categoria || 'Outros')}</select></label>
      <label class="field"><span>Status</span><select name="status">${optionList(['Previsto','Pago','Cancelado'], record.status || 'Previsto')}</select></label>
      <label class="field span-2"><span>Descrição *</span><input name="descricao" required value="${escapeHtml(record.descricao || '')}"></label>
      <label class="field"><span>Data prevista</span><input name="data_prevista" type="date" value="${dateOnly(record.data_prevista)}"></label>
      <label class="field"><span>Data realizada</span><input name="data_realizada" type="date" value="${dateOnly(record.data_realizada)}"></label>
      <label class="field"><span>Valor BRL</span><input name="valor_brl" type="number" step="0.01" value="${escapeHtml(record.valor_brl || '')}"></label>
      <label class="field"><span>Valor USD</span><input name="valor_usd" type="number" step="0.01" value="${escapeHtml(record.valor_usd || '')}"></label>
      <label class="field"><span>Câmbio</span><input name="cambio" type="number" step="0.000001" value="${escapeHtml(record.cambio || '')}"></label>
      <label class="field"><span>Documento</span><input name="documento" value="${escapeHtml(record.documento || '')}"></label>
      <label class="field span-2"><span>Observações</span><textarea name="observacoes">${escapeHtml(record.observacoes || '')}</textarea></label>
    </div><div class="form-actions"><button type="button" class="button button-secondary" data-close>Cancelar</button><button class="button button-primary" type="submit">${edit ? 'Salvar alterações' : 'Criar pagamento'}</button></div></form>`;
    openModal(edit ? 'Editar pagamento' : 'Novo pagamento', 'FINANCEIRO', renderForm(record.id_processo || ''));
    const bindDynamic = () => { $('#paymentProcess').addEventListener('change', e => { $('#paymentShipment').innerHTML = shipmentOptions(e.target.value, ''); $('#paymentFinimp').innerHTML = finimpOptions(e.target.value, ''); }); };
    bindDynamic(); $('[data-close]', els.modalBody).addEventListener('click', closeModal);
    $('#paymentForm').addEventListener('submit', async e => { e.preventDefault(); const data = formObject(e.currentTarget, ['valor_brl','valor_usd','cambio']); if (edit) data.id_evento = record.id_evento; await saveAndRefresh(edit ? 'payment.update' : 'payment.create', data, 'Pagamento salvo com sucesso.'); });
  }

  function openFinimpForm(record = {}) {
    const edit = !!record.id_finimp;
    openModal(edit ? 'Editar FINIMP' : 'Novo FINIMP', 'FINIMP', `<form id="finimpForm"><div class="form-grid">
      <label class="field span-2"><span>Processo associado *</span><select name="id_processo" required>${processOptions(record.id_processo || '')}</select></label>
      <label class="field"><span>Banco *</span><input name="banco" required value="${escapeHtml(record.banco || '')}" placeholder="Ex.: Sicredi"></label>
      <label class="field"><span>Número do contrato</span><input name="numero_contrato" value="${escapeHtml(record.numero_contrato || '')}"></label>
      <label class="field"><span>Data da contratação</span><input name="data_contratacao" type="date" value="${dateOnly(record.data_contratacao)}"></label>
      <label class="field"><span>Vencimento</span><input name="vencimento" type="date" value="${dateOnly(record.vencimento)}"></label>
      <label class="field"><span>Valor financiado USD</span><input name="valor_usd" type="number" step="0.01" value="${escapeHtml(record.valor_usd || '')}"></label>
      <label class="field"><span>Câmbio contratação</span><input name="cambio_contratacao" type="number" step="0.000001" value="${escapeHtml(record.cambio_contratacao || '')}"></label>
      <label class="field"><span>Valor BRL</span><input name="valor_brl" type="number" step="0.01" value="${escapeHtml(record.valor_brl || '')}"></label>
      <label class="field"><span>Taxa de juros (% a.a.)</span><input name="taxa_juros" type="number" step="0.0001" value="${escapeHtml(record.taxa_juros || '')}"></label>
      <label class="field"><span>Status</span><select name="status">${optionList(['Em aberto','Liquidado','Cancelado'], record.status || 'Em aberto')}</select></label>
      <label class="field span-2"><span>Observações</span><textarea name="observacoes">${escapeHtml(record.observacoes || '')}</textarea></label>
    </div><div class="form-actions"><button type="button" class="button button-secondary" data-close>Cancelar</button><button class="button button-primary" type="submit">${edit ? 'Salvar alterações' : 'Criar FINIMP'}</button></div></form>`);
    $('[data-close]', els.modalBody).addEventListener('click', closeModal);
    $('#finimpForm').addEventListener('submit', async e => { e.preventDefault(); const data = formObject(e.currentTarget, ['valor_usd','cambio_contratacao','valor_brl','taxa_juros']); if (edit) data.id_finimp = record.id_finimp; await saveAndRefresh(edit ? 'finimp.update' : 'finimp.create', data, 'FINIMP salvo com sucesso.'); });
  }

  function openSupplierForm(record = {}) {
    const edit = !!record.id_fornecedor;
    openModal(edit ? 'Editar fornecedor' : 'Novo fornecedor', 'CADASTRO', `<form id="supplierForm"><div class="form-grid"><label class="field span-2"><span>Nome *</span><input name="nome" required value="${escapeHtml(record.nome || '')}"></label><label class="field"><span>Ativo</span><select name="ativo">${optionList(['SIM','NÃO'], record.ativo || 'SIM')}</select></label><label class="field span-2"><span>Observações</span><textarea name="observacoes">${escapeHtml(record.observacoes || '')}</textarea></label></div><div class="form-actions"><button type="button" class="button button-secondary" data-close>Cancelar</button><button class="button button-primary" type="submit">Salvar</button></div></form>`);
    $('[data-close]', els.modalBody).addEventListener('click', closeModal);
    $('#supplierForm').addEventListener('submit', async e => { e.preventDefault(); const data = formObject(e.currentTarget); if (edit) data.id_fornecedor = record.id_fornecedor; await saveAndRefresh(edit ? 'supplier.update' : 'supplier.create', data, 'Fornecedor salvo com sucesso.'); });
  }

  function formObject(form, numeric = []) {
    const data = Object.fromEntries(new FormData(form).entries());
    numeric.forEach(k => { data[k] = data[k] === '' ? '' : Number(data[k]); });
    return data;
  }

  async function saveAndRefresh(action, data, message) {
    setLoading(true);
    try { await api.request(action, data); closeModal(); await refreshBootstrap(); toast(message, 'success'); await renderView(state.view); }
    catch (e) { toast(e.message, 'error'); }
    finally { setLoading(false); }
  }

  function bindGlobalEvents() {
    els.loginForm.addEventListener('submit', async e => {
      e.preventDefault(); els.loginMessage.textContent = ''; els.loginButton.disabled = true;
      try {
        const session = await api.login(els.loginInput.value.trim(), els.passwordInput.value);
        api.setSession(session); state.view = 'dashboard'; await bootstrap();
      } catch (err) { els.loginMessage.textContent = err.message; }
      finally { els.loginButton.disabled = false; }
    });
    els.togglePassword.addEventListener('click', () => { const show = els.passwordInput.type === 'password'; els.passwordInput.type = show ? 'text' : 'password'; els.togglePassword.textContent = show ? 'Ocultar' : 'Mostrar'; });
    $$('.nav-item').forEach(b => b.addEventListener('click', () => renderView(b.dataset.view)));
    els.logoutButton.addEventListener('click', async () => { try { await api.logout(); } catch (_) {} api.clearSession(); state.user = null; els.appView.classList.add('hidden'); els.loginView.classList.remove('hidden'); els.passwordInput.value = ''; });
    els.refreshButton.addEventListener('click', async () => { setLoading(true); try { await refreshBootstrap(); await renderView(state.view); toast('Informações atualizadas.', 'success'); } catch (e) { toast(e.message, 'error'); } finally { setLoading(false); } });
    els.mobileMenuButton.addEventListener('click', () => els.sidebar.classList.toggle('open'));
    els.modalClose.addEventListener('click', closeModal);
    els.modalBackdrop.addEventListener('click', e => { if (e.target === els.modalBackdrop) closeModal(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !els.modalBackdrop.classList.contains('hidden')) closeModal(); });
  }

  async function init() {
    bindGlobalEvents();
    els.demoHint.classList.toggle('hidden', !cfg.DEMO_MODE);
    const session = api.getSession();
    if (session?.token) {
      try { await bootstrap(); return; } catch (_) { api.clearSession(); }
    }
    els.loginView.classList.remove('hidden'); els.appView.classList.add('hidden');
  }

  init();
})();
