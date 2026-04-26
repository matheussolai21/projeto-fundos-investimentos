// server.js (com ordem corrigida)
const jsonServer = require('json-server');
const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const server = jsonServer.create();
const router = jsonServer.router(path.join(__dirname, 'db.json'));
const middlewares = jsonServer.defaults();

const SECRET_KEY = 'seu-chave-secreta-jwt';
const TOKEN_EXPIRATION = '8h';

// Gerar token
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, username: user.username, email: user.email },
    SECRET_KEY,
    { expiresIn: TOKEN_EXPIRATION }
  );
};

// Verificar token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, SECRET_KEY);
  } catch (error) {
    return null;
  }
};

// Validar CNPJ
const validateCNPJ = (cnpj) => {
  const cnpjStr = String(cnpj).replace(/\D/g, '');
  return cnpjStr.length === 14;
};

// ==================== 1. MIDDLEWARES BÁSICOS ====================
server.use(cors());
server.use(express.json());
server.use(middlewares);

// ==================== 2. ROTAS PÚBLICAS (NÃO PRECISAM DE TOKEN) ====================

// Health check
server.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Login - ROTA PÚBLICA
server.post('/usuarios', (req, res) => {
  console.log('🔵 Login request:', req.body);
  
  const db = router.db;  // ✅ Usa o banco do JSON Server
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ 
      success: false,
      error: 'Usuário e senha são obrigatórios' 
    });
  }
  
  // ✅ Busca no db.json
  const user = db.get('login').find({ username }).value();
  
  if (!user) {
    console.log('❌ Usuário não encontrado:', username);
    return res.status(401).json({ 
      success: false,
      error: 'Usuário ou senha inválidos' 
    });
  }
  
  // Verifica se a senha está em bcrypt ou texto plano
  let passwordValid = false;
  if (user.password && (user.password.startsWith('$2a$') || user.password.startsWith('$2b$'))) {
    passwordValid = bcrypt.compareSync(password, user.password);
  } else {
    passwordValid = (password === user.password);
  }
  
  if (!passwordValid) {
    console.log('❌ Senha inválida para:', username);
    return res.status(401).json({ 
      success: false,
      error: 'Usuário ou senha inválidos' 
    });
  }
  
  const token = generateToken(user);
  const { password: _, ...userWithoutPassword } = user;
  
  console.log('✅ Login successful:', username);
  
  res.json({
    success: true,
    message: 'Login realizado com sucesso',
    token,
    user: userWithoutPassword,
    expiresIn: TOKEN_EXPIRATION
  });
});

server.use(router);
server.listen(3000, () => {
  console.log('JSON Server com Login rodando em http://localhost:3000');
});
// Register - ROTA PÚBLICA
server.post('/register', async (req, res) => {
  const db = router.db;
  const { username, email, password, nome } = req.body;
  
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Campos obrigatórios' });
  }
  
  const userExists = db.get('usuarios').find({ username }).value();
  if (userExists) {
    return res.status(400).json({ error: 'Usuário já existe' });
  }
  
  const hashedPassword = bcrypt.hashSync(password, 10);
  
  const newUser = {
    id: Date.now(),
    username,
    email,
    password: hashedPassword,
    nome: nome || username,
    role: 'user',
    created_at: new Date().toISOString()
  };
  
  db.get('usuarios').push(newUser).write();
  
  const token = generateToken(newUser);
  const { password: _, ...userWithoutPassword } = newUser;
  
  res.status(201).json({
    success: true,
    token,
    user: userWithoutPassword
  });
});

// ==================== 3. MIDDLEWARE DE AUTENTICAÇÃO (APENAS PARA ROTAS PROTEGIDAS) ====================
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ 
      error: 'Token não fornecido. Faça login primeiro.',
      code: 'MISSING_TOKEN'
    });
  }
  
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return res.status(403).json({ 
      error: 'Token inválido ou expirado. Faça login novamente.',
      code: 'INVALID_TOKEN'
    });
  }
  
  req.user = decoded;
  next();
};

// ==================== 4. MIDDLEWARE DE VALIDAÇÃO DE FUNDOS ====================
const validateFundo = (req, res, next) => {
  const db = router.db;
  
  if (req.method === 'POST' && req.path === '/fundos') {
    const { codigo, nome, cnpj, codigo_tipo } = req.body;
    
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
  }
  
  next();
};

// ==================== 5. ROTAS PROTEGIDAS (REQUEREM TOKEN) ====================
server.use(authenticateToken);

// GET - Listar todos os fundos
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

// GET - Detalhes de um fundo
server.get('/fundos/:codigo', (req, res) => {
  const db = router.db;
  const { codigo } = req.params;
  
  const fundo = db.get('fundos').find({ codigo }).value();
  
  if (!fundo) {
    return res.status(404).json({ error: 'Fundo não encontrado' });
  }
  
  const tipo = db.get('tipos_fundo').find({ codigo: fundo.codigo_tipo }).value();
  
  res.json({
    ...fundo,
    tipo_nome: tipo?.nome
  });
});

// POST - Criar novo fundo
server.post('/fundos', validateFundo, (req, res) => {
  const db = router.db;
  const { codigo, nome, cnpj, codigo_tipo, patrimonio = 0 } = req.body;
  
  const novoFundo = { codigo, nome, cnpj, codigo_tipo, patrimonio };
  db.get('fundos').push(novoFundo).write();
  
  const tipo = db.get('tipos_fundo').find({ codigo: codigo_tipo }).value();
  
  res.status(201).json({ ...novoFundo, tipo_nome: tipo?.nome });
});

// PUT - Editar fundo
server.put('/fundos/:codigo', validateFundo, (req, res) => {
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
  
  res.json({ ...fundoAtualizado, tipo_nome: tipo?.nome });
});

// DELETE - Excluir fundo
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

// PUT - Alterar patrimônio
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

// GET - Listar tipos de fundo
server.get('/tipos-fundo', (req, res) => {
  const db = router.db;
  const tipos = db.get('tipos_fundo').value();
  res.json(tipos);
});

// Validar token
server.get('/validate-token', (req, res) => {
  const token = req.headers['authorization']?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ valid: false, error: 'Token não fornecido' });
  }
  
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return res.status(401).json({ valid: false, error: 'Token inválido' });
  }
  
  res.json({ valid: true, user: decoded, expiresIn: TOKEN_EXPIRATION });
});

// ==================== 6. ROUTER PADRÃO ====================
server.use('/api', router);

// ==================== 7. INICIAR SERVIDOR ====================
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════════════════╗
  ║         JSON Server - API de Fundos Itaú             ║
  ╠══════════════════════════════════════════════════════╣
  ║  Servidor rodando em: http://localhost:${PORT}       ║
  ╠══════════════════════════════════════════════════════╣
  ║  🔓 Rotas Públicas:                                  ║
  ║  POST   /login                  - Login              ║
  ║  POST   /register               - Registro           ║
  ║  GET    /health                 - Health check       ║
  ╠══════════════════════════════════════════════════════╣
  ║  🔒 Rotas Protegidas (requer token):                 ║
  ║  GET    /fundos                  - Listar fundos     ║
  ║  GET    /fundos/:codigo          - Detalhes fundo    ║
  ║  POST   /fundos                  - Criar fundo       ║
  ║  PUT    /fundos/:codigo          - Editar fundo      ║
  ║  DELETE /fundos/:codigo          - Excluir fundo     ║
  ║  GET    /tipos-fundo             - Listar tipos      ║
  ╚══════════════════════════════════════════════════════╝
  `);
});

module.exports = server;