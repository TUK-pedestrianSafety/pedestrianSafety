// routes/move.js
const express = require("express");
const router = express.Router();
const { evaluateSnapshot } = require("../evaluate");

// POST /api/simulate/move
// body: { car_x_px: 차량 x좌표, duration_sec: 감지 시간 }
router.post("/move", (req, res) => {
  const { car_x_px, duration_sec } = req.body;

  if (typeof car_x_px !== "number" || typeof duration_sec !== "number") {
    return res.status(400).json({ error: "car_x_px, duration_sec 숫자 필요" });
  }

  evaluateSnapshot(car_x_px, duration_sec, (err, results) => {
    if (err) {
      console.error("simulate move error:", err);
      return res.status(500).json({ error: "internal error" });
    }
    // 센서별 거리/위험도 결과 반환
    res.json(results);
  });
});

module.exports = router;
