import { api } from "../api";

export function authConfig(token, config = {}) {
  return {
    ...config,
    headers: {
      ...(config.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  };
}

// ── Session-level browser cache ──────────────────────────────────────────────
// Stores the last full ERP fetch so the UI can render instantly on revisit.
const CACHE_KEY = "erp_data_v1";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function cacheLoad() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) return null;
    return data;
  } catch {
    return null;
  }
}

export function cacheSave(data) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
  } catch {
    // sessionStorage full or unavailable — ignore
  }
}

export function cacheInvalidate() {
  try { sessionStorage.removeItem(CACHE_KEY); } catch { /* ignore */ }
}


const defaultSchoolSettings = {
  schoolName: "Your School Name",
  shortName: "School",
  subtitle: "An English Medium School",
  leftLogoUrl: "",
  rightLogoUrl: "",
  address: "School address here",
  phone: "",
  schoolEmail: "",
  website: "",
  academicYear: new Date().getFullYear().toString(),
  academicSession: "January - December",
  defaultExamTitle: "Progress Report",
  defaultPassMark: 33,
  classStartTime: "09:00",
  supportEmail: "",
  admissionNotice: "Admission open. Contact school office for details.",
  principalName: "Principal",
  resultRemarksDefault: "She/He has been consistently progressing.",
};

const emptyERPData = {
  dashboard: { totalStudents: 0, totalEmployees: 0, totalIncome: 0, totalDue: 0, monthlyCollection: [], recentPayments: [] },
  classFees: [],
  students: [],
  employees: [],
  payments: [],
  salaries: [],
  marks: [],
  markResults: [],
  routines: [],
  increments: [],
  schoolSettings: defaultSchoolSettings,
  attendance: [],
  expenses: [],
  sections: [],
  classrooms: [],
  teacherUsers: [],
};

function readSettled(results, key, defaultValue) {
  const item = results[key];
  return item.status === "fulfilled" ? item.value.data : defaultValue;
}

export async function loadERPData(token) {
  const config = authConfig(token);
  const requestMap = {
    dashboard: api.get("/api/dashboard", config),
    classFees: api.get("/api/class-fees", config),
    students: api.get("/api/students", config),
    employees: api.get("/api/employees", config),
    payments: api.get("/api/payments", config),
    salaries: api.get("/api/salaries", config),
    marks: api.get("/api/marks", config),
    markResults: api.get("/api/marks/results", config),
    routines: api.get("/api/routines", config),
    increments: api.get("/api/salary-increments", config),
    schoolSettings: api.get("/api/school-settings", config),
    attendance: api.get("/api/attendance", config),
    expenses: api.get("/api/expenses", config),
    sections: api.get("/api/sections", config),
    classrooms: api.get("/api/classrooms", config),
    teacherUsers: api.get("/api/users?role=teacher", config),
  };

  const keys = Object.keys(requestMap);
  const settled = await Promise.allSettled(Object.values(requestMap));
  const results = Object.fromEntries(keys.map((key, index) => [key, settled[index]]));

  const dashboard = readSettled(results, "dashboard", { dashboard: emptyERPData.dashboard });
  const classFees = readSettled(results, "classFees", { classFees: [] });
  const students = readSettled(results, "students", { students: [] });
  const employees = readSettled(results, "employees", { employees: [] });
  const payments = readSettled(results, "payments", { payments: [] });
  const salaries = readSettled(results, "salaries", { salaries: [] });
  const marks = readSettled(results, "marks", { marks: [] });
  const markResults = readSettled(results, "markResults", { results: [] });
  const routines = readSettled(results, "routines", { routines: [] });
  const increments = readSettled(results, "increments", { increments: [] });
  const schoolSettings = readSettled(results, "schoolSettings", { settings: defaultSchoolSettings });
  const attendance = readSettled(results, "attendance", { attendance: [] });
  const expenses = readSettled(results, "expenses", { expenses: [] });
  const sections = readSettled(results, "sections", { sections: [] });
  const classrooms = readSettled(results, "classrooms", { classrooms: [] });
  const teacherUsers = readSettled(results, "teacherUsers", { users: [] });

  return {
    dashboard: dashboard.dashboard || emptyERPData.dashboard,
    classFees: classFees.classFees || [],
    students: students.students || [],
    employees: employees.employees || [],
    payments: payments.payments || [],
    salaries: salaries.salaries || [],
    marks: marks.marks || [],
    markResults: markResults.results || [],
    routines: routines.routines || [],
    increments: increments.increments || [],
    schoolSettings: schoolSettings.settings || defaultSchoolSettings,
    attendance: attendance.attendance || [],
    expenses: expenses.expenses || [],
    sections: sections.sections || [],
    classrooms: classrooms.classrooms || [],
    teacherUsers: teacherUsers.users || [],
  };
}

