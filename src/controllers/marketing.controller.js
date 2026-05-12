'use strict';
const { MarketingModel, AuditLogModel } = require('../models');

exports.showConfig = async (req, res, next) => {
  try {
    const [configs, allLogs] = await Promise.all([
      MarketingModel.findAll(),
      AuditLogModel.recent(20),
    ]);
    const recentLogs = allLogs.filter(l => l.action.startsWith('marketing.'));
    res.render('admin/marketing', {
      pageTitle: 'Marketing & Analytics', currentPage: 'marketing',
      breadcrumb: '// CONFIG / MARKETING',
      user: req.user,
      flash: req.query.success
        ? { type: 'success', message: 'Configuração salva com sucesso.' }
        : req.query.error
          ? { type: 'error', message: 'Erro ao salvar. Tente novamente.' }
          : null,
      configs, recentLogs,
    });
  } catch (err) { next(err); }
};

exports.updateConfig = async (req, res, next) => {
  const { provider, tracking_id, is_active } = req.body;
  try {
    await MarketingModel.upsert(provider, {
      trackingId: (tracking_id || '').trim() || null,
      isActive:   is_active === '1',
      updatedBy:  req.user.id,
    });
    await AuditLogModel.log({
      userId: req.user.id,
      action: `marketing.update.${provider}`,
      entityType: 'marketing_config', entityId: provider,
      newValue: { tracking_id: tracking_id || null, is_active: is_active === '1' },
      ipAddress: req.ip,
    });
    res.redirect('/admin/marketing?success=1');
  } catch (err) {
    console.error('[marketing.updateConfig]', err);
    next(err);
  }
};
