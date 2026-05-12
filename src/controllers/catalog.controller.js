'use strict';
const Product          = require('../models/Product.model');
const { CategoryModel, MarketingModel } = require('../models');
const { _buildMarketingTags } = require('./home.controller');

// ── PÁGINA DO CATÁLOGO ────────────────────────────────────────────
exports.showCatalog = async (req, res, next) => {
  const { categorySlug } = req.params;
  const { q = '', filtro = 'todos', page = 1 } = req.query;
  const PER_PAGE = 24;

  try {
    const [category, categories] = await Promise.all([
      CategoryModel.findBySlug(categorySlug),
      CategoryModel.findAll(true),
    ]);

    if (!category) {
      return res.status(404).render('public/404', {
        title: 'Categoria não encontrada',
        marketingHead: '', marketingBody: '',
      });
    }

    const [products, total, mktConfigs] = await Promise.all([
      Product.search({ categorySlug, q, filtro, page, limit: PER_PAGE }),
      Product.count({ categorySlug, q, filtro }),
      MarketingModel.findActive(),
    ]);

    const { marketingHead, marketingBody } = _buildMarketingTags(mktConfigs);

    res.render('public/catalog', {
      title:      `${category.name} · Catálogo BRIWAX`,
      active:     'catalog',
      category, categories, products,
      q, filtro,
      page:       Number(page),
      total,
      totalPages: Math.ceil(total / PER_PAGE),
      marketingHead, marketingBody,
    });
  } catch (err) {
    console.error('[catalog.showCatalog]', err);
    next(err);
  }
};

// ── PÁGINA DO PRODUTO ─────────────────────────────────────────────
exports.showProduct = async (req, res, next) => {
  try {
    const [product, mktConfigs, categories] = await Promise.all([
      Product.findBySlug(req.params.slug),
      MarketingModel.findActive(),
      CategoryModel.findAll(true),
    ]);

    if (!product) {
      return res.status(404).render('public/404', {
        title: 'Produto não encontrado',
        marketingHead: '', marketingBody: '',
      });
    }

    // Produtos relacionados: mesma categoria, excluindo o atual
    let relatedProducts = [];
    if (product.category_slug) {
      const allInCat = await Product.search({
        categorySlug: product.category_slug,
        q: '', filtro: 'todos', page: 1, limit: 8,
      });
      relatedProducts = allInCat
        .filter(p => p.id !== product.id)
        .slice(0, 4);
    }

    const { marketingHead, marketingBody } = _buildMarketingTags(mktConfigs);

    res.render('public/product', {
      title:   `${product.name} · BRIWAX`,
      active:  'catalog',
      product, categories, relatedProducts,
      marketingHead, marketingBody,
    });
  } catch (err) {
    console.error('[catalog.showProduct]', err);
    next(err);
  }
};

// ── API JSON: BUSCA AJAX DO CATÁLOGO ─────────────────────────────
exports.apiSearch = async (req, res) => {
  const { categorySlug, q = '', filtro = 'todos', page = 1 } = req.query;
  const PER_PAGE = 24;
  try {
    const [products, total] = await Promise.all([
      Product.search({ categorySlug, q, filtro, page, limit: PER_PAGE }),
      Product.count({ categorySlug, q, filtro }),
    ]);
    res.json({
      products,
      total,
      totalPages: Math.ceil(total / PER_PAGE),
      page: Number(page),
    });
  } catch (err) {
    console.error('[catalog.apiSearch]', err);
    res.status(500).json({ error: 'Erro na busca.' });
  }
};
