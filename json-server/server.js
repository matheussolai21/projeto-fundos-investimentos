// server.js - VERSÃO CORRIGIDA
const jsonServer = require('json-server');
const express = require('express');
const cors = require('cors');
const path = require('path');

const server = jsonServer.create();
const router = jsonServer.router(path.join(__dirname, 'db.json'));
const middlewares = jsonServer.defaults();

// Middlewares básicos
server.use(cors());
server.use(express.json());
server.use(middlewares);

// Validar CNPJ
const validateCNPJ = (cnpj) => {
  const cnpjStr = String(cnpj).replace(/\D/g, '');
  return cnpjStr.length === 14;
};

// ==================== ROTAS PÚBLICAS (NÃO PRECISAM DE TOKEN) ====================

// Rota GET - Listar todos os fundos (PÚBLICA - sem autenticação)
server.get('/fundos', (req, res) => {
  const db = router.db;
  const fundos = db.get('fundos').value();
  const tipos = db.get('tipos_fundo').value();
  
  const fundosEnriquecidos = fundos.map(fundo => ({
    ...fundo,
    tipo_nome: tipos.find(t => t.codigo === fundo.codigo_tipo)?.nome
  }));
  
  res.json(fundosEnriquecidos);
});

// Rota GET - Detalhes de um fundo por código (PÚBLICA)
server.get('/fundos/:codigo', (req, res) => {
  console.log('🔵 Buscando fundo com código:', req.params.codigo);
  
  const db = router.db;
  const { codigo } = req.params;
  
  const fundo = db.get('fundos').find({ codigo }).value();
  
  if (!fundo) {
    console.log('❌ Fundo não encontrado:', codigo);
    return res.status(404).json({ error: 'Fundo não encontrado' });
  }
  
  const tipo = db.get('tipos_fundo').find({ codigo: fundo.codigo_tipo }).value();
  
  console.log('✅ Fundo encontrado:', fundo.nome);
  
  res.json({
    ...fundo,
    tipo_nome: tipo?.nome
  });
});

// Rota POST - Cadastrar novo fundo
server.post('/fundos', (req, res) => {
  const db = router.db;
  const { codigo, nome, cnpj, codigo_tipo, patrimonio = 0 } = req.body;
  
  // Validações
  if (!codigo || !nome || !cnpj || !codigo_tipo) {
    return res.status(400).json({ 
      error: 'Campos obrigatórios: codigo, nome, cnpj, codigo_tipo' 
    });
  }
  
  const fundoExistente = db.get('fundos').find({ codigo }).value();
  if (fundoExistente) {
    return res.status(400).json({ error: 'Código do fundo já existe' });
  }
  
  const cnpjExistente = db.get('fundos').find({ cnpj }).value();
  if (cnpjExistente) {
    return res.status(400).json({ error: 'CNPJ já cadastrado' });
  }
  
  if (!validateCNPJ(cnpj)) {
    return res.status(400).json({ error: 'CNPJ inválido' });
  }
  
  const tipoExistente = db.get('tipos_fundo').find({ codigo: codigo_tipo }).value();
  if (!tipoExistente) {
    return res.status(400).json({ error: 'Tipo de fundo inválido' });
  }
  
  const novoFundo = {
    codigo,
    nome,
    cnpj,
    codigo_tipo,
    patrimonio
  };
  
  db.get('fundos').push(novoFundo).write();
  
  const tipo = db.get('tipos_fundo').find({ codigo: codigo_tipo }).value();
  
  res.status(201).json({
    ...novoFundo,
    tipo_nome: tipo?.nome
  });
});

// Rota PUT - Editar fundo existente
server.put('/fundos/:codigo', (req, res) => {
  const db = router.db;
  const { codigo } = req.params;
  const { nome, cnpj, codigo_tipo, patrimonio } = req.body;
  
  const fundoExistente = db.get('fundos').find({ codigo }).value();
  
  if (!fundoExistente) {
    return res.status(404).json({ error: 'Fundo não encontrado' });
  }
  
  if (cnpj && cnpj !== fundoExistente.cnpj) {
    const cnpjExistente = db.get('fundos').find({ cnpj }).value();
    if (cnpjExistente) {
      return res.status(400).json({ error: 'CNPJ já cadastrado para outro fundo' });
    }
  }
  
  const fundoAtualizado = {
    ...fundoExistente,
    nome: nome || fundoExistente.nome,
    cnpj: cnpj || fundoExistente.cnpj,
    codigo_tipo: codigo_tipo || fundoExistente.codigo_tipo,
    patrimonio: patrimonio !== undefined ? patrimonio : fundoExistente.patrimonio
  };
  
  db.get('fundos').find({ codigo }).assign(fundoAtualizado).write();
  
  const tipo = db.get('tipos_fundo').find({ codigo: fundoAtualizado.codigo_tipo }).value();
  
  res.json({
    ...fundoAtualizado,
    tipo_nome: tipo?.nome
  });
});

// Rota DELETE - Excluir fundo
server.delete('/fundos/:codigo', (req, res) => {
  const db = router.db;
  const { codigo } = req.params;
  
  const fundoExistente = db.get('fundos').find({ codigo }).value();
  
  if (!fundoExistente) {
    return res.status(404).json({ error: 'Fundo não encontrado' });
  }
  
  db.get('fundos').remove({ codigo }).write();
  
  res.status(204).send();
});

// Rota PUT - Adicionar/subtrair patrimônio
server.put('/fundos/:codigo/patrimonio', (req, res) => {
  const db = router.db;
  const { codigo } = req.params;
  const { valor } = req.body;
  
  if (valor === undefined || typeof valor !== 'number') {
    return res.status(400).json({ error: 'Valor é obrigatório e deve ser numérico' });
  }
  
  const fundo = db.get('fundos').find({ codigo }).value();
  
  if (!fundo) {
    return res.status(404).json({ error: 'Fundo não encontrado' });
  }
  
  const novoPatrimonio = fundo.patrimonio + valor;
  
  if (novoPatrimonio < 0) {
    return res.status(400).json({ error: 'Patrimônio não pode ficar negativo' });
  }
  
  db.get('fundos').find({ codigo }).assign({ patrimonio: novoPatrimonio }).write();
  
  res.json({
    codigo: fundo.codigo,
    patrimonio_anterior: fundo.patrimonio,
    patrimonio_atual: novoPatrimonio,
    alteracao: valor
  });
});

// Rota GET - Listar tipos de fundo
server.get('/tipos-fundo', (req, res) => {
  const db = router.db;
  const tipos = db.get('tipos_fundo').value();
  res.json(tipos);
});

// Usar router padrão para outras rotas
server.use('/api', router);

// Porta do servidor
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`✅ Servidor rodando em http://localhost:${PORT}`);
  console.log('📋 GET /fundos/:codigo - Buscar fundo por código');
  console.log('📋 GET /fundos - Listar todos os fundos');
});