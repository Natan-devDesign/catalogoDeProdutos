// src/models/Product.model.js
'use strict';

const { query } = require('../config/database');
const slugify   = require('slugify');

class ProductModel {

  // ── BUSCA COM FULL-TEXT E FILTROS ─────────────────────────────
  static async search({ categorySlug, q, filtro, page = 1, limit = 24 }) {
    const offset = (Number(page) - 1) * Number(limit);
    const params = [];
    let idx = 1;
    const conditions = ['p.is_active = TRUE'];

    if (categorySlug && categorySlug !== 'todos') {
      params.push(categorySlug);
      conditions.push(`c.slug = $${idx++}`);
    }
    if (q && q.trim()) {
      params.push(q.trim());
      conditions.push(
        `to_tsvector('portuguese', p.name || ' ' || COALESCE(p.short_desc,''))
         @@ plainto_tsquery('portuguese', $${idx++})`
      );
    }
    if (filtro && filtro !== 'todos') {
      params.push(filtro);
      conditions.push(`$${idx++} = ANY(p.tags)`);
    }

    params.push(limit, offset);
    const sql = `
      SELECT
        p.id, p.name, p.slug, p.sku, p.short_desc, p.tags,
        p.is_active, p.sort_order, p.updated_at,
        c.name  AS category_name,
        c.slug  AS category_slug,
        img.url AS cover_image
      FROM products p
      LEFT JOIN categories   c   ON c.id = p.category_id
      LEFT JOIN product_images img
             ON img.product_id = p.id AND img.is_cover = TRUE
      WHERE ${conditions.join(' AND ')}
      ORDER BY p.sort_order ASC, p.created_at DESC
      LIMIT $${idx++} OFFSET $${idx}
    `;
    const { rows } = await query(sql, params);
    return rows;
  }

  // ── CONTAGEM (para paginação) ─────────────────────────────────
  static async count({ categorySlug, q, filtro } = {}) {
    const params = [];
    let idx = 1;
    const conditions = ['p.is_active = TRUE'];

    if (categorySlug && categorySlug !== 'todos') {
      params.push(categorySlug);
      conditions.push(`c.slug = $${idx++}`);
    }
    if (q && q.trim()) {
      params.push(q.trim());
      conditions.push(
        `to_tsvector('portuguese', p.name || ' ' || COALESCE(p.short_desc,''))
         @@ plainto_tsquery('portuguese', $${idx++})`
      );
    }
    if (filtro && filtro !== 'todos') {
      params.push(filtro);
      conditions.push(`$${idx++} = ANY(p.tags)`);
    }

    const sql = `
      SELECT COUNT(*) AS total
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE ${conditions.join(' AND ')}
    `;
    const { rows } = await query(sql, params);
    return Number(rows[0].total);
  }

  // ── BUSCA POR SLUG (página do produto) ───────────────────────
  static async findBySlug(slug) {
    const sql = `
      SELECT
        p.*,
        c.name AS category_name,
        c.slug AS category_slug,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id',         img.id,
              'url',        img.url,
              'alt_text',   img.alt_text,
              'sort_order', img.sort_order,
              'is_cover',   img.is_cover
            )
          ) FILTER (WHERE img.id IS NOT NULL),
          '[]'
        ) AS images,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id',         dl.id,
              'label',      dl.label,
              'url',        dl.url,
              'icon',       dl.icon,
              'sort_order', dl.sort_order
            )
          ) FILTER (WHERE dl.id IS NOT NULL),
          '[]'
        ) AS downloads
      FROM products p
      LEFT JOIN categories       c   ON c.id = p.category_id
      LEFT JOIN product_images   img ON img.product_id = p.id
      LEFT JOIN product_downloads dl ON dl.product_id  = p.id
      WHERE p.slug = $1 AND p.is_active = TRUE
      GROUP BY p.id, c.name, c.slug
    `;
    const { rows } = await query(sql, [slug]);
    if (!rows[0]) return null;

    // Ordenar imagens por sort_order
    rows[0].images.sort((a, b) => a.sort_order - b.sort_order);
    rows[0].downloads.sort((a, b) => a.sort_order - b.sort_order);
    return rows[0];
  }

