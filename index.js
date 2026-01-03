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
