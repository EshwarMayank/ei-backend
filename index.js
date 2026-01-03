const express = require("express");
const cors = require("cors");

const app = express();

// Allow all origins for now
app.use(cors());

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("EI_HealthCare API is working");
});

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
app.get('/therapists', (req, res) => {
  const therapists = [
    { id: 1, name: 'Dr. A', specialization: 'Anxiety', experienceYears: 5 },
    { id: 2, name: 'Dr. B', specialization: 'Depression', experienceYears: 8 },
    { id: 3, name: 'Dr. C', specialization: 'Stress & burnout', experienceYears: 4 }
  ];
  res.json(therapists);
});
