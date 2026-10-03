import { requireOptionalNativeModule } from 'expo';

// 블루투스 심박 센서 (표준 Heart Rate Service). 심박 벨트, 심박수 브로드캐스트를 켠 워치(샤오미 · 가민 등) (결정 로그 80항).
// 로컬 네이티브 모듈 modules/dallimo-heart는 아이폰 개발 빌드에만 있다.
// 웹 · 개발 확인용으로는 가짜 센서를 쓴다 (globalThis.__dallimoHeart로 상황을 바꿀 수 있다).

export type HeartSensorState = {
  // 블루투스 상태. unknown: 아직 찾거나 연결한 적이 없어 모른다
  bluetooth: 'on' | 'off' | 'unauthorized' | 'unsupported' | 'unknown';
  scanning: boolean;
  connection: 'idle' | 'connecting' | 'connected';
  deviceId?: string;
  deviceName?: string;
};

export type HeartSensorDevice = { id: string; name: string; rssi?: number };

export interface HeartSensorTransport {
  // 이 기기에서 심박 센서를 쓸 수 있나 (아이폰 · 개발 중 웹)
  supported: boolean;
  state(): HeartSensorState;
  // 처음 부르면 iOS가 블루투스 권한을 묻는다
  startScan(): void;
  stopScan(): void;
  // 범위 밖이면 들어올 때 연결되고, 끊기면 다시 연결한다
  connect(id: string): void;
  disconnect(): void;
  onState(fn: (s: HeartSensorState) => void): () => void;
  onDevice(fn: (d: HeartSensorDevice) => void): () => void;
  onHeartRate(fn: (bpm: number, at: number) => void): () => void;
}

type Subscription = { remove(): void };
type Payload = Record<string, unknown>;
type DallimoHeartModule = {
  getState(): HeartSensorState;
  startScan(): void;
  stopScan(): void;
  connect(id: string): void;
  disconnect(): void;
  addListener(event: 'onState', fn: (s: HeartSensorState) => void): Subscription;
  addListener(event: 'onDevice' | 'onHeartRate', fn: (p: Payload) => void): Subscription;
};

const nativeHeart = requireOptionalNativeModule<DallimoHeartModule>('DallimoHeart');

function nativeTransport(mod: DallimoHeartModule): HeartSensorTransport {
  return {
    supported: true,
    state: () => mod.getState(),
    startScan: () => mod.startScan(),
    stopScan: () => mod.stopScan(),
    connect: (id) => mod.connect(id),
    disconnect: () => mod.disconnect(),
    onState: (fn) => {
      const sub = mod.addListener('onState', fn);
      return () => sub.remove();
    },
    onDevice: (fn) => {
      const sub = mod.addListener('onDevice', (p) => {
        if (typeof p.id !== 'string') return;
        fn({ id: p.id, name: typeof p.name === 'string' ? p.name : '', rssi: typeof p.rssi === 'number' ? p.rssi : undefined });
      });
      return () => sub.remove();
    },
    onHeartRate: (fn) => {
      const sub = mod.addListener('onHeartRate', (p) => {
        if (typeof p.bpm !== 'number' || p.bpm <= 0) return;
        fn(Math.round(p.bpm), typeof p.at === 'number' ? p.at : Date.now());
      });
      return () => sub.remove();
    },
  };
}

// ── 개발용 가짜 센서 ──
export const MOCK_HEART_SCENARIOS = ['normal', 'empty', 'off', 'denied'] as const;
export type MockHeartScenario = (typeof MOCK_HEART_SCENARIOS)[number];

const MOCK_DEVICES: HeartSensorDevice[] = [
  { id: 'mock-redmi-watch', name: 'Redmi Watch 5 Lite', rssi: -58 },
  { id: 'mock-polar-h10', name: 'Polar H10 9A1B2C3D', rssi: -77 },
];

type MockHeartDebug = {
  setScenario(s: MockHeartScenario): void;
  // 센서가 범위를 벗어난 것처럼 끊는다 (다시 연결 중으로 바뀐다)
  drop(): void;
  bpm: number;
};

