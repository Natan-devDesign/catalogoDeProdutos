'use strict';
const Product          = require('../models/Product.model');
const {
  HomeSectionModel,
  HomeFeaturedModel,
  MarketingModel,
  CategoryModel,
  AuditLogModel,
} = require('../models');

// ── HOME PÚBLICA ──────────────────────────────────────────────────
exports.showHome = async (req, res, next) => {
  try {
    const [sectionsArr, featuredProducts, mktConfigs, categories] = await Promise.all([
      HomeSectionModel.findAll(),   // já ordenado por sort_order ASC no model
      HomeFeaturedModel.findAll(),
      MarketingModel.findActive(),
      CategoryModel.findAll(true),
    ]);

    // objeto keyed para acesso por chave (ex: sections.hero)
    const sections = sectionsArr.reduce(
      (acc, s) => ({ ...acc, [s.section_key]: s }), {}
    );

    // array ordenado por sort_order para a view iterar na ordem certa
    const sectionsOrdered = [...sectionsArr].sort(
      (a, b) => (a.sort_order || 0) - (b.sort_order || 0)
    );

    const { marketingHead, marketingBody } = exports._buildMarketingTags(mktConfigs);

    res.render('public/home', {
      title: (sections.hero && sections.hero.title) ? sections.hero.title : 'Solucoes Inovadoras · BRIWAX',
      active: 'home',
      sections,           // acesso por chave para dados de cada seção
      sectionsOrdered,    // array na ordem salva pelo usuário
      featuredProducts,
      categories,
      marketingHead,
      marketingBody,
    });
  } catch (err) {
    console.error('[home.showHome]', err);
    next(err);
  }
};

// ── DASHBOARD EDITOR ──────────────────────────────────────────────
exports.showEditor = async (req, res, next) => {
  try {
    const [sectionsArr, featuredProducts] = await Promise.all([
      HomeSectionModel.findAll(),
      HomeFeaturedModel.findAll(),
    ]);
    const sections = sectionsArr.reduce(
      (acc, s) => ({ ...acc, [s.section_key]: s }), {}
    );
    res.render('admin/home-editor', {
      pageTitle: 'Editor da Home', currentPage: 'home-editor',
      breadcrumb: '// SITE / HOME',
      user: req.user,
      flash: req.query.success
        ? { type: 'success', message: 'Seção atualizada com sucesso.' }
        : req.query.error
          ? { type: 'error', message: 'Erro ao atualizar. Tente novamente.' }
          : null,
      sections, featuredProducts,
    });
  } catch (err) { next(err); }
};

// ── ATUALIZAR SEÇÃO ───────────────────────────────────────────────
exports.updateSection = async (req, res, next) => {
  const { key } = req.params;
  try {
    const extraData = _buildExtraData(key, req.body);
    await HomeSectionModel.update(key, {
      title:     req.body.title     || null,
      subtitle:  req.body.subtitle  || null,
      body:      req.body.body      || null,
      ctaLabel:  req.body.cta_label || null,
      ctaUrl:    req.body.cta_url   || null,
      extraData,
      isVisible: true,
      updatedBy: req.user.id,
    });
    await AuditLogModel.log({
      userId: req.user.id, action: `home.update.${key}`,
      entityType: 'home_section', entityId: key,
      ipAddress: req.ip,
    });
    res.redirect('/admin/home-editor?success=1');
  } catch (err) {
    console.error('[home.updateSection]', err);
    next(err);
  }
};

// ── API: LISTAR PRODUTOS DISPONÍVEIS (modal) ──────────────────────
exports.listAvailableProducts = async (req, res) => {
  try {
    const products = await Product.findAllActive();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── REORDENAR SEÇÕES ─────────────────────────────────────────
exports.reorderSections = async (req, res) => {
  try {
    // order: array de { key, sort_order }
    const { order } = req.body;
    if (!Array.isArray(order)) {
      return res.status(400).json({ error: 'Formato inválido.' });
    }
    for (const item of order) {
      await require('../config/database').query(
        'UPDATE home_sections SET sort_order = $1 WHERE section_key = $2',
        [item.sort_order, item.key]
      );
    }
    await AuditLogModel.log({
      userId: req.user.id, action: 'home.reorder',
      entityType: 'home_sections', entityId: 'bulk',
      newValue: { order },
      ipAddress: req.ip,
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('[home.reorderSections]', err);
    res.status(500).json({ error: err.message });
  }
};
// UUID v4 regex para validação antes de passar ao banco
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

exports.updateFeatured = async (req, res) => {
  try {
    const { productIds = [] } = req.body;
    if (!Array.isArray(productIds)) {
      return res.status(400).json({ error: 'productIds deve ser um array.' });
    }
    // Filtrar apenas UUIDs validos — previne erro "sintaxe invalida para tipo uuid"
    const validIds = productIds.map(String).filter(id => UUID_REGEX.test(id));
    await HomeFeaturedModel.setFeatured(validIds, req.user.id);
    await AuditLogModel.log({
      userId: req.user.id, action: 'home.update.featured',
      entityType: 'home_featured', entityId: 'bulk',
      newValue: { count: productIds.length, ids: productIds },
      ipAddress: req.ip,
    });
    res.json({ ok: true, count: productIds.length });
  } catch (err) {
    console.error('[home.updateFeatured]', err);
    res.status(500).json({ error: err.message });
  }
};

// ── HELPERS ───────────────────────────────────────────────────────
function _buildExtraData(key, body) {
  const extra = {};

  // Campos genéricos mapeados
  const map = {
    extra_eyebrow:       'eyebrow',
    extra_whatsapp:      'whatsapp',
    extra_whatsapp_text: 'whatsapp_text',
    extra_whatsapp_url:  'whatsapp',
    extra_location:      'location',
    extra_copyright:     'copyright',
    extra_instagram:     'instagram',
    extra_facebook:      'facebook',
    extra_linkedin:      'linkedin',
  };
  for (const [bodyKey, extraKey] of Object.entries(map)) {
    if (body[bodyKey] && body[bodyKey].trim()) extra[extraKey] = body[bodyKey].trim();
  }

  // Campos específicos da seção "about"
  if (key === 'about') {
    if (body.extra_body2)      extra.body2       = body.extra_body2.trim();
    if (body.extra_circle_num) extra.circle_num  = body.extra_circle_num.trim();
    if (body.extra_circle_lbl) extra.circle_lbl  = body.extra_circle_lbl.trim();
    if (body.extra_tags)       extra.tags        = body.extra_tags.trim();
  }

  return extra;
}

/**
 * Constrói as tags de rastreamento de marketing.
 * Exportado para ser reutilizado em catalog.controller.js
 */
exports._buildMarketingTags = function buildMarketingTags(configs = []) {
  let marketingHead = '';
  let marketingBody = '';

  for (const cfg of configs) {
    if (!cfg.tracking_id) continue;

    if (cfg.provider === 'facebook_pixel') {
      marketingHead += `
<!-- Facebook Pixel -->
<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${cfg.tracking_id}');fbq('track','PageView');</script>
<noscript><img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${cfg.tracking_id}&ev=PageView&noscript=1"/></noscript>`;
    }

    if (cfg.provider === 'gtm') {
      marketingHead += `
<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${cfg.tracking_id}');</script>`;
      marketingBody += `
<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${cfg.tracking_id}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>`;
    }

    if (cfg.provider === 'ga4') {
      marketingHead += `
<!-- Google Analytics 4 -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${cfg.tracking_id}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${cfg.tracking_id}');</script>`;
    }
  }

  return { marketingHead, marketingBody };
};
