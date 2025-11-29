const BASE_URL = "http://localhost:3000";

export interface Sensor {
    id: number;
    map_x_px: number;
    map_y_px: number;
    is_active: number;
}

export interface SimulationResult {
    sensor_id: number;
    map_x_px: number;
    map_y_px: number;
    distance_m: number;
    duration_sec: number;
    object_type: string;
    risk_label: string;
}

export interface SensorHealth {
    sensor_id: number;
    map_x_px: number;
    map_y_px: number;
    is_active: number;
    consecutive_timeout_count: number;
    is_faulty: number;
    updated_at: string;
    last_ping_at: string | null;
}

export interface PingResponse {
    sensor_id: number;
    timeout: boolean;
    response_ms: number | null;
    consecutive_timeout_count: number;
    is_faulty: number;
}

export interface RiskEvent {
    event_id: number;
    sensor_id: number;
    distance_m: number;
    detected_at: string;
    object_type: string;
    risk_label: string;
}

// 1. 센서 위치 가져오기 (초기 로딩용)
export const getSensors = async (): Promise<Sensor[]> => {
    const response = await fetch(`${BASE_URL}/api/sensors`);
    return response.json();
};

// 2. 차량 이동 시뮬레이션 (버튼 클릭용)
export const moveCar = async (carX: number, duration: number): Promise<SimulationResult[]> => {
    const response = await fetch(`${BASE_URL}/api/simulate/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ car_x_px: carX, duration_sec: duration }),
    });
    return response.json();
};

// 3. 전체 센서 상태 조회 (대시보드용)
export const getHealth = async (): Promise<SensorHealth[]> => {
    const response = await fetch(`${BASE_URL}/api/health`);
    return response.json();
};

// 4. 특정 센서 핑 날리기 (고장 진단용)
export const sendPing = async (sensorId: number): Promise<PingResponse> => {
    const response = await fetch(`${BASE_URL}/api/health/ping`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sensor_id: sensorId }),
    });
    return response.json();
};

// 5. 로그 조회 (필요하면)
export const getEvents = async (limit: number = 50): Promise<RiskEvent[]> => {
    const response = await fetch(`${BASE_URL}/api/events?limit=${limit}`);
    return response.json();
};
