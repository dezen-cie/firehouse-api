'use strict';
module.exports = {
  up: async (qi, Sequelize) => {
    await qi.createTable('RefreshTokens', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      userId: { type: Sequelize.INTEGER, references: { model: 'Users', key: 'id' }, onDelete: 'CASCADE' },
      tokenHash: Sequelize.STRING,
      revokedAt: Sequelize.DATE,
      createdAt: Sequelize.DATE,
      updatedAt: Sequelize.DATE
    });
    await qi.createTable('AuditLogs', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      actorId: { type: Sequelize.INTEGER, references: { model: 'Users', key: 'id' }, onDelete: 'SET NULL' },
      action: Sequelize.STRING,
      targetType: Sequelize.STRING,
      targetId: Sequelize.INTEGER,
      payload: Sequelize.JSON,
      createdAt: Sequelize.DATE,
      updatedAt: Sequelize.DATE
    });
  },
  down: async (qi) => {
    await qi.dropTable('AuditLogs');
    await qi.dropTable('RefreshTokens');
  }
};
