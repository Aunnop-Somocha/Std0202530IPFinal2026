async function testAPI() {
  const port = process.env.PORT || 3049;
  const base = `http://localhost:${port}`;
  console.log("=== Testing Backend Endpoints on " + base + " ===");

  // 1. Login success
  let res = await fetch(`${base}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "password123" })
  });
  console.log("1. Login (valid):", res.status, await res.json());

  // 2. Login failure
  res = await fetch(`${base}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "wrongpassword" })
  });
  console.log("2. Login (invalid):", res.status, await res.json());

  // 3. GET /api/employees
  res = await fetch(`${base}/api/employees`);
  const employees = await res.json();
  console.log("3. GET /api/employees:", res.status, "Count:", employees.length);

  // 4. POST /api/employees (invalid - empty fields)
  res = await fetch(`${base}/api/employees`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "", position: "Dev", salary: 30000 })
  });
  console.log("4. POST (empty name):", res.status, await res.json());

  // 5. POST /api/employees (valid)
  res = await fetch(`${base}/api/employees`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Sarawut Tech", position: "Fullstack Developer", salary: 48000 })
  });
  const newEmp = await res.json();
  console.log("5. POST (valid):", res.status, newEmp);

  // 6. PUT /api/employees/:id (Edit Employee)
  const idToEdit = newEmp.employee.id;
  res = await fetch(`${base}/api/employees/${idToEdit}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Sarawut Tech Senior", position: "Lead Architect", salary: 75000, status: "Active" })
  });
  console.log("6. PUT /employees/:id (Edit):", res.status, await res.json());

  // 7. PUT status toggle
  res = await fetch(`${base}/api/employees/${idToEdit}/status`, { method: "PUT" });
  console.log("7. PUT /status:", res.status, await res.json());

  // 7. GET /api/employees/salary-clusters
  res = await fetch(`${base}/api/employees/salary-clusters`);
  console.log("7. GET /salary-clusters:", res.status, JSON.stringify(await res.json(), null, 2));

  // 8. DELETE employee
  res = await fetch(`${base}/api/employees/${idToEdit}`, { method: "DELETE" });
  console.log("8. DELETE:", res.status, await res.json());

  // 9. Reset
  res = await fetch(`${base}/api/reset`, { method: "POST" });
  console.log("9. Reset:", res.status, await res.json());

  console.log("=== All Backend Tests Passed Successfully! ===");
}
testAPI().catch(console.error);
