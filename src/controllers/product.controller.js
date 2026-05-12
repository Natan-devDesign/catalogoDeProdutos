'use strict';
const path        = require('path');
const slugify     = require('slugify');
const Product     = require('../models/Product.model');
const { CategoryModel, AuditLogModel } = require('../models');

// ── LIST ─────────────────────────────────────────────────────────
exports.list = async (req, res) => {
  const { q = '', categoria = '', page = 1 } = req.query;
  const LIMIT = 30;
  try {
    const [products, total, categories] = await Promise.all([
      Product.findAll({ q, categoryId: categoria || null, page, limit: LIMIT }),
      Product.countAll({ q, categoryId: categoria || null }),
      CategoryModel.findAll(),
    ]);
    res.render('admin/products/index', {
      pageTitle: 'Produtos', currentPage: 'products',
      breadcrumb: '// CATÁLOGO / PRODUTOS',
      user: req.user, flash: _flash(req),
      products, total, categories,
      q, categoryId: categoria,
      page: Number(page),
      totalPages: Math.ceil(total / LIMIT),
    });
  } catch (err) {
    console.error('[product.list]', err);
    next(err);
  }
};

// ── CREATE FORM ──────────────────────────────────────────────────
exports.createForm = async (req, res) => {
  const categories = await CategoryModel.findAll();
  res.render('admin/products/create', {
    pageTitle: 'Novo Produto', currentPage: 'product-new',
    breadcrumb: '// PRODUTOS / NOVO',
    user: req.user, flash: _flash(req),
    categories, product: undefined,
  });
};

// ── CREATE ────────────────────────────────────────────────────────
exports.create = async (req, res, next) => {
  try {
    const data = _parseBody(req.body);

    if (!data.name || !data.sku) {
      const categories = await CategoryModel.findAll();
      return res.render('admin/products/create', {
        pageTitle: 'Novo Produto', currentPage: 'product-new',
        breadcrumb: '// PRODUTOS / NOVO',
        user: req.user, flash: { type: 'error', message: 'Nome e SKU são obrigatórios.' },
        categories, product: undefined,
      });
    }

    if (await Product.isSkuTaken(data.sku)) {
      const categories = await CategoryModel.findAll();
      return res.render('admin/products/create', {
        pageTitle: 'Novo Produto', currentPage: 'product-new',
        breadcrumb: '// PRODUTOS / NOVO',
        user: req.user, flash: { type: 'error', message: `SKU "${data.sku}" já cadastrado.` },
        categories, product: undefined,
      });
    }

    const product = await Product.create({ ...data, createdBy: req.user.id });

    if (req.files?.length) {
      for (let i = 0; i < req.files.length; i++) {
        await Product.addImage(product.id, {
          url:       `/uploads/products/${req.files[i].filename}`,
          altText:   product.name,
          sortOrder: i,
          isCover:   i === 0,
        });
      }
    }

    await _syncDownloads(product.id, req.body);
    await AuditLogModel.log({
      userId: req.user.id, action: 'product.create',
      entityType: 'product', entityId: product.id,
      newValue: { sku: product.sku, name: product.name },
      ipAddress: req.ip,
    });
    res.redirect('/admin/produtos?success=created');
  } catch (err) {
    console.error('[product.create]', err);
    next(err);
  }
};

// ── EDIT FORM ─────────────────────────────────────────────────────
exports.editForm = async (req, res, next) => {
  try {
    const [product, categories] = await Promise.all([
      Product.findById(req.params.id),
      CategoryModel.findAll(),
    ]);
    if (!product) return res.status(404).render('public/404', { title: '404' });
    res.render('admin/products/create', {
      pageTitle: `Editar · ${product.sku}`, currentPage: 'products',
      breadcrumb: `// PRODUTOS / ${product.sku}`,
      user: req.user, flash: _flash(req),
      product, categories,
    });
  } catch (err) { next(err); }
};

