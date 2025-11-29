import { useState, useEffect, useRef } from "react";
import {
  ArrowRight,
  RotateCcw,
  Play,
  Pause,
} from "lucide-react";
import { Button } from "./ui/button";
import { Slider } from "./ui/slider";
import { moveCar, getSensors, Sensor as ApiSensor } from "../services/api";

interface Sensor {
  id: number;
  x: number;
  y: number;
  distance: number;
  status: "safe" | "warning" | "danger" | "off";
  objectType?: string;
}

export function SensorSimulation() {
  const [carPosition, setCarPosition] = useState(-100);
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(200); // 밀리초 단위
  const [simulationType, setSimulationType] = useState<"VEHICLE" | "OTHER" | "UNKNOWN">("VEHICLE");

  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 400;
  const CAR_START = -100;
  const CAR_END = CANVAS_WIDTH + 100;
  const MOVE_STEP = 20; // 한 번에 이동하는 거리 (6m)

  const moveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 센서 초기화 (백엔드에서 가져오기)
  useEffect(() => {
    getSensors().then((data) => {
      const mappedSensors: Sensor[] = data.map((s) => ({
        id: s.id,
        x: s.map_x_px,
        y: s.map_y_px,
        distance: 0,
        status: "off",
        objectType: undefined,
      }));
      setSensors(mappedSensors);
    });
  }, []);

  // 거리 계산 및 상태 업데이트 (서버 요청)
  const updateSensors = async (position: number) => {
    try {
      let duration = speed / 1000;

      if (simulationType === "OTHER") {
        // 2.0s ~ 5.0s random
        duration = Math.random() * 3.0 + 2.0;
      } else if (simulationType === "UNKNOWN") {
        // 0.51s ~ 1.99s random
        duration = Math.random() * 1.48 + 0.51;
      }

      const results = await moveCar(position, duration);
      setSensors((prevSensors) =>
        prevSensors.map((sensor) => {
          const res = results.find((r) => r.sensor_id === sensor.id);
          if (res) {
            let status: "safe" | "warning" | "danger" | "off" = "off";
            if (res.risk_label === "위험") status = "danger";
            else if (res.risk_label === "경고") status = "warning";
            else if (res.risk_label === "안전") status = "safe";
            else status = "off"; // "꺼짐" or others

            const objectTypeMap: Record<string, string> = {
              "VEHICLE": "차량",
              "OTHER": "차량 이외",
              "UNKNOWN": "?"
            };

            return {
              ...sensor,
              distance: res.distance_m,
              status,
              objectType: res.object_type ? (objectTypeMap[res.object_type] || res.object_type) : undefined
            };
          }
          return sensor;
        })
      );
    } catch (error) {
      console.error("Simulation failed:", error);
    }
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

    // Vehicle uses slider speed, others use fixed speed (200ms)
    const intervalSpeed = simulationType === "VEHICLE" ? speed : 200;

    moveIntervalRef.current = setInterval(handleMove, intervalSpeed);
    setIsPlaying(true);
  };

  const handlePause = () => {
    if (moveIntervalRef.current) {
      clearInterval(moveIntervalRef.current);
      moveIntervalRef.current = null;
      setIsPlaying(false);
    }
  };

  // 속도 변경 시 interval 재설정 (Vehicle only)
  useEffect(() => {
    if (isPlaying && moveIntervalRef.current && simulationType === "VEHICLE") {
      clearInterval(moveIntervalRef.current);
      moveIntervalRef.current = setInterval(handleMove, speed);
    }
  }, [speed, simulationType, isPlaying]);

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
        return "#FF4D4D"; // Red (Guidelines)
      case "warning":
        return "#FFA500"; // Orange (Guidelines)
      case "safe":
        return "#4CAF50"; // Green (Guidelines)
      default: // "off"
        return "#4b5563"; // 회색 (꺼짐)
    }
  };

  const getGlowIntensity = (status: string) => {
    switch (status) {
      case "danger":
        return "0 0 20px rgba(255, 77, 77, 0.8), 0 0 40px rgba(255, 77, 77, 0.4)";
      case "warning":
        return "0 0 15px rgba(255, 165, 0, 0.6), 0 0 30px rgba(255, 165, 0, 0.3)";
      case "safe":
        return "0 0 10px rgba(76, 175, 80, 0.4)";
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
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#FF4D4D" }}></div>
            <span>위험: {dangerSensors}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#FFA500" }}></div>
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
            <div className="absolute inset-0 flex flex-col items-center justify-center text-xs text-white">
              <span>{sensor.id}</span>
              {sensor.objectType && (
                <span className="text-[10px] opacity-80">{sensor.objectType}</span>
              )}
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

        {/* 이동 객체 (차량/사람/?) */}
        <div
          className="absolute transition-all duration-300"
          style={{
            left: `${carPosition}px`,
            top: "200px",
            transform: "translate(-50%, -50%)",
          }}
        >
          {simulationType === "VEHICLE" && (
            <svg width="80" height="40" viewBox="0 0 80 40" fill="none">
              <rect x="5" y="15" width="70" height="20" rx="3" fill="#3b82f6" />
              <rect x="15" y="8" width="50" height="15" rx="2" fill="#60a5fa" />
              <rect x="20" y="10" width="18" height="10" rx="1" fill="#93c5fd" opacity="0.7" />
              <rect x="42" y="10" width="18" height="10" rx="1" fill="#93c5fd" opacity="0.7" />
              <circle cx="20" cy="35" r="5" fill="#1f2937" />
              <circle cx="60" cy="35" r="5" fill="#1f2937" />
              <circle cx="20" cy="35" r="3" fill="#4b5563" />
              <circle cx="60" cy="35" r="3" fill="#4b5563" />
              <rect x="72" y="20" width="3" height="5" rx="1" fill="#fef08a" />
            </svg>
          )}

          {simulationType === "OTHER" && (
            <svg width="40" height="60" viewBox="0 0 40 60" fill="none">
              <circle cx="20" cy="10" r="8" fill="#f59e0b" />
              <rect x="16" y="18" width="8" height="25" rx="2" fill="#f59e0b" />
              <rect x="10" y="22" width="20" height="3" rx="1" fill="#f59e0b" />
              <rect x="14" y="43" width="5" height="15" rx="2" fill="#f59e0b" />
              <rect x="21" y="43" width="5" height="15" rx="2" fill="#f59e0b" />
            </svg>
          )}

          {simulationType === "UNKNOWN" && (
            <div className="flex items-center justify-center w-10 h-10 bg-gray-600 rounded-full text-white font-bold text-xl border-2 border-gray-400">
              ?
            </div>
          )}
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
          <div style={{ color: "#FF4D4D" }}>{"≤ 12m"}</div>
        </div>
        <div className="bg-gray-900 p-3 rounded">
          <div className="text-gray-400 mb-1">경고 거리</div>
          <div style={{ color: "#FFA500" }}>12~20m</div>
        </div>
        <div className="bg-gray-900 p-3 rounded">
          <div className="text-gray-400 mb-1">안전 거리</div>
          <div style={{ color: "#4CAF50" }}>20~50m</div>
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
          onValueChange={(value: number[]) =>
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

      {/* 시뮬레이션 타입 선택 */}
      <div className="bg-gray-900 rounded-lg p-4 space-y-3">
        <div className="text-sm text-gray-400 mb-2">시뮬레이션 객체 유형</div>
        <div className="flex gap-2">
          <Button
            variant={simulationType === "VEHICLE" ? "default" : "outline"}
            onClick={() => setSimulationType("VEHICLE")}
            size="sm"
            className="flex-1"
          >
            차량
          </Button>
          <Button
            variant={simulationType === "OTHER" ? "default" : "outline"}
            onClick={() => setSimulationType("OTHER")}
            size="sm"
            className="flex-1"
          >
            사람 (Other)
          </Button>
          <Button
            variant={simulationType === "UNKNOWN" ? "default" : "outline"}
            onClick={() => setSimulationType("UNKNOWN")}
            size="sm"
            className="flex-1"
          >
            미확인 (?)
          </Button>
        </div>
      </div>
    </div>
  );
}