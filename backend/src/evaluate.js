// evaluate.js
const { db } = require("./db");

const PX_TO_M = 0.5; // 1px = 0.5m 가정

// 물체 판단 함수
function computeObjectType(distanceM, durationSec) {
  if (durationSec <= 0.5) {
    return "CAR";
  }
  if (durationSec >= 2.0) {
    return "PERSON";
  }
}

// 위험도 판단 함수
function computeRisk(distanceM, objectType) {
  if (objectType === "PERSON") {
    if (distanceM <= 3) return "위험";
    if (distanceM <= 10) return "보통";
    return "안전";
  } else if (objectType === "CAR") {
    if (distanceM <= 5) return "위험";
    if (distanceM <= 20) return "보통";
    return "안전";
  }
  return "안전";
}

/**
 * carXpx, durationSec 기반으로 모든 센서에 대해 거리/위험도 계산.
 * ➜ 결과에 센서 좌표(map_x_px, map_y_px)도 포함해서 프론트가 바로 그림.
 */
function evaluateSnapshot(carXpx, durationSec, callback) {
  db.all(`SELECT id, map_x_px, map_y_px FROM sensor`, [], (err, sensors) => {
    if (err) return callback(err);
    if (!sensors || sensors.length === 0) return callback(null, []);

    const results = [];

    const stmt = db.prepare(`
      INSERT INTO risk_event
      (sensor_id, distance_m, duration_sec, object_type, risk_label)
      VALUES (?, ?, ?, ?, ?)
    `);

    sensors.forEach((sensor) => {
      const distancePx = Math.abs(sensor.map_x_px - carXpx); // 센서 <-> 차량 거리
      const distanceM = distancePx * PX_TO_M; // px -> m 환산

      const objectType = computeObjectType(distanceM, durationSec);
      const riskLabel = computeRisk(distanceM, objectType);

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
