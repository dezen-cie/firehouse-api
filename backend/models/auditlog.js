'use strict';
module.exports = (sequelize, DataTypes) => {
  const AuditLog = sequelize.define('AuditLog', {
    actorId: DataTypes.INTEGER,
    action: DataTypes.STRING,
    targetType: DataTypes.STRING,
    targetId: DataTypes.INTEGER,
    payload: DataTypes.JSON
  }, {});
  AuditLog.associate = (models) => {
    AuditLog.belongsTo(models.User, { foreignKey: 'actorId' });
  };
  return AuditLog;
};
