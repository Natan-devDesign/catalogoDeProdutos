-- ============================================================
-- BRIWAX — Schema Completo PostgreSQL 15+
-- Execute: psql -d briwax -f database/schema.sql
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── ENUMS ──────────────────────────────────────────────────
CREATE TYPE user_role AS ENUM ('admin', 'editor');
CREATE TYPE section_type AS ENUM (
  'hero', 'about', 'featured_products',
  'categories', 'contact', 'footer'
);

-- ── FUNÇÃO: updated_at automático ──────────────────────────
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- ── TABELA: users ───────────────────────────────────────────
CREATE TABLE users (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(120) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          user_role    NOT NULL DEFAULT 'editor',
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  last_login    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ── TABELA: categories ─────────────────────────────────────
CREATE TABLE categories (
  id          SERIAL       PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  slug        VARCHAR(120) NOT NULL UNIQUE,
  description TEXT,
  icon_svg    TEXT,
  sort_order  SMALLINT     NOT NULL DEFAULT 0,
  is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── TABELA: products ────────────────────────────────────────
CREATE TABLE products (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id INT          REFERENCES categories(id) ON DELETE SET NULL,
  sku         VARCHAR(60)  NOT NULL UNIQUE,
  name        VARCHAR(200) NOT NULL,
  slug        VARCHAR(220) NOT NULL UNIQUE,
  short_desc  VARCHAR(400),
  description TEXT,
  specs       JSONB        NOT NULL DEFAULT '{}',
  tags        TEXT[]       NOT NULL DEFAULT '{}',
  is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
  sort_order  INT          NOT NULL DEFAULT 0,
  created_by  UUID         REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_products_category ON products(category_id) WHERE is_active = TRUE;
CREATE INDEX idx_products_slug     ON products(slug);
CREATE INDEX idx_products_tags     ON products USING GIN(tags);
CREATE INDEX idx_products_fts      ON products
  USING GIN(to_tsvector('portuguese', name || ' ' || COALESCE(short_desc, '')));
CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ── TABELA: product_images ──────────────────────────────────
CREATE TABLE product_images (
  id         SERIAL       PRIMARY KEY,
  product_id UUID         NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url        VARCHAR(500) NOT NULL,
  alt_text   VARCHAR(200),
  sort_order SMALLINT     NOT NULL DEFAULT 0,
  is_cover   BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_product_images_product ON product_images(product_id);

-- ── TABELA: product_downloads ───────────────────────────────
CREATE TABLE product_downloads (
  id         SERIAL       PRIMARY KEY,
  product_id UUID         NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  label      VARCHAR(150) NOT NULL,
  url        VARCHAR(500) NOT NULL,
  icon       VARCHAR(50),
  sort_order SMALLINT     NOT NULL DEFAULT 0
);
CREATE INDEX idx_product_downloads_product ON product_downloads(product_id);

-- ── TABELA: home_sections ───────────────────────────────────
CREATE TABLE home_sections (
  id           SERIAL       PRIMARY KEY,
  section_key  VARCHAR(80)  NOT NULL UNIQUE,
  section_type section_type NOT NULL,
  title        VARCHAR(300),
  subtitle     VARCHAR(500),
  body         TEXT,
  cta_label    VARCHAR(100),
  cta_url      VARCHAR(500),
  extra_data   JSONB        NOT NULL DEFAULT '{}',
  is_visible   BOOLEAN      NOT NULL DEFAULT TRUE,
  sort_order   SMALLINT     NOT NULL DEFAULT 0,
  updated_by   UUID         REFERENCES users(id) ON DELETE SET NULL,
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_home_sections_updated_at
  BEFORE UPDATE ON home_sections FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ── TABELA: home_featured_products ─────────────────────────
CREATE TABLE home_featured_products (
  id         SERIAL      PRIMARY KEY,
  product_id UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sort_order SMALLINT    NOT NULL DEFAULT 0,
  added_by   UUID        REFERENCES users(id) ON DELETE SET NULL,
  added_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(product_id)
);

-- ── TABELA: marketing_configs ───────────────────────────────
CREATE TABLE marketing_configs (
  id          SERIAL       PRIMARY KEY,
  provider    VARCHAR(60)  NOT NULL UNIQUE,
  label       VARCHAR(120) NOT NULL,
  tracking_id VARCHAR(200),
  is_active   BOOLEAN      NOT NULL DEFAULT FALSE,
  extra_conf  JSONB        NOT NULL DEFAULT '{}',
  updated_by  UUID         REFERENCES users(id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_marketing_updated_at
  BEFORE UPDATE ON marketing_configs FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ── TABELA: audit_log ───────────────────────────────────────
CREATE TABLE audit_log (
  id          BIGSERIAL    PRIMARY KEY,
  user_id     UUID         REFERENCES users(id) ON DELETE SET NULL,
  action      VARCHAR(100) NOT NULL,
  entity_type VARCHAR(60),
  entity_id   VARCHAR(100),
  old_value   JSONB,
  new_value   JSONB,
  ip_address  INET,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_audit_user    ON audit_log(user_id);
CREATE INDEX idx_audit_entity  ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_created ON audit_log(created_at DESC);
