import { SensorSimulation } from './components/SensorSimulation';
import { SensorDataTable } from './components/SensorDataTable';

/**
 * 메인 앱 컴포넌트
 * 보행자 안전 센서 시스템 시뮬레이션
 */
export default function App() {
  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="text-center">
          <h1 className="text-3xl mb-2">보행자 안전 센서 시스템</h1>
          <p className="text-gray-400">차량 접근 시 거리 기반 경고 시뮬레이션</p>
        </header>
        
        <SensorSimulation />
        
        <SensorDataTable />
      </div>
    </div>
  );
}
