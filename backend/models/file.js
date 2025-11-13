'use strict';
module.exports = (sequelize, DataTypes) => {
  const File = sequelize.define('File', {
    userId: DataTypes.INTEGER,
    originalName: DataTypes.STRING,
    mime: DataTypes.STRING,
    size: DataTypes.INTEGER,
    storageKey: DataTypes.STRING
  }, {});
  File.associate = (models) => {
    File.belongsTo(models.User, { foreignKey: 'userId' });
  };
  return File;
};