  // ── BUSCA POR ID ──────────────────────────────────────────────
  static async findById(id) {
    const sql = `
      SELECT
        p.*,
        c.name AS category_name,
        c.slug AS category_slug,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object(
            'id', img.id, 'url', img.url, 'alt_text', img.alt_text,
            'sort_order', img.sort_order, 'is_cover', img.is_cover
          )) FILTER (WHERE img.id IS NOT NULL), '[]'
        ) AS images,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object(
            'id', dl.id, 'label', dl.label, 'url', dl.url,
            'icon', dl.icon, 'sort_order', dl.sort_order
          )) FILTER (WHERE dl.id IS NOT NULL), '[]'
        ) AS downloads
      FROM products p
      LEFT JOIN categories       c   ON c.id = p.category_id
      LEFT JOIN product_images   img ON img.product_id = p.id
      LEFT JOIN product_downloads dl ON dl.product_id  = p.id
      WHERE p.id = $1
      GROUP BY p.id, c.name, c.slug
    `;
    const { rows } = await query(sql, [id]);
    return rows[0] || null;
  }

  // ── LISTAR TODOS (dashboard) ──────────────────────────────────
  static async findAll({ q, categoryId, page = 1, limit = 30 } = {}) {
    const offset = (Number(page) - 1) * Number(limit);
    const params = [];
    let idx = 1;
    const conditions = ['1=1'];

    if (q && q.trim()) {
      params.push(`%${q.trim()}%`);
      conditions.push(`(p.name ILIKE $${idx++} OR p.sku ILIKE $${idx - 1})`);
    }
    if (categoryId) {
      params.push(categoryId);
      conditions.push(`p.category_id = $${idx++}`);
    }
    params.push(limit, offset);

    const sql = `
      SELECT
        p.id, p.name, p.slug, p.sku, p.short_desc,
        p.is_active, p.sort_order, p.updated_at, p.category_id,
        c.name AS category_name,
        img.url AS cover_image
      FROM products p
      LEFT JOIN categories   c   ON c.id = p.category_id
      LEFT JOIN product_images img ON img.product_id = p.id AND img.is_cover = TRUE
      WHERE ${conditions.join(' AND ')}
      ORDER BY p.sort_order ASC, p.created_at DESC
      LIMIT $${idx++} OFFSET $${idx}
    `;
    const { rows } = await query(sql, params);
    return rows;
  }

  static async countAll({ q, categoryId } = {}) {
    const params = [];
    let idx = 1;
    const conditions = ['1=1'];
    if (q && q.trim()) {
      params.push(`%${q.trim()}%`);
      conditions.push(`(p.name ILIKE $${idx++} OR p.sku ILIKE $${idx - 1})`);
    }
    if (categoryId) { params.push(categoryId); conditions.push(`p.category_id = $${idx++}`); }
    const sql = `SELECT COUNT(*) AS total FROM products p WHERE ${conditions.join(' AND ')}`;
    const { rows } = await query(sql, params);
    return Number(rows[0].total);
  }

  // ── LISTAR TODOS PARA MODAL (ativos) ──────────────────────────
  static async findAllActive() {
    const sql = `
      SELECT p.id, p.name, p.sku, p.slug,
             img.url AS cover_image
      FROM products p
      LEFT JOIN product_images img ON img.product_id = p.id AND img.is_cover = TRUE
      WHERE p.is_active = TRUE
      ORDER BY p.sort_order ASC, p.name ASC
    `;
    const { rows } = await query(sql);
    return rows;
  }

