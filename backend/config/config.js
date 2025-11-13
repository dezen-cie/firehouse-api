require('dotenv').config();
const url = process.env.DATABASE_URL;
module.exports = {
  development: { url, dialect: 'postgres', logging: false },
  test: { url, dialect: 'postgres', logging: false },
  production: { url, dialect: 'postgres', logging: false }
};