// ── Targeted partial refresh ─────────────────────────────────────────────────
// Fetches only the listed data slices and returns a partial update object.
// The caller should merge this into existing state: setData(prev => ({...prev, ...partial}))
const sliceEndpoints = {
  dashboard: (config) => api.get("/api/dashboard", config),
  classFees: (config) => api.get("/api/class-fees", config),
  students: (config) => api.get("/api/students", config),
  employees: (config) => api.get("/api/employees", config),
  payments: (config) => api.get("/api/payments", config),
  salaries: (config) => api.get("/api/salaries", config),
  marks: (config) => api.get("/api/marks", config),
  markResults: (config) => api.get("/api/marks/results", config),
  routines: (config) => api.get("/api/routines", config),
  increments: (config) => api.get("/api/salary-increments", config),
  schoolSettings: (config) => api.get("/api/school-settings", config),
  attendance: (config) => api.get("/api/attendance", config),
  expenses: (config) => api.get("/api/expenses", config),
  sections: (config) => api.get("/api/sections", config),
  classrooms: (config) => api.get("/api/classrooms", config),
  teacherUsers: (config) => api.get("/api/users?role=teacher", config),
};

// Maps each slice name to the key inside the API response body
const sliceResponseKey = {
  dashboard: "dashboard",
  classFees: "classFees",
  students: "students",
  employees: "employees",
  payments: "payments",
  salaries: "salaries",
  marks: "marks",
  markResults: "results",
  routines: "routines",
  increments: "increments",
  schoolSettings: "settings",
  attendance: "attendance",
  expenses: "expenses",
  sections: "sections",
  classrooms: "classrooms",
  teacherUsers: "users",
};

const sliceDefaults = {
  dashboard: emptyERPData.dashboard,
  classFees: [],
  students: [],
  employees: [],
  payments: [],
  salaries: [],
  marks: [],
  markResults: [],
  routines: [],
  increments: [],
  schoolSettings: defaultSchoolSettings,
  attendance: [],
  expenses: [],
  sections: [],
  classrooms: [],
  teacherUsers: [],
};

export async function refreshPartialData(token, slices) {
  const config = authConfig(token);
  const keys = slices.filter((k) => sliceEndpoints[k]);
  const settled = await Promise.allSettled(keys.map((k) => sliceEndpoints[k](config)));
  const partial = {};
  keys.forEach((key, index) => {
    const result = settled[index];
    const responseKey = sliceResponseKey[key];
    const fallback = sliceDefaults[key];
    const value = result.status === "fulfilled" ? result.value.data[responseKey] : undefined;
    partial[key] = value ?? fallback;
  });
  return partial;
}

