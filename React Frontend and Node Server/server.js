const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Violation schema and model
const violationSchema = new mongoose.Schema({
  type: String,
  timestamp: { type: Date, default: Date.now },
});
const Violation = mongoose.model("Violation", violationSchema);

// ✅ Log violations (POST)
app.post("/log-violation", async (req, res) => {
  const { type } = req.body;
  if (!type) return res.status(400).json({ error: "Violation type is required" });

  try {
    const violation = new Violation({ type });
    await violation.save();
    return res.json({ message: "Violation logged", violation });
  } catch (err) {
    console.error("Error logging violation:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ Fetch all violations (GET) 🚀
app.get("/violations", async (req, res) => {
  try {
    const violations = await Violation.find().sort({ timestamp: -1 }); // Latest first
    return res.json(violations);
  } catch (err) {
    console.error("Error fetching violations:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Start the server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
