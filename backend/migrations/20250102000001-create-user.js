'use strict';
module.exports = {
  up: async (qi, Sequelize) => {
    await qi.createTable('Users', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      firstName: Sequelize.STRING,
      lastName: Sequelize.STRING,
      email: { type: Sequelize.STRING, unique: true },
      grade: Sequelize.STRING,
      role: { type: Sequelize.ENUM('user','admin','super_admin'), defaultValue: 'user' },
      passwordHash: Sequelize.STRING,
      avatarUrl: Sequelize.STRING,
      visibleInList: { type: Sequelize.BOOLEAN, defaultValue: true },
      createdAt: Sequelize.DATE,
      updatedAt: Sequelize.DATE
    });
  },
  down: async (qi) => { await qi.dropTable('Users'); }
};
