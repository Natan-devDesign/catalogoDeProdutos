# BRIWAX — Sistema Web Completo

Stack: **Node.js · Express · PostgreSQL · EJS · MVC**

---

## Pré-requisitos

- Node.js 18+
- PostgreSQL 14+
- npm

---

## Instalação em 6 passos

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Edite `.env` com suas credenciais:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=briwax
DB_USER=postgres
DB_PASSWORD=sua_senha

# Gere com: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
JWT_SECRET=sua_chave_jwt_minimo_48_caracteres

BCRYPT_ROUNDS=12
PORT=3000
NODE_ENV=development
UPLOAD_MAX_SIZE_MB=10
```

### 3. Criar o banco de dados

```bash
psql -U postgres -c "CREATE DATABASE briwax WITH ENCODING='UTF8' LC_COLLATE='pt_BR.UTF-8' LC_CTYPE='pt_BR.UTF-8';"
```

### 4. Executar o schema

```bash
psql -U postgres -d briwax -f database/schema.sql
```

### 5. Gerar o hash da senha do admin e popular o banco

```bash
# Gera o hash bcrypt da senha desejada
node scripts/hash-password.js Admin@2025
```

Copie o hash gerado, abra `database/seed.sql` e substitua o placeholder:

```
SUBSTITUA_PELO_HASH_GERADO_NO_NODE
```

Depois execute:

```bash
psql -U postgres -d briwax -f database/seed.sql
```

### 6. Executar a migration de ordenação de seções

```bash
psql -U postgres -d briwax -f database/migration_001_section_order.sql
```

### 7. Iniciar o servidor

```bash
# Desenvolvimento (auto-reload)
npm run dev

# Produção
npm start
```

Acesse: **http://localhost:3000**  
Dashboard: **http://localhost:3000/admin**

---

## Credenciais padrão do admin

| Campo  | Valor                  |
|--------|------------------------|
| E-mail | `admin@briwax.com.br`  |
| Senha  | `Admin@2025`           |

> **Troque a senha imediatamente após o primeiro acesso.**

---

## Estrutura de arquivos

```
briwax/
├── app.js                            # Express app (middlewares, rotas)
├── server.js                         # Entry point (listen + health check)
├── package.json
├── .env.example
├── .gitignore
├── README.md
├── ARQUITETURA.md
│
├── database/
│   ├── schema.sql                    # DDL completo — execute primeiro
│   ├── seed.sql                      # Dados iniciais — execute segundo
│   └── migration_001_section_order.sql  # Ordenação de seções — execute por último
│
├── scripts/
│   └── hash-password.js              # Gera hash bcrypt para senhas
│
├── public/
│   ├── js/
│   │   └── catalog-filters.js        # Busca AJAX do catálogo (sem reload)
│   └── uploads/
│       └── products/                 # Imagens enviadas pelo dashboard
│
└── src/
    ├── config/
    │   └── database.js               # Pool de conexão PostgreSQL
    │
    ├── models/
    │   ├── index.js                  # Barrel — exporta todos os models
    │   ├── Product.model.js          # Busca FTS, CRUD, imagens, downloads
    │   ├── User.model.js
    │   ├── Category.model.js
    │   ├── HomeSection.model.js
    │   ├── HomeFeatured.model.js
    │   ├── Marketing.model.js
    │   └── AuditLog.model.js
    │
    ├── controllers/
    │   ├── auth.controller.js        # Login / logout / JWT
    │   ├── dashboard.controller.js   # Painel + gestão de usuários
    │   ├── product.controller.js     # CRUD de produtos + uploads
    │   ├── catalog.controller.js     # Catálogo público + busca AJAX
    │   ├── home.controller.js        # Home pública + editor + featured + reorder
    │   └── marketing.controller.js   # Pixel FB / GTM / GA4
    │
    ├── routes/
    │   ├── public.routes.js          # /, /catalogo/:slug, /produto/:slug
    │   ├── auth.routes.js            # /auth/login, /auth/logout
    │   └── admin.routes.js           # /admin/* (protegidas por JWT)
    │
    ├── middlewares/
    │   ├── auth.middleware.js        # requireAuth, requireAdmin
    │   ├── upload.middleware.js      # Multer para imagens de produto
    │   └── error.middleware.js       # Handler global de erros
    │
    └── views/
        ├── layouts/
        │   └── dashboard.ejs         # Layout do painel administrativo
        ├── auth/
        │   └── login.ejs             # Página de login
        ├── public/
        │   ├── home.ejs              # Home dinâmica com 3 seções de produtos
        │   ├── catalog.ejs           # Catálogo com filtros AJAX
        │   ├── product.ejs           # Produto com carrossel dinâmico
        │   └── 404.ejs
        └── admin/
            ├── dashboard.ejs         # Visão geral + atividade recente
            ├── home-editor.ejs       # Editor de seções + drag & drop + modal featured
            ├── marketing.ejs         # Pixel FB / GTM / GA4
            ├── users.ejs             # Gestão de usuários
            ├── 403.ejs
            └── products/
                ├── index.ejs         # Listagem com busca e filtros
                └── create.ejs        # Criar / editar produto
