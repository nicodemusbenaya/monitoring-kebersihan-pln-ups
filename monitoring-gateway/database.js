'use strict';

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const TABLES = Object.freeze({
  SETTINGS: { table: 'settings', key: 'Key', columns: ['Key', 'Value', 'UpdatedAt'] },
  USERS: { table: 'users', key: 'UserId', columns: ['UserId', 'Username', 'FullName', 'Role', 'PasswordHash', 'Salt', 'Active', 'MustChangePassword', 'CreatedAt', 'UpdatedAt'] },
  ROOM_TYPES: { table: 'room_types', key: 'RoomTypeId', columns: ['RoomTypeId', 'Name', 'TemplateSheet', 'WorkDays', 'Active', 'SortOrder', 'CreatedAt', 'UpdatedAt'] },
  ROOMS: { table: 'rooms', key: 'RoomId', columns: ['RoomId', 'Code', 'Name', 'RoomTypeId', 'QrToken', 'Active', 'SortOrder', 'CreatedAt', 'UpdatedAt'] },
  ACTIVITIES: { table: 'activities', key: 'ActivityId', columns: ['ActivityId', 'RoomTypeId', 'Name', 'QualityApplicable', 'QualityPositive', 'QualityNegative', 'FunctionApplicable', 'FunctionPositive', 'FunctionNegative', 'ExportRow', 'Active', 'SortOrder', 'CreatedAt', 'UpdatedAt'] },
  ROOM_ACTIVITIES: { table: 'room_activities', key: 'MapId', columns: ['MapId', 'RoomId', 'ActivityId', 'Active', 'SortOrder', 'CreatedAt', 'UpdatedAt'] },
  SLOTS: { table: 'slots', key: 'SlotId', columns: ['SlotId', 'RoomTypeId', 'Code', 'Name', 'Role', 'SortOrder', 'Active', 'CreatedAt', 'UpdatedAt'] },
  SCAN_EVENTS: { table: 'scan_events', key: 'ScanId', columns: ['ScanId', 'RoomId', 'UserId', 'ScannedAt', 'UserAgent', 'QrPayload'] },
  INSPECTIONS: { table: 'inspections', key: 'InspectionId', columns: ['InspectionId', 'DateKey', 'WeekStart', 'DayNumber', 'RoomId', 'RoomTypeId', 'SlotId', 'SlotCode', 'UserId', 'ScanId', 'ScannedAt', 'SubmittedAt', 'OverallStatus', 'DirtyCount', 'EvidenceFileId', 'EvidenceName', 'State', 'BackupStatus', 'BackupUpdatedAt', 'ReopenedAt', 'ReopenedBy'] },
  INSPECTION_DETAILS: { table: 'inspection_details', key: 'DetailId', columns: ['DetailId', 'InspectionId', 'ActivityId', 'QualityResult', 'QualityLabel', 'FunctionResult', 'FunctionLabel', 'Status', 'FuncStatus', 'Note', 'PhotoFileId', 'CorrectedAt', 'CorrectedBy'] },
  BACKUP_QUEUE: { table: 'backup_queue', key: 'QueueId', columns: ['QueueId', 'InspectionId', 'EventType', 'PayloadJson', 'Status', 'AttemptCount', 'LastError', 'CreatedAt', 'UpdatedAt'] },
  SESSIONS: { table: 'sessions', key: 'SessionHash', columns: ['SessionHash', 'UserId', 'ExpiresAt', 'CreatedAt'] },
  AUDIT_LOG: { table: 'audit_log', key: 'AuditId', columns: ['AuditId', 'UserId', 'Action', 'EntityType', 'EntityId', 'Detail', 'CreatedAt'] }
});

let pool = null;
let initializationError = null;

function databaseConfigured() {
  return Boolean(process.env.DB_HOST && process.env.DB_NAME && process.env.DB_USER && process.env.DB_PASSWORD);
}

async function initializeDatabase() {
  if (!databaseConfigured()) {
    initializationError = new Error('Konfigurasi DB_HOST, DB_NAME, DB_USER, dan DB_PASSWORD belum lengkap.');
    return false;
  }
  pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    charset: 'utf8mb4',
    timezone: 'Z',
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
    queueLimit: 0,
    multipleStatements: true,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10_000
  });
  try {
    const schema = await fs.promises.readFile(path.join(__dirname, 'schema.sql'), 'utf8');
    await pool.query(schema);
    await pool.query('SELECT 1');
    initializationError = null;
    return true;
  } catch (error) {
    initializationError = error;
    await pool.end().catch(() => {});
    pool = null;
    return false;
  }
}

