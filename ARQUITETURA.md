# BRIWAX — Arquitetura do Sistema Completo
## Stack: Node.js · Express · PostgreSQL · MVC · JWT

---

## 1. ESTRUTURA DE PASTAS (Padrão MVC)

```
briwax/
├── src/
│   ├── config/
│   │   ├── database.js          # Pool de conexão PostgreSQL (pg)
│   │   ├── session.js           # Configuração express-session / JWT
│   │   └── multer.js            # Configuração de upload de imagens
│   │
│   ├── models/                  # Camada M — Acesso ao banco
│   │   ├── User.model.js        # Usuários e autenticação
│   │   ├── Product.model.js     # Produtos e imagens
│   │   ├── Category.model.js    # Categorias do catálogo
│   │   ├── HomeSection.model.js # Seções editáveis da Home
│   │   ├── FeaturedProduct.model.js # "Linha de Produtos" da Home
│   │   └── Marketing.model.js   # Pixel FB / GTM configs
│   │
│   ├── controllers/             # Camada C — Lógica de negócio
│   │   ├── auth.controller.js   # Login, logout, refresh token
│   │   ├── product.controller.js
│   │   ├── catalog.controller.js
│   │   ├── home.controller.js
│   │   ├── marketing.controller.js
│   │   └── dashboard.controller.js
│   │
│   ├── routes/
│   │   ├── index.js             # Agrupador de rotas
│   │   ├── public.routes.js     # Home, catálogo, produto (públicas)
│   │   ├── auth.routes.js       # POST /auth/login, /auth/logout
│   │   └── admin.routes.js      # Todas as rotas /admin/* (protegidas)
│   │
│   ├── middlewares/
│   │   ├── auth.middleware.js   # Verifica JWT + nível de acesso
│   │   ├── upload.middleware.js # Multer para imagens de produto
│   │   └── error.middleware.js  # Handler global de erros
│   │
│   ├── views/                   # Camada V — Templates EJS
│   │   ├── layouts/
│   │   │   ├── main.ejs         # Layout público (navbar + footer)
│   │   │   └── dashboard.ejs    # Layout admin (sidebar + topbar)
│   │   ├── partials/
│   │   │   ├── navbar.ejs
│   │   │   ├── footer.ejs
│   │   │   ├── sidebar.ejs      # Sidebar do dashboard
│   │   │   └── modals/
│   │   │       └── featured-picker.ejs  # Modal "Linha de Produtos"
│   │   ├── public/
│   │   │   ├── home.ejs
│   │   │   ├── catalog.ejs
│   │   │   └── product.ejs
│   │   ├── auth/
│   │   │   └── login.ejs
│   │   └── admin/
│   │       ├── dashboard.ejs    # Visão geral / métricas
│   │       ├── products/
│   │       │   ├── index.ejs    # Lista de produtos
│   │       │   ├── create.ejs   # Adicionar produto
│   │       │   └── edit.ejs     # Editar produto
│   │       ├── home-editor.ejs  # Editor das seções da Home
│   │       └── marketing.ejs    # Pixel FB / GTM
│   │
│   └── utils/
│       ├── jwt.utils.js         # Geração e verificação de tokens
│       └── response.utils.js    # Padronização de respostas JSON
│
├── public/
│   ├── css/
│   │   ├── briwax-tokens.css    # CSS Variables (identidade visual)
│   │   ├── main.css             # Estilos públicos globais
│   │   └── dashboard.css        # Estilos do painel admin
│   ├── js/
│   │   ├── catalog-filters.js   # Lógica de busca/filtro via fetch
│   │   ├── product-carousel.js  # Carrossel da página de produto
│   │   └── dashboard/
│   │       ├── featured-picker.js  # Modal de seleção de produtos
│   │       └── home-editor.js
│   └── uploads/                 # Imagens enviadas via multer
│       └── products/
│
├── database/
│   ├── schema.sql               # DDL completo (tabelas + constraints)
│   ├── seed.sql                 # Dados iniciais (admin + categorias)
│   └── migrations/              # Alterações futuras versionadas
│
├── .env                         # Variáveis de ambiente (nunca no git)
├── .env.example
├── .gitignore
├── app.js                       # Express app (middlewares globais)
├── server.js                    # Entry point (listen)
└── package.json
```

---

