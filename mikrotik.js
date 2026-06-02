const fs = require("fs");

// Load configuration
const config = JSON.parse(fs.readFileSync("config.json", "utf8"));

// Create or update hotspot user (simulation mode for now)
async function createHotspotUser({
  username,
  password,
  packageName,
  speed,
  duration,
  macAddress = null
}) {
  // Load existing users
  let users = [];

  if (fs.existsSync("users.json")) {
    users = JSON.parse(fs.readFileSync("users.json", "utf8"));
  }

  // Check if user already exists
  const existingIndex = users.findIndex(
    (u) => u.username === username
  );

  const userRecord = {
    username,
    password,
    package: packageName,
    speed,
    duration,
    macAddress,
    sharedUsers: config.hotspot.sharedUsers,
    bindMacAddress: config.hotspot.bindMacAddress,
    status: "active",
    activatedAt: new Date().toISOString()
  };

  if (existingIndex >= 0) {
    users[existingIndex] = {
      ...users[existingIndex],
      ...userRecord
    };
  } else {
    users.push(userRecord);
  }

  // Save updated users
  fs.writeFileSync(
    "users.json",
    JSON.stringify(users, null, 2)
  );

  console.log(`Hotspot user activated: ${username}`);

  return {
    success: true,
    username,
    password,
    package: packageName,
    speed,
    duration,
    sharedUsers: config.hotspot.sharedUsers,
    macAddress
  };
}

module.exports = {
  createHotspotUser
};
