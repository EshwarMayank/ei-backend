const express = require("express");
const cors = require("cors");

const app = express();

// Allow all origins for now
app.use(cors());

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("EI_HealthCare API is working");
});

// <-- move therapists route here
app.get("/therapists", (req, res) => {
  const therapists = [
    { id: 1, name: "Dr. A", specialization: "Anxiety", experienceYears: 5 },
    { id: 2, name: "Dr. B", specialization: "Depression", experienceYears: 8 },
    { id: 3, name: "Dr. C", specialization: "Stress & burnout", experienceYears: 4 },
  ];
  res.json(therapists);
});

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
app.post("/contact", (req, res) => {
  const { name, email, message } = req.body;
  console.log("New contact request:", { name, email, message });
  if (!name || !email || !message) {
    return res.status(400).json({ success: false, error: "All fields required" });
  }
  res.json({ success: true });
});

app.get("/faq", (req, res) => {
  res.json([
    { id: 1, q: "Is this confidential?", a: "Yes, all conversations are private." },
    { id: 2, q: "Do I need a camera?", a: "You can join by audio-only if you prefer." },
  ]);
});

