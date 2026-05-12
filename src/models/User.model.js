'use strict';
const { query } = require('../config/database');

class UserModel {
  static async findByEmail(email) {
    const { rows } = await query(
      'SELECT * FROM users WHERE email = $1 LIMIT 1',
      [email]
    );
    return rows[0] || null;
  }

  static async findById(id) {
    const { rows } = await query(
      'SELECT id,name,email,role,is_active,last_login,created_at FROM users WHERE id = $1',
      [id]
    );
    return rows[0] || null;
  }

  static async findAll() {
    const { rows } = await query(
      'SELECT id,name,email,role,is_active,last_login,created_at FROM users ORDER BY created_at DESC'
    );
    return rows;
  }

  static async create({ name, email, passwordHash, role = 'editor' }) {
    const { rows } = await query(
      'INSERT INTO users (name,email,password_hash,role) VALUES ($1,$2,$3,$4) RETURNING id,name,email,role',
      [name, email, passwordHash, role]
    );
    return rows[0];
  }

  static async updateLastLogin(id) {
    await query('UPDATE users SET last_login = NOW() WHERE id = $1', [id]);
  }

  static async updatePassword(id, passwordHash) {
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, id]);
  }

  static async setActive(id, isActive) {
    await query('UPDATE users SET is_active = $1 WHERE id = $2', [isActive, id]);
  }
}

module.exports = UserModel;