// ── UPDATE ────────────────────────────────────────────────────────
exports.update = async (req, res, next) => {
   try {
      const { id } = req.params;
      const existing = await Product.findById(id);

      const keepRaw = req.body.delete_images;

        if (keepRaw === undefined) {
        
          if (!existing) return res.status(404).render('public/404', { title: '404' });

          const data = _parseBody(req.body);
          if (await Product.isSkuTaken(data.sku, id)) {
            return res.redirect(`/admin/produtos/${id}/editar?error=sku`);
          }

          await Product.update(id, { ...data, isActive: req.body.is_active === '1' });

          // Novas imagens
          if (req.files?.length) {
            const currentImgs = await Product.getImages(id);
            const hasCover    = currentImgs.some(i => i.is_cover);
            for (let i = 0; i < req.files.length; i++) {
              await Product.addImage(id, {
                url:       `/uploads/products/${req.files[i].filename}`,
                altText:   data.name,
                sortOrder: currentImgs.length + i,
                isCover:   !hasCover && i === 0,
              });
            }
          }

          // Remover imagens desmarcadas

          // console.log('KEEPRAW: '+keepRaw);

          // if (keepRaw !== undefined) {
          //   const keepIds = (Array.isArray(keepRaw) ? keepRaw : [keepRaw]).map(Number);
          //   const all     = await Product.getImages(id);

          //    for (const img of all) {
          //      if (!keepIds.includes(img.id)) await Product.removeImage(img.id);
          //    }
          // }

          await _syncDownloads(id, req.body);
          await AuditLogModel.log({
            userId: req.user.id, action: 'product.update',
            entityType: 'product', entityId: id,
            newValue: { sku: data.sku, name: data.name },
            ipAddress: req.ip,
          });
          res.redirect('/admin/produtos?success=updated');

      }else{
        if (keepRaw !== undefined) await Product.removeImage(Number(keepRaw));
      }
  } catch (err) {
    console.error('[product.update]', err);
    next(err);
  }
};

// ── REMOVE ────────────────────────────────────────────────────────
exports.remove = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Não encontrado' });
    await Product.hardDelete(req.params.id);
    await AuditLogModel.log({
      userId: req.user.id, action: 'product.delete',
      entityType: 'product', entityId: req.params.id,
      oldValue: { sku: product.sku, name: product.name },
      ipAddress: req.ip,
    });
    res.redirect('/admin/produtos?success=deleted');
  } catch (err) {
    console.error('[product.remove]', err);
    next(err);
  }
};

// ── HELPERS ───────────────────────────────────────────────────────
function _parseBody(body) {
  const name = (body.name || '').trim();
  const slug = (body.slug || '').trim() ||
    slugify(name, { lower: true, strict: true, locale: 'pt' });
  return {
    categoryId:  body.category_id || null,
    sku:         (body.sku || '').trim().toUpperCase(),
    name,
    slug,
    shortDesc:   (body.short_desc  || '').trim() || null,
    description: (body.description || '').trim() || null,
    specs:       _parseSpecs(body.specs),
    tags:        _parseTags(body.tags_raw),
    sortOrder:   Number(body.sort_order) || 0,
  };
}

function _parseSpecs(raw) {
  try { return JSON.parse(raw || '{}'); } catch { return {}; }
}

function _parseTags(raw) {
  if (!raw) return [];
  return raw.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
}

async function _syncDownloads(productId, body) {
  const labels = _toArray(body.dl_label);
  const urls   = _toArray(body.dl_url);
  const downloads = labels
    .map((label, i) => ({ label: label?.trim(), url: urls[i]?.trim() }))
    .filter(d => d.label && d.url);
  await Product.syncDownloads(productId, downloads);
}

function _toArray(val) {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

function _flash(req) {
  const { success, error } = req.query;
  if (success === 'created') return { type: 'success', message: 'Produto criado com sucesso.' };
  if (success === 'updated') return { type: 'success', message: 'Produto atualizado com sucesso.' };
  if (success === 'deleted') return { type: 'success', message: 'Produto removido com sucesso.' };
  if (error === 'sku')       return { type: 'error',   message: 'Este SKU já está em uso.' };
  if (error)                 return { type: 'error',   message: 'Ocorreu um erro. Tente novamente.' };
  return null;
}