## 2. SCHEMA DO BANCO DE DADOS (PostgreSQL)

```sql
-- ============================================================
-- BRIWAX — Schema Principal
-- Banco: PostgreSQL 15+
-- ============================================================

-- Extensão para UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── ENUMS ────────────────────────────────────────────────────

CREATE TYPE user_role AS ENUM ('admin', 'editor');
CREATE TYPE section_type AS ENUM (
  'hero', 'about', 'featured_products',
  'categories', 'contact', 'footer'
);

-- ── TABELA: users ────────────────────────────────────────────
-- Controla acesso ao painel administrativo
-- Roles: 'admin' (acesso total) | 'editor' (sem gestão de usuários)

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(120)  NOT NULL,
  email         VARCHAR(255)  NOT NULL UNIQUE,
  password_hash VARCHAR(255)  NOT NULL,          -- bcrypt (rounds: 12)
  role          user_role     NOT NULL DEFAULT 'editor',
  is_active     BOOLEAN       NOT NULL DEFAULT TRUE,
  last_login    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN users.password_hash IS 'Hash bcrypt com cost factor 12. NUNCA armazenar senha plain.';
COMMENT ON COLUMN users.role IS 'admin: acesso total. editor: sem gestão de usuários nem configs de marketing.';

-- ── TABELA: categories ───────────────────────────────────────
-- Segmentos do catálogo (Iluminação, Automotivo, Tecnologia...)

CREATE TABLE categories (
  id          SERIAL       PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  slug        VARCHAR(120) NOT NULL UNIQUE,       -- ex: "iluminacao-profissional"
  description TEXT,
  icon_svg    TEXT,                               -- SVG inline do ícone
  sort_order  SMALLINT     NOT NULL DEFAULT 0,
  is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── TABELA: products ─────────────────────────────────────────
-- Catálogo principal de produtos

CREATE TABLE products (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id     INT          REFERENCES categories(id) ON DELETE SET NULL,
  sku             VARCHAR(60)  NOT NULL UNIQUE,   -- ex: "BRY-432-1"
  name            VARCHAR(200) NOT NULL,
  slug            VARCHAR(220) NOT NULL UNIQUE,   -- URL amigável
  short_desc      VARCHAR(400),                   -- Resumo para card do catálogo
  description     TEXT,                           -- Descrição completa (HTML permitido)
  specs           JSONB,                          -- Especificações técnicas livres
  tags            TEXT[],                         -- Array de tags para busca
  is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
  is_featured     BOOLEAN      NOT NULL DEFAULT FALSE, -- Destaque geral
  sort_order      INT          NOT NULL DEFAULT 0,
  created_by      UUID         REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Índices para busca e filtros do catálogo
CREATE INDEX idx_products_category  ON products(category_id) WHERE is_active = TRUE;
CREATE INDEX idx_products_slug      ON products(slug);
CREATE INDEX idx_products_tags      ON products USING GIN(tags);
CREATE INDEX idx_products_fts       ON products
  USING GIN(to_tsvector('portuguese', name || ' ' || COALESCE(short_desc, '')));

COMMENT ON COLUMN products.specs IS
  'JSON flexível. Ex: {"potencia": "50W", "voltagem": "100-240V", "cor": "Preto"}';
COMMENT ON COLUMN products.tags IS
  'Ex: ARRAY[''led'', ''moving head'', ''beam''] — usado na busca por texto e filtros';

-- ── TABELA: product_images ───────────────────────────────────
-- Imagens do carrossel da página de produto

CREATE TABLE product_images (
  id          SERIAL      PRIMARY KEY,
  product_id  UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url         VARCHAR(500) NOT NULL,              -- Caminho relativo /uploads/products/...
  alt_text    VARCHAR(200),
  sort_order  SMALLINT    NOT NULL DEFAULT 0,     -- Ordem no carrossel
  is_cover    BOOLEAN     NOT NULL DEFAULT FALSE,  -- Imagem principal (card do catálogo)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_product_images_product ON product_images(product_id);

-- ── TABELA: product_downloads ────────────────────────────────
-- Arquivos para download na página do produto (fichas técnicas, manuais)

CREATE TABLE product_downloads (
  id          SERIAL      PRIMARY KEY,
  product_id  UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  label       VARCHAR(150) NOT NULL,              -- Ex: "Ficha Técnica PDF"
  url         VARCHAR(500) NOT NULL,
  icon        VARCHAR(50),                        -- Ex: "pdf", "zip"
  sort_order  SMALLINT    NOT NULL DEFAULT 0
);

-- ── TABELA: home_sections ────────────────────────────────────
-- Seções editáveis da página Home (via dashboard)

CREATE TABLE home_sections (
  id           SERIAL       PRIMARY KEY,
  section_key  VARCHAR(80)  NOT NULL UNIQUE,      -- Ex: "hero", "about", "contact"
  section_type section_type NOT NULL,
  title        VARCHAR(300),
  subtitle     VARCHAR(500),
  body         TEXT,                              -- Texto longo / HTML
  cta_label    VARCHAR(100),                     -- Texto do botão CTA
  cta_url      VARCHAR(500),
  extra_data   JSONB,                             -- Dados extras (ex: lista de ícones)
  is_visible   BOOLEAN      NOT NULL DEFAULT TRUE,
  sort_order   SMALLINT     NOT NULL DEFAULT 0,
  updated_by   UUID         REFERENCES users(id) ON DELETE SET NULL,
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN home_sections.extra_data IS
  'Dados estruturados livres por seção. Ex hero: {"eyebrow": "Parceiros que movem o atacado"}';

-- ── TABELA: home_featured_products ───────────────────────────
-- Produtos selecionados para a "Linha de Produtos" da Home
-- Relação M:N entre home_sections (type=featured_products) e products

CREATE TABLE home_featured_products (
  id          SERIAL      PRIMARY KEY,
  product_id  UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sort_order  SMALLINT    NOT NULL DEFAULT 0,
  added_by    UUID        REFERENCES users(id) ON DELETE SET NULL,
  added_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(product_id)                             -- Cada produto aparece 1x
);

CREATE INDEX idx_hfp_product ON home_featured_products(product_id);

-- ── TABELA: marketing_configs ────────────────────────────────
-- Configurações de rastreamento (Pixel FB, GTM, GA4...)

CREATE TABLE marketing_configs (
  id          SERIAL       PRIMARY KEY,
  provider    VARCHAR(60)  NOT NULL UNIQUE,       -- 'facebook_pixel' | 'gtm' | 'ga4'
  label       VARCHAR(120) NOT NULL,              -- Nome amigável
  tracking_id VARCHAR(200),                       -- Ex: "GTM-XXXXXXX" | "1234567890"
  is_active   BOOLEAN      NOT NULL DEFAULT FALSE,
  extra_conf  JSONB,                              -- Configurações extras do provider
  updated_by  UUID         REFERENCES users(id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN marketing_configs.extra_conf IS
  'Ex GTM: {"environments": "...", "auth": "..."}. Ex GA4: {"measurement_id": "G-..."}';

-- ── TABELA: audit_log ────────────────────────────────────────
-- Rastreabilidade de ações no painel admin

CREATE TABLE audit_log (
  id          BIGSERIAL   PRIMARY KEY,
  user_id     UUID        REFERENCES users(id) ON DELETE SET NULL,
  action      VARCHAR(100) NOT NULL,             -- Ex: 'product.create', 'home.update'
  entity_type VARCHAR(60),
  entity_id   VARCHAR(100),
  old_value   JSONB,
  new_value   JSONB,
  ip_address  INET,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_user    ON audit_log(user_id);
CREATE INDEX idx_audit_entity  ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_created ON audit_log(created_at DESC);

-- ── FUNÇÃO: updated_at automático ────────────────────────────

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER trg_home_sections_updated_at
  BEFORE UPDATE ON home_sections
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER trg_marketing_updated_at
  BEFORE UPDATE ON marketing_configs
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
```

