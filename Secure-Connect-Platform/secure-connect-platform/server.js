require("dotenv").config();

const express = require("express");
const http = require("http");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");
const EventEmitter = require("events");
const path = require("path");
const fs = require("fs/promises");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});
const events = new EventEmitter();

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h";
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS || 10);
const DATA_DIR = path.join(__dirname, "data");
const DB_FILE = path.join(DATA_DIR, "store.json");

if (!JWT_SECRET || JWT_SECRET.length < 24) {
  console.error("Set JWT_SECRET in .env to a random string of at least 24 characters.");
  process.exit(1);
}

app.use(express.json());

async function readStore() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    return JSON.parse(await fs.readFile(DB_FILE, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    const initial = { users: [], notes: [] };
    await writeStore(initial);
    return initial;
  }
}

async function writeStore(store) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DB_FILE, JSON.stringify(store, null, 2));
}

function createToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function authenticate(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ success: false, message: "Access denied. Bearer token required." });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ success: false, message: "Invalid or expired token." });
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Forbidden: insufficient permissions." });
    }
    next();
  };
}

function validEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

app.get("/", (_req, res) => {
  res.json({
    name: "Secure Connect and Communication Platform",
    status: "running",
    endpoints: ["/api/auth/signup", "/api/auth/login", "/api/profile", "/api/notes"]
  });
});

// SIGNUP
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !validEmail(email) || typeof password !== "string" || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Provide name, a valid email, and a password of at least 8 characters."
      });
    }

    const store = await readStore();
    const normalizedEmail = email.toLowerCase().trim();
    if (store.users.some(user => user.email === normalizedEmail)) {
      return res.status(409).json({ success: false, message: "Email is already registered." });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = {
      id: require("crypto").randomUUID(),
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: "user",
      createdAt: new Date().toISOString()
    };
    store.users.push(user);
    await writeStore(store);

    const token = createToken(user);
    events.emit("user:signup", { userId: user.id, email: user.email });
    return res.status(201).json({
      success: true,
      message: "Signup successful.",
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error("Signup error:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
});

// LOGIN
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!validEmail(email) || typeof password !== "string") {
      return res.status(400).json({ success: false, message: "Valid email and password are required." });
    }

    const store = await readStore();
    const user = store.users.find(item => item.email === email.toLowerCase().trim());
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }

    const token = createToken(user);
    events.emit("user:login", { userId: user.id, email: user.email });
    return res.json({
      success: true,
      message: "Login successful.",
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
});

// PROTECTED PROFILE
app.get("/api/profile", authenticate, async (req, res) => {
  const store = await readStore();
  const user = store.users.find(item => item.id === req.user.sub);
  if (!user) return res.status(404).json({ success: false, message: "User not found." });
  res.json({
    success: true,
    user: { id: user.id, name: user.name, email: user.email, role: user.role }
  });
});

// NOTES CRUD - users can access only their own notes
app.post("/api/notes", authenticate, async (req, res) => {
  const { title, content } = req.body;
  if (typeof title !== "string" || !title.trim() || typeof content !== "string") {
    return res.status(400).json({ success: false, message: "Title and content are required." });
  }
  const store = await readStore();
  const note = {
    id: require("crypto").randomUUID(),
    userId: req.user.sub,
    title: title.trim(),
    content,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  store.notes.push(note);
  await writeStore(store);
  res.status(201).json({ success: true, message: "Note created.", note });
});

app.get("/api/notes", authenticate, async (req, res) => {
  const store = await readStore();
  const notes = store.notes.filter(note => note.userId === req.user.sub);
  res.json({ success: true, count: notes.length, notes });
});

app.get("/api/notes/:id", authenticate, async (req, res) => {
  const store = await readStore();
  const note = store.notes.find(item => item.id === req.params.id && item.userId === req.user.sub);
  if (!note) return res.status(404).json({ success: false, message: "Note not found." });
  res.json({ success: true, note });
});

app.put("/api/notes/:id", authenticate, async (req, res) => {
  const { title, content } = req.body;
  if (typeof title !== "string" || !title.trim() || typeof content !== "string") {
    return res.status(400).json({ success: false, message: "Title and content are required." });
  }
  const store = await readStore();
  const note = store.notes.find(item => item.id === req.params.id && item.userId === req.user.sub);
  if (!note) return res.status(404).json({ success: false, message: "Note not found." });
  note.title = title.trim();
  note.content = content;
  note.updatedAt = new Date().toISOString();
  await writeStore(store);
  res.json({ success: true, message: "Note updated.", note });
});

app.delete("/api/notes/:id", authenticate, async (req, res) => {
  const store = await readStore();
  const index = store.notes.findIndex(item => item.id === req.params.id && item.userId === req.user.sub);
  if (index === -1) return res.status(404).json({ success: false, message: "Note not found." });
  const [deleted] = store.notes.splice(index, 1);
  await writeStore(store);
  res.json({ success: true, message: "Note deleted.", note: deleted });
});

// RBAC demonstration: only admins can access this route.
// Signup deliberately assigns "user"; change a user's role to "admin" in data/store.json for testing.
app.get("/api/admin", authenticate, authorize("admin"), (_req, res) => {
  res.json({ success: true, message: "Welcome, administrator." });
});

// EventEmitter listeners
events.on("user:signup", data => console.log("[EVENT] New signup:", data.email));
events.on("user:login", data => console.log("[EVENT] User logged in:", data.email));

// Socket.IO authentication: send { token } in the handshake auth object.
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth && socket.handshake.auth.token;
    if (!token) return next(new Error("Authentication token required"));
    socket.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    next(new Error("Invalid or expired token"));
  }
});

io.on("connection", socket => {
  console.log(`[CHAT] ${socket.user.email} connected (${socket.id})`);
  socket.emit("chat:system", { message: "Connected securely to the chat." });

  socket.on("chat:message", payload => {
    if (!payload || typeof payload.message !== "string" || !payload.message.trim()) return;
    const message = {
      sender: socket.user.email,
      message: payload.message.trim().slice(0, 1000),
      sentAt: new Date().toISOString()
    };
    console.log("[CHAT MESSAGE]", message);
    io.emit("chat:message", message);
  });

  socket.on("disconnect", reason => {
    console.log(`[CHAT] ${socket.user.email} disconnected: ${reason}`);
  });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ success: false, message: "Unexpected server error." });
});

server.listen(PORT, () => {
  console.log(`Secure Connect server running at http://localhost:${PORT}`);
});