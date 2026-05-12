'use strict';
/**
 * src/models/index.js — Barrel de models
 * Uso: const { UserModel, CategoryModel } = require('../models');
 */
const UserModel         = require('./User.model');
const CategoryModel     = require('./Category.model');
const HomeSectionModel  = require('./HomeSection.model');
const HomeFeaturedModel = require('./HomeFeatured.model');
const MarketingModel    = require('./Marketing.model');
const AuditLogModel     = require('./AuditLog.model');

module.exports = {
  UserModel,
  CategoryModel,
  HomeSectionModel,
  HomeFeaturedModel,
  MarketingModel,
  AuditLogModel,
};
