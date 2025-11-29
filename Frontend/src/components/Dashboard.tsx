import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Activity, AlertTriangle, CheckCircle, ShieldAlert, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { getEvents, getHealth, sendPing, RiskEvent, SensorHealth } from "../services/api";

export function Dashboard() {
  const [riskEvents, setRiskEvents] = useState<RiskEvent[]>([]);
  const [sensorHealthRegistry, setSensorHealthRegistry] = useState<SensorHealth[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async (isInitial = false) => {
      try {
        if (isInitial) setLoading(true);
        const [events, health] = await Promise.all([
          getEvents(),
          getHealth(),
        ]);

        // Generate synthetic events for faulty sensors
        const faultyEvents: RiskEvent[] = health
          .filter(s => s.is_faulty === 1)
          .map(s => ({
            event_id: -s.sensor_id, // Negative ID to distinguish from DB events
            sensor_id: s.sensor_id,
            object_type: "System",
            distance_m: 0,
            risk_label: "고장",
            detected_at: s.updated_at
          }));

        // Combine real events and faulty events
        const allEvents = [...events, ...faultyEvents];
        const sortedEvents = allEvents.sort((a, b) => a.sensor_id - b.sensor_id);

        setRiskEvents(sortedEvents);
        setSensorHealthRegistry(health);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        if (isInitial) setLoading(false);
      }
    };

    fetchData(true);
    const interval = setInterval(() => fetchData(false), 2000); // 2초마다 갱신

    return () => clearInterval(interval);
  }, []);

  // Autonomic Monitoring Logic
  const totalSensors = sensorHealthRegistry.length;
  const faultySensors = sensorHealthRegistry.filter((s) => s.is_faulty === 1).length;
  const activeSensors = totalSensors - faultySensors;

  const recentHighRisks = riskEvents.filter(e => e.risk_label === "고장").length;
  const currentRiskLevel = recentHighRisks > 0 ? "CRITICAL" : "NORMAL";

  const formatTime = (dateString: string | null) => {
    if (!dateString) return "-";
    return dateString;
  };

  const handlePing = async (sensorId: number) => {
    try {
      const result = await sendPing(sensorId);
      setSensorHealthRegistry((prev) =>
        prev.map((s) =>
          s.sensor_id === sensorId
            ? {
              ...s,
              consecutive_timeout_count: result.consecutive_timeout_count,
              is_faulty: result.is_faulty,
            }
            : s
        )
      );
      alert(`핑 결과: ${result.timeout ? "타임아웃" : "성공"} (${result.response_ms ?? 0}ms)`);
    } catch (error) {
      console.error("Ping failed:", error);
      alert("핑 전송 실패");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-400">시스템 데이터 동기화 중...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Section 1: Autonomic System Monitor */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-200">
              시스템 상태
            </CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {activeSensors} / {totalSensors} 가동 중
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {faultySensors > 0
                ? `${faultySensors}개 센서 점검 필요`
                : "모든 시스템 정상 가동 중"}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-200">
              위험 분석
            </CardTitle>
            <ShieldAlert className={`h-4 w-4 ${currentRiskLevel === 'CRITICAL' ? 'text-red-500' : 'text-blue-500'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${currentRiskLevel === 'CRITICAL' ? 'text-red-400' : 'text-blue-400'}`}>
              {currentRiskLevel === 'CRITICAL' ? '위험' : '정상'}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              최근 {recentHighRisks}건의 고위험 이벤트 감지
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Section 2: Risk Event Log */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            위험 이벤트 로그
          </h2>
          <Badge variant="outline" className="text-gray-400">risk_event table</Badge>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-700 hover:bg-gray-800">
                <TableHead className="text-gray-400">이벤트 ID</TableHead>
                <TableHead className="text-gray-400">센서 ID</TableHead>
                <TableHead className="text-gray-400">객체 유형</TableHead>
                <TableHead className="text-gray-400">거리 (m)</TableHead>
                <TableHead className="text-gray-400">위험도</TableHead>
                <TableHead className="text-gray-400">감지 시간</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {riskEvents.map((event) => (
                <TableRow key={event.event_id} className="border-gray-700 hover:bg-gray-700/50">
                  <TableCell className="font-mono text-gray-300">{event.event_id}</TableCell>
                  <TableCell className="text-gray-300">{event.sensor_id}</TableCell>
                  <TableCell className="text-gray-300">{event.object_type}</TableCell>
                  <TableCell className="text-gray-300 font-medium">
                    {event.distance_m}m
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      style={{
                        backgroundColor:
                          event.risk_label === "위험" ? "#FF4D4D" :
                            event.risk_label === "경고" ? "#FFA500" :
                              event.risk_label === "안전" ? "#4CAF50" :
                                event.risk_label === "고장" ? "#4b5563" : undefined,
                        color: "white",
                        border: "none"
                      }}
                    >
                      {event.risk_label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-400 text-sm">{formatTime(event.detected_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Section 3: Sensor Health Registry */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            센서 상태 현황
          </h2>
          <Badge variant="outline" className="text-gray-400">sensor_health table</Badge>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-700 hover:bg-gray-800">
                <TableHead className="text-gray-400">센서 ID</TableHead>
                <TableHead className="text-gray-400">상태</TableHead>
                <TableHead className="text-gray-400">연속 타임아웃</TableHead>
                <TableHead className="text-gray-400">마지막 업데이트</TableHead>
                <TableHead className="text-gray-400">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sensorHealthRegistry.map((sensor) => (
                <TableRow key={sensor.sensor_id} className="border-gray-700 hover:bg-gray-700/50">
                  <TableCell className="text-gray-300 font-medium">Sensor #{sensor.sensor_id}</TableCell>
                  <TableCell>
                    {sensor.is_faulty !== 1 ? (
                      <Badge style={{ backgroundColor: "#4CAF50", color: "white", border: "none" }}>정상</Badge>
                    ) : (
                      <Badge style={{ backgroundColor: "#FF4D4D", color: "white", border: "none" }}>오류</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-gray-300">
                    {sensor.consecutive_timeout_count > 0 ? (
                      <span className="text-yellow-500 font-bold">{sensor.consecutive_timeout_count}</span>
                    ) : (
                      <span className="text-gray-500">0</span>
                    )}
                  </TableCell>
                  <TableCell className="text-gray-400 text-sm">{formatTime(sensor.updated_at)}</TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePing(sensor.sensor_id)}
                    >
                      Ping
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
