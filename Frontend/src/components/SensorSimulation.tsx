import { useState, useEffect, useRef } from "react";
import {
  ArrowRight,
  RotateCcw,
  Play,
  Pause,
} from "lucide-react";
import { Button } from "./ui/button";
import { Slider } from "./ui/slider";

interface Sensor {
  id: number;
  x: number;
  y: number;
  distance: number;
  status: "safe" | "warning" | "danger" | "off";
}

export function SensorSimulation() {
  const [carPosition, setCarPosition] = useState(-100);
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(200); // 밀리초 단위

  const SENSOR_COUNT = 6;
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 400;
  const SENSOR_SPACING = 120;
  const CAR_START = -100;
  const CAR_END = CANVAS_WIDTH + 100;
  const MOVE_STEP = 20; // 한 번에 이동하는 거리 (20m)
  const SCALE_FACTOR = 0.3; // px를 m로 변환하는 배율 (1px = 0.3m)

  const moveIntervalRef = useRef<number | null>(null);

  // 센서 초기화
  useEffect(() => {
    const leftSensors: Sensor[] = [];
    const rightSensors: Sensor[] = [];

    for (let i = 0; i < SENSOR_COUNT; i++) {
      leftSensors.push({
        id: i * 2 + 1,
        x: 100 + i * SENSOR_SPACING,
        y: 150,
        distance: 0,
        status: "off",
      });

      rightSensors.push({
        id: i * 2 + 2,
        x: 100 + i * SENSOR_SPACING,
        y: 250,
        distance: 0,
        status: "off",
      });
    }

    setSensors([...leftSensors, ...rightSensors]);
  }, []);

  // 거리 계산 및 상태 업데이트
  const updateSensors = (position: number) => {
    setSensors((prevSensors) =>
      prevSensors.map((sensor) => {
        const distancePx = sensor.x - position; // px 단위 거리
        const distance = distancePx * SCALE_FACTOR; // m 단위로 변환
        const absDistance = Math.abs(distance);
        let status: "safe" | "warning" | "danger" | "off" = "off";

        // 우선순위: 위험 > 경고 > 안전 > 범위 밖
        if (absDistance <= 10) {
          status = "danger";
        } else if (absDistance <= 20) {
          status = "warning";
        } else if (absDistance <= 50) {
          status = "safe";
        } else {
          status = "off";
        }

        return { ...sensor, distance, status };
      }),
    );
  };

  // 차량 이동 함수
  const handleMove = () => {
    setCarPosition((prev) => {
      const newPos = prev + MOVE_STEP;
      if (newPos > CAR_END) {
        updateSensors(CAR_START);
        return CAR_START;
      }
      updateSensors(newPos);
      return newPos;
    });
  };

  const handleReset = () => {
    setIsPlaying(false);
    if (moveIntervalRef.current) {
      clearInterval(moveIntervalRef.current);
      moveIntervalRef.current = null;
    }
    setCarPosition(CAR_START);
    updateSensors(CAR_START);
  };

  // 자동 재생
  const handleStart = () => {
    if (moveIntervalRef.current) return;
    moveIntervalRef.current = setInterval(handleMove, speed);
    setIsPlaying(true);
  };

  const handlePause = () => {
    if (moveIntervalRef.current) {
      clearInterval(moveIntervalRef.current);
      moveIntervalRef.current = null;
      setIsPlaying(false);
    }
  };

  // 속도 변경 시 interval 재설정
  useEffect(() => {
    if (isPlaying && moveIntervalRef.current) {
      clearInterval(moveIntervalRef.current);
      moveIntervalRef.current = setInterval(handleMove, speed);
    }

    return () => {
      if (moveIntervalRef.current) {
        clearInterval(moveIntervalRef.current);
      }
    };
  }, [speed]);

  // cleanup
  useEffect(() => {
    return () => {
      if (moveIntervalRef.current) {
        clearInterval(moveIntervalRef.current);
      }
    };
  }, []);

  const handleSpeedChange = (value: number[]) => {
    setSpeed(value[0]);
  };

  const getSpeedLabel = () => {
    if (speed <= 100) return "매우 빠름";
    if (speed <= 200) return "빠름";
    if (speed <= 350) return "보통";
    if (speed <= 600) return "느림";
    return "매우 느림";
  };

  const getSensorColor = (status: string) => {
    switch (status) {
      case "danger":
        return "#FF0000";
      case "warning":
        return "#FF8C00";
      case "safe":
        return "#28A745";
      default: // "off"
        return "#4b5563"; // 회색 (꺼짐)
    }
  };

  const getGlowIntensity = (status: string) => {
    switch (status) {
      case "danger":
        return "0 0 20px rgba(255, 0, 0, 0.8), 0 0 40px rgba(255, 0, 0, 0.4)";
      case "warning":
        return "0 0 15px rgba(255, 140, 0, 0.6), 0 0 30px rgba(255, 140, 0, 0.3)";
      case "safe":
        return "0 0 10px rgba(40, 167, 69, 0.4)";
      default: // "off"
        return "none";
    }
  };

  const dangerSensors = sensors.filter(
    (s) => s.status === "danger",
  ).length;
  const warningSensors = sensors.filter(
    (s) => s.status === "warning",
  ).length;

  return (
    <div className="bg-gray-800 rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          <Button
            onClick={handleMove}
            variant="default"
            size="sm"
          >
            <ArrowRight className="size-4 mr-2" />
            이동
          </Button>
          <Button
            onClick={handleReset}
            variant="outline"
            size="sm"
          >
            <RotateCcw className="size-4 mr-2" />
            초기화
          </Button>
          {!isPlaying ? (
            <Button
              onClick={handleStart}
              variant="outline"
              size="sm"
            >
              <Play className="size-4 mr-2" />
              시작
            </Button>
          ) : (
            <Button
              onClick={handlePause}
              variant="outline"
              size="sm"
            >
              <Pause className="size-4 mr-2" />
              일시정지
            </Button>
          )}
        </div>

        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#FF0000" }}></div>
            <span>위험: {dangerSensors}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#FF8C00" }}></div>
            <span>경고: {warningSensors}</span>
          </div>
        </div>
      </div>

      <div
        className="relative bg-gray-900 rounded-lg overflow-hidden"
        style={{ height: CANVAS_HEIGHT }}
      >
        {/* 도로 */}
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-0 right-0 h-px bg-gray-700 transform -translate-y-1/2"></div>
          <div className="absolute top-1/2 left-0 right-0 border-t-2 border-dashed border-gray-600 transform -translate-y-1/2"></div>
        </div>

        {/* 센서들 */}
        {sensors.map((sensor) => (
          <div
            key={sensor.id}
            className="absolute w-8 h-8 rounded-full transition-all duration-200"
            style={{
              left: `${sensor.x}px`,
              top: `${sensor.y}px`,
              backgroundColor: getSensorColor(sensor.status),
              boxShadow: getGlowIntensity(sensor.status),
              transform: "translate(-50%, -50%)",
            }}
          >
            <div className="absolute inset-0 flex items-center justify-center text-xs text-white">
              {sensor.id}
            </div>

            {/* 거리 표시 */}
            {Math.abs(sensor.distance) < 50 && (
              <div
                className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 text-xs whitespace-nowrap"
                style={{ color: getSensorColor(sensor.status) }}
              >
                {Math.round(sensor.distance)}m
              </div>
            )}
          </div>
        ))}

        {/* 차량 */}
        <div
          className="absolute transition-all duration-300"
          style={{
            left: `${carPosition}px`,
            top: "200px",
            transform: "translate(-50%, -50%)",
          }}
        >
          <svg
            width="80"
            height="40"
            viewBox="0 0 80 40"
            fill="none"
          >
            {/* 차체 */}
            <rect
              x="5"
              y="15"
              width="70"
              height="20"
              rx="3"
              fill="#3b82f6"
            />
            <rect
              x="15"
              y="8"
              width="50"
              height="15"
              rx="2"
              fill="#60a5fa"
            />

            {/* 창문 */}
            <rect
              x="20"
              y="10"
              width="18"
              height="10"
              rx="1"
              fill="#93c5fd"
              opacity="0.7"
            />
            <rect
              x="42"
              y="10"
              width="18"
              height="10"
              rx="1"
              fill="#93c5fd"
              opacity="0.7"
            />

            {/* 바퀴 */}
            <circle cx="20" cy="35" r="5" fill="#1f2937" />
            <circle cx="60" cy="35" r="5" fill="#1f2937" />
            <circle cx="20" cy="35" r="3" fill="#4b5563" />
            <circle cx="60" cy="35" r="3" fill="#4b5563" />

            {/* 헤드라이트 */}
            <rect
              x="72"
              y="20"
              width="3"
              height="5"
              rx="1"
              fill="#fef08a"
            />
          </svg>
        </div>

        {/* 보행자 (왼쪽) */}
        <div className="absolute left-8 top-1/4 transform -translate-y-1/2">
          <svg
            width="40"
            height="60"
            viewBox="0 0 40 60"
            fill="none"
          >
            <circle cx="20" cy="10" r="8" fill="#f59e0b" />
            <rect
              x="16"
              y="18"
              width="8"
              height="25"
              rx="2"
              fill="#f59e0b"
            />
            <rect
              x="10"
              y="22"
              width="20"
              height="3"
              rx="1"
              fill="#f59e0b"
            />
            <rect
              x="14"
              y="43"
              width="5"
              height="15"
              rx="2"
              fill="#f59e0b"
            />
            <rect
              x="21"
              y="43"
              width="5"
              height="15"
              rx="2"
              fill="#f59e0b"
            />
          </svg>
          <div className="text-xs text-center mt-1 text-orange-400">
            보행자
          </div>
        </div>

        {/* 보행자 (오른쪽) */}
        <div className="absolute right-8 top-3/4 transform -translate-y-1/2">
          <svg
            width="40"
            height="60"
            viewBox="0 0 40 60"
            fill="none"
          >
            <circle cx="20" cy="10" r="8" fill="#f59e0b" />
            <rect
              x="16"
              y="18"
              width="8"
              height="25"
              rx="2"
              fill="#f59e0b"
            />
            <rect
              x="10"
              y="22"
              width="20"
              height="3"
              rx="1"
              fill="#f59e0b"
            />
            <rect
              x="14"
              y="43"
              width="5"
              height="15"
              rx="2"
              fill="#f59e0b"
            />
            <rect
              x="21"
              y="43"
              width="5"
              height="15"
              rx="2"
              fill="#f59e0b"
            />
          </svg>
          <div className="text-xs text-center mt-1 text-orange-400">
            보행자
          </div>
        </div>

        {/* 바닥 경고 표시 */}
        {dangerSensors > 0 && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-red-500 rounded-lg animate-pulse">
            <span className="text-sm">⚠️ 차량 접근 경고!</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4 text-sm">
        <div className="bg-gray-900 p-3 rounded">
          <div className="text-gray-400 mb-1">위험 거리</div>
          <div className="text-red-400">{"≤ 10m"}</div>
        </div>
        <div className="bg-gray-900 p-3 rounded">
          <div className="text-gray-400 mb-1">경고 거리</div>
          <div style={{ color: "#FF8C00" }}>10~20m</div>
        </div>
        <div className="bg-gray-900 p-3 rounded">
          <div className="text-gray-400 mb-1">안전 거리</div>
          <div style={{ color: "#28A745" }}>20~50m</div>
        </div>
      </div>

      {/* 속도 조절 슬라이더 */}
      <div className="bg-gray-900 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">
            차량 속도
          </span>
          <span className="text-sm text-blue-400">
            {getSpeedLabel()} ({speed}ms)
          </span>
        </div>
        <Slider
          value={[1000 - speed]}
          onValueChange={(value) =>
            handleSpeedChange([1000 - value[0]])
          }
          max={990}
          min={600}
          step={25}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>매우 느림</span>
          <span>보통</span>
          <span>매우 빠름</span>
        </div>
      </div>
    </div>
  );
}