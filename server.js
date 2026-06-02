require("dotenv").config();
const { createHotspotUser } = require("./mikrotik");
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const { createClient } = require("@supabase/supabase-js");
const app = express();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);
app.use(cors());
app.use(express.json());

// Home route
app.get("/", (req, res) => {
  res.send("Hotspot M-PESA Backend Running");
});

// Get OAuth token
async function getToken() {
  const auth = Buffer.from(
    process.env.CONSUMER_KEY + ":" + process.env.CONSUMER_SECRET
  ).toString("base64");

  const response = await axios.get(
    "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
    {
      headers: {
        Authorization: "Basic " + auth,
      },
    }
  );

  return response.data.access_token;
}

// Token test route
app.get("/token", async (req, res) => {
  try {
    const token = await getToken();
    res.json({ access_token: token });
  } catch (error) {
    res.status(500).json({
      message: error.message,
      details: error.response?.data,
    });
  }
});

// STK Push route
app.post("/stkpush", async (req, res) => {
  try {
    const { phone, amount } = req.body;
    const token = await getToken();

    const timestamp = new Date()
      .toISOString()
      .replace(/[-T:\.Z]/g, "")
      .slice(0, 14);

    const password = Buffer.from(
      process.env.BUSINESS_SHORTCODE +
      process.env.PASSKEY +
      timestamp
    ).toString("base64");

    const response = await axios.post(
      "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      {
        BusinessShortCode: process.env.BUSINESS_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: Number(amount),
        PartyA: phone,
        PartyB: process.env.BUSINESS_SHORTCODE,
        PhoneNumber: phone,
        CallBackURL: process.env.CALLBACK_URL,
        AccountReference: "HOTSPOT",
        TransactionDesc: "Hotspot Payment"
      },
      {
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json"
        }
      }
    );

    res.json(response.data);
  } catch (error) {
    res.status(500).json({
      message: error.message,
      details: error.response?.data,
    });
  }
});

// Start server
// Test automatic hotspot activation
app.get("/activate-test", async (req, res) => {
  try {
    const result = await createHotspotUser({
      username: "254703514345",
      password: "CW2026",
      packageName: "6 Hours",
      speed: "5 Mbps",
      duration: "6h"
    });

    res.json({
      message: "Hotspot user activated successfully",
      user: result
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});
app.post("/create-payment", async (req, res) => {
  const { phone, amount, plan, speed } = req.body;

  try {
    // 1. Save payment
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
      ])
      .select()
      .single();

    if (error) throw error;

    // 2. Get free voucher
    const { data: voucher, error: voucherError } = await supabase
      .from("vouchers")
      .select("*")
      .is("activated_at", null)
      .limit(1)
      .single();

    if (voucherError || !voucher) {
      return res.json({
        message: "Payment saved but no voucher available",
        payment: data
      });
    }

    // 3. Mark voucher as used
    await supabase
      .from("vouchers")
      .update({ activated_at: new Date() })
      .eq("id", voucher.id);

    // 4. Return everything
    res.json({
      message: "Payment saved and voucher assigned",
      payment: data,
      voucher: voucher.code,
      plan: voucher.plan,
      duration: voucher.duration_hours
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({
      error: "Failed to save payment"
    });
  }
});
app.get("/vouchers", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("vouchers")
      .select("*")
      .order("id", { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Failed to fetch vouchers" });
  }
});
console.log("PORT FROM RENDER:", process.env.PORT);
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port:", PORT);
});
