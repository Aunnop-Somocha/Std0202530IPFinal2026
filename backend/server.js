const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Request logger
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  next();
});

// ==========================================
// Database & Storage Configuration
// Table Name: AunSom_employees (Requested by User)
// ==========================================
const TABLE_NAME = process.env.TABLE_NAME || 'AunSom_employees';
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);
const DB_USER = process.env.DB_USER || 'ip_std6730202530';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'ip_std6730202530';

let pool = null;
let useDatabase = false;

// Initial Mock Data (8 Employees for K-Means Clustering)
const INITIAL_EMPLOYEES = [
  { id: '1', name: 'John Doe', position: 'Software Engineer', status: 'Active', salary: 45000 },
  { id: '2', name: 'Jane Smith', position: 'HR Manager', status: 'Active', salary: 52000 },
  { id: '3', name: 'Somchai Jaidee', position: 'Junior Frontend Developer', status: 'Active', salary: 22000 },
  { id: '4', name: 'Somsri Rakdee', position: 'Administrative Assistant', status: 'On Leave', salary: 18500 },
  { id: '5', name: 'Alice Johnson', position: 'VP of Engineering', status: 'Active', salary: 95000 },
  { id: '6', name: 'Bob Williams', position: 'Senior System Architect', status: 'Active', salary: 85000 },
  { id: '7', name: 'Kanya Wattana', position: 'Data Analyst', status: 'Active', salary: 42000 },
  { id: '8', name: 'David Miller', position: 'DevOps Engineer', status: 'On Leave', salary: 60000 }
];

let inMemoryEmployees = JSON.parse(JSON.stringify(INITIAL_EMPLOYEES));
let nextEmployeeId = 9;

// ==========================================
// Initialize MySQL Connection & Auto Table Setup
// ==========================================
async function initDatabase() {
  try {
    pool = mysql.createPool({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 4000
    });

    // Test connection
    const conn = await pool.getConnection();

    // Auto-create table AunSom_employees if it does not exist
    await conn.query(`
      CREATE TABLE IF NOT EXISTS \`${TABLE_NAME}\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`name\` VARCHAR(255) NOT NULL,
        \`position\` VARCHAR(255) NOT NULL,
        \`status\` ENUM('Active', 'On Leave') NOT NULL DEFAULT 'Active',
        \`salary\` DECIMAL(12, 2) NOT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Check if table has data, seed if empty
    const [rows] = await conn.query(`SELECT COUNT(*) AS count FROM \`${TABLE_NAME}\``);
    if (rows[0].count === 0) {
      console.log(`🌱 Seeding initial records into MySQL table: ${TABLE_NAME}...`);
      for (const emp of INITIAL_EMPLOYEES) {
        await conn.query(
          `INSERT INTO \`${TABLE_NAME}\` (name, position, status, salary) VALUES (?, ?, ?, ?)`,
          [emp.name, emp.position, emp.status, emp.salary]
        );
      }
    }

    conn.release();
    useDatabase = true;
    console.log(`✅ [MySQL Connected] Active table: \`${TABLE_NAME}\` in database \`${DB_NAME}\``);
  } catch (err) {
    useDatabase = false;
    console.log(`ℹ️ [Storage Mode] Running with In-Memory Array persistence (${err.message})`);
  }
}

