'use strict';
const { query } = require('../config/database');

class MarketingModel {
  static async findAll() {
    const { rows } = await query(
      'SELECT * FROM marketing_configs ORDER BY id ASC'
    );
    return rows;
  }

  static async findActive() {
    const { rows } = await query(
      `SELECT * FROM marketing_configs
       WHERE is_active = TRUE
         AND tracking_id IS NOT NULL
         AND tracking_id != ''`
    );
    return rows;
  }

  static async upsert(provider, { trackingId, isActive, extraConf, updatedBy }) {
    const { rows } = await query(`
      UPDATE marketing_configs SET
        tracking_id = $1,
        is_active   = $2,
        extra_conf  = $3,
        updated_by  = $4
      WHERE provider = $5
      RETURNING *
    `, [
      trackingId || null,
      isActive   || false,
      JSON.stringify(extraConf || {}),
      updatedBy  || null,
      provider,
    ]);
    return rows[0];
  }
}

module.exports = MarketingModel;
