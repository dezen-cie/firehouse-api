require('dotenv').config();
const url = process.env.DATABASE_URL;

const base = {
  url,
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: process.env.NODE_ENV === 'production'
      ? { require: true, rejectUnauthorized: false }
      : false
  }
};

module.exports = {
  development: base,
  test: base,
  production: base
};