// ==========================================
// 1D K-Means Clustering Algorithm (k = 3)
// ==========================================
function calculateSalaryClusters(salariesList, k = 3) {
  // Extract only the salary values from all current employees
  const salaries = salariesList
    .map(Number)
    .filter(s => !isNaN(s) && s > 0)
    .sort((a, b) => a - b);

  // Fallback for empty list
  if (salaries.length === 0) {
    return Array.from({ length: k }, (_, i) => ({
      group: `Tier ${i + 1}`,
      centroid: 0,
      count: 0
    }));
  }

  // Handle fewer data points than k
  if (salaries.length < k) {
    return Array.from({ length: k }, (_, i) => ({
      group: `Tier ${i + 1}`,
      centroid: i < salaries.length ? Math.round(salaries[i]) : 0,
      count: i < salaries.length ? 1 : 0
    }));
  }

  // Initial centroid selection across the sorted range (quantiles)
  let centroids = [
    salaries[Math.floor((salaries.length - 1) * 0.15)],
    salaries[Math.floor((salaries.length - 1) * 0.50)],
    salaries[Math.floor((salaries.length - 1) * 0.85)]
  ];

  // Guard against identical initial centroids
  if (centroids[0] === centroids[1] || centroids[1] === centroids[2]) {
    const min = salaries[0];
    const max = salaries[salaries.length - 1];
    const step = (max - min) / (k + 1);
    centroids = Array.from({ length: k }, (_, i) => min + (i + 1) * step);
  }

  // Run iterative K-Means
  const MAX_ITERATIONS = 100;
  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    const clusters = Array.from({ length: k }, () => []);

    // Assignment step: assign each salary to the closest centroid
    for (const val of salaries) {
      let closestIdx = 0;
      let minDistance = Math.abs(val - centroids[0]);
      for (let i = 1; i < k; i++) {
        const dist = Math.abs(val - centroids[i]);
        if (dist < minDistance) {
          minDistance = dist;
          closestIdx = i;
        }
      }
      clusters[closestIdx].push(val);
    }

    // Update step: recompute centroid as mean of cluster
    let converged = true;
    for (let i = 0; i < k; i++) {
      if (clusters[i].length > 0) {
        const mean = clusters[i].reduce((sum, v) => sum + v, 0) / clusters[i].length;
        if (Math.abs(mean - centroids[i]) > 0.01) {
          converged = false;
          centroids[i] = mean;
        }
      }
    }

    if (converged) break;
  }

  // Final assignment to calculate exact counts and centroids
  const finalClusters = Array.from({ length: k }, () => []);
  for (const val of salaries) {
    let closestIdx = 0;
    let minDistance = Math.abs(val - centroids[0]);
    for (let i = 1; i < k; i++) {
      const dist = Math.abs(val - centroids[i]);
      if (dist < minDistance) {
        minDistance = dist;
        closestIdx = i;
      }
    }
    finalClusters[closestIdx].push(val);
  }

  // Sort clusters by centroid in ascending order (Tier 1 = lowest, Tier 3 = highest)
  const clusterResults = finalClusters.map((clusterPoints, i) => ({
    centroid: clusterPoints.length > 0
      ? clusterPoints.reduce((sum, v) => sum + v, 0) / clusterPoints.length
      : centroids[i],
    count: clusterPoints.length
  }));

  clusterResults.sort((a, b) => a.centroid - b.centroid);

  // Format matching the exact required specification
  return clusterResults.map((item, index) => ({
    group: `Tier ${index + 1}`,
    centroid: Math.round(item.centroid),
    count: item.count
  }));
}

// ==========================================
// Phase 1: Authentication (Login) Endpoint
// ==========================================
// POST /api/login
// Accept username and password in the request body.
// If credentials match admin / password123 (or database user), respond with Status 200 OK and token.
// If incorrect, respond with Status 401 Unauthorized and an error message.
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(401).json({
      success: false,
      message: 'Username and password are required'
    });
  }

  // 1. Query MySQL AunSom_users table if database is connected
  if (useDatabase && pool) {
    try {
      const [rows] = await pool.query(
        `SELECT id, username, role, name FROM \`AunSom_users\` WHERE username = ? AND password = ?`,
        [username, password]
      );

      if (rows.length > 0) {
        return res.status(200).json({
          success: true,
          token: 'mock-jwt-token',
          user: rows[0]
        });
      }
    } catch (err) {
      console.log('Database login query fallback:', err.message);
    }
  }

  // 2. Fallback / Standard Exam Requirement check
  if (username === 'admin' && password === 'password123') {
    return res.status(200).json({
      success: true,
      token: 'mock-jwt-token',
      user: { username: 'admin', role: 'admin', name: 'HR Administrator' }
    });
  }

  return res.status(401).json({
    success: false,
    message: 'Invalid username or password'
  });
});

// ==========================================
// Phase 1: Employee Management (CRUD)
// ==========================================

// [GET] /api/employees - Return all employee records
app.get('/api/employees', async (req, res) => {
  try {
    if (useDatabase && pool) {
      const [rows] = await pool.query(
        `SELECT id, name, position, status, CAST(salary AS DOUBLE) AS salary FROM \`${TABLE_NAME}\` ORDER BY id ASC`
      );
      const formatted = rows.map(r => ({
        id: String(r.id),
        name: r.name,
        position: r.position,
        status: r.status,
        salary: Number(r.salary)
      }));
      return res.status(200).json(formatted);
    }

    return res.status(200).json(inMemoryEmployees);
  } catch (error) {
    console.error('Error fetching employees:', error);
    return res.status(200).json(inMemoryEmployees);
  }
});