---

## 3. SEED INICIAL (database/seed.sql)

```sql
-- Admin padrão (senha: Admin@2025 — TROCAR NO PRIMEIRO LOGIN)
-- Hash gerado com: bcrypt.hashSync('Admin@2025', 12)
INSERT INTO users (name, email, password_hash, role) VALUES
(
  'Administrador',
  'admin@briwax.com.br',
  '$2b$12$PLACEHOLDER_HASH_AQUI',   -- Substituir pelo hash real
  'admin'
);

-- Categorias padrão
INSERT INTO categories (name, slug, description, sort_order) VALUES
('Iluminação Profissional', 'iluminacao-profissional',
 'Moving heads, beam lights e par leds de alta performance.', 1),
('Automotivo', 'automotivo',
 'Linha completa de produtos automotivos inovadores.', 2),
('Tecnologia', 'tecnologia',
 'Produtos tecnológicos de ponta para o atacado.', 3);

-- Seções iniciais da Home
INSERT INTO home_sections (section_key, section_type, title, subtitle, sort_order) VALUES
('hero',             'hero',              'Soluções Inovadoras', 'Parcerias que Movem o Atacado', 1),
('featured_products','featured_products', 'Linha de Produtos',   'Produtos em Destaque',          2),
('categories',       'categories',        'Segmentos de Atuação','Nossos Catálogos',              3),
('contact',          'contact',           'Vamos fazer negócio?','Entre em contato com nossa equipe', 4);

-- Configs de marketing (inativas por padrão)
INSERT INTO marketing_configs (provider, label, tracking_id, is_active) VALUES
('facebook_pixel', 'Facebook Pixel', NULL, FALSE),
('gtm',            'Google Tag Manager', NULL, FALSE),
('ga4',            'Google Analytics 4', NULL, FALSE);
```

