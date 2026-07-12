const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || ''
};

let pool;

async function getPool() {
  if (pool) return pool;

  // First connect without database to create it if needed
  const connection = await mysql.createConnection(dbConfig);
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'assetflow_db'}\`;`);
  await connection.end();

  // Create standard connection pool
  pool = mysql.createPool({
    ...dbConfig,
    database: process.env.DB_NAME || 'assetflow_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  return pool;
}

async function query(sql, params) {
  const activePool = await getPool();
  const [results] = await activePool.execute(sql, params);
  return results;
}

async function initializeDatabase() {
  console.log('Initializing database tables...');

  // Drop tables to force clean schema update
  await query('DROP TABLE IF EXISTS notifications');
  await query('DROP TABLE IF EXISTS audits');
  await query('DROP TABLE IF EXISTS maintenance');
  await query('DROP TABLE IF EXISTS allocations');
  await query('DROP TABLE IF EXISTS assets');
  await query('DROP TABLE IF EXISTS users');
  await query('DROP TABLE IF EXISTS organization');
  await query('DROP TABLE IF EXISTS departments');
  
  // 1. Departments Table
  await query(`
    CREATE TABLE IF NOT EXISTS departments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(191) NOT NULL UNIQUE
    ) ENGINE=InnoDB;
  `);

  // 2. Users Table
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      email VARCHAR(191) PRIMARY KEY,
      password VARCHAR(255) NOT NULL,
      fullName VARCHAR(255) NOT NULL,
      role VARCHAR(100) NOT NULL,
      department VARCHAR(100) NOT NULL,
      avatar VARCHAR(255),
      isVerified BOOLEAN DEFAULT TRUE,
      status VARCHAR(100) DEFAULT 'Active',
      transitionDetails TEXT
    ) ENGINE=InnoDB;
  `);

  // 3. Organization Table
  await query(`
    CREATE TABLE IF NOT EXISTS organization (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      code VARCHAR(100) NOT NULL,
      industry VARCHAR(100),
      address TEXT,
      phone VARCHAR(100),
      website VARCHAR(255)
    ) ENGINE=InnoDB;
  `);

  // 4. Assets Table
  await query(`
    CREATE TABLE IF NOT EXISTS assets (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      type VARCHAR(100) NOT NULL,
      serial VARCHAR(255) UNIQUE,
      status VARCHAR(100) NOT NULL,
      value DECIMAL(15, 2) NOT NULL,
      location VARCHAR(255),
      owner VARCHAR(255)
    ) ENGINE=InnoDB;
  `);

  // 5. Allocations Table
  await query(`
    CREATE TABLE IF NOT EXISTS allocations (
      id VARCHAR(50) PRIMARY KEY,
      assetId VARCHAR(50) NULL,
      assetName VARCHAR(255) NOT NULL,
      allocatedTo VARCHAR(255) NOT NULL,
      date VARCHAR(100) NOT NULL,
      status VARCHAR(100) NOT NULL,
      department VARCHAR(100) NOT NULL
    ) ENGINE=InnoDB;
  `);

  // 6. Bookings Table
  await query(`
    CREATE TABLE IF NOT EXISTS bookings (
      id VARCHAR(50) PRIMARY KEY,
      resourceName VARCHAR(255) NOT NULL,
      bookedBy VARCHAR(255) NOT NULL,
      date VARCHAR(100) NOT NULL,
      startTime VARCHAR(100) NOT NULL,
      endTime VARCHAR(100) NOT NULL,
      status VARCHAR(100) NOT NULL,
      department VARCHAR(100) NOT NULL
    ) ENGINE=InnoDB;
  `);

  // 7. Maintenance Table
  await query(`
    CREATE TABLE IF NOT EXISTS maintenance (
      id VARCHAR(50) PRIMARY KEY,
      assetId VARCHAR(50) NOT NULL,
      assetName VARCHAR(255) NOT NULL,
      type VARCHAR(100) NOT NULL,
      description TEXT,
      cost DECIMAL(15, 2) NOT NULL,
      date VARCHAR(100) NOT NULL,
      status VARCHAR(100) NOT NULL
    ) ENGINE=InnoDB;
  `);

  // 8. Audits Table
  await query(`
    CREATE TABLE IF NOT EXISTS audits (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      date VARCHAR(100) NOT NULL,
      auditor VARCHAR(255) NOT NULL,
      progress INT DEFAULT 0,
      status VARCHAR(100) NOT NULL
    ) ENGINE=InnoDB;
  `);

  // 9. Notifications Table (Targeted audience support added)
  await query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id VARCHAR(50) PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      type VARCHAR(100) NOT NULL,
      date VARCHAR(100) NOT NULL,
      \`read\` BOOLEAN DEFAULT FALSE,
      targetRole VARCHAR(100),
      targetUserEmail VARCHAR(191)
    ) ENGINE=InnoDB;
  `);

  console.log('Database tables verified/created successfully.');
  
  // Seed Database if empty
  await seedDatabase();
}