// [POST] /api/employees - Add a new employee
// Must receive name, position, and salary. If any field is empty, respond with Status 400 Bad Request.
app.post('/api/employees', async (req, res) => {
  const { name, position, salary } = req.body || {};

  // Strict validation: check all fields
  if (
    !name ||
    typeof name !== 'string' ||
    name.trim() === '' ||
    !position ||
    typeof position !== 'string' ||
    position.trim() === '' ||
    salary === undefined ||
    salary === null ||
    String(salary).trim() === '' ||
    isNaN(Number(salary)) ||
    Number(salary) <= 0
  ) {
    return res.status(400).json({
      success: false,
      message: 'All fields (name, position, salary) are required and salary must be a positive number.'
    });
  }

  const cleanName = name.trim();
  const cleanPosition = position.trim();
  const cleanSalary = Number(salary);

  try {
    if (useDatabase && pool) {
      const [result] = await pool.query(
        `INSERT INTO \`${TABLE_NAME}\` (name, position, status, salary) VALUES (?, ?, 'Active', ?)`,
        [cleanName, cleanPosition, cleanSalary]
      );

      const createdEmployee = {
        id: String(result.insertId),
        name: cleanName,
        position: cleanPosition,
        status: 'Active',
        salary: cleanSalary
      };

      return res.status(201).json({
        success: true,
        employee: createdEmployee
      });
    }

    const newEmployee = {
      id: String(nextEmployeeId++),
      name: cleanName,
      position: cleanPosition,
      status: 'Active',
      salary: cleanSalary
    };

    inMemoryEmployees.push(newEmployee);

    return res.status(201).json({
      success: true,
      employee: newEmployee
    });
  } catch (error) {
    console.error('Error creating employee:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create employee record'
    });
  }
});

// [PUT] /api/employees/:id/status - Toggle the employee's status (Active <-> On Leave)
app.put('/api/employees/:id/status', async (req, res) => {
  const employeeId = String(req.params.id);

  try {
    if (useDatabase && pool) {
      const [rows] = await pool.query(
        `SELECT id, name, position, status, CAST(salary AS DOUBLE) AS salary FROM \`${TABLE_NAME}\` WHERE id = ?`,
        [employeeId]
      );

      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }

      const currentStatus = rows[0].status;
      const newStatus = currentStatus === 'Active' ? 'On Leave' : 'Active';

      await pool.query(
        `UPDATE \`${TABLE_NAME}\` SET status = ? WHERE id = ?`,
        [newStatus, employeeId]
      );

      const updated = {
        id: String(rows[0].id),
        name: rows[0].name,
        position: rows[0].position,
        status: newStatus,
        salary: Number(rows[0].salary)
      };

      return res.status(200).json({
        success: true,
        employee: updated
      });
    }

    const employee = inMemoryEmployees.find(e => String(e.id) === employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    employee.status = employee.status === 'Active' ? 'On Leave' : 'Active';

    return res.status(200).json({
      success: true,
      employee
    });
  } catch (error) {
    console.error('Error toggling status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update employee status'
    });
  }
});

// [DELETE] /api/employees/:id - Remove the employee from the system
app.delete('/api/employees/:id', async (req, res) => {
  const employeeId = String(req.params.id);

  try {
    if (useDatabase && pool) {
      const [rows] = await pool.query(
        `SELECT id, name, position, status, CAST(salary AS DOUBLE) AS salary FROM \`${TABLE_NAME}\` WHERE id = ?`,
        [employeeId]
      );

      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }

      await pool.query(`DELETE FROM \`${TABLE_NAME}\` WHERE id = ?`, [employeeId]);

      return res.status(200).json({
        success: true,
        message: 'Employee removed successfully',
        employee: {
          id: String(rows[0].id),
          name: rows[0].name,
          position: rows[0].position,
          status: rows[0].status,
          salary: Number(rows[0].salary)
        }
      });
    }

    const employeeIndex = inMemoryEmployees.findIndex(e => String(e.id) === employeeId);
    if (employeeIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    const [deletedEmployee] = inMemoryEmployees.splice(employeeIndex, 1);

    return res.status(200).json({
      success: true,
      message: 'Employee removed successfully',
      employee: deletedEmployee
    });
  } catch (error) {
    console.error('Error deleting employee:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete employee'
    });
  }
});

