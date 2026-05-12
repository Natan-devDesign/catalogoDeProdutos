'use strict';
const { query, pool } = require('../config/database');

class HomeFeaturedModel {
  static async findAll() {
    const sql = `
      SELECT
        hfp.id          AS hfp_id,
        hfp.product_id  AS id,
        hfp.sort_order,
        p.name, p.slug, p.sku, p.short_desc,
        img.url AS cover_image
      FROM home_featured_products hfp
      JOIN products p ON p.id = hfp.product_id
      LEFT JOIN product_images img
             ON img.product_id = p.id AND img.is_cover = TRUE
      WHERE p.is_active = TRUE
      ORDER BY hfp.sort_order ASC
    `;
    const { rows } = await query(sql);
    return rows;
  }

  /**
   * Substitui toda a seleção de produtos em destaque de uma vez.
   * Usa transação para garantir consistência.
   */
  static async setFeatured(productIds = [], addedBy = null) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM home_featured_products');
      for (let i = 0; i < productIds.length; i++) {
        await client.query(
          `INSERT INTO home_featured_products (product_id, sort_order, added_by)
           VALUES ($1, $2, $3)
           ON CONFLICT (product_id) DO UPDATE SET sort_order = $2`,
          [productIds[i], i, addedBy]
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

module.exports = HomeFeaturedModel;
