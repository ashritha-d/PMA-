// One-off script to create or update the Super Admin login.
// Run from the server/ directory, supplying the new credentials as env vars
// so nothing sensitive is ever hardcoded or committed to the repo:
//
//   NEW_ADMIN_EMAIL=you@example.com NEW_ADMIN_PASSWORD=your-password node scripts/setAdminCredentials.js
//
// (On Windows PowerShell: $env:NEW_ADMIN_EMAIL="..."; $env:NEW_ADMIN_PASSWORD="..."; node scripts/setAdminCredentials.js)
require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('../models/Admin');

const NEW_EMAIL = process.env.NEW_ADMIN_EMAIL;
const NEW_PASSWORD = process.env.NEW_ADMIN_PASSWORD;

if (!NEW_EMAIL || !NEW_PASSWORD) {
  console.error('Set NEW_ADMIN_EMAIL and NEW_ADMIN_PASSWORD environment variables before running this script.');
  process.exit(1);
}

async function run() {
  await mongoose.connect(process.env.MONGO_URI);

  let admin = await Admin.findOne();
  if (admin) {
    console.log(`Updating existing admin (${admin.email}) -> ${NEW_EMAIL}`);
    admin.email = NEW_EMAIL;
    admin.password = NEW_PASSWORD; // pre-save hook hashes this
  } else {
    console.log(`No admin found. Creating new Super Admin: ${NEW_EMAIL}`);
    admin = new Admin({
      name: 'Super Admin',
      email: NEW_EMAIL,
      password: NEW_PASSWORD,
      role: 'superadmin',
      isActive: true,
    });
  }

  await admin.save();
  console.log('Done. Admin login is now:', NEW_EMAIL);

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
