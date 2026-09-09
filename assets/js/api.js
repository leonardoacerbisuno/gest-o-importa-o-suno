(function () {
  const cfg = window.SUNO_CONFIG;

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function uid(prefix) { return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 6).toUpperCase()}`; }

  class DemoApi {
    constructor() {
      const saved = localStorage.getItem(cfg.DEMO_STORAGE_KEY);
      this.db = saved ? JSON.parse(saved) : clone(window.SUNO_DEMO_SEED);
      this.persist();
    }

    persist() { localStorage.setItem(cfg.DEMO_STORAGE_KEY, JSON.stringify(this.db)); }
    user() { return this.db.user; }
    processName(id) { return this.db.processes.find(x => x.id_processo === id)?.nome_processo || ''; }

    dashboard() {
      const today = new Date(); today.setHours(0,0,0,0);
      const inDays = (dateText) => dateText ? Math.ceil((new Date(`${dateText}T00:00:00`) - today) / 86400000) : 99999;
      const active = this.db.processes.filter(p => p.status === 'Em andamento');
      const overdue = this.db.payments.filter(p => p.status !== 'Pago' && p.status !== 'Cancelado' && inDays(p.data_prevista) < 0);
      const pay7 = this.db.payments.filter(p => p.status !== 'Pago' && p.status !== 'Cancelado' && inDays(p.data_prevista) >= 0 && inDays(p.data_prevista) <= 7);
      const pay30 = this.db.payments.filter(p => p.status !== 'Pago' && p.status !== 'Cancelado' && inDays(p.data_prevista) >= 0 && inDays(p.data_prevista) <= 30);
      const ship30 = this.db.shipments.filter(s => ['Programado','Em trânsito','Embarcado'].includes(s.status) && inDays(s.data_prevista_embarque || s.eta) <= 30);
      const openFin = this.db.finimp.filter(f => f.status === 'Em aberto');
      return {
        metrics: {
          processos_ativos: active.length,
          pagamentos_vencidos: overdue.length,
          pagamentos_7_dias: pay7.length,
          pagamentos_30_dias_valor: pay30.reduce((a,b) => a + (+b.valor_brl || 0), 0),
          embarques_em_transito: this.db.shipments.filter(s => s.status === 'Em trânsito').length,
          finimp_abertos: openFin.length
        },
        proximos_pagamentos: [...this.db.payments].filter(p => p.status !== 'Pago' && p.status !== 'Cancelado' && p.data_prevista).sort((a,b) => a.data_prevista.localeCompare(b.data_prevista)).slice(0,8),
        proximos_embarques: [...this.db.shipments].filter(s => ['Programado','Em trânsito','Embarcado'].includes(s.status)).sort((a,b) => (a.data_prevista_embarque || a.eta || '9999').localeCompare(b.data_prevista_embarque || b.eta || '9999')).slice(0,8),
        finimp_vencimentos: [...openFin].sort((a,b) => (a.vencimento || '9999').localeCompare(b.vencimento || '9999')).slice(0,8)
      };
    }

    recalcStage(processId) {
      const p = this.db.processes.find(x => x.id_processo === processId);
      const ships = this.db.shipments.filter(x => x.id_processo === processId && x.status !== 'Cancelado');
      if (!p || !ships.length) return;
      const total = ships.length;
      const received = ships.filter(x => x.status === 'Recebido').length;
      const started = ships.filter(x => ['Embarcado','Em trânsito','Chegou','Nacionalização','Liberado','Recebido'].includes(x.status)).length;
      if (received === total) p.etapa = 'Recebido';
      else if (received > 0) p.etapa = 'Recebimento parcial';
      else if (started === total) p.etapa = 'Em trânsito';
      else if (started > 0) p.etapa = 'Embarque parcial';
      else p.etapa = 'Aguardando embarque';
    }

    async request(action, data = {}) {
      await new Promise(r => setTimeout(r, 120));
      switch (action) {
        case 'auth.login':
          if (String(data.login).toLowerCase() !== 'leonardo' || String(data.password) !== '123456') throw new Error('Usuário ou senha inválidos.');
          return { token: 'demo-session-token', user: this.user(), expires_at: new Date(Date.now()+8*3600000).toISOString() };
        case 'auth.me': return { user: this.user() };
        case 'auth.logout': return { ok: true };
        case 'app.bootstrap': return { user: this.user(), suppliers: clone(this.db.suppliers), processes: clone(this.db.processes), dashboard: this.dashboard() };
        case 'dashboard.get': return this.dashboard();
        case 'process.list': return clone(this.db.processes);
        case 'process.get': {
          const process = this.db.processes.find(x => x.id_processo === data.id_processo);
          if (!process) throw new Error('Processo não encontrado.');
          return {
            process: clone(process),
            shipments: clone(this.db.shipments.filter(x => x.id_processo === data.id_processo)),
            payments: clone(this.db.payments.filter(x => x.id_processo === data.id_processo)),
            finimp: clone(this.db.finimp.filter(x => x.id_processo === data.id_processo)),
            logs: clone(this.db.logs.filter(x => x.id_registro === data.id_processo || x.detalhes?.includes(data.id_processo)).slice(-20).reverse())
          };
        }
        case 'process.create': {
          const row = { ...data, id_processo: uid('PRC'), criado_em: new Date().toISOString(), atualizado_em: new Date().toISOString() };
          this.db.processes.push(row); this.persist(); return clone(row);
        }
        case 'process.update': {
          const i = this.db.processes.findIndex(x => x.id_processo === data.id_processo); if (i < 0) throw new Error('Processo não encontrado.');
          this.db.processes[i] = { ...this.db.processes[i], ...data, atualizado_em: new Date().toISOString() }; this.persist(); return clone(this.db.processes[i]);
        }
        case 'shipment.list': return clone(this.db.shipments);
        case 'shipment.create': {
          const row = { ...data, id_embarque: uid('EMB'), criado_em: new Date().toISOString(), atualizado_em: new Date().toISOString() };
          this.db.shipments.push(row); this.recalcStage(row.id_processo); this.persist(); return clone(row);
        }
        case 'shipment.update': {
          const i = this.db.shipments.findIndex(x => x.id_embarque === data.id_embarque); if (i < 0) throw new Error('Embarque não encontrado.');
          this.db.shipments[i] = { ...this.db.shipments[i], ...data, atualizado_em: new Date().toISOString() }; this.recalcStage(this.db.shipments[i].id_processo); this.persist(); return clone(this.db.shipments[i]);
        }
        case 'payment.list': return clone(this.db.payments);
        case 'payment.create': {
          const row = { ...data, id_evento: uid('EVT'), criado_em: new Date().toISOString(), atualizado_em: new Date().toISOString() };
          this.db.payments.push(row); this.persist(); return clone(row);
        }
        case 'payment.update': {
          const i = this.db.payments.findIndex(x => x.id_evento === data.id_evento); if (i < 0) throw new Error('Pagamento não encontrado.');
          this.db.payments[i] = { ...this.db.payments[i], ...data, atualizado_em: new Date().toISOString() }; this.persist(); return clone(this.db.payments[i]);
        }
        case 'finimp.list': return clone(this.db.finimp);
        case 'finimp.create': {
          const row = { ...data, id_finimp: uid('FIN'), criado_em: new Date().toISOString(), atualizado_em: new Date().toISOString() };
          this.db.finimp.push(row); this.persist(); return clone(row);
        }
        case 'finimp.update': {
          const i = this.db.finimp.findIndex(x => x.id_finimp === data.id_finimp); if (i < 0) throw new Error('FINIMP não encontrado.');
          this.db.finimp[i] = { ...this.db.finimp[i], ...data, atualizado_em: new Date().toISOString() }; this.persist(); return clone(this.db.finimp[i]);
        }
        case 'supplier.list': return clone(this.db.suppliers);
        case 'supplier.create': {
          const row = { ...data, id_fornecedor: uid('FOR'), criado_em: new Date().toISOString(), atualizado_em: new Date().toISOString() };
          this.db.suppliers.push(row); this.persist(); return clone(row);
        }
        case 'supplier.update': {
          const i = this.db.suppliers.findIndex(x => x.id_fornecedor === data.id_fornecedor); if (i < 0) throw new Error('Fornecedor não encontrado.');
          this.db.suppliers[i] = { ...this.db.suppliers[i], ...data, atualizado_em: new Date().toISOString() }; this.persist(); return clone(this.db.suppliers[i]);
        }
        default: throw new Error(`Ação de demonstração não implementada: ${action}`);
      }
    }
  }

  class ApiClient {
    constructor() {
      this.demo = cfg.DEMO_MODE ? new DemoApi() : null;
    }
    getSession() {
      try { return JSON.parse(sessionStorage.getItem(cfg.SESSION_KEY) || 'null'); } catch { return null; }
    }
    setSession(session) { sessionStorage.setItem(cfg.SESSION_KEY, JSON.stringify(session)); }
    clearSession() { sessionStorage.removeItem(cfg.SESSION_KEY); }

    async request(action, data = {}, requiresAuth = true) {
      if (this.demo) return this.demo.request(action, data);
      const session = this.getSession();
      if (requiresAuth && !session?.token) throw new Error('Sessão expirada. Faça login novamente.');
      const payload = { action, data, token: requiresAuth ? session?.token : undefined };
      let response;
      try {
        response = await fetch(cfg.API_URL, {
          method: 'POST',
          redirect: 'follow',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload)
        });
      } catch (error) {
        throw new Error('Não foi possível acessar a API. Verifique a URL do Apps Script e a implantação.');
      }
      const text = await response.text();
      let json;
      try { json = JSON.parse(text); } catch { throw new Error('A API retornou uma resposta inválida.'); }
      if (!json.ok) {
        if (json.code === 'AUTH_REQUIRED') this.clearSession();
        throw new Error(json.error || 'Erro na API.');
      }
      return json.data;
    }

    login(login, password) { return this.request('auth.login', { login, password }, false); }
    logout() { return this.request('auth.logout', {}, true); }
  }

  window.sunoApi = new ApiClient();
})();
