'use strict';
const { query } = require('../config/database');

class CategoryModel {
  static async findAll(onlyActive = false) {
    const sql = onlyActive
      ? 'SELECT * FROM categories WHERE is_active = TRUE ORDER BY sort_order ASC'
      : 'SELECT * FROM categories ORDER BY sort_order ASC';
    const { rows } = await query(sql);
    return rows;
  }

  static async findBySlug(slug) {
    const { rows } = await query(
      'SELECT * FROM categories WHERE slug = $1 AND is_active = TRUE',
      [slug]
    );
    return rows[0] || null;
  }

  static async findById(id) {
    const { rows } = await query(
      'SELECT * FROM categories WHERE id = $1',
      [id]
    );
    return rows[0] || null;
  }
}

module.exports = CategoryModel;