async function databaseHealth() {
  if (!pool) return { connected: false, message: initializationError?.message || 'MariaDB belum dikonfigurasi.' };
  try {
    await pool.query('SELECT 1');
    return { connected: true, database: process.env.DB_NAME, host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306) };
  } catch (error) {
    return { connected: false, message: error.message };
  }
}

function requirePool() {
  if (!pool) {
    const error = new Error(initializationError?.message || 'MariaDB belum siap.');
    error.statusCode = 503;
    throw error;
  }
  return pool;
}

function tableDefinition(name) {
  const definition = TABLES[String(name || '').toUpperCase()];
  if (!definition) {
    const error = new Error('Tabel tidak diizinkan.');
    error.statusCode = 400;
    throw error;
  }
  return definition;
}

function quoted(name) {
  return `\`${String(name).replace(/`/g, '')}\``;
}

function databaseValue(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'object') return JSON.stringify(value);
  return value;
}

function normalizedRow(definition, row) {
  const result = {};
  definition.columns.forEach(column => {
    if (Object.prototype.hasOwnProperty.call(row || {}, column)) result[column] = databaseValue(row[column]);
  });
  if (result[definition.key] === undefined || result[definition.key] === null) {
    const error = new Error(`Kolom kunci ${definition.key} wajib diisi.`);
    error.statusCode = 400;
    throw error;
  }
  return result;
}

async function listRows(name) {
  const definition = tableDefinition(name);
  const columns = definition.columns.map(quoted).join(', ');
  const [rows] = await requirePool().query(`SELECT ${columns} FROM ${quoted(definition.table)}`);
  return rows.map(row => ({ ...row, _row: String(row[definition.key]) }));
}

async function upsertWithConnection(connection, name, source) {
  const definition = tableDefinition(name);
  const row = normalizedRow(definition, source);
  const columns = Object.keys(row);
  const updates = columns.filter(column => column !== definition.key);
  const sql = `INSERT INTO ${quoted(definition.table)} (${columns.map(quoted).join(', ')}) VALUES (${columns.map(() => '?').join(', ')}) ` +
    `ON DUPLICATE KEY UPDATE ${updates.length ? updates.map(column => `${quoted(column)} = VALUES(${quoted(column)})`).join(', ') : `${quoted(definition.key)} = ${quoted(definition.key)}`}`;
  await connection.execute(sql, columns.map(column => row[column]));
  return { key: String(row[definition.key]) };
}

async function upsertRow(name, row) {
  return upsertWithConnection(requirePool(), name, row);
}

async function upsertRows(name, rows) {
  const connection = await requirePool().getConnection();
  try {
    await connection.beginTransaction();
    for (const row of rows || []) await upsertWithConnection(connection, name, row);
    await connection.commit();
    return { count: (rows || []).length };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function upsertTransaction(mutations) {
  const connection = await requirePool().getConnection();
  let count = 0;
  try {
    await connection.beginTransaction();
    for (const mutation of mutations || []) {
      for (const row of mutation.rows || []) {
        await upsertWithConnection(connection, mutation.table, row);
        count++;
      }
    }
    await connection.commit();
    return { count };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function updateRow(name, key, updates) {
  const definition = tableDefinition(name);
  const safeUpdates = {};
  definition.columns.forEach(column => {
    if (column !== definition.key && Object.prototype.hasOwnProperty.call(updates || {}, column)) {
      safeUpdates[column] = databaseValue(updates[column]);
    }
  });
  const columns = Object.keys(safeUpdates);
  if (!columns.length) return { key: String(key), changed: 0 };
  const sql = `UPDATE ${quoted(definition.table)} SET ${columns.map(column => `${quoted(column)} = ?`).join(', ')} WHERE ${quoted(definition.key)} = ?`;
  const [result] = await requirePool().execute(sql, columns.map(column => safeUpdates[column]).concat(String(key)));
  if (!result.affectedRows) {
    const error = new Error('Baris yang akan diperbarui tidak ditemukan.');
    error.statusCode = 404;
    throw error;
  }
  return { key: String(key), changed: result.changedRows };
}

async function deleteRow(name, key) {
  const definition = tableDefinition(name);
  const [result] = await requirePool().execute(
    `DELETE FROM ${quoted(definition.table)} WHERE ${quoted(definition.key)} = ?`,
    [String(key)]
  );
  return { key: String(key), deleted: result.affectedRows };
}

module.exports = {
  TABLES,
  databaseConfigured,
  initializeDatabase,
  databaseHealth,
  listRows,
  upsertRow,
  upsertRows,
  upsertTransaction,
  updateRow,
  deleteRow
};
