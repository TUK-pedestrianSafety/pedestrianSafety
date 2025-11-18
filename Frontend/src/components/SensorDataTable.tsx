import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Badge } from "./ui/badge";

export function SensorDataTable() {
  // 거리에 따른 상태 계산 (절대값 기준)
  const getStatusFromDistance = (distance: number) => {
    const absDistance = Math.abs(distance);
    if (absDistance <= 10) return "위험";
    if (absDistance <= 20) return "경고";
    if (absDistance <= 50) return "안전";
    return "범위밖"; // 50m 초과
  };

  // 센서 데이터 (거리별 상태 자동 계산)
  // 시속 30km/h (8.33m/s) 차량 기준 감지 시간
  const sensorData = [
    {
      id: 1,
      distance: 8,
      timestamp: "25.11.04 20:56:33",
      responseTime: "1.8s", // 차량 감지 시간
      action: "긴급 경보",
    },
    {
      id: 2,
      distance: 15,
      timestamp: "25.11.04 20:56:36",
      responseTime: "2.2s", // 차량 감지 시간
      action: "경고",
    },
    {
      id: 3,
      distance: -18,
      timestamp: "25.11.04 20:56:38",
      responseTime: "2.5s", // 차량 감지 시간
      action: "경고",
    },
    {
      id: 4,
      distance: 25,
      timestamp: "25.11.04 20:56:40",
      responseTime: "2.8s", // 차량 감지 시간
      action: "정상",
    },
    {
      id: 5,
      distance: -5,
      timestamp: "25.11.04 20:56:42",
      responseTime: "1.5s", // 차량 감지 시간 (가장 가까움)
      action: "긴급 경보",
    },
  ].map((row) => ({
    ...row,
    status: getStatusFromDistance(row.distance),
  }));

  // 센서 로그 데이터
  const sensorLogs = [
    {
      id: 1,
      activations: 6,
      lastPing: "25.11.04 20:10:03",
      status: "정상",
    },
    {
      id: 2,
      activations: 3,
      lastPing: "25.11.04 16:32:24",
      status: "정상",
    },
    {
      id: 3,
      activations: 9,
      lastPing: "25.11.04 10:11:32",
      status: "정상",
    },
    {
      id: 4,
      activations: 12,
      lastPing: "25.11.04 08:05:15",
      status: "정상",
    },
    {
      id: 5,
      activations: 4,
      lastPing: "25.11.03 22:40:50",
      status: "고장 의심",
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "위험":
        return "destructive";
      case "경고":
        return "default";
      case "안전":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-6">
      {/* 데이터베이스 테이블 */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl mb-4">데이터베이스</h2>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-700">
                <TableHead className="text-gray-300">
                  sensor ID(번호)
                </TableHead>
                <TableHead className="text-gray-300">
                  센서 반경(m)
                </TableHead>
                <TableHead className="text-gray-300">
                  센서 종류 정보 (시간)
                </TableHead>
                <TableHead className="text-gray-300">
                  센서 감지 지속시간(s)
                </TableHead>
                <TableHead className="text-gray-300">
                  통작업 결과
                </TableHead>
                <TableHead className="text-gray-300">
                  위험도
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sensorData.map((row) => (
                <TableRow
                  key={row.id}
                  className="border-gray-700"
                >
                  <TableCell>{row.id}</TableCell>
                  <TableCell>
                    <span
                      style={{
                        color:
                          row.status === "위험"
                            ? "#FF0000"
                            : row.status === "경고"
                              ? "#FF8C00"
                              : row.status === "안전"
                                ? "#28A745"
                                : "#9ca3af", // 범위밖 = 회색
                        fontWeight: row.status === "위험" ? "bold" : "normal"
                      }}
                    >
                      {row.distance > 0 ? "+" : ""}{row.distance}m{" "}
                      {row.status === "위험"
                        ? "(≤ 10m)"
                        : row.status === "경고"
                          ? "(10-20m)"
                          : row.status === "안전"
                            ? "(20-50m)"
                            : "(> 50m)"}
                    </span>
                  </TableCell>
                  <TableCell>{row.timestamp}</TableCell>
                  <TableCell>{row.responseTime}</TableCell>
                  <TableCell>{row.action}</TableCell>
                  <TableCell>
                    <span
                      style={{
                        color:
                          row.status === "위험"
                            ? "#FF0000"
                            : row.status === "경고"
                              ? "#FF8C00"
                              : row.status === "안전"
                                ? "#28A745"
                                : "#9ca3af", // 범위밖 = 회색
                        fontWeight: row.status === "위험" ? "bold" : "normal",
                        padding: "4px 8px",
                        borderRadius: "4px",
                        backgroundColor:
                          row.status === "위험"
                            ? "rgba(255, 0, 0, 0.1)"
                            : row.status === "경고"
                              ? "rgba(255, 140, 0, 0.1)"
                              : row.status === "안전"
                                ? "rgba(40, 167, 69, 0.1)"
                                : "rgba(156, 163, 175, 0.1)", // 범위밖
                      }}
                    >
                      {row.status}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* 센서 로그 테이블 */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl mb-4">
          센서 통합 조회 - 활성화 횟수 및 상태
        </h2>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-700">
                <TableHead className="text-gray-300">
                  ID
                </TableHead>
                <TableHead className="text-gray-300">
                  활성화 횟수
                </TableHead>
                <TableHead className="text-gray-300">
                  마지막 핑
                </TableHead>
                <TableHead className="text-gray-300">
                  상태
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sensorLogs.map((row) => (
                <TableRow
                  key={row.id}
                  className="border-gray-700"
                >
                  <TableCell>{row.id}</TableCell>
                  <TableCell>{row.activations}</TableCell>
                  <TableCell>{row.lastPing}</TableCell>
                  <TableCell>
                    <span style={{
                      color: row.status === "정상" ? "#28A745" : "#FF0000",
                      fontWeight: row.status === "고장 의심" ? "bold" : "normal"
                    }}>
                      {row.status}
                    </span>
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