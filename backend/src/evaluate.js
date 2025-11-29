// evaluate.js
const { db } = require("./db");

const PX_TO_M = 0.3; // 1px = 0.3m (20px 이동 = 6m)

// 물체 판단 함수
function computeObjectType(distanceM, durationSec) {
  if (durationSec <= 0.5) {
    return "VEHICLE"; // 차량
  }
  if (durationSec >= 2.0) {
    return "OTHER"; // 차량 이외
  }
  return "UNKNOWN";
}

// 위험도 판단 함수
function computeRisk(distanceM, objectType) {
  // 차량이 아니면 위험도 분석 하지 않음 (색깔 변화 없음)
  if (objectType !== "VEHICLE") {
    return "꺼짐";
  }

  if (distanceM <= 12) return "위험";
  if (distanceM <= 20) return "경고";
  if (distanceM <= 50) return "안전";
  return "꺼짐"; // 50m 초과 시 LED 꺼짐
}

/**
 * carXpx, durationSec 기반으로 모든 센서에 대해 거리/위험도 계산.
 * ➜ 결과에 센서 좌표(map_x_px, map_y_px)도 포함해서 프론트가 바로 그림.
 */
function evaluateSnapshot(carXpx, durationSec, callback) {
  // Join with sensor_health to check for faults
  const query = `
    SELECT s.id, s.map_x_px, s.map_y_px, h.is_faulty 
    FROM sensor s
    LEFT JOIN sensor_health h ON s.id = h.sensor_id
  `;

  db.all(query, [], (err, sensors) => {
    if (err) return callback(err);
    if (!sensors || sensors.length === 0) return callback(null, []);

    const results = [];

    const stmt = db.prepare(`
      INSERT INTO risk_event
      (sensor_id, distance_m, duration_sec, object_type, risk_label, detected_at)
      VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'))
    `);

    sensors.forEach((sensor) => {
      const distancePx = Math.abs(sensor.map_x_px - carXpx); // 센서 <-> 차량 거리
      const distanceM = distancePx * PX_TO_M; // px -> m 환산

      const objectType = computeObjectType(distanceM, durationSec);
      let riskLabel = computeRisk(distanceM, objectType);

      // Fail-Safe: If sensor is faulty (Ping failed), mark as Fault (not Danger)
      if (sensor.is_faulty === 1) {
        riskLabel = "고장";
      }

      // DB에 로그 기록
      stmt.run(sensor.id, distanceM, durationSec, objectType, riskLabel);

      // 프론트에 줄 데이터
      results.push({
        sensor_id: sensor.id, // 센서 id
        map_x_px: sensor.map_x_px, // 센서 x좌표
        map_y_px: sensor.map_y_px, // 센서 y좌표
        distance_m: distanceM, // 차량 <-> 센서 거리
        duration_sec: durationSec, // 감지 시간
        object_type: objectType, // 물체 인식 결과
        risk_label: riskLabel, // 위험도 판단 결과
      });
    });

    stmt.finalize();
    callback(null, results);
  });
}

module.exports = {
  evaluateSnapshot,
};