function mockTransport(): HeartSensorTransport {
  let scenario: MockHeartScenario = 'normal';
  let scanning = false;
  let wantId: string | null = null;
  let connected = false;
  let reachable = true;
  let bpm = 148;
  const timers: ReturnType<typeof setTimeout>[] = [];
  let beat: ReturnType<typeof setInterval> | null = null;
  const stateListeners = new Set<(s: HeartSensorState) => void>();
  const deviceListeners = new Set<(d: HeartSensorDevice) => void>();
  const heartListeners = new Set<(bpm: number, at: number) => void>();

  const bluetooth = (): HeartSensorState['bluetooth'] => (scenario === 'off' ? 'off' : scenario === 'denied' ? 'unauthorized' : 'on');
  const state = (): HeartSensorState => {
    const device = MOCK_DEVICES.find((d) => d.id === wantId);
    return {
      bluetooth: bluetooth(),
      scanning,
      connection: wantId == null || bluetooth() !== 'on' ? 'idle' : connected ? 'connected' : 'connecting',
      ...(device ? { deviceId: device.id, deviceName: device.name } : {}),
    };
  };
  const publish = () => stateListeners.forEach((fn) => fn(state()));
  const later = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));
  const stopBeat = () => {
    if (beat) clearInterval(beat);
    beat = null;
  };
  const tryConnect = () => {
    if (wantId == null || connected || bluetooth() !== 'on' || !reachable) return;
    later(800, () => {
      if (wantId == null || !reachable || bluetooth() !== 'on') return;
      connected = true;
      publish();
      stopBeat();
      // 센서는 1초마다 보낸다
      beat = setInterval(() => {
        bpm = Math.max(120, Math.min(178, bpm + Math.round((Math.random() - 0.45) * 4)));
        debug.bpm = bpm;
        heartListeners.forEach((fn) => fn(bpm, Date.now()));
      }, 1000);
    });
  };

  const debug: MockHeartDebug = {
    bpm,
    setScenario: (s) => {
      if (s === scenario) return;
      scenario = s;
      if (bluetooth() !== 'on') {
        connected = false;
        scanning = false;
        stopBeat();
      }
      publish();
      tryConnect();
    },
    drop: () => {
      connected = false;
      reachable = false;
      stopBeat();
      publish();
      later(4000, () => {
        reachable = true;
        tryConnect();
      });
    },
  };
  (globalThis as { __dallimoHeart?: MockHeartDebug }).__dallimoHeart = debug;

  return {
    supported: true,
    state,
    startScan: () => {
      if (bluetooth() !== 'on') {
        publish();
        return;
      }
      scanning = true;
      publish();
      if (scenario === 'empty') return;
      MOCK_DEVICES.forEach((d, i) => later(600 + i * 700, () => scanning && deviceListeners.forEach((fn) => fn(d))));
    },
    stopScan: () => {
      scanning = false;
      publish();
    },
    connect: (id) => {
      if (wantId !== id) {
        connected = false;
        stopBeat();
      }
      wantId = id;
      publish();
      tryConnect();
    },
    disconnect: () => {
      wantId = null;
      connected = false;
      stopBeat();
      timers.splice(0).forEach(clearTimeout);
      publish();
    },
    onState: (fn) => {
      stateListeners.add(fn);
      return () => stateListeners.delete(fn);
    },
    onDevice: (fn) => {
      deviceListeners.add(fn);
      return () => deviceListeners.delete(fn);
    },
    onHeartRate: (fn) => {
      heartListeners.add(fn);
      return () => heartListeners.delete(fn);
    },
  };
}

const noTransport: HeartSensorTransport = {
  supported: false,
  state: () => ({ bluetooth: 'unsupported', scanning: false, connection: 'idle' }),
  startScan: () => undefined,
  stopScan: () => undefined,
  connect: () => undefined,
  disconnect: () => undefined,
  onState: () => () => undefined,
  onDevice: () => () => undefined,
  onHeartRate: () => () => undefined,
};

/** 아이폰 개발 빌드면 CoreBluetooth, 개발 중 웹이면 가짜 센서, 그 밖(안드로이드 · 배포 웹)은 없음 */
export const heartSensor: HeartSensorTransport = nativeHeart ? nativeTransport(nativeHeart) : __DEV__ ? mockTransport() : noTransport;

export function setMockHeartScenario(s: MockHeartScenario) {
  (globalThis as { __dallimoHeart?: MockHeartDebug }).__dallimoHeart?.setScenario(s);
}
