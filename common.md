# 프로젝트 명세서 (Project Specification)

## 1. 개요 (Overview)
보행자 안전을 위한 센서 모니터링 및 위험 감지 시스템입니다. 센서로부터 데이터를 수집하여 위험 이벤트를 감지하고, 대시보드를 통해 실시간 모니터링 및 시뮬레이션을 제공합니다.

## 2. 기술 스택 (Tech Stack)

### Frontend
- **Language**: TypeScript
- **Framework**: React
- **Styling**: Tailwind CSS
- **Components**: Shadcn UI (inferred)
- **API Client**: `Frontend/src/services/api.ts`

### Backend
- **Runtime**: Node.js
- **Framework**: Express
- **Database**: SQLite

## 3. 데이터 모델 (Data Models)

### Sensor (센서 정보)
| Field     | Type   | Description                           |
|-----------|--------|---------------------------------------|
| id        | number | 센서 고유 ID                           |
| map_x_px  | number | 지도상 X 좌표 (pixel)                   |
| map_y_px  | number | 지도상 Y 좌표 (pixel)                   |
| is_active | number | 활성화 여부 (1: Active, 0: Inactive)    |

### RiskEvent (위험 이벤트)
|    Field    |  Type  | Description                    |
|-------------|------- |--------------------------------|
| event_id    | number | 이벤트 고유 ID                   |
| sensor_id   | number | 감지한 센서 ID                   |
| distance_m  | number | 감지된 객체와의 거리 (m)          |
| detected_at | string | 감지 시간 (ISO 8601 or String)  |
| object_type | string | 객체 유형 (예: VEHICLE, PERSON)  |
| risk_label  | string | 위험도 라벨 (예: 위험, 경고, 안전) |

### SensorHealth (센서 상태)
| Field        | Type   | Description |
|--------------|--------|-------------|
| sensor_id    | number | 센서 ID      |
| map_x_px     | number | 지도상 X 좌표 |
| map_y_px     | number | 지도상 Y 좌표 |
| is_active    | number | 활성화 여부   |
| (consecutive_|
|timeout_count)| number | 연속 타임아웃 횟수                |
| is_faulty    | number | 고장 여부 (1: Faulty, 0: Normal) |
| updated_at   | string | 마지막 상태 업데이트 시간          |
| last_ping_at | string | null | 마지막 핑 시간             |

### SimulationResult (시뮬레이션 결과)
|  Field       |  Type  |  Description  |
|--------------|--------|---------------|
| sensor_id    | number | 센서 ID       |
| map_x_px     | number | 감지 위치 X   |
| map_y_px     | number | 감지 위치 Y   |
| distance_m   | number | 거리 (m)      |
| duration_sec | number | 시뮬레이션 지속 시간 |
| object_type  | string | 객체 유형     |
| risk_label   | string | 위험도 라벨    |

### PingResponse (핑 응답)
| Field       | Type   | Description |
|-------------|--------|-------------|
| sensor_id   | number | 센서 ID      |
| timeout     | boolean| 타임아웃 발생 여부 |
| response_ms | number | null | 응답 시간 (ms) |
| consecutive_
| timeout_count | number | 연속 타임아웃 횟수 |
| is_faulty |  number | 고장 여부 |

## 4. API 명세 (API Specification)

Base URL: `http://localhost:3000`

### 4.1 센서 위치 조회
- **Endpoint**: `GET /api/sensors`
- **Description**: 초기 로딩 시 센서들의 위치 정보를 가져옵니다.
- **Response**: `Sensor[]`

### 4.2 차량 이동 시뮬레이션
- **Endpoint**: `POST /api/simulate/move`
- **Description**: 차량 이동을 시뮬레이션하고 결과를 반환합니다.
- **Request Body**:
  ```json
  {
    "car_x_px": number,
    "duration_sec": number
  }
  ```
- **Response**: `SimulationResult[]`

### 4.3 전체 센서 상태 조회
- **Endpoint**: `GET /api/health`
- **Description**: 대시보드용으로 전체 센서의 상태(Health)를 조회합니다.
- **Response**: `SensorHealth[]`

### 4.4 특정 센서 핑 (Ping)
- **Endpoint**: `POST /api/health/ping`
- **Description**: 특정 센서에 핑을 보내 상태를 점검합니다.
- **Request Body**:
  ```json
  {
    "sensor_id": number
  }
  ```
- **Response**: `PingResponse`

### 4.5 위험 이벤트 로그 조회
- **Endpoint**: `GET /api/events`
- **Query Params**:
  - `limit`: number (default: 50)
- **Description**: 최근 위험 이벤트 로그를 조회합니다.
- **Response**: `RiskEvent[]`

## 5. 핵심 로직 (Critical Logic)
> [!IMPORTANT]
> 이 로직은 사용자의 명시적인 요구사항이며 절대 변경해서는 안 됩니다.

### 5.1 위험 분석 (Risk Analysis)
- **고장 센서 = 위험 이벤트 (Faulty Sensor = Critical Risk)**
    - 센서가 고장(`is_faulty=1`)나면, 시뮬레이션 실행 여부와 관계없이 **즉시 위험 이벤트**로 간주해야 합니다.
    - 대시보드의 "위험 분석" 섹션은 **고장난 센서**만 생각하며 **위험 거리(12m) 내 차량**이 있을 때 **"CRITICAL"** 상태를 표시할 필요가 없습니다. 
    - 이를 위해 프론트엔드(`Dashboard.tsx`)는 `sensor_health` 데이터를 기반으로 가상의 "고장" 이벤트(set_faulty.js를 통해 생성된 이벤트)를 생성하여 `riskEvents` 목록에 주입합니다.