async function seedDatabase() {
  // Seed Departments first
  const deptsCount = await query('SELECT COUNT(*) as count FROM departments');
  if (deptsCount[0].count === 0) {
    console.log('Seeding default departments...');
    const defaultDepts = ['IT', 'Engineering', 'Human Resources', 'Marketing', 'Finance'];
    for (const d of defaultDepts) {
      await query('INSERT INTO departments (name) VALUES (?)', [d]);
    }
  }

  // Check if users empty
  const usersCount = await query('SELECT COUNT(*) as count FROM users');
  if (usersCount[0].count === 0) {
    console.log('Seeding default users (1 example per role)...');
    const defaultUsers = [
      ['admin@assetflow.com', 'Password123!', 'Rahul Sharma', 'Admin', 'Management', null, true, 'Active', null],
      ['manager@assetflow.com', 'Password123!', 'Amit Patel', 'Asset Manager', 'Asset Management', null, true, 'Active', null],
      ['it-head@assetflow.com', 'Password123!', 'Priya Iyer', 'Department Head', 'IT', null, true, 'Active', null],
      ['employee@assetflow.com', 'Password123!', 'Arjun Nair', 'Employee', 'IT', null, true, 'Active', null]
    ];
    for (const u of defaultUsers) {
      await query(
        'INSERT INTO users (email, password, fullName, role, department, avatar, isVerified, status, transitionDetails) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        u
      );
    }
  }

  // Check if organization empty
  const orgCount = await query('SELECT COUNT(*) as count FROM organization');
  if (orgCount[0].count === 0) {
    console.log('Seeding organization setup...');
    await query(
      'INSERT INTO organization (name, code, industry, address, phone, website) VALUES (?, ?, ?, ?, ?, ?)',
      ['Acme India Private Limited', 'ACME-IN', 'Technology', 'DLF Cyber City, Phase 3, Gurugram, Haryana, India', '+91 98765 43210', 'https://acme-india.in']
    );
  }

  // Check if assets empty
  const assetsCount = await query('SELECT COUNT(*) as count FROM assets');
  if (assetsCount[0].count === 0) {
    console.log('Seeding default assets (2 items)...');
    const defaultAssets = [
      ['AST-001', 'MacBook Pro 16"', 'Hardware', 'C02DF43SMD6R', 'Active', 199000.00, 'Gurugram HQ', 'Rahul Sharma'],
      ['AST-002', 'Dell UltraSharp 32" Monitor', 'Hardware', 'MX-09283-918', 'Active', 65000.00, 'Gurugram HQ', 'Arjun Nair']
    ];
    for (const a of defaultAssets) {
      await query(
        'INSERT INTO assets (id, name, type, serial, status, value, location, owner) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        a
      );
    }
  }

  // Check if allocations empty
  const allocCount = await query('SELECT COUNT(*) as count FROM allocations');
  if (allocCount[0].count === 0) {
    console.log('Seeding default allocations (2 items)...');
    const defaultAllocations = [
      ['ALC-001', 'AST-001', 'MacBook Pro 16"', 'Rahul Sharma', '2026-01-15', 'Approved', 'Management'],
      ['ALC-002', 'AST-002', 'Dell UltraSharp 32" Monitor', 'Arjun Nair', '2026-02-10', 'Approved', 'IT']
    ];
    for (const al of defaultAllocations) {
      await query(
        'INSERT INTO allocations (id, assetId, assetName, allocatedTo, date, status, department) VALUES (?, ?, ?, ?, ?, ?, ?)',
        al
      );
    }
  }

  // Check if bookings empty
  const bookingsCount = await query('SELECT COUNT(*) as count FROM bookings');
  if (bookingsCount[0].count === 0) {
    console.log('Seeding default resource bookings (2 items)...');
    const defaultBookings = [
      ['BKG-001', 'Conference Room A', 'Priya Iyer', '2026-07-13', '10:00', '11:30', 'Confirmed', 'IT'],
      ['BKG-002', 'Company EV Tata Nexon', 'Vikram Malhotra', '2026-07-14', '09:00', '17:00', 'Confirmed', 'Engineering']
    ];
    for (const b of defaultBookings) {
      await query(
        'INSERT INTO bookings (id, resourceName, bookedBy, date, startTime, endTime, status, department) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        b
      );
    }
  }

  // Check if maintenance logs empty
  const maintCount = await query('SELECT COUNT(*) as count FROM maintenance');
  if (maintCount[0].count === 0) {
    console.log('Seeding default maintenance records (2 items)...');
    const defaultMaint = [
      ['MNT-001', 'AST-002', 'Dell UltraSharp 32" Monitor', 'Repair', 'No power delivery to usb ports', 5000.00, '2026-07-10', 'Pending'],
      ['MNT-002', 'AST-001', 'MacBook Pro 16"', 'Repair', 'Thermal repasting & service', 12000.00, '2026-07-09', 'Approved']
    ];
    for (const m of defaultMaint) {
      await query(
        'INSERT INTO maintenance (id, assetId, assetName, type, description, cost, date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        m
      );
    }
  }

  // Check if audits empty
  const auditsCount = await query('SELECT COUNT(*) as count FROM audits');
  if (auditsCount[0].count === 0) {
    console.log('Seeding default audit schedules (2 items)...');
    const defaultAudits = [
      ['AUD-001', 'Q2 Hardware Inventory Audit', '2026-06-30', 'Amit Patel', 100, 'Completed'],
      ['AUD-002', 'Software License Compliance Audit', '2026-08-15', 'Priya Iyer', 10, 'In Progress']
    ];
    for (const au of defaultAudits) {
      await query(
        'INSERT INTO audits (id, name, date, auditor, progress, status) VALUES (?, ?, ?, ?, ?, ?)',
        au
      );
    }
  }

  // Check if notifications empty
  const notificationsCount = await query('SELECT COUNT(*) as count FROM notifications');
  if (notificationsCount[0].count === 0) {
    console.log('Seeding default system notifications (2 items)...');
    const defaultNotifications = [
      ['NTF-001', 'Maintenance Overdue', 'Asset AST-002 Dell UltraSharp 32" Monitor is overdue for power check.', 'warning', '2026-07-12 08:30', false, 'Asset Manager', null],
      ['NTF-002', 'Booking Confirmed', 'Your booking for Conference Room A has been confirmed.', 'success', '2026-07-11 14:20', false, null, 'it-head@assetflow.com']
    ];
    for (const n of defaultNotifications) {
      await query(
        'INSERT INTO notifications (id, title, message, type, date, `read`, targetRole, targetUserEmail) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        n
      );
    }
  }

  console.log('Database seeding verified successfully.');
}

module.exports = {
  query,
  initializeDatabase
};
