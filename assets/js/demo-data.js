(function () {
  const now = new Date();
  const isoDate = (offsetDays) => {
    const d = new Date(now);
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().slice(0, 10);
  };

  window.SUNO_DEMO_SEED = {
    user: { id_usuario: 'USR-DEMO-01', nome: 'Leonardo', login: 'leonardo' },
    suppliers: [
      { id_fornecedor: 'FOR-DEMO-01', nome: 'SOLARTECH ASIA', ativo: 'SIM', observacoes: '' },
      { id_fornecedor: 'FOR-DEMO-02', nome: 'NOVA MODULES', ativo: 'SIM', observacoes: '' },
      { id_fornecedor: 'FOR-DEMO-03', nome: 'GRIDPOWER', ativo: 'SIM', observacoes: '' }
    ],
    processes: [
      {
        id_processo: 'PRC-DEMO-001', codigo_processo: '2609/26', nome_processo: '2026-09 Módulos 630W - 3 embarques',
        fornecedor: 'NOVA MODULES', quantidade_total: 8640, moeda: 'USD', valor_compra_usd: 612000,
        valor_compra_brl: '', status: 'Em andamento', etapa: 'Embarque parcial', qtd_embarques_previstos: 3,
        responsavel: 'Leonardo', observacoes: 'Processo demonstrativo com embarques fracionados.'
      },
      {
        id_processo: 'PRC-DEMO-002', codigo_processo: '2610/26', nome_processo: '2026-09 Inversores 100K',
        fornecedor: 'SOLARTECH ASIA', quantidade_total: 420, moeda: 'USD', valor_compra_usd: 245000,
        valor_compra_brl: '', status: 'Em andamento', etapa: 'Em trânsito', qtd_embarques_previstos: 1,
        responsavel: 'Leonardo', observacoes: 'FINIMP associado ao processo.'
      },
      {
        id_processo: 'PRC-DEMO-003', codigo_processo: 'BR-0926', nome_processo: 'Compra nacional - inversores híbridos',
        fornecedor: 'GRIDPOWER', quantidade_total: 180, moeda: 'BRL', valor_compra_usd: '',
        valor_compra_brl: 520000, status: 'Concluído', etapa: 'Fechado', qtd_embarques_previstos: 0,
        responsavel: 'Jayra', observacoes: ''
      }
    ],
    shipments: [
      { id_embarque: 'EMB-DEMO-001', id_processo: 'PRC-DEMO-001', sequencia: 1, quantidade: 2880, status: 'Recebido', data_prevista_embarque: isoDate(-35), data_embarque: isoDate(-34), bl: 'BL-DEMO-001', container: '03 containers', eta: isoDate(-8), data_chegada: isoDate(-7), data_nacionalizacao: isoDate(-6), data_liberacao: isoDate(-5), data_recebimento: isoDate(-3), observacoes: '' },
      { id_embarque: 'EMB-DEMO-002', id_processo: 'PRC-DEMO-001', sequencia: 2, quantidade: 2880, status: 'Em trânsito', data_prevista_embarque: isoDate(-10), data_embarque: isoDate(-9), bl: 'BL-DEMO-002', container: '03 containers', eta: isoDate(8), data_chegada: '', data_nacionalizacao: '', data_liberacao: '', data_recebimento: '', observacoes: '' },
      { id_embarque: 'EMB-DEMO-003', id_processo: 'PRC-DEMO-001', sequencia: 3, quantidade: 2880, status: 'Programado', data_prevista_embarque: isoDate(5), data_embarque: '', bl: '', container: '03 containers', eta: isoDate(28), data_chegada: '', data_nacionalizacao: '', data_liberacao: '', data_recebimento: '', observacoes: '' },
      { id_embarque: 'EMB-DEMO-004', id_processo: 'PRC-DEMO-002', sequencia: 1, quantidade: 420, status: 'Em trânsito', data_prevista_embarque: isoDate(-18), data_embarque: isoDate(-17), bl: 'BL-DEMO-004', container: '01 container', eta: isoDate(4), data_chegada: '', data_nacionalizacao: '', data_liberacao: '', data_recebimento: '', observacoes: '' }
    ],
    payments: [
      { id_evento: 'EVT-DEMO-001', id_processo: 'PRC-DEMO-001', id_embarque: '', id_finimp: '', categoria: 'Parcela', descricao: '1ª parcela | 10%', status: 'Pago', data_prevista: isoDate(-45), data_realizada: isoDate(-45), valor_brl: 340000, valor_usd: 61200, cambio: 5.5556, documento: 'SWIFT-001', observacoes: '' },
      { id_evento: 'EVT-DEMO-002', id_processo: 'PRC-DEMO-001', id_embarque: 'EMB-DEMO-002', id_finimp: '', categoria: 'Nacionalização', descricao: 'Nacionalização - embarque 02/03', status: 'Previsto', data_prevista: isoDate(10), data_realizada: '', valor_brl: 565000, valor_usd: 101000, cambio: 5.5941, documento: '', observacoes: '' },
      { id_evento: 'EVT-DEMO-003', id_processo: 'PRC-DEMO-001', id_embarque: 'EMB-DEMO-003', id_finimp: '', categoria: 'Frete', descricao: 'Frete internacional - embarque 03/03', status: 'Previsto', data_prevista: isoDate(6), data_realizada: '', valor_brl: 112000, valor_usd: 20000, cambio: 5.6, documento: '', observacoes: '' },
      { id_evento: 'EVT-DEMO-004', id_processo: 'PRC-DEMO-002', id_embarque: '', id_finimp: 'FIN-DEMO-001', categoria: 'IOF', descricao: 'IOF contratação FINIMP', status: 'Pago', data_prevista: isoDate(-20), data_realizada: isoDate(-20), valor_brl: 9200, valor_usd: '', cambio: '', documento: '', observacoes: '' },
      { id_evento: 'EVT-DEMO-005', id_processo: 'PRC-DEMO-002', id_embarque: '', id_finimp: 'FIN-DEMO-001', categoria: 'FINIMP', descricao: 'Liquidação principal FINIMP', status: 'Previsto', data_prevista: isoDate(25), data_realizada: '', valor_brl: 1325000, valor_usd: 235000, cambio: 5.6383, documento: '', observacoes: '' },
      { id_evento: 'EVT-DEMO-006', id_processo: 'PRC-DEMO-002', id_embarque: '', id_finimp: 'FIN-DEMO-001', categoria: 'Juros', descricao: 'Juros FINIMP', status: 'Previsto', data_prevista: isoDate(25), data_realizada: '', valor_brl: 21500, valor_usd: '', cambio: '', documento: '', observacoes: '' }
    ],
    finimp: [
      { id_finimp: 'FIN-DEMO-001', id_processo: 'PRC-DEMO-002', banco: 'Banco Demo', numero_contrato: 'FIN-2609-001', data_contratacao: isoDate(-20), vencimento: isoDate(25), valor_usd: 235000, cambio_contratacao: 5.48, valor_brl: 1287800, taxa_juros: 6.25, status: 'Em aberto', observacoes: 'Operação demonstrativa.' }
    ],
    logs: [
      { id_log: 'LOG-DEMO-001', data_hora: new Date().toISOString(), id_usuario: 'USR-DEMO-01', login: 'leonardo', acao: 'LOGIN', entidade: 'SESSAO', id_registro: '', detalhes: 'Acesso em modo demonstração.' }
    ]
  };
})();