```

---

## Rotas do sistema

### Públicas

| Método | Rota                        | Descrição                        |
|--------|-----------------------------|----------------------------------|
| GET    | `/`                         | Home dinâmica                    |
| GET    | `/catalogo/:slug`           | Catálogo por categoria           |
| GET    | `/produto/:slug`            | Página do produto                |
| GET    | `/api/catalog/search`       | Busca AJAX (retorna JSON)        |

### Autenticação

| Método | Rota             | Descrição       |
|--------|------------------|-----------------|
| GET    | `/auth/login`    | Tela de login   |
| POST   | `/auth/login`    | Autenticar      |
| POST   | `/auth/logout`   | Encerrar sessão |

### Admin (requer JWT)

| Método      | Rota                              | Acesso       |
|-------------|-----------------------------------|--------------|
| GET         | `/admin`                          | todos        |
| GET/POST    | `/admin/produtos`                 | todos        |
| GET/POST    | `/admin/produtos/novo`            | todos        |
| GET/POST    | `/admin/produtos/:id/editar`      | todos        |
| GET/POST    | `/admin/home-editor`              | todos        |
| POST        | `/admin/home-editor/featured`     | todos        |
| POST        | `/admin/home-editor/reorder`      | todos        |
| POST        | `/admin/home-editor/:key`         | todos        |
| GET         | `/admin/api/produtos-disponiveis` | todos        |
| GET/POST    | `/admin/marketing`                | **admin**    |
| GET/POST    | `/admin/usuarios`                 | **admin**    |

---

## Níveis de acesso

| Role     | Produtos | Home Editor | Marketing | Usuários |
|----------|----------|-------------|-----------|----------|
| `admin`  | ✅        | ✅           | ✅         | ✅        |
| `editor` | ✅        | ✅           | ❌         | ❌        |

---

## Seções da Home e lógica de produtos em destaque

A Home é composta por seções ordenáveis via drag & drop no editor:

| Seção               | Descrição                                           |
|---------------------|-----------------------------------------------------|
| `hero`              | Banner principal com beam canvas e navegação        |
| `feature_blue`      | 1º produto em destaque — fundo azul                 |
| `featured_products` | Grid de cards horizontais — "Linha de Produtos"     |
| `feature_dark`      | Último produto em destaque — fundo escuro           |
| `about`             | Seção "Quem Somos" com círculo animado              |
| `categories`        | Grid de categorias/catálogos                        |
| `contact`           | Contato com botão WhatsApp                          |
| `footer`            | Rodapé com logo, tagline e redes sociais            |

### Distribuição automática dos produtos em destaque

Os produtos selecionados no editor são distribuídos automaticamente:

```
Lista de produtos selecionados: [A, B, C, D, E]
  └─ A         →  feature_blue  (destaque azul)
  └─ B, C, D   →  featured_products  (cards horizontais)
  └─ E         →  feature_dark  (destaque escuro)
```

Com apenas 1 produto selecionado, só o `feature_blue` é exibido.  
Com 2 produtos, `feature_blue` + `feature_dark`.  
A partir de 3, os do meio viram cards.

### Reordenar seções

No editor da Home, arraste os itens do painel "Ordem das Seções" e clique em **Salvar Ordem**. A mudança persiste no banco e a home reflete imediatamente.

---

## Tags de marketing

Configure em `/admin/marketing` (apenas role `admin`).  
Os scripts são injetados automaticamente em todas as páginas públicas quando ativos.

| Provider          | Formato do ID     |
|-------------------|-------------------|
| Facebook Pixel    | `1234567890`      |
| Google Tag Manager| `GTM-XXXXXXX`     |
| Google Analytics 4| `G-XXXXXXXXXX`    |

---

## Scripts npm

```bash
npm run dev          # Nodemon (auto-reload)
npm start            # Produção
npm run db:schema    # Executa schema.sql via DATABASE_URL
npm run db:seed      # Executa seed.sql via DATABASE_URL
npm run db:reset     # Drop + schema + seed (CUIDADO em produção)
npm run hash -- MinhaS3nha   # Gera hash bcrypt da senha
```

---

## Deploy em produção (Railway / Render / Heroku)

1. Defina `DATABASE_URL` no painel — o `database.js` detecta automaticamente  
2. Defina `NODE_ENV=production`  
3. Defina `JWT_SECRET` com valor longo e aleatório  
4. Comando de build: `npm install`  
5. Comando de start: `npm start`  
6. Execute as migrations manualmente via console do banco ou SQL runner da plataforma

---

## Variáveis de ambiente

| Variável              | Obrigatória | Descrição                              |
|-----------------------|-------------|----------------------------------------|
| `DB_HOST`             | sim         | Host do PostgreSQL                     |
| `DB_PORT`             | não         | Porta (padrão: 5432)                   |
| `DB_NAME`             | sim         | Nome do banco                          |
| `DB_USER`             | sim         | Usuário do banco                       |
| `DB_PASSWORD`         | sim         | Senha do banco                         |
| `DATABASE_URL`        | alternativa | URL completa (Railway/Render/Heroku)   |
| `JWT_SECRET`          | sim         | Chave secreta JWT (mín. 48 chars)      |
| `BCRYPT_ROUNDS`       | não         | Rounds bcrypt (padrão: 12)             |
| `PORT`                | não         | Porta do servidor (padrão: 3000)       |
| `NODE_ENV`            | não         | `development` ou `production`          |
| `UPLOAD_MAX_SIZE_MB`  | não         | Tamanho máximo de upload (padrão: 10)  |
