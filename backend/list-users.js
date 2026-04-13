#!/usr/bin/env node

const axios = require("axios");
const bcrypt = require("bcryptjs");
const { execSync } = require("child_process");
const dotenv = require("dotenv");
const path = require("path");
const readline = require("readline");

dotenv.config({ path: path.resolve(__dirname, ".env") });

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getApiConfig() {
  const supabaseUrl = getRequiredEnv("SUPABASE_URL").replace(/\/$/, "");
  const serviceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");

  return {
    baseUrl: `${supabaseUrl}/rest/v1`,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
  };
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      out[key] = true;
    } else {
      out[key] = next;
      i += 1;
    }
  }
  return out;
}

async function fetchUsersRaw() {
  const { baseUrl, headers } = getApiConfig();
  const response = await axios.get(`${baseUrl}/admin_users`, {
    headers,
    params: {
      select: "id,data",
    },
  });
  return Array.isArray(response.data) ? response.data : [];
}

async function listUsers() {
  const rows = await fetchUsersRaw();
  const users = rows
    .map((row) => {
      const data = row && typeof row.data === "object" ? row.data : {};
      return {
        Id: row.id,
        Name: data.name || "(no name)",
        Email: data.email || "(no email)",
        Role: data.role || "(no role)",
      };
    })
    .sort((a, b) => a.Name.localeCompare(b.Name));

  if (!users.length) {
    console.log("No users found.");
    return;
  }

  console.table(users);
}

async function promptHiddenPassword() {
  if (!process.stdin.isTTY) {
    throw new Error("Interactive password prompt requires a TTY terminal");
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });

  try {
    execSync("stty -echo", { stdio: "inherit" });
    const password = await new Promise((resolve) => {
      rl.question("Password: ", resolve);
    });
    process.stdout.write("\n");
    return String(password || "").trim();
  } finally {
    execSync("stty echo", { stdio: "inherit" });
    rl.close();
  }
}

async function addUser(flags) {
  const email = flags.email;
  let password = flags.password;
  const role = flags.role ? String(flags.role).toUpperCase() : "";
  const name = flags.name || (email ? String(email).split("@")[0] : "");
  const profileImageUrl = flags["profile-image-url"];
  const designation = flags.designation;

  if (!password && flags["prompt-password"]) {
    password = await promptHiddenPassword();
  }

  if (!email || !password || !role) {
    throw new Error(
      "For add, pass --email and --role, plus one of --password or --prompt-password. Optional: --name"
    );
  }

  const rows = await fetchUsersRaw();
  const exists = rows.some((row) => {
    const data = row && typeof row.data === "object" ? row.data : {};
    return String(data.email || "").toLowerCase() === String(email).toLowerCase();
  });

  if (exists) {
    throw new Error(`User already exists with email: ${email}`);
  }

  const { baseUrl, headers } = getApiConfig();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const passwordHash = await bcrypt.hash(String(password), 12);

  const payload = {
    id,
    data: {
      id,
      email,
      passwordHash,
      name,
      role,
      status: "ACTIVE",
      profileImageUrl: profileImageUrl || "",
      designation: designation || "",
      createdAt: now,
    },
  };

  await axios.post(`${baseUrl}/admin_users`, payload, {
    headers: {
      ...headers,
      Prefer: "return=representation",
    },
  });

  console.log(`User added: ${email} (${role})`);
}

async function updateUser(flags) {
  const byId = flags.id;
  const byEmail = flags.email;

  if (!byId && !byEmail) {
    throw new Error("For update, pass --id or --email");
  }

  const updates = {};
  if (flags.name !== undefined) updates.name = flags.name;
  if (flags.role !== undefined) updates.role = String(flags.role).toUpperCase();
  if (flags.designation !== undefined) updates.designation = flags.designation;
  if (flags["profile-image-url"] !== undefined) {
    updates.profileImageUrl = flags["profile-image-url"];
  }

  if (Object.keys(updates).length === 0) {
    throw new Error(
      "For update, pass at least one field: --name, --role, --designation, --profile-image-url"
    );
  }

  const rows = await fetchUsersRaw();
  const found = rows.find((row) => {
    if (byId) return row.id === byId;
    const data = row && typeof row.data === "object" ? row.data : {};
    return (
      String(data.email || "").toLowerCase() === String(byEmail).toLowerCase()
    );
  });

  if (!found) {
    throw new Error(byId ? `No user found with id: ${byId}` : `No user found with email: ${byEmail}`);
  }

  const { baseUrl, headers } = getApiConfig();
  const currentData =
    found && typeof found.data === "object" && found.data !== null ? found.data : {};
  const mergedData = { ...currentData, ...updates };

  await axios.patch(
    `${baseUrl}/admin_users`,
    { data: mergedData, updated_at: new Date().toISOString() },
    {
      headers: {
        ...headers,
        Prefer: "return=representation",
      },
      params: { id: `eq.${found.id}` },
    }
  );

  const userEmail = mergedData.email || byEmail || found.id;
  console.log(`User updated: ${userEmail}`);
}

async function removeUser(flags) {
  const byId = flags.id;
  const byEmail = flags.email;

  if (!byId && !byEmail) {
    throw new Error("For remove, pass --id or --email");
  }

  const rows = await fetchUsersRaw();
  const found = rows.find((row) => {
    if (byId) return row.id === byId;
    const data = row && typeof row.data === "object" ? row.data : {};
    return (
      String(data.email || "").toLowerCase() === String(byEmail).toLowerCase()
    );
  });

  if (!found) {
    throw new Error(byId ? `No user found with id: ${byId}` : `No user found with email: ${byEmail}`);
  }

  const { baseUrl, headers } = getApiConfig();
  await axios.delete(`${baseUrl}/admin_users`, {
    headers,
    params: { id: `eq.${found.id}` },
  });

  const deletedEmail = found?.data?.email || "unknown";
  console.log(`User removed: ${deletedEmail} (id: ${found.id})`);
}

function showHelp() {
  console.log("Usage:");
  console.log("  node list-users.js list");
  console.log(
    "  node list-users.js add --email user@example.com --password mypass --role INTERN [--name 'User Name'] [--designation 'PMO'] [--profile-image-url 'https://...']"
  );
  console.log(
    "  node list-users.js add --email user@example.com --role INTERN --prompt-password [--name 'User Name'] [--designation 'PMO'] [--profile-image-url 'https://...']"
  );
  console.log(
    "  node list-users.js update --email user@example.com --name 'New Name' [--role SALES] [--designation 'PMO'] [--profile-image-url 'https://...']"
  );
  console.log(
    "  node list-users.js update --id <user-id> --name 'New Name' [--profile-image-url 'https://...']"
  );
  console.log("  node list-users.js remove --id <user-id>");
  console.log("  node list-users.js remove --email user@example.com");
}

async function main() {
  const command = process.argv[2] || "list";
  const flags = parseArgs(process.argv.slice(3));

  if (command === "list") {
    await listUsers();
    return;
  }

  if (command === "add") {
    await addUser(flags);
    return;
  }

  if (command === "remove") {
    await removeUser(flags);
    return;
  }

  if (command === "update") {
    await updateUser(flags);
    return;
  }

  showHelp();
  process.exit(1);
}

main().catch((error) => {
  const message = error.response?.data?.message || error.message;
  console.error(`User CLI error: ${message}`);
  process.exit(1);
});
