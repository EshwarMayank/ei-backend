const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const pool = new Pool({
  host: "localhost",
  port: 5432,
  user: "postgres", // your Postgres username
  password: "mayu", // your real password
  database: "ei_healthcare",
});

const app = express();

// Allow all origins for now
app.use(cors());
app.use(express.json()); // parse JSON bodies

const PORT = process.env.PORT || 4000;
const JWT_SECRET = "supersecret_ei_healthcare"; // later load from env
const JWT_EXPIRES_IN = "7d";

// ---------- Therapist data (shared) ----------
const therapists = [
  {
    id: 1,
    name: "Dr. A",
    specialization: "Anxiety & stress",
    experienceYears: 5,
    tags: ["individual", "anxiety", "stress"],
  },
  {
    id: 2,
    name: "Dr. B",
    specialization: "Depression & mood",
    experienceYears: 8,
    tags: ["individual", "depression"],
  },
  {
    id: 3,
    name: "Dr. C",
    specialization: "Couples & relationships",
    experienceYears: 6,
    tags: ["couples", "relationships"],
  },
  {
    id: 4,
    name: "Dr. D",
    specialization: "Teen & young adults",
    experienceYears: 4,
    tags: ["teen", "students"],
  },
];

// ---------- Matching routes ----------
app.get("/match/individual", (req, res) => {
  const reasonsText = (req.query.reasons || "").toLowerCase();

  let matches = therapists.filter((t) => t.tags.includes("individual"));

  if (reasonsText.includes("anxiety") || reasonsText.includes("stress")) {
    matches = therapists.filter((t) => t.tags.includes("anxiety"));
  } else if (reasonsText.includes("sad") || reasonsText.includes("low")) {
    matches = therapists.filter((t) => t.tags.includes("depression"));
  }

  res.json({ matches });
});

app.get("/match/couples", (req, res) => {
  const issuesText = (req.query.issues || "").toLowerCase();

  let matches = therapists.filter((t) => t.tags.includes("couples"));

  if (issuesText.includes("communication") || issuesText.includes("fight")) {
    matches = therapists.filter((t) => t.tags.includes("couples"));
  }

  res.json({ matches });
});

app.get("/match/teen", (req, res) => {
  const concernsText = (req.query.concerns || "").toLowerCase();

  let matches = therapists.filter((t) => t.tags.includes("teen"));

  if (concernsText.includes("study") || concernsText.includes("school")) {
    matches = therapists.filter((t) => t.tags.includes("teen"));
  }

  res.json({ matches });
});

// ---------- Simple routes ----------
app.get("/", (req, res) => {
  res.send("EI_HealthCare API is working");
});

app.get("/therapists", (req, res) => {
  res.json(therapists);
});

app.post("/contact", (req, res) => {
  const { name, email, message } = req.body;
  console.log("New contact request:", { name, email, message });

  if (!name || !email || !message) {
    return res
      .status(400)
      .json({ success: false, error: "All fields required" });
  }

  res.json({ success: true });
});

app.get("/faq", (req, res) => {
  res.json([
    {
      id: 1,
      q: "Is this confidential?",
      a: "Yes, all conversations are private.",
    },
    {
      id: 2,
      q: "Do I need a camera?",
      a: "You can join by audio-only if you prefer.",
    },
  ]);
});

