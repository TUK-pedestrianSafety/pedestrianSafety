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
    `INSERT INTO sensor_ping_log (sensor_id, response_ms, status, ping_at)
     VALUES (?, ?, ?, datetime('now', 'localtime'))`,
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

          // row가 없을 경우(초기 상태) 기본값 0으로 처리
          let newCount = row ? row.consecutive_timeout_count : 0;
          let faulty = row ? row.is_faulty : 0;

          if (isTimeout) {
            newCount++;
            if (newCount >= 3) {
              faulty = 1;
              newCount = 0; // 3회 연속 타임아웃 시 카운트 초기화 및 고장 처리
            }
          } else {
            newCount = 0;
            faulty = 0; // 정상 응답 시 고장 해제
          }

          // 3) health 업데이트 (없으면 삽입, 있으면 수정)
          db.run(
            `INSERT OR REPLACE INTO sensor_health (sensor_id, consecutive_timeout_count, is_faulty, updated_at)
             VALUES (?, ?, ?, datetime('now', 'localtime'))`,
            [sensorId, newCount, faulty],
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
