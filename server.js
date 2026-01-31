const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

if (process.env.DB_SSL === 'true') {
  dbConfig.ssl = { rejectUnauthorized: false };
}

const pool = mysql.createPool(dbConfig);

const DEMO_USER = { id: 1, username: "admin", password: "admin123" };
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Missing token" });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (username !== DEMO_USER.username || password !== DEMO_USER.password) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign(
    { userId: DEMO_USER.id, username: DEMO_USER.username },
    JWT_SECRET,
    { expiresIn: "1h" }
  );

  res.json({ token });
});

app.get("/community", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM community ORDER BY id DESC");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/community/:id", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM community WHERE id = ?", [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/community", requireAuth, async (req, res) => {
  const { card_name, card_pic, description, status } = req.body;
  if (!card_name || !description) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const [result] = await pool.execute(
      "INSERT INTO community (card_name, card_pic, description, status) VALUES (?,?,?,?)",
      [card_name, card_pic || null, description, status || "Open"]
    );
    const insertId = result.insertId;
    const [rows] = await pool.query("SELECT * FROM community WHERE id = ?", [insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.put("/community/:id", async (req, res) => {
  const { card_name, card_pic, description, status } = req.body;
  try {
    const [result] = await pool.execute(
      "UPDATE community SET card_name = ?, card_pic = ?, description = ?, status = ? WHERE id = ?",
      [card_name, card_pic || null, description || null, status || "Open", req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: "Not found" });
    const [rows] = await pool.query("SELECT * FROM community WHERE id = ?", [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.delete("/community/:id", async (req, res) => {
  try {
    const [result] = await pool.execute("DELETE FROM community WHERE id = ?", [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: "Not found" });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
