// src/db.js
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// backend/data.db 라는 파일로 생성됨
const dbPath = path.join(__dirname, "..", "data.db");
const db = new sqlite3.Database(dbPath);

function initDb() {
  db.serialize(() => {
    // 외래키 제약 활성화
    db.run("PRAGMA foreign_keys = ON");

    // 센서 정적 정보 테이블
    db.run(`
        CREATE TABLE IF NOT EXISTS sensor (
            id INTEGER PRIMARY KEY AUTOINCREMENT,   -- 센서 고유 ID
            map_x_px INTEGER NOT NULL,              -- 미니맵/화면용 X 좌표 (px)
            map_y_px INTEGER NOT NULL,              -- 미니맵/화면용 Y 좌표 (px)
            is_active INTEGER NOT NULL DEFAULT 1    -- 1=활성(정상), 0=비활성(고장)
        );
    `);
    // 위험 이벤트(물체 인식 + 위험도 판단) 로그 테이블
    db.run(`
        CREATE TABLE IF NOT EXISTS risk_event (
            event_id INTEGER PRIMARY KEY AUTOINCREMENT,  -- 고유키(이벤트 ID 역할)
            sensor_id INTEGER NOT NULL,                  -- 센서 ID (FK: sensor.id)

            distance_m REAL NOT NULL,                    -- 센서와 물체 거리 (m)
            duration_sec REAL NOT NULL,                  -- 측정 유지 시간
            detected_at DATETIME NOT NULL                -- 센서 측정 일시
            DEFAULT CURRENT_TIMESTAMP,             
            object_type TEXT NOT NULL,                   -- 'CAR', 'PERSON' 등

            risk_label TEXT NOT NULL,                    -- '안전', '보통', '위험'

            FOREIGN KEY (sensor_id) REFERENCES sensor(id)
        );
    `);

    // 핑 로그 (모든 핑 기록)
    db.run(`
        CREATE TABLE IF NOT EXISTS sensor_ping_log (
            ping_id INTEGER PRIMARY KEY AUTOINCREMENT,      -- 고유키(이벤트 ID 역할)
            sensor_id INTEGER NOT NULL,                     -- 센서 ID (FK: sensor ID)
            ping_at DATETIME NOT NULL                       -- ping 전송 일시 (DEAULT: 현재 시간)
            DEFAULT CURRENT_TIMESTAMP,                     
            response_ms INTEGER,                            -- 타임아웃이면 NULL
            status TEXT NOT NULL,                           -- 'OK' or 'TIMEOUT'

            FOREIGN KEY (sensor_id) REFERENCES sensor(id)
        );
    `);

    // 센서 상태 요약 (연속 실패 수 + 고장 여부)
    db.run(`
        CREATE TABLE IF NOT EXISTS sensor_health (
            sensor_id INTEGER PRIMARY KEY,                          -- 센서 ID (FK: sensor ID)
            consecutive_timeout_count INTEGER NOT NULL DEFAULT 0,   -- 연속 타임아웃 횟수 (정상이면 0 초기화)
            is_faulty INTEGER NOT NULL DEFAULT 0,                   -- 고장 여부 (0: 고장, 1: 정상)
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, -- 갱신 일시

            FOREIGN KEY (sensor_id) REFERENCES sensor(id)
        );
    `);

    // 초기 센서 좌표 자동 삽입 (최초 1회만)
    db.get(`SELECT COUNT(*) AS cnt FROM sensor`, (err, row) => {
      if (err) {
        console.error("sensor count check error:", err);
        return;
      }

      if (row.cnt === 0) {
        console.log("초기 센서 데이터 삽입 중...");
        const stmt = db.prepare(`
                INSERT INTO sensor (map_x_px, map_y_px)
                VALUES (?, ?)
            `);

        // 일자 도로 위/아래 일정 간격 배치
        // 이 부분에 대한 값은 프론트에서 수정하셔도 됩니다.
        const ROAD_START_X = 100; // 도로 시작 x (px)
        const ROAD_END_X = 700; // 도로 끝 x (px)
        const SENSORS_PER_SIDE = 5; // 위에 5개, 아래 5개 → 총 10개

        const ROAD_CENTER_Y = 300; // 도로 중앙 y (px)
        const OFFSET_Y = 40; // 도로 위/아래 간격 (px)

        const stepX =
          SENSORS_PER_SIDE > 1
            ? (ROAD_END_X - ROAD_START_X) / (SENSORS_PER_SIDE - 1)
            : 0;

        for (let i = 0; i < SENSORS_PER_SIDE; i++) {
          const x = Math.round(ROAD_START_X + stepX * i);
          // 도로 위쪽 센서
          stmt.run(x, ROAD_CENTER_Y - OFFSET_Y);
          // 도로 아래쪽 센서
          stmt.run(x, ROAD_CENTER_Y + OFFSET_Y);
        }

        stmt.finalize();
        console.log("센서 기본 데이터 삽입 완료");
      }
    });
  });
}

module.exports = {
  db,
  initDb,
};