// ==========================================
// Phase 2: Salary Clustering Analytics
// ==========================================
// [GET] /api/employees/salary-clusters
// Respond with Status 200 OK containing the number of employees and the average salary (centroid) for each cluster.
app.get('/api/employees/salary-clusters', async (req, res) => {
  try {
    let salaries = [];

    if (useDatabase && pool) {
      const [rows] = await pool.query(`SELECT CAST(salary AS DOUBLE) AS salary FROM \`${TABLE_NAME}\``);
      salaries = rows.map(r => Number(r.salary));
    } else {
      salaries = inMemoryEmployees.map(e => Number(e.salary));
    }

    const clusters = calculateSalaryClusters(salaries, 3);
    return res.status(200).json({
      success: true,
      clusters
    });
  } catch (error) {
    console.error('Error during salary clustering:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to calculate salary clusters'
    });
  }
});

// ==========================================
// Utility & Health Check Endpoints
// ==========================================
// Reset to initial mock data (Convenient for examiner or automated tests)
app.post('/api/reset', async (req, res) => {
  try {
    if (useDatabase && pool) {
      await pool.query(`DELETE FROM \`${TABLE_NAME}\``);
      for (const emp of INITIAL_EMPLOYEES) {
        await pool.query(
          `INSERT INTO \`${TABLE_NAME}\` (name, position, status, salary) VALUES (?, ?, ?, ?)`,
          [emp.name, emp.position, emp.status, emp.salary]
        );
      }
      return res.status(200).json({
        success: true,
        message: `Table \`${TABLE_NAME}\` reset to initial 8 mock records`,
        storage: 'MySQL',
        count: INITIAL_EMPLOYEES.length
      });
    }

    inMemoryEmployees = JSON.parse(JSON.stringify(INITIAL_EMPLOYEES));
    nextEmployeeId = 9;
    return res.status(200).json({
      success: true,
      message: 'Employee database reset to initial 8 mock records',
      storage: 'In-Memory',
      count: inMemoryEmployees.length
    });
  } catch (error) {
    console.error('Error resetting database:', error);
    return res.status(500).json({ success: false, message: 'Failed to reset database' });
  }
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    server: 'HR Manager & Salary Analytics API',
    storageMode: useDatabase ? 'MySQL' : 'In-Memory',
    tableName: TABLE_NAME,
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.send(`
    <html>
      <head><title>HR Manager API</title></head>
      <body style="font-family: sans-serif; padding: 40px; background: #0f172a; color: #f8fafc;">
        <h1>🏢 HR Manager & Salary Analytics API</h1>
        <p>Status: <span style="color: #4ade80; font-weight: bold;">ONLINE</span></p>
        <p>Storage Engine: <strong>${useDatabase ? `MySQL Table [${TABLE_NAME}]` : 'In-Memory Array'}</strong></p>
        <h3>Available Endpoints:</h3>
        <ul>
          <li><code>POST /api/login</code> - Authenticate (admin / password123)</li>
          <li><code>GET /api/employees</code> - List all employees</li>
          <li><code>POST /api/employees</code> - Add employee</li>
          <li><code>PUT /api/employees/:id/status</code> - Toggle employee status</li>
          <li><code>DELETE /api/employees/:id</code> - Delete employee</li>
          <li><code>GET /api/employees/salary-clusters</code> - 1D K-Means Clustering</li>
          <li><code>POST /api/reset</code> - Reset to mock employees</li>
        </ul>
      </body>
    </html>
  `);
});

// Start Express Server
initDatabase().finally(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`====================================================`);
    console.log(`🚀 HR Manager & Salary Analytics API Server Started`);
    console.log(`📡 Listening on: http://localhost:${PORT}`);
    console.log(`🗄️ Storage Table: \`${TABLE_NAME}\` (${useDatabase ? 'MySQL Database' : 'In-Memory Auto-Fallback'})`);
    console.log(`🔐 Credentials: admin / password123`);
    console.log(`====================================================`);
  });
});
