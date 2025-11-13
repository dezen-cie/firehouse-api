'use strict';
module.exports = (sequelize, DataTypes) => {
  const StatusHistory = sequelize.define('StatusHistory', {
    userId: DataTypes.INTEGER,
    status: { type: DataTypes.ENUM('AVAILABLE','INTERVENTION','UNAVAILABLE','ABSENT'), allowNull: false },
    comment: DataTypes.TEXT,
    returnAt: DataTypes.DATE,
    fileId: DataTypes.INTEGER
  }, {});
  StatusHistory.associate = (models) => {
    StatusHistory.belongsTo(models.User, { foreignKey: 'userId' });
    StatusHistory.belongsTo(models.File, { foreignKey: 'fileId' });
  };
  return StatusHistory;
};
