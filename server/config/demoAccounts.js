const DEMO_PASSWORD = "test1234";

const DEMO_ACCOUNTS = [
  { name: "Demo Admin", email: "admin@school.test", password: DEMO_PASSWORD, role: "admin" },
  { name: "Demo Teacher", email: "teacher@school.test", password: DEMO_PASSWORD, role: "teacher" },
  { name: "Demo Accountant", email: "accountant@school.test", password: DEMO_PASSWORD, role: "accountant" },
  { name: "Demo Accounts", email: "accounts@school.test", password: DEMO_PASSWORD, role: "accounts" },
  { name: "Demo Staff", email: "staff@school.test", password: DEMO_PASSWORD, role: "staff" },
  { name: "Demo Employee", email: "employee@school.test", password: DEMO_PASSWORD, role: "employee" },
  { name: "Demo Student", email: "student@school.test", password: DEMO_PASSWORD, role: "student" },
  { name: "Demo Audit", email: "audit@school.test", password: DEMO_PASSWORD, role: "audit" },
];

module.exports = {
  DEMO_ACCOUNTS,
  DEMO_PASSWORD,
};
