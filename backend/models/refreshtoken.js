'use strict';
module.exports = (sequelize, DataTypes) => {
  const RefreshToken = sequelize.define('RefreshToken', {
    userId: DataTypes.INTEGER,
    tokenHash: DataTypes.STRING,
    revokedAt: DataTypes.DATE
  }, {});
  RefreshToken.associate = (models) => {
    RefreshToken.belongsTo(models.User, { foreignKey: 'userId' });
  };
  return RefreshToken;
};
