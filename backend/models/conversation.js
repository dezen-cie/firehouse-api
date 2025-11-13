'use strict';
module.exports = (sequelize, DataTypes) => {
  const Conversation = sequelize.define('Conversation', {
    userId: DataTypes.INTEGER,
    adminId: DataTypes.INTEGER
  }, {});
  Conversation.associate = (models) => {
    Conversation.belongsTo(models.User, { as: 'user', foreignKey: 'userId' });
    Conversation.belongsTo(models.User, { as: 'admin', foreignKey: 'adminId' });
    Conversation.hasMany(models.Message, { foreignKey: 'conversationId' });
  };
  return Conversation;
};
