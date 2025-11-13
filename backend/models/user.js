'use strict';
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    firstName: DataTypes.STRING,
    lastName: DataTypes.STRING,
    email: { type: DataTypes.STRING, unique: true },
    grade: DataTypes.STRING,
    role: { type: DataTypes.ENUM('user','admin','super_admin'), defaultValue: 'user' },
    passwordHash: DataTypes.STRING,
    avatarUrl: DataTypes.STRING,
    visibleInList: { type: DataTypes.BOOLEAN, defaultValue: true }
  }, {});
  User.associate = (models) => {
    User.hasMany(models.StatusHistory, { foreignKey: 'userId' });
    User.hasMany(models.File, { foreignKey: 'userId' });
    User.hasMany(models.RefreshToken, { foreignKey: 'userId' });
    User.hasMany(models.AuditLog, { foreignKey: 'actorId' });
    User.hasMany(models.Conversation, { foreignKey: 'adminId', as:'adminConversations' });
    User.hasMany(models.Conversation, { foreignKey: 'userId', as:'userConversations' });
  };
  return User;
};
