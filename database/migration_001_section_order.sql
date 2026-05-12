-- =============================================================
-- Migration 001: Ordenação de seções + seções faltantes
-- Execute após seed.sql:
--   psql -U postgres -d briwax -f database/migration_001_section_order.sql
-- =============================================================

-- Inserir seções que não existem no seed original
INSERT INTO home_sections (section_key, section_type, title, subtitle, sort_order, is_visible)
VALUES
  ('feature_blue', 'featured_products', NULL, NULL,                    15, TRUE),
  ('feature_dark',  'featured_products', NULL, NULL,                   25, TRUE),
  ('about',         'about',            'Quem Somos', 'Sobre a Briwax', 35, TRUE)
ON CONFLICT (section_key) DO NOTHING;

-- Garantir sort_orders corretos para todas as seções
UPDATE home_sections SET sort_order = 10  WHERE section_key = 'hero';
UPDATE home_sections SET sort_order = 15  WHERE section_key = 'feature_blue';
UPDATE home_sections SET sort_order = 20  WHERE section_key = 'featured_products';
UPDATE home_sections SET sort_order = 25  WHERE section_key = 'feature_dark';
UPDATE home_sections SET sort_order = 35  WHERE section_key = 'about';
UPDATE home_sections SET sort_order = 40  WHERE section_key = 'categories';
UPDATE home_sections SET sort_order = 50  WHERE section_key = 'contact';
UPDATE home_sections SET sort_order = 60  WHERE section_key = 'footer';

-- Confirmar resultado
SELECT section_key, section_type, sort_order, is_visible
FROM home_sections
ORDER BY sort_order;
