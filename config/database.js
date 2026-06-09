const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'event_platform',
});

function replaceQuestionPlaceholders(sql) {
  let index = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let result = '';

  for (let i = 0; i < sql.length; i += 1) {
    const char = sql[i];
    const prev = sql[i - 1];

    if (char === "'" && !inDoubleQuote && prev !== '\\') {
      inSingleQuote = !inSingleQuote;
      result += char;
      continue;
    }

    if (char === '"' && !inSingleQuote && prev !== '\\') {
      inDoubleQuote = !inDoubleQuote;
      result += char;
      continue;
    }

    if (char === '?' && !inSingleQuote && !inDoubleQuote) {
      index += 1;
      result += `$${index}`;
      continue;
    }

    result += char;
  }

  return result;
}

function normalizeLegacySqlSyntax(sql) {
  return sql
    // PostgreSQL воспринимает двойные кавычки как имена идентификаторов, поэтому
    // конвертируем оставшиеся простые строковые литералы до отправки запроса.
    .replace(/"([a-zA-Z0-9_ -]+)"/g, "'$1'")
    .replace(/\bDATABASE\s*\(\s*\)/gi, 'current_schema()')
    .replace(/\bINFORMATION_SCHEMA\.COLUMNS\b/g, 'information_schema.columns')
    .replace(/\bTABLE_SCHEMA\b/g, 'table_schema')
    .replace(/\bTABLE_NAME\b/g, 'table_name')
    .replace(/\bCOLUMN_NAME\b/g, 'column_name');
}

function addReturningId(sql) {
  const insertMatch = sql.match(/^\s*INSERT\s+INTO\s+([a-zA-Z_][a-zA-Z0-9_]*)/i);
  if (!insertMatch || /\bRETURNING\b/i.test(sql)) {
    return sql;
  }

  const tableName = insertMatch[1].toLowerCase();
  const tablesWithoutIdColumn = new Set(['favorites']);
  if (tablesWithoutIdColumn.has(tableName)) {
    return sql;
  }

  return `${sql.trim().replace(/;$/, '')} RETURNING id`;
}


function prepareSql(sql, { returningId = false } = {}) {
  const normalizedSql = normalizeLegacySqlSyntax(sql);
  const sqlWithPlaceholders = replaceQuestionPlaceholders(normalizedSql);
  return returningId ? addReturningId(sqlWithPlaceholders) : sqlWithPlaceholders;
}

function toDriverResult(result) {
  const command = result.command || '';

  if (command === 'SELECT') {
    return result.rows;
  }

  const insertId = result.rows?.[0]?.id;

  return {
    affectedRows: result.rowCount,
    changedRows: result.rowCount,
    insertId,
    rowCount: result.rowCount,
    rows: result.rows,
  };
}

async function query(sql, params = []) {
  const preparedSql = prepareSql(sql);
  const result = await pool.query(preparedSql, params);
  return result.rows;
}

async function execute(sql, params = []) {
  const preparedSql = prepareSql(sql, { returningId: true });
  const result = await pool.query(preparedSql, params);
  return [toDriverResult(result), result.fields];
}

async function getClient() {
  const client = await pool.connect();
  const originalQuery = client.query.bind(client);

  return {
    ...client,
    query(sql, params = []) {
      return originalQuery(prepareSql(sql), params);
    },
    execute(sql, params = []) {
      return originalQuery(prepareSql(sql, { returningId: true }), params)
        .then((result) => [toDriverResult(result), result.fields]);
    },
    release: client.release.bind(client),
  };
}

module.exports = {
  query,
  execute,
  pool,
  getClient,
};
