const Pool = require("pg").Pool;

const pool = new Pool({
    host: "localhost",
    port: "5432",
    database: "project1",
    user: "postgres",
    password: "root"
});
module.exports = pool;



