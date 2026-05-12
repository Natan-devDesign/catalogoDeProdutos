'use strict';
const { query } = require('../config/database');

class AuditLogModel {
  static async log({ userId, action, entityType, entityId, oldValue, newValue, ipAddress }) {
    try {
      // Verificar se o userId realmente existe no banco antes de inserir.
      // Evita FK violation quando o JWT tem um ID de uma sessão antiga/banco diferente.
      let safeUserId = null;
      if (userId) {
        const { rows } = await query('SELECT id FROM users WHERE id = $1', [userId]);
        safeUserId = rows.length > 0 ? userId : null;
      }

      await query(`
        INSERT INTO audit_log
          (user_id, action, entity_type, entity_id, old_value, new_value, ip_address)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        safeUserId,
        action,
        entityType || null,
        entityId   ? String(entityId) : null,
        oldValue   ? JSON.stringify(oldValue) : null,
        newValue   ? JSON.stringify(newValue) : null,
        ipAddress  || null,
      ]);
    } catch (err) {
      // AuditLog nunca deve derrubar a operação principal
      console.warn('[AuditLog] Falha silenciosa:', err.message);
    }
  }

  static async recent(limit = 20) {
    const { rows } = await query(`
      SELECT al.*, u.name AS user_name
      FROM audit_log al
      LEFT JOIN users u ON u.id = al.user_id
      ORDER BY al.created_at DESC
      LIMIT $1
    `, [limit]);
    return rows;
  }
}

module.exports = AuditLogModel;