export const erpApi = {
  createClassFee: (token, payload) => api.post("/api/class-fees", payload, authConfig(token)),
  updateClassFee: (token, id, payload) => api.put(`/api/class-fees/${id}`, payload, authConfig(token)),
  deleteClassFee: (token, id) => api.delete(`/api/class-fees/${id}`, authConfig(token)),

  createEmployee: (token, payload) => api.post("/api/employees", payload, authConfig(token)),
  updateEmployee: (token, id, payload) => api.put(`/api/employees/${id}`, payload, authConfig(token)),
  deleteEmployee: (token, id) => api.delete(`/api/employees/${id}`, authConfig(token)),

  createPayment: (token, payload) => api.post("/api/payments", payload, authConfig(token)),
  updatePayment: (token, id, payload) => api.put(`/api/payments/${id}`, payload, authConfig(token)),
  createSalary: (token, payload) => api.post("/api/salaries", payload, authConfig(token)),

  createStudent: (token, payload) => api.post("/api/students", payload, authConfig(token)),
  updateStudent: (token, id, payload) => api.put(`/api/students/${id}`, payload, authConfig(token)),
  deleteStudent: (token, id) => api.delete(`/api/students/${id}`, authConfig(token)),

  createMark: (token, payload) => api.post("/api/marks", payload, authConfig(token)),
  updateMark: (token, id, payload) => api.put(`/api/marks/${id}`, payload, authConfig(token)),
  deleteMark: (token, id) => api.delete(`/api/marks/${id}`, authConfig(token)),

  createRoutine: (token, payload) => api.post("/api/routines", payload, authConfig(token)),
  updateRoutine: (token, id, payload) => api.put(`/api/routines/${id}`, payload, authConfig(token)),
  deleteRoutine: (token, id) => api.delete(`/api/routines/${id}`, authConfig(token)),

  createIncrement: (token, payload) => api.post("/api/salary-increments", payload, authConfig(token)),
  updateIncrement: (token, id, payload) => api.put(`/api/salary-increments/${id}`, payload, authConfig(token)),
  deleteIncrement: (token, id) => api.delete(`/api/salary-increments/${id}`, authConfig(token)),

  generateExamFees: (token, payload) => api.post("/api/payments/generate-exam", payload, authConfig(token)),
  generateMonthlyFees: (token, payload) => api.post("/api/payments/generate-monthly", payload, authConfig(token)),
  generateSalaries: (token, payload) => api.post("/api/salaries/generate-monthly", payload, authConfig(token)),
  updateSchoolSettings: (token, payload) => api.put("/api/school-settings", payload, authConfig(token)),
  updateProfile: (token, payload) => api.put("/api/auth/me", payload, authConfig(token)),

  createAttendance: (token, payload) => api.post("/api/attendance", payload, authConfig(token)),
  updateAttendance: (token, id, payload) => api.put(`/api/attendance/${id}`, payload, authConfig(token)),
  deleteAttendance: (token, id) => api.delete(`/api/attendance/${id}`, authConfig(token)),
  biometricScan: (token, payload) => api.post("/api/attendance/biometric", payload, authConfig(token)),
  bulkMarkAttendance: (token, payload) => api.post("/api/attendance/bulk", payload, authConfig(token)),

  createExpense: (token, payload) => api.post("/api/expenses", payload, authConfig(token)),
  updateExpense: (token, id, payload) => api.put(`/api/expenses/${id}`, payload, authConfig(token)),
  deleteExpense: (token, id) => api.delete(`/api/expenses/${id}`, authConfig(token)),

  getEmployeeBiometricOptions: (token, id) => api.get(`/api/employees/${id}/biometric/register-options`, authConfig(token)),
  registerEmployeeBiometric: (token, id, payload) => api.post(`/api/employees/${id}/biometric/register`, payload, authConfig(token)),
  removeEmployeeBiometric: (token, id, credentialId) => api.delete(`/api/employees/${id}/biometric/${encodeURIComponent(credentialId)}`, authConfig(token)),

  createSection: (token, payload) => api.post("/api/sections", payload, authConfig(token)),
  updateSection: (token, id, payload) => api.put(`/api/sections/${id}`, payload, authConfig(token)),
  deleteSection: (token, id) => api.delete(`/api/sections/${id}`, authConfig(token)),

  createClassroom: (token, payload) => api.post("/api/classrooms", payload, authConfig(token)),
  updateClassroom: (token, id, payload) => api.put(`/api/classrooms/${id}`, payload, authConfig(token)),
  deleteClassroom: (token, id) => api.delete(`/api/classrooms/${id}`, authConfig(token)),

  getDbConfig: (token) => api.get("/api/db-config", authConfig(token)),
  testDbConnection: (token, payload) => api.post("/api/db-config/test", payload, authConfig(token)),
  saveDbConfig: (token, payload) => api.put("/api/db-config", payload, authConfig(token)),
  resetDbConfig: (token) => api.delete("/api/db-config", authConfig(token)),

  getUsers: (token) => api.get("/api/users", authConfig(token)),
  createUser: (token, payload) => api.post("/api/users", payload, authConfig(token)),
  updateUser: (token, id, payload) => api.put(`/api/users/${id}`, payload, authConfig(token)),
  deleteUser: (token, id) => api.delete(`/api/users/${id}`, authConfig(token)),
};
