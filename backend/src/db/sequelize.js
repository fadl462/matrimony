const { Sequelize } = require("sequelize");
const path = require("path");

/**
 * DEV/DEMO: SQLite file on disk, zero external setup required.
 * PRODUCTION: set DB_DIALECT=postgres and DATABASE_URL to a Postgres
 * connection string — Sequelize's query API below doesn't change at all;
 * only this connection block does. That's the whole migration.
 */
const dialect = process.env.DB_DIALECT || "sqlite";

let sequelize;
if (dialect === "postgres") {
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: "postgres",
    logging: false,
    dialectOptions: {
      ssl: process.env.PGSSL === "false" ? false : { require: true, rejectUnauthorized: false },
    },
    pool: { max: 20, min: 2, acquire: 30000, idle: 10000 },
  });
} else {
  sequelize = new Sequelize({
    dialect: "sqlite",
    storage: process.env.SQLITE_PATH || path.join(__dirname, "..", "..", "dev.sqlite3"),
    logging: false,
  });
}

module.exports = sequelize;
