-- =============================================================
-- FIX: JWT Token com UUID que não existe mais no banco
-- Execute quando aparecer erro:
--   "violação de chave estrangeira ... user_id ... não está presente"
--
-- Este script lista os usuários ativos para você confirmar
-- e limpar sessões antigas sem desativar o banco.
-- =============================================================

-- Ver usuários atuais no banco
SELECT id, name, email, role, created_at FROM users ORDER BY created_at;

-- Se necessário, recriar o admin com um UUID específico (substitua os valores):
-- INSERT INTO users (id, name, email, password_hash, role)
-- VALUES (
--   'SEU_UUID_DO_JWT_AQUI',          -- cole o UUID do erro
--   'Administrador Briwax',
--   'admin@briwax.com.br',
--   '$2b$12$HASH_GERADO_COM_HASH-PASSWORD_SCRIPT',
--   'admin'
-- ) ON CONFLICT (id) DO NOTHING;
