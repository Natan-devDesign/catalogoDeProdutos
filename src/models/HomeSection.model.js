'use strict';
const { query } = require('../config/database');

class HomeSectionModel {
  static async findAll() {
    const { rows } = await query(
      'SELECT * FROM home_sections ORDER BY sort_order ASC'
    );
    return rows;
  }

  static async findByKey(key) {
    const { rows } = await query(
      'SELECT * FROM home_sections WHERE section_key = $1',
      [key]
    );
    return rows[0] || null;
  }

  static async update(key, { title, subtitle, body, ctaLabel, ctaUrl, extraData, isVisible, updatedBy }) {
    const { rows } = await query(`
      UPDATE home_sections SET
        title      = $1,
        subtitle   = $2,
        body       = $3,
        cta_label  = $4,
        cta_url    = $5,
        extra_data = $6,
        is_visible = $7,
        updated_by = $8
      WHERE section_key = $9
      RETURNING *
    `, [
      title      || null,
      subtitle   || null,
      body       || null,
      ctaLabel   || null,
      ctaUrl     || null,
      JSON.stringify(extraData || {}),
      isVisible !== false,
      updatedBy  || null,
      key,
    ]);
    return rows[0];
  }
}

module.exports = HomeSectionModel;
