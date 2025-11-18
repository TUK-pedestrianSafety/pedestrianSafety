// server.js
const express = require("express");
const cors = require("cors");
const { initDb } = require("./db");

const sensorsRoute = require("./routes/sensors");
const eventsRoute = require("./routes/events");
const healthRoute = require("./routes/health");
const simulateRoute = require("./routes/simulate");

const app = express();

// 미들웨어
app.use(cors());
app.use(express.json());

// DB 초기화
initDb();

// 라우트 연결
app.use("/api/sensors", sensorsRoute);
app.use("/api/events", eventsRoute);
app.use("/api/health", healthRoute);
app.use("/api/simulate", simulateRoute);

// 서버 실행
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
