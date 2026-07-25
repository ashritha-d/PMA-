// One-off script to create or update the Super Admin login.
// Run once from the server/ directory: node scripts/setAdminCredentials.js
// Delete this file after running it so the credential doesn't linger in the repo.
require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('../models/Admin');

const NEW_EMAIL = 'ashritha@gmail.com';
const NEW_PASSWORD = 'Admin';

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
