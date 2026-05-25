const { DEMO_ACCOUNTS } = require("../config/demoAccounts");
const User = require("../models/User");
const { hashPassword } = require("../utils/password");
const { normalizeEmail } = require("../utils/users");

async function ensureDemoAccounts() {
  if (String(process.env.ENABLE_DEMO_ACCOUNTS || "true").toLowerCase() === "false") {
    console.log("Demo accounts are disabled. Set ENABLE_DEMO_ACCOUNTS=true to enable test logins.");
    return [];
  }

  const seeded = [];

  for (const account of DEMO_ACCOUNTS) {
    const email = normalizeEmail(account.email);
    const passwordData = hashPassword(account.password);

    const user = await User.findOneAndUpdate(
      { email },
      {
        $set: {
          name: account.name,
          email,
          role: account.role,
          salt: passwordData.salt,
          passwordHash: passwordData.hash,
        },
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );

    seeded.push(user);
  }

  console.log(`Demo test accounts ready: ${seeded.map((user) => `${user.role}:${user.email}`).join(", ")}`);
  return seeded;
}

module.exports = {
  ensureDemoAccounts,
};
