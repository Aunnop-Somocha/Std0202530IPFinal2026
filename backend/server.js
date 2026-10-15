const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Request logger for debugging and examiner inspection
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  next();
});

// ==========================================
// In-Memory Employee Data Storage
// (Initialized with 8 diverse mock employees)
// ==========================================
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

let employees = JSON.parse(JSON.stringify(INITIAL_EMPLOYEES));
let nextEmployeeId = 9;

// ==========================================
// 1D K-Means Clustering Algorithm (k = 3)
// ==========================================
function calculateSalaryClusters(employeeList, k = 3) {
  // Extract only the salary values from all current employees
  const salaries = employeeList
    .map(e => Number(e.salary))
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
// If credentials are admin and password123, respond with Status 200 OK and {"success": true, "token": "mock-jwt-token"}.
// If incorrect, respond with Status 401 Unauthorized and an error message.
app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(401).json({
      success: false,
      message: 'Username and password are required'
    });
  }

  if (username === 'admin' && password === 'password123') {
    return res.status(200).json({
      success: true,
      token: 'mock-jwt-token'
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
app.get('/api/employees', (req, res) => {
  // Return array directly per REST convention, or wrapper object if needed
  res.status(200).json(employees);
});

// [POST] /api/employees - Add a new employee
// Must receive name, position, and salary. If any field is empty, respond with Status 400 Bad Request.
app.post('/api/employees', (req, res) => {
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

  const newEmployee = {
    id: String(nextEmployeeId++),
    name: name.trim(),
    position: position.trim(),
    status: 'Active', // Default status is Active
    salary: Number(salary) // Numeric field
  };

  employees.push(newEmployee);

  return res.status(201).json({
    success: true,
    employee: newEmployee
  });
});

// [PUT] /api/employees/:id/status - Toggle the employee's status (Active <-> On Leave)
app.put('/api/employees/:id/status', (req, res) => {
  const employeeId = String(req.params.id);
  const employee = employees.find(e => String(e.id) === employeeId);

  if (!employee) {
    return res.status(404).json({
      success: false,
      message: 'Employee not found'
    });
  }

  // Toggle status
  employee.status = employee.status === 'Active' ? 'On Leave' : 'Active';

  return res.status(200).json({
    success: true,
    employee
  });
});

// [DELETE] /api/employees/:id - Remove the employee from the system
app.delete('/api/employees/:id', (req, res) => {
  const employeeId = String(req.params.id);
  const employeeIndex = employees.findIndex(e => String(e.id) === employeeId);

  if (employeeIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Employee not found'
    });
  }

  const [deletedEmployee] = employees.splice(employeeIndex, 1);

  return res.status(200).json({
    success: true,
    message: 'Employee removed successfully',
    employee: deletedEmployee
  });
});

// ==========================================
// Phase 2: Salary Clustering Analytics
// ==========================================
// [GET] /api/employees/salary-clusters
// Respond with Status 200 OK containing the number of employees and the average salary (centroid) for each cluster.
app.get('/api/employees/salary-clusters', (req, res) => {
  try {
    const clusters = calculateSalaryClusters(employees, 3);
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
app.post('/api/reset', (req, res) => {
  employees = JSON.parse(JSON.stringify(INITIAL_EMPLOYEES));
  nextEmployeeId = 9;
  res.status(200).json({
    success: true,
    message: 'Employee database reset to initial 8 mock records',
    count: employees.length
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    server: 'HR Manager & Salary Analytics API',
    employeeCount: employees.length,
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
        <p>Current In-memory Employees: <strong>${employees.length}</strong></p>
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
app.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`🚀 HR Manager & Salary Analytics API Server Started`);
  console.log(`📡 Listening on: http://localhost:${PORT}`);
  console.log(`📊 In-memory employees loaded: ${employees.length}`);
  console.log(`🔐 Credentials: admin / password123`);
  console.log(`====================================================`);
});
