-- ============================================================
-- BRIWAX — Seed Inicial
-- ATENÇÃO: Gere o hash real com Node antes de executar:
--   node -e "const b=require('bcrypt');b.hash('Admin@2025',12).then(console.log)"
-- Substitua o valor abaixo pelo hash gerado.
-- ============================================================

-- Admin padrão (senha: Admin@2025)
INSERT INTO users (name, email, password_hash, role) VALUES (
  'Administrador Briwax',
  'admin@briwax.com.br',
  '$2b$12$SUBSTITUA_PELO_HASH_GERADO_NO_NODE',
  'admin'
);

-- Categorias
INSERT INTO categories (name, slug, description, sort_order, icon_svg) VALUES
(
  'Iluminação Profissional',
  'iluminacao-profissional',
  'Moving heads, beam lights e par leds de alta performance para shows, eventos e instalações.',
  1,
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>'
),
(
  'Automotivo',
  'automotivo',
  'Linha completa de produtos automotivos inovadores para o mercado atacadista brasileiro.',
  2,
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2M8 4v4h8V4M8 4h8M12 11v5M9.5 13.5L12 11l2.5 2.5"/></svg>'
),
(
  'Tecnologia',
  'tecnologia',
  'Produtos tecnológicos de ponta para o mercado atacadista com foco em inovação e qualidade.',
  3,
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"/></svg>'
);

-- Seções da Home
INSERT INTO home_sections (section_key, section_type, title, subtitle, body, cta_label, cta_url, extra_data, sort_order) VALUES
(
  'hero',
  'hero',
  'Soluções Inovadoras e Parcerias que Movem o Atacado',
  'Distribuidor oficial de equipamentos para o mercado atacadista brasileiro',
  NULL,
  'Fale no WhatsApp',
  'https://wa.me/5511962769557',
  '{"eyebrow": "Briwax · Zhejiang, China", "whatsapp": "5511962769557"}',
  1
),
(
  'featured_products',
  'featured_products',
  'Linha de Produtos',
  'Produtos em Destaque',
  NULL,
  NULL,
  NULL,
  '{}',
  2
),
(
  'categories',
  'categories',
  'Segmentos de Atuação',
  'Nossos Catálogos',
  NULL,
  'Ver Todos os Catálogos',
  'https://briwax.com.br/todos-catalogos/',
  '{}',
  3
),
(
  'contact',
  'contact',
  'Vamos fazer negócio?',
  'Fale Conosco',
  'Entre em contato com nossa equipe e solicite seu acesso ao catálogo completo',
  'WhatsApp',
  'https://wa.me/5511962769557',
  '{"whatsapp": "5511962769557", "whatsapp_text": "Olá! Gostaria de mais informações."}',
  4
),
(
  'footer',
  'footer',
  'BRIWAX',
  'Soluções Inovadoras e Parcerias que Movem o Atacado.',
  NULL,
  NULL,
  NULL,
  '{"location": "Zhejiang, China · Mercado Atacadista Brasileiro", "copyright": "© 2025 BRIWAX · TODOS OS DIREITOS RESERVADOS · ZHEJIANG, CHINA", "instagram": "https://www.instagram.com/briwax_oficial", "facebook": "https://www.facebook.com/profile.php?id=61566373353292", "linkedin": "https://www.linkedin.com/company/briwax-oficial/", "whatsapp": "https://wa.me/5511962769557"}',
  5
);

-- Configurações de Marketing (inativas por padrão)
INSERT INTO marketing_configs (provider, label, tracking_id, is_active, extra_conf) VALUES
('facebook_pixel', 'Facebook Pixel',        NULL, FALSE, '{"events": ["PageView", "ViewContent", "Contact"]}'),
('gtm',            'Google Tag Manager',     NULL, FALSE, '{}'),
('ga4',            'Google Analytics 4',     NULL, FALSE, '{}');
