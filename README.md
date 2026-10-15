# 🏢 HR Manager & Salary Analytics System
### Final Examination: Internet Programming (2026)
**Student ID:** 6730202530  
**Repository Name:** `Std6730202530IPFinal2026`  
**Time Limit:** 3 Hours (9.00 - 12.00)

---

## 📌 Project Architecture & Directory Layout

This project follows the strict directory structure specified in the exam protocol:

```text
Std6730202530IPFinal2026/
├── backend/                       # Express.js In-Memory REST API Server
│   ├── server.js                  # Complete API & 1D K-Means Clustering (k=3)
│   ├── package.json               # Backend dependencies (express, cors, dotenv)
│   ├── .env.example               # Port configuration example (PORT=5000)
│   ├── test-api.js                # Automated backend test suite
│   └── ...
├── frontend/                      # React Native (Expo SDK 57) Mobile & Web App
│   ├── app.json                   # Expo App Configuration
│   ├── package.json               # Frontend dependencies (React 19, RN 0.86, Expo Router)
│   ├── tsconfig.json              # TypeScript configuration
│   ├── src/
│   │   ├── app/
│   │   │   ├── _layout.tsx        # Expo Router root Stack layout
│   │   │   ├── index.tsx          # Login Screen (Phase 1 Auth UI)
│   │   │   └── dashboard.tsx      # Dashboard Screen (Phase 1 CRUD & Phase 2 Analytics)
│   │   └── services/
│   │       └── api.ts             # API Client service with cross-platform URL resolution
│   └── ...
├── README.md                      # Comprehensive project documentation
└── package.json                   # Root convenience runner scripts
```

---

## 🚀 Quick Start Guide

### 1. Start Backend Server (Express.js)
```bash
cd backend
npm install
npm start
```
* The backend will start on **`http://localhost:5000`**
* Pre-seeded with 8 diverse mock employees in memory.

### 2. Start Frontend App (React Native Expo)
Open a new terminal window:
```bash
cd frontend
npm install
npm start
```
* To run directly in your web browser:
```bash
npm run web
```
* The web app will open at **`http://localhost:8081`**

### Alternative: Run from Project Root
```bash
npm run backend    # Starts backend server on port 5000
npm run frontend   # Starts Expo Metro bundler on port 8081
```

---

## 🔐 Authentication Credentials

| Field | Value |
|---|---|
| **Username** | `admin` |
| **Password** | `password123` |

> ⚡ **Quick Fill Feature:** The login screen contains a **"⚡ Quick Fill Admin"** button for instant one-click login testing.

---

## 🛠️ Phase 1: Authentication & Employee Management (CRUD)

### 1.1 Backend Endpoints

| Method | Endpoint | Description | Status Codes |
|---|---|---|---|
| `POST` | `/api/login` | Authenticate admin user | `200 OK` (token), `401 Unauthorized` |
| `GET` | `/api/employees` | Return all employee records | `200 OK` |
| `POST` | `/api/employees` | Add a new employee (`name`, `position`, `salary`) | `201 Created`, `400 Bad Request` |
| `PUT` | `/api/employees/:id/status` | Toggle employee status (`Active` ⟷ `On Leave`) | `200 OK`, `404 Not Found` |
| `DELETE` | `/api/employees/:id` | Remove employee from in-memory array | `200 OK`, `404 Not Found` |

### 1.2 Frontend Features (React Native)
- **Login Screen:** Accepts username and password with client-side validation and failure alert dialog. Navigates to Dashboard upon success.
- **Employee Directory:** Renders all employees with Name, Position, Status badge, and Salary.
- **Add Employee Form:** Client-side validation prevents submission if any required field is empty.
- **Status Toggle:** One-click toggle button (`Active` ⟷ `On Leave`) that immediately updates the UI.
- **Delete Confirmation:** Displays an Alert Confirmation dialog (`"Are you sure?"`) before dispatching delete request to the API.

---

## 📈 Phase 2: Automated Salary Clustering (K-Means Analytics)

### 2.1 Backend 1D K-Means Clustering (`k=3`)
- **Endpoint:** `GET /api/employees/salary-clusters`
- **Algorithm:** Robust 1D K-Means algorithm clustering salaries into 3 tiers:
  - **Tier 1:** Entry / Junior salary band
  - **Tier 2:** Mid-Level / Professional salary band
  - **Tier 3:** Senior / Executive salary band
- **Response Format:**
```json
{
  "success": true,
  "clusters": [
    { "group": "Tier 1", "centroid": 20250, "count": 2 },
    { "group": "Tier 2", "centroid": 49400, "count": 4 },
    { "group": "Tier 3", "centroid": 90000, "count": 2 }
  ]
}
```

### 2.2 Frontend Analytics UI
- **"Analyze Salary Structure" Button:** Initiates server clustering calculation.
- **Loading State:** Animated `ActivityIndicator` displays while awaiting the server response.
- **Summary Cards:** Renders 3 visual cards displaying Tier Name, Employee Count, Workforce Percentage, and Average Base Salary (Centroid).

---

## 🧪 Automated Testing

To run the backend automated test suite:
```bash
node backend/test-api.js
```
All endpoints and edge cases (`400 Bad Request`, `401 Unauthorized`, `CRUD`, and `K-Means clustering`) will be verified automatically.
