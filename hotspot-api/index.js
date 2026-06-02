const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// SUPABASE CONNECT
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// TEST ROUTE
app.get("/", (req, res) => {
  res.send("Hotspot API is running");
});


// CREATE PAYMENT (NO STK YET)
app.post("/create-payment", async (req, res) => {
  const { phone, amount, plan, speed } = req.body;

  try {
    const { data, error } = await supabase
      .from("payments")
      .insert([
        {
          phone,
          amount,
          plan,
          speed,
          status: "pending"
        }
      ]);

    if (error) throw error;

    res.json({
      message: "Payment saved (pending)",
      data
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Failed to save payment" });
  }
});


// GET PAYMENTS (ADMIN VIEW)
app.get("/payments", async (req, res) => {
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .order("id", { ascending: false });

  if (error) return res.status(500).json(error);

  res.json(data);
});


// START SERVER
const PORT = 3000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
