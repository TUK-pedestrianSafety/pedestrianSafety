// routes/health.js
const express = require("express");
const router = express.Router();
const { db } = require("../db");

// 센서별 현재 상태 + 마지막 ping 시간 같이 조회
router.get("/", (req, res) => {
  db.all(
    `SELECT
      s.id AS sensor_id,
      s.map_x_px,
      s.map_y_px,
      s.is_active,
      h.consecutive_timeout_count,
      h.is_faulty,
      h.updated_at,
      (
        SELECT ping_at
        FROM sensor_ping_log p
        WHERE p.sensor_id = s.id
        ORDER BY p.ping_id DESC
        LIMIT 1
      ) AS last_ping_at
    FROM sensor s
    LEFT JOIN sensor_health h
      ON h.sensor_id = s.id
    ORDER BY s.id ASC`,
    (err, rows) => {
      if (err) {
        console.error("health 조회 에러:", err);
        return res.status(500).json({ error: "DB error" });
      }
      res.json(rows);
    }
  );
});

// 필요하면 특정 센서의 ping 로그도 별도로
// 예시 - api/health/ping/1
router.get("/ping/:sensorId", (req, res) => {
  const sensorId = req.params.sensorId;
  const limit = Number(req.query.limit) || 10;

  db.all(
    `SELECT
      ping_id,
      sensor_id,
      ping_at,
      response_ms,
      status
    FROM sensor_ping_log
    WHERE sensor_id = ?
    ORDER BY ping_id DESC
    LIMIT ?`,
    [sensorId, limit],
    (err, rows) => {
      if (err) {
        console.error("ping 로그 조회 에러:", err);
        return res.status(500).json({ error: "DB error" });
      }
      res.json(rows);
    }
  );
});

// 핑보내기
// /api/health/ping
router.post("/ping", (req, res) => {
  const sensorId = req.body.sensor_id;

  if (!sensorId) {
    return res.status(400).json({ error: "sensor_id 필요" });
  }

  const isTimeout = Math.random() < 0.2; // 20% 확률로 timeout
  const responseMs = isTimeout ? null : Math.floor(Math.random() * 80) + 20;

  // ping 로그 기록 수행
  db.run(
    `INSERT INTO sensor_ping_log (sensor_id, response_ms, status)
     VALUES (?, ?, ?)`,
    [sensorId, responseMs, isTimeout ? "TIMEOUT" : "OK"],
    (err) => {
      if (err) return res.status(500).json({ error: "db error" });

      // 2) 기존 health 상태 가져오기
      db.get(
        `SELECT consecutive_timeout_count, is_faulty
         FROM sensor_health
         WHERE sensor_id = ?`,
        [sensorId],
        (err2, row) => {
          if (err2) return res.status(500).json({ error: "db error" });

          let newCount = row.consecutive_timeout_count;
          let faulty = row.is_faulty;

          if (isTimeout) newCount++;
          else newCount = 0;

          if (newCount >= 3) faulty = 1;

          // 3) health 업데이트
          db.run(
            `UPDATE sensor_health
             SET consecutive_timeout_count = ?, is_faulty = ?, updated_at = CURRENT_TIMESTAMP
             WHERE sensor_id = ?`,
            [newCount, faulty, sensorId],
            (err3) => {
              if (err3) return res.status(500).json({ error: "db error" });

              res.json({
                sensor_id: sensorId,
                timeout: isTimeout,
                response_ms: responseMs,
                consecutive_timeout_count: newCount,
                is_faulty: faulty,
              });
            }
          );
        }
      );
    }
  );
});

module.exports = router;