---

## 4. ARQUIVOS-CHAVE DO BACKEND

### src/config/database.js
```javascript
const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     process.env.DB_PORT     || 5432,
  database: process.env.DB_NAME     || 'briwax',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD,
  max: 10,               // máx conexões no pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('❌ Erro inesperado no pool PostgreSQL', err);
  process.exit(-1);
});

module.exports = { pool, query: (text, params) => pool.query(text, params) };
```

### src/middlewares/auth.middleware.js
```javascript
const jwt = require('jsonwebtoken');

// Middleware: exige autenticação (qualquer role)
exports.requireAuth = (req, res, next) => {
  const token = req.cookies?.jwt || req.headers.authorization?.split(' ')[1];
  if (!token) return res.redirect('/admin/login');
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.clearCookie('jwt');
    return res.redirect('/admin/login');
  }
};

// Middleware: exige role 'admin'
exports.requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).render('admin/403', { user: req.user });
  }
  next();
};
```

### src/controllers/auth.controller.js
```javascript
const bcrypt = require('bcrypt');
const jwt    = require('jsonwebtoken');
const User   = require('../models/User.model');

exports.showLogin = (req, res) => res.render('auth/login', { error: null });

exports.doLogin = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findByEmail(email);
    if (!user || !user.is_active) {
      return res.render('auth/login', { error: 'Credenciais inválidas.' });
    }
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.render('auth/login', { error: 'Credenciais inválidas.' });
    }
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );
    await User.updateLastLogin(user.id);
    res.cookie('jwt', token, {
      httpOnly: true,   // Inacessível via JS no browser
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 8 * 60 * 60 * 1000  // 8 horas
    });
    return res.redirect('/admin');
  } catch (err) {
    console.error(err);
    return res.render('auth/login', { error: 'Erro interno. Tente novamente.' });
  }
};

exports.doLogout = (req, res) => {
  res.clearCookie('jwt');
  res.redirect('/admin/login');
};
```

### src/controllers/catalog.controller.js
```javascript
const Product  = require('../models/Product.model');
const Category = require('../models/Category.model');

// GET /catalogo/:categorySlug  — página do catálogo com busca+filtro
exports.showCatalog = async (req, res) => {
  const { categorySlug } = req.params;
  const { q = '', filtro = 'todos', page = 1 } = req.query;
  const PER_PAGE = 24;

  const [category, products, categories, total] = await Promise.all([
    Category.findBySlug(categorySlug),
    Product.search({ categorySlug, q, filtro, page, limit: PER_PAGE }),
    Category.findAll(),
    Product.count({ categorySlug, q, filtro }),
  ]);

  if (!category) return res.status(404).render('404');

  res.render('public/catalog', {
    category, products, categories,
    q, filtro, page: Number(page),
    totalPages: Math.ceil(total / PER_PAGE),
  });
};

// GET /api/catalog/search — chamada AJAX dos filtros (retorna JSON)
exports.apiSearch = async (req, res) => {
  const { categorySlug, q = '', filtro = 'todos', page = 1 } = req.query;
  const PER_PAGE = 24;
  const [products, total] = await Promise.all([
    Product.search({ categorySlug, q, filtro, page, limit: PER_PAGE }),
    Product.count({ categorySlug, q, filtro }),
  ]);
  res.json({ products, total, totalPages: Math.ceil(total / PER_PAGE) });
};
```

