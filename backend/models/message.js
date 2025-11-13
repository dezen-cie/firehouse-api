'use strict';
module.exports = (sequelize, DataTypes) => {
  const Message = sequelize.define('Message', {
    conversationId: DataTypes.INTEGER,
    senderId: DataTypes.INTEGER,
    content: DataTypes.TEXT,
    readAt: DataTypes.DATE
  }, {});
  Message.associate = (models) => {
    Message.belongsTo(models.Conversation, { foreignKey: 'conversationId' });
    Message.belongsTo(models.User, { as: 'sender', foreignKey: 'senderId' });
  };
  return Message;
};
