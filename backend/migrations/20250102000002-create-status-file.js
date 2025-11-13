'use strict';
module.exports = {
  up: async (qi, Sequelize) => {
    await qi.createTable('Files', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      userId: { type: Sequelize.INTEGER, references: { model: 'Users', key: 'id' }, onDelete: 'CASCADE' },
      originalName: Sequelize.STRING,
      mime: Sequelize.STRING,
      size: Sequelize.INTEGER,
      storageKey: Sequelize.STRING,
      createdAt: Sequelize.DATE,
      updatedAt: Sequelize.DATE
    });
    await qi.createTable('StatusHistories', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      userId: { type: Sequelize.INTEGER, references: { model: 'Users', key: 'id' }, onDelete: 'CASCADE' },
      status: { type: Sequelize.ENUM('AVAILABLE','INTERVENTION','UNAVAILABLE','ABSENT'), allowNull: false },
      comment: Sequelize.TEXT,
      returnAt: Sequelize.DATE,
      fileId: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'Files', key: 'id' }, onDelete: 'SET NULL' },
      createdAt: Sequelize.DATE,
      updatedAt: Sequelize.DATE
    });
  },
  down: async (qi) => {
    await qi.dropTable('StatusHistories');
    await qi.dropTable('Files');
  }
};