### src/models/Product.model.js
```javascript
const { query } = require('../config/database');

class ProductModel {
  // Busca com full-text search e filtros
  static async search({ categorySlug, q, filtro, page = 1, limit = 24 }) {
    const offset = (page - 1) * limit;
    const params = [];
    let where = 'p.is_active = TRUE';
    let paramIdx = 1;

    if (categorySlug && categorySlug !== 'todos') {
      params.push(categorySlug);
      where += ` AND c.slug = $${paramIdx++}`;
    }
    if (q) {
      params.push(q);
      where += ` AND to_tsvector('portuguese', p.name || ' ' || COALESCE(p.short_desc,''))
                 @@ plainto_tsquery('portuguese', $${paramIdx++})`;
    }
    if (filtro && filtro !== 'todos') {
      params.push(filtro);
      where += ` AND $${paramIdx++} = ANY(p.tags)`;
    }

    params.push(limit, offset);
    const sql = `
      SELECT
        p.id, p.name, p.slug, p.sku, p.short_desc, p.tags,
        c.name AS category_name, c.slug AS category_slug,
        img.url AS cover_image
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN product_images img ON img.product_id = p.id AND img.is_cover = TRUE
      WHERE ${where}
      ORDER BY p.sort_order ASC, p.created_at DESC
      LIMIT $${paramIdx++} OFFSET $${paramIdx}
    `;
    const { rows } = await query(sql, params);
    return rows;
  }

  static async findBySlug(slug) {
    const { rows } = await query(`
      SELECT p.*, c.name AS category_name, c.slug AS category_slug,
        json_agg(DISTINCT jsonb_build_object(
          'id', img.id, 'url', img.url, 'alt_text', img.alt_text,
          'sort_order', img.sort_order, 'is_cover', img.is_cover
        ) ORDER BY img.sort_order) FILTER (WHERE img.id IS NOT NULL) AS images,
        json_agg(DISTINCT jsonb_build_object(
          'label', dl.label, 'url', dl.url, 'icon', dl.icon
        ) ORDER BY dl.sort_order) FILTER (WHERE dl.id IS NOT NULL) AS downloads
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN product_images img ON img.product_id = p.id
      LEFT JOIN product_downloads dl ON dl.product_id = p.id
      WHERE p.slug = $1 AND p.is_active = TRUE
      GROUP BY p.id, c.name, c.slug
    `, [slug]);
    return rows[0] || null;
  }

  static async count({ categorySlug, q, filtro }) {
    // Similar ao search mas retorna COUNT(*) — omitido por brevidade
  }

  static async create(data) {
    const { rows } = await query(`
      INSERT INTO products
        (category_id, sku, name, slug, short_desc, description, specs, tags, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *
    `, [data.categoryId, data.sku, data.name, data.slug, data.shortDesc,
        data.description, JSON.stringify(data.specs || {}),
        data.tags || [], data.createdBy]);
    return rows[0];
  }
}

module.exports = ProductModel;
```

### src/routes/admin.routes.js
```javascript
const router = require('express').Router();
const { requireAuth, requireAdmin } = require('../middlewares/auth.middleware');
const dashCtrl    = require('../controllers/dashboard.controller');
const productCtrl = require('../controllers/product.controller');
const homeCtrl    = require('../controllers/home.controller');
const mktCtrl     = require('../controllers/marketing.controller');
const upload      = require('../middlewares/upload.middleware');

// Todas as rotas /admin/* passam por requireAuth
router.use(requireAuth);

// ── Dashboard geral
router.get('/',                 dashCtrl.index);

// ── Produtos
router.get('/produtos',         productCtrl.list);
router.get('/produtos/novo',    productCtrl.createForm);
router.post('/produtos/novo',   upload.array('imagens', 10), productCtrl.create);
router.get('/produtos/:id/editar', productCtrl.editForm);
router.post('/produtos/:id',    upload.array('imagens', 10), productCtrl.update);
router.delete('/produtos/:id',  productCtrl.remove);

// ── Editor da Home
router.get('/home-editor',      homeCtrl.showEditor);
router.post('/home-editor/:key', homeCtrl.updateSection);

// ── Linha de Produtos (modal)
router.get('/api/produtos-disponiveis', homeCtrl.listAvailableProducts);
router.post('/home-editor/featured',    homeCtrl.updateFeatured);

// ── Marketing — somente admin
router.get('/marketing',        requireAdmin, mktCtrl.showConfig);
router.post('/marketing',       requireAdmin, mktCtrl.updateConfig);

// ── Usuários — somente admin
router.get('/usuarios',         requireAdmin, dashCtrl.listUsers);
router.post('/usuarios',        requireAdmin, dashCtrl.createUser);

module.exports = router;
```

### app.js
```javascript
const express      = require('express');
const cookieParser = require('cookie-parser');
const path         = require('path');
const helmet       = require('helmet');
require('dotenv').config();

const app = express();

// Segurança
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));

// Rotas
const publicRoutes = require('./src/routes/public.routes');
const authRoutes   = require('./src/routes/auth.routes');
const adminRoutes  = require('./src/routes/admin.routes');

app.use('/',        publicRoutes);
app.use('/auth',    authRoutes);
app.use('/admin',   adminRoutes);

// Error handler
app.use(require('./src/middlewares/error.middleware'));

module.exports = app;
```

---

## 5. INTEGRAÇÃO DAS PÁGINAS HTML/CSS EXISTENTES

### Estratégia: HTML Estático → Templates EJS

EJS (Embedded JavaScript) é um motor de templates que permite inserir lógica
JavaScript dentro de HTML — mínima curva de aprendizado pois a sintaxe HTML
permanece intacta. A migração é cirúrgica:

#### Passo 1 — Extrair a identidade visual para um único arquivo

Crie `public/css/briwax-tokens.css` copiando exatamente as variáveis CSS:

```css
/* public/css/briwax-tokens.css */
:root {
  --blue-deep:   #071470;
  --blue-mid:    #1135b8;
  --blue-bright: #2352e8;
  --blue-light:  #3b82f6;
  --blue-glow:   #60a5fa;
  --white:       #ffffff;
  --off-white:   #f0f5ff;
  --gray:        #e8eef8;
  --text-dark:   #0d1a5c;
  --text-muted:  #5a6fa8;
  --border:      rgba(255,255,255,.18);
  --border-blue: rgba(35,82,232,.18);
  /* Fontes já carregadas no layout.ejs via Google Fonts */
}
```

Isso garante que o Dashboard herde exatamente as mesmas cores.

#### Passo 2 — Criar layouts EJS com partials

**src/views/layouts/main.ejs** (layout público):
```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title><%= title %> · BRIWAX</title>
  <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Rajdhani:wght@300;400;500;600;700&family=Share+Tech+Mono&display=swap" rel="stylesheet"/>
  <link rel="stylesheet" href="/css/briwax-tokens.css"/>
  <link rel="stylesheet" href="/css/main.css"/>
  <%- typeof extraCss !== 'undefined' ? extraCss : '' %>

  <!-- Marketing Tags (injetadas dinamicamente do banco) -->
  <%- marketingHead %>
</head>
<body>
  <%- include('../partials/navbar', { active: active }) %>
  <main><%- body %></main>
  <%- include('../partials/footer') %>
  <%- marketingBody %>
</body>
</html>
```

#### Passo 3 — Migrar as páginas HTML para EJS

A migração de cada página segue este padrão:

**Antes (HTML estático — catálogo):**
```html
<div class="grid" id="grid">
  <div class="prod-card">
    <img src="img/produto.jpg" alt="Produto">
    <div class="prod-name">BRY 432-1</div>
  </div>
  <!-- ... mais cards hard-coded ... -->
</div>
```

**Depois (EJS dinâmico — catálogo):**
```html
<div class="grid" id="grid">
  <% products.forEach(product => { %>
    <a class="prod-card" href="/produto/<%= product.slug %>">
      <img src="<%= product.cover_image || '/img/placeholder.jpg' %>"
           alt="<%= product.name %>">
      <div class="prod-sku"><%= product.sku %></div>
      <div class="prod-name"><%= product.name %></div>
      <div class="prod-desc"><%= product.short_desc %></div>
    </a>
  <% }) %>
  <% if (products.length === 0) { %>
    <div class="no-results visible">
      <!-- SVG e texto de "sem resultados" do HTML original -->
    </div>
  <% } %>
</div>
```

**Página do produto (carousel dinâmico):**
```html
<div class="carousel-track" id="carouselTrack">
  <% product.images.forEach(img => { %>
    <img src="<%= img.url %>" alt="<%= img.alt_text || product.name %>"
         class="carousel-slide"/>
  <% }) %>
</div>
```

#### Passo 4 — Busca AJAX (sem reload de página)

O arquivo `public/js/catalog-filters.js` substitui o filtro estático por
chamadas ao endpoint `/api/catalog/search`:

```javascript
// public/js/catalog-filters.js
const searchInput = document.getElementById('searchInput');
const filterBtns  = document.querySelectorAll('.filter-btn');
const grid        = document.getElementById('grid');
let debounceTimer;

function fetchProducts() {
  const q      = searchInput.value.trim();
  const filtro = document.querySelector('.filter-btn.active')?.dataset.filter || 'todos';
  const slug   = document.body.dataset.categorySlug;

  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    grid.classList.add('loading');
    const res  = await fetch(`/api/catalog/search?categorySlug=${slug}&q=${encodeURIComponent(q)}&filtro=${filtro}`);
    const data = await res.json();
    renderGrid(data.products);
    document.getElementById('resultsCount').textContent = data.total;
    grid.classList.remove('loading');
  }, 300);
}

function renderGrid(products) {
  if (!products.length) {
    grid.innerHTML = `<div class="no-results visible">...</div>`;
    return;
  }
  grid.innerHTML = products.map(p => `
    <a class="prod-card" href="/produto/${p.slug}">
      <img src="${p.cover_image || '/img/placeholder.jpg'}" alt="${p.name}">
      <div class="prod-sku">${p.sku}</div>
      <div class="prod-name">${p.name}</div>
    </a>
  `).join('');
}

searchInput.addEventListener('input', fetchProducts);
filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    fetchProducts();
  });
});
```

---

## 6. DASHBOARD — IDENTIDADE VISUAL HERDADA

O dashboard usa as **mesmas variáveis CSS** do site público, acrescentando
apenas camadas de layout administrativo:

```css
/* public/css/dashboard.css */
/* Todas as variáveis já existem via briwax-tokens.css */

.dash-layout {
  display: grid;
  grid-template-columns: 260px 1fr;
  min-height: 100vh;
}

.dash-sidebar {
  background: var(--blue-deep);           /* Mesma cor da navbar */
  border-right: 1px solid rgba(255,255,255,.1);
  padding: 0;
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
}

.dash-sidebar .logo {
  font-family: 'Bebas Neue', sans-serif;  /* Mesma fonte */
  font-size: 1.7rem;
  letter-spacing: .2em;
  color: var(--white);
  padding: 1.5rem 1.5rem 1rem;
  border-bottom: 1px solid rgba(255,255,255,.08);
}

.dash-nav-item {
  display: flex;
  align-items: center;
  gap: .75rem;
  padding: .8rem 1.5rem;
  font-family: 'Rajdhani', sans-serif;    /* Mesma fonte */
  font-weight: 600;
  font-size: .78rem;
  letter-spacing: .16em;
  text-transform: uppercase;
  color: rgba(255,255,255,.65);
  text-decoration: none;
  transition: all .2s;
  border-left: 3px solid transparent;
}
.dash-nav-item:hover,
.dash-nav-item.active {
  color: var(--white);
  background: rgba(255,255,255,.06);
  border-left-color: var(--blue-bright);  /* Accent azul-brilhante */
}

.dash-main {
  background: var(--off-white);           /* Fundo claro do site */
  padding: 2.5rem 3rem;
}

/* Botões herdam o estilo do .nav-cta do site */
.btn-primary {
  font-family: 'Rajdhani', sans-serif;
  font-weight: 700;
  font-size: .78rem;
  letter-spacing: .16em;
  text-transform: uppercase;
  padding: .6rem 1.6rem;
  background: var(--blue-mid);
  color: var(--white);
  border: 1.5px solid var(--blue-mid);
  cursor: pointer;
  transition: all .25s;
  clip-path: polygon(5px 0%,100% 0%,100% calc(100% - 5px),calc(100% - 5px) 100%,0% 100%,0% 5px);
}
.btn-primary:hover {
  background: var(--blue-bright);
  border-color: var(--blue-bright);
}
```

---

## 7. INJEÇÃO DE MARKETING TAGS (Home.controller.js)

```javascript
// src/controllers/home.controller.js (trecho)
const Marketing = require('../models/Marketing.model');

exports.showHome = async (req, res) => {
  const [sections, featuredProducts, mktConfigs] = await Promise.all([
    HomeSection.findAll(),
    HomeFeatured.findAll(),
    Marketing.findActive(),
  ]);

  // Monta os scripts de rastreamento para injetar no <head> e <body>
  const marketingHead = buildMarketingHeadTags(mktConfigs);
  const marketingBody = buildMarketingBodyTags(mktConfigs);

  res.render('public/home', {
    title: 'Soluções Inovadoras e Parcerias que Movem o Atacado',
    sections: sections.reduce((acc, s) => ({ ...acc, [s.section_key]: s }), {}),
    featuredProducts,
    marketingHead,
    marketingBody,
    active: 'home',
  });
};

function buildMarketingHeadTags(configs) {
  return configs.map(cfg => {
    if (cfg.provider === 'facebook_pixel' && cfg.tracking_id) {
      return `<!-- Facebook Pixel -->
<script>!function(f,b,e,v,n,t,s)...fbq('init','${cfg.tracking_id}');fbq('track','PageView');</script>
<noscript><img src="https://www.facebook.com/tr?id=${cfg.tracking_id}&ev=PageView&noscript=1"/></noscript>`;
    }
    if (cfg.provider === 'gtm' && cfg.tracking_id) {
      return `<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){...})(window,document,'script','dataLayer','${cfg.tracking_id}');</script>`;
    }
    return '';
  }).join('\n');
}
```

