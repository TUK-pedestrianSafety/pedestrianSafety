// routes/sensors.js
const express = require("express");
const router = express.Router();
const { db } = require("../db");

// 센서 정적 정보 불러오기 (프론트에서 활용)
router.get("/", (req, res) => {
  db.all(
    `SELECT 
      id,
      map_x_px,
      map_y_px,
      is_active
    FROM sensor
    ORDER BY id ASC`,
    (err, rows) => {
      if (err) return res.status(500).json({ error: err });
      res.json(rows);
    }
  );
});

module.exports = router;