  // ── CREATE ────────────────────────────────────────────────────
  static async create({ categoryId, sku, name, slug, shortDesc, description, specs, tags, sortOrder, createdBy }) {
    // Gerar slug se não fornecido
    const finalSlug = slug || slugify(name, { lower: true, strict: true, locale: 'pt' });

    // Verificar se createdBy existe no banco (evita FK violation por JWT antigo)
    let safeCreatedBy = null;
    if (createdBy) {
      const { rows: urows } = await query('SELECT id FROM users WHERE id = $1', [createdBy]);
      safeCreatedBy = urows.length > 0 ? createdBy : null;
    }

    const sql = `
      INSERT INTO products
        (category_id, sku, name, slug, short_desc, description, specs, tags, sort_order, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *
    `;
    const params = [
      categoryId || null, sku, name, finalSlug,
      shortDesc || null, description || null,
      JSON.stringify(specs || {}),
      tags || [],
      sortOrder || 0,
      safeCreatedBy,
    ];
    const { rows } = await query(sql, params);
    return rows[0];
  }

  // ── UPDATE ────────────────────────────────────────────────────
  static async update(id, { categoryId, sku, name, slug, shortDesc, description, specs, tags, isActive, sortOrder }) {
    const sql = `
      UPDATE products SET
        category_id  = $1,
        sku          = $2,
        name         = $3,
        slug         = $4,
        short_desc   = $5,
        description  = $6,
        specs        = $7,
        tags         = $8,
        is_active    = $9,
        sort_order   = $10
      WHERE id = $11
      RETURNING *
    `;
    const params = [
      categoryId || null, sku, name, slug,
      shortDesc || null, description || null,
      JSON.stringify(specs || {}),
      tags || [],
      isActive !== false,
      sortOrder || 0,
      id
    ];
    const { rows } = await query(sql, params);
    return rows[0];
  }

  // ── DELETE (soft) ─────────────────────────────────────────────
  static async softDelete(id) {
    await query('UPDATE products SET is_active = FALSE WHERE id = $1', [id]);
  }

  // ── DELETE (hard) ─────────────────────────────────────────────
  static async hardDelete(id) {
    await query('DELETE FROM products WHERE id = $1', [id]);
  }

  // ── IMAGENS ───────────────────────────────────────────────────
  static async addImage(productId, { url, altText, sortOrder, isCover }) {
    if (isCover) {
      await query('UPDATE product_images SET is_cover = FALSE WHERE product_id = $1', [productId]);
    }
    const { rows } = await query(
      `INSERT INTO product_images (product_id, url, alt_text, sort_order, is_cover)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [productId, url, altText || null, sortOrder || 0, isCover || false]
    );
    return rows[0];
  }

  static async removeImage(imageId) {
    await query('DELETE FROM product_images WHERE id = $1', [imageId]);
  }

  static async getImages(productId) {
    const { rows } = await query(
      'SELECT * FROM product_images WHERE product_id = $1 ORDER BY sort_order ASC',
      [productId]
    );
    return rows;
  }

  // ── DOWNLOADS ─────────────────────────────────────────────────
  static async syncDownloads(productId, downloads = []) {
    await query('DELETE FROM product_downloads WHERE product_id = $1', [productId]);
    for (let i = 0; i < downloads.length; i++) {
      const { label, url, icon } = downloads[i];
      if (!label || !url) continue;
      await query(
        'INSERT INTO product_downloads (product_id, label, url, icon, sort_order) VALUES ($1,$2,$3,$4,$5)',
        [productId, label, url, icon || 'pdf', i]
      );
    }
  }

  // ── SLUG ÚNICO ────────────────────────────────────────────────
  static async isSlugTaken(slug, excludeId = null) {
    const sql = excludeId
      ? 'SELECT id FROM products WHERE slug = $1 AND id != $2'
      : 'SELECT id FROM products WHERE slug = $1';
    const params = excludeId ? [slug, excludeId] : [slug];
    const { rows } = await query(sql, params);
    return rows.length > 0;
  }

  // ── SKU ÚNICO ─────────────────────────────────────────────────
  static async isSkuTaken(sku, excludeId = null) {
    const sql = excludeId
      ? 'SELECT id FROM products WHERE sku = $1 AND id != $2'
      : 'SELECT id FROM products WHERE sku = $1';
    const params = excludeId ? [sku, excludeId] : [sku];
    const { rows } = await query(sql, params);
    return rows.length > 0;
  }
}

module.exports = ProductModel;