---

## 8. VARIÁVEIS DE AMBIENTE (.env.example)

```bash
# Servidor
NODE_ENV=development
PORT=3000

# Banco de dados
DB_HOST=localhost
DB_PORT=5432
DB_NAME=briwax
DB_USER=postgres
DB_PASSWORD=sua_senha_aqui

# Segurança
JWT_SECRET=sua_chave_jwt_super_secreta_minimo_32_chars
BCRYPT_ROUNDS=12

# Upload de arquivos
UPLOAD_MAX_SIZE_MB=10
UPLOAD_PATH=./public/uploads/products
```

---

## 9. DEPENDÊNCIAS (package.json)

```json
{
  "dependencies": {
    "bcrypt": "^5.1.1",
    "cookie-parser": "^1.4.6",
    "dotenv": "^16.4.5",
    "ejs": "^3.1.10",
    "express": "^4.19.2",
    "express-rate-limit": "^7.3.1",
    "helmet": "^7.1.0",
    "jsonwebtoken": "^9.0.2",
    "multer": "^1.4.5",
    "pg": "^8.12.0",
    "slugify": "^1.6.6"
  },
  "devDependencies": {
    "nodemon": "^3.1.4"
  },
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "db:schema": "psql $DATABASE_URL -f database/schema.sql",
    "db:seed": "psql $DATABASE_URL -f database/seed.sql"
  }
}
```

---

## 10. PRÓXIMOS PASSOS (Ordem Sugerida)

```
Fase 1 — Fundação (Semana 1-2)
  ✅ Criar schema.sql e executar no PostgreSQL
  ✅ Configurar express + EJS + conexão pool
  ✅ Implementar autenticação JWT (login/logout)
  ✅ Migrar navbar e footer para partials EJS

Fase 2 — Páginas Públicas Dinâmicas (Semana 2-3)
  ✅ Migrar Home para EJS com dados do banco
  ✅ Migrar Catálogo + endpoint de busca AJAX
  ✅ Migrar página de Produto (carrossel dinâmico)

Fase 3 — Dashboard (Semana 3-5)
  ✅ Layout sidebar + topbar com identidade visual
  ✅ CRUD de Produtos (listagem, criação, edição, exclusão)
  ✅ Upload de imagens com Multer
  ✅ Editor de seções da Home
  ✅ Modal "Linha de Produtos"

Fase 4 — Marketing & Polimento (Semana 5-6)
  ✅ Página de configurações de marketing
  ✅ Injeção dinâmica de Pixel FB / GTM
  ✅ Audit log para rastreabilidade
  ✅ Rate limiting e hardening de segurança
```
