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
  };
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
};
