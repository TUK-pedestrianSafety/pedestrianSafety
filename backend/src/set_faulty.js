const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data.db');

const sensorId = 3;

db.run(
    `INSERT OR REPLACE INTO sensor_health (sensor_id, consecutive_timeout_count, is_faulty, updated_at)
   VALUES (?, 3, 1, datetime('now', 'localtime'))`,
    [sensorId],
    function (err) {
        if (err) {
            return console.error(err.message);
        }
        console.log(`Sensor ${sensorId} set to faulty (count=3, is_faulty=1)`);
    }
);

db.close();
