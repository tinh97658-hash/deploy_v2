require('dotenv').config();
const mysql = require('mysql2');

const connection = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  charset: 'utf8mb4_unicode_ci', // ensure connection uses utf8mb4
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});
module.exports = connection;