// ---------- Auth: Signup ----------
app.post("/auth/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ success: false, error: "Name, email, password required" });
    }

    // check if email already exists
    const existing = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email.toLowerCase()]
    );

    if (existing.rows.length > 0) {
      return res
        .status(409)
        .json({ success: false, error: "Email already registered" });
    }

    const hash = await bcrypt.hash(password, 10); // saltRounds = 10

    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, created_at`,
      [name, email.toLowerCase(), hash]
    );

    const user = result.rows[0];

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(201).json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email },
      token,
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ---------- Auth: Login ----------
app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, error: "Email and password required" });
    }

    const result = await pool.query(
      "SELECT id, name, email, password_hash FROM users WHERE email = $1",
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res
        .status(401)
        .json({ success: false, error: "Invalid email or password" });
    }

    const user = result.rows[0];

    const match = await bcrypt.compare(password, user.password_hash);

    if (!match) {
      return res
        .status(401)
        .json({ success: false, error: "Invalid email or password" });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email },
      token,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ---------- Individual intake ----------
app.post("/intake/individual", async (req, res) => {
  try {
    const {
      userId,
      reasons,
      duration,
      intensity,
      pastTherapy,
      affectedAreas,
      comfort,
      supportType,
      therapistPref,
      language,
      urgency,
    } = req.body;

    const result = await pool.query(
      `INSERT INTO individual_intake_responses
       (user_id, reasons, duration, intensity, past_therapy, affected_areas,
        comfort, support_type, therapist_pref, language, urgency)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING id`,
      [
        userId || null,
        (reasons || []).join(", "),
        duration || null,
        intensity || null,
        pastTherapy || null,
        (affectedAreas || []).join(", "),
        comfort || null,
        supportType || null,
        therapistPref || null,
        language || null,
        urgency || null,
      ]
    );

    // very simple matching rule
    const text = (reasons || []).join(" ").toLowerCase();
    let matches = therapists.filter((t) => t.tags.includes("individual"));

    if (text.includes("anxiety") || text.includes("stress")) {
      matches = therapists.filter((t) => t.tags.includes("anxiety"));
    } else if (text.includes("sad") || text.includes("low")) {
      matches = therapists.filter((t) => t.tags.includes("depression"));
    }

    res.status(201).json({
      success: true,
      id: result.rows[0].id,
      matches,
    });
  } catch (err) {
    console.error("Error saving intake:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

app.get("/intake/individual/recent", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, reasons, duration, intensity, language, urgency, created_at
       FROM individual_intake_responses
       ORDER BY created_at DESC
       LIMIT 20`
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching individual intakes:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ---------- Couples intake ----------
app.post("/intake/couples", async (req, res) => {
  try {
    const {
      userId,
      relationshipType,
      duration,
      issues,
      conflictFrequency,
      argumentEnd,
      pastTherapy,
      goal,
      commitment,
      therapistPref,
      startTimeline,
    } = req.body;

    const result = await pool.query(
      `INSERT INTO couples_intake_responses
       (user_id, relationship_type, duration, issues, conflict_frequency, argument_end,
        past_therapy, goal, commitment, therapist_pref, start_timeline)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING id`,
      [
        userId || null,
        relationshipType || null,
        duration || null,
        (issues || []).join(", "),
        conflictFrequency || null,
        argumentEnd || null,
        pastTherapy || null,
        goal || null,
        commitment || null,
        therapistPref || null,
        startTimeline || null,
      ]
    );

    res.status(201).json({ success: true, id: result.rows[0].id });
  } catch (err) {
    console.error("Error saving couples intake:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

app.get("/intake/couples/recent", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, relationship_type, duration, issues, conflict_frequency,
              goal, commitment, therapist_pref, start_timeline, created_at
       FROM couples_intake_responses
       ORDER BY created_at DESC
       LIMIT 20`
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching couples intakes:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ---------- Teen intake ----------
app.post("/intake/teen", async (req, res) => {
  try {
    const {
      userId,
      filledBy,
      ageGroup,
      concerns,
      duration,
      schoolImpact,
      openness,
      recentChanges,
      pastCounseling,
      language,
      urgency,
    } = req.body;

    const result = await pool.query(
      `INSERT INTO teen_intake_responses
       (user_id, filled_by, age_group, concerns, duration, school_impact,
        openness, recent_changes, past_counseling, language, urgency)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING id`,
      [
        userId || null,
        filledBy || null,
        ageGroup || null,
        (concerns || []).join(", "),
        duration || null,
        schoolImpact || null,
        openness || null,
        (recentChanges || []).join(", "),
        pastCounseling || null,
        language || null,
        urgency || null,
      ]
    );

    res.status(201).json({ success: true, id: result.rows[0].id });
  } catch (err) {
    console.error("Error saving teen intake:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

app.get("/intake/teen/recent", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, filled_by, age_group, concerns, duration, school_impact,
              openness, recent_changes, past_counseling, language, urgency, created_at
       FROM teen_intake_responses
       ORDER BY created_at DESC
       LIMIT 20`
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching teen intakes:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

/* ---------- NEW: Recent intakes per user for dashboard ---------- */

// Individual – last 5 for this user
app.get("/me/individual-intakes", async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) {
      return res
        .status(400)
        .json({ success: false, error: "userId is required" });
    }

    const result = await pool.query(
      `SELECT id, created_at, reasons
       FROM individual_intake_responses
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 5`,
      [userId]
    );

    res.json({ success: true, items: result.rows });
  } catch (err) {
    console.error("Error fetching individual intakes", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// Couples – last 5 for this user
app.get("/me/couples-intakes", async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) {
      return res
        .status(400)
        .json({ success: false, error: "userId is required" });
    }

    const result = await pool.query(
      `SELECT id, created_at, issues
       FROM couples_intake_responses
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 5`,
      [userId]
    );

    res.json({ success: true, items: result.rows });
  } catch (err) {
    console.error("Error fetching couples intakes", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// Teen – last 5 for this user
app.get("/me/teen-intakes", async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) {
      return res
        .status(400)
        .json({ success: false, error: "userId is required" });
    }

    const result = await pool.query(
      `SELECT id, created_at, concerns
       FROM teen_intake_responses
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 5`,
      [userId]
    );

    res.json({ success: true, items: result.rows });
  } catch (err) {
    console.error("Error fetching teen intakes", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ---------- Start server ----------
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
