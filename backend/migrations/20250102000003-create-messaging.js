'use strict';
module.exports = {
  up: async (qi, Sequelize) => {
    await qi.createTable('Conversations', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      userId: { type: Sequelize.INTEGER, references: { model: 'Users', key: 'id' }, onDelete: 'CASCADE' },
      adminId: { type: Sequelize.INTEGER, references: { model: 'Users', key: 'id' }, onDelete: 'CASCADE' },
      createdAt: Sequelize.DATE,
      updatedAt: Sequelize.DATE
    });
    await qi.createTable('Messages', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      conversationId: { type: Sequelize.INTEGER, references: { model: 'Conversations', key: 'id' }, onDelete: 'CASCADE' },
      senderId: { type: Sequelize.INTEGER, references: { model: 'Users', key: 'id' }, onDelete: 'CASCADE' },
      content: Sequelize.TEXT,
      readAt: Sequelize.DATE,
      createdAt: Sequelize.DATE,
      updatedAt: Sequelize.DATE
    });
  },
  down: async (qi) => {
    await qi.dropTable('Messages');
    await qi.dropTable('Conversations');
  }
};
