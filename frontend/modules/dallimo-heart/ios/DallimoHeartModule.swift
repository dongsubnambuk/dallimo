import CoreBluetooth
import ExpoModulesCore

// 블루투스 심박 센서 (표준 Heart Rate Service 0x180D · Heart Rate Measurement 0x2A37).
// 심박 벨트, 심박수 브로드캐스트를 켠 워치(샤오미 · 가민 등)에서 달리는 동안 심박을 받는다 (결정 로그 80항).
// 블루투스 권한은 처음 찾기 · 연결할 때 묻는다 (앱을 켤 때 묻지 않게 관리자를 그때 만든다).
// 앱 쪽 경계는 src/shared/heart/heartSensorTransport.ts
public class DallimoHeartModule: Module {
  private var central: HeartCentral?

  private func ensureCentral() -> HeartCentral {
    if let central = central { return central }
    let created = HeartCentral { [weak self] name, body in
      self?.sendEvent(name, body)
    }
    central = created
    return created
  }

  public func definition() -> ModuleDefinition {
    Name("DallimoHeart")

    Events("onState", "onDevice", "onHeartRate")

    Function("getState") { () -> [String: Any] in
      self.central?.currentState() ?? HeartCentral.idleState()
    }

    // 주변 심박 센서를 찾는다. 찾은 센서는 onDevice로 하나씩 알린다
    Function("startScan") {
      self.ensureCentral().startScan()
    }

    Function("stopScan") {
      self.central?.stopScan()
    }

    // 이 센서에 연결한다. 범위 밖이면 들어올 때 연결되고, 끊기면 다시 연결한다
    Function("connect") { (id: String) in
      self.ensureCentral().connect(id)
    }

    Function("disconnect") {
      self.central?.disconnect()
    }
  }
}

final class HeartCentral: NSObject, CBCentralManagerDelegate, CBPeripheralDelegate {
  static let service = CBUUID(string: "180D")
  static let measurement = CBUUID(string: "2A37")

  private let queue = DispatchQueue(label: "com.dongseopseo.dallimo.heart")
  private let emit: (String, [String: Any]) -> Void
  private var manager: CBCentralManager!
  private var wantScan = false
  private var wantId: UUID?
  private var peripheral: CBPeripheral?
  private var connected = false
  private var seen: [UUID: CBPeripheral] = [:]

  init(emit: @escaping (String, [String: Any]) -> Void) {
    self.emit = emit
    super.init()
    // 블루투스가 꺼져 있어도 iOS 기본 알림창은 띄우지 않는다 (앱 화면에서 안내한다)
    manager = CBCentralManager(delegate: self, queue: queue, options: [CBCentralManagerOptionShowPowerAlertKey: false])
  }

  static func idleState() -> [String: Any] {
    let denied = CBManager.authorization == .denied || CBManager.authorization == .restricted
    return ["bluetooth": denied ? "unauthorized" : "unknown", "scanning": false, "connection": "idle"]
  }

  func currentState() -> [String: Any] {
    queue.sync { state() }
  }

  func startScan() {
    queue.async {
      self.wantScan = true
      self.scanIfReady()
      self.publish()
    }
  }

  func stopScan() {
    queue.async {
      self.wantScan = false
      if self.manager.isScanning { self.manager.stopScan() }
      self.publish()
    }
  }

  func connect(_ id: String) {
    queue.async {
      guard let uuid = UUID(uuidString: id) else { return }
      if let current = self.peripheral, current.identifier != uuid {
        self.manager.cancelPeripheralConnection(current)
        self.peripheral = nil
        self.connected = false
      }
      self.wantId = uuid
      self.connectIfReady()
      self.publish()
    }
  }

  func disconnect() {
    queue.async {
      self.wantId = nil
      if let current = self.peripheral { self.manager.cancelPeripheralConnection(current) }
      self.peripheral = nil
      self.connected = false
      self.publish()
    }
  }

  // ── 큐 안에서만 부른다 ──

  private func bluetooth() -> String {
    switch manager.state {
    case .poweredOn: return "on"
    case .poweredOff: return "off"
    case .unauthorized: return "unauthorized"
    case .unsupported: return "unsupported"
    default: return "unknown"
    }
  }

  private func state() -> [String: Any] {
    var out: [String: Any] = [
      "bluetooth": bluetooth(),
      "scanning": manager.isScanning,
      "connection": connected ? "connected" : (peripheral != nil ? "connecting" : "idle"),
    ]
    if let current = peripheral {
      out["deviceId"] = current.identifier.uuidString
      if let name = current.name { out["deviceName"] = name }
    }
    return out
  }

  private func publish() {
    emit("onState", state())
  }

  private func scanIfReady() {
    guard wantScan, manager.state == .poweredOn else { return }
    // 이미 휴대폰에 연결된 센서는 광고를 하지 않아 찾기에 나오지 않는다. 따로 알려 준다
    for known in manager.retrieveConnectedPeripherals(withServices: [Self.service]) {
      seen[known.identifier] = known
      emit("onDevice", device(known, name: nil, rssi: nil))
    }
    if !manager.isScanning {
      manager.scanForPeripherals(withServices: [Self.service], options: [CBCentralManagerScanOptionAllowDuplicatesKey: false])
    }
  }

  private func connectIfReady() {
    guard let id = wantId, peripheral == nil, manager.state == .poweredOn else { return }
    let found = seen[id]
      ?? manager.retrievePeripherals(withIdentifiers: [id]).first
      ?? manager.retrieveConnectedPeripherals(withServices: [Self.service]).first(where: { $0.identifier == id })
    guard let target = found else { return }
    peripheral = target
    target.delegate = self
    // iOS 연결 요청은 시간이 지나도 끝나지 않는다. 센서가 범위에 들어오면 연결된다
    manager.connect(target, options: nil)
  }

  private func device(_ p: CBPeripheral, name: String?, rssi: NSNumber?) -> [String: Any] {
    var out: [String: Any] = ["id": p.identifier.uuidString, "name": name ?? p.name ?? ""]
    if let rssi = rssi { out["rssi"] = rssi.intValue }
    return out
  }

  // ── CBCentralManagerDelegate ──

  func centralManagerDidUpdateState(_ central: CBCentralManager) {
    if central.state == .poweredOn {
      scanIfReady()
      connectIfReady()
    } else {
      // 블루투스가 꺼지면 연결이 모두 끊긴다. 다시 켜지면 원하는 센서에 다시 연결한다
      peripheral = nil
      connected = false
    }
    publish()
  }

  func centralManager(_ central: CBCentralManager, didDiscover peripheral: CBPeripheral, advertisementData: [String: Any], rssi RSSI: NSNumber) {
    seen[peripheral.identifier] = peripheral
    let name = advertisementData[CBAdvertisementDataLocalNameKey] as? String
    emit("onDevice", device(peripheral, name: name, rssi: RSSI))
  }

  func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) {
    // 다른 센서로 바꾸는 사이에 이전 센서가 연결됐으면 끊는다
    guard peripheral.identifier == wantId else {
      central.cancelPeripheralConnection(peripheral)
      return
    }
    connected = true
    peripheral.discoverServices([Self.service])
    publish()
  }

  func centralManager(_ central: CBCentralManager, didFailToConnect peripheral: CBPeripheral, error: Error?) {
    reconnect(peripheral)
  }

  func centralManager(_ central: CBCentralManager, didDisconnectPeripheral peripheral: CBPeripheral, error: Error?) {
    reconnect(peripheral)
  }

  private func reconnect(_ lost: CBPeripheral) {
    guard lost.identifier == wantId else { return }
    connected = false
    // 범위를 벗어났거나 센서가 잠깐 꺼졌다. 같은 센서에 다시 연결을 걸어 둔다
    manager.connect(lost, options: nil)
    publish()
  }

  // ── CBPeripheralDelegate ──

  func peripheral(_ peripheral: CBPeripheral, didDiscoverServices error: Error?) {
    for s in peripheral.services ?? [] where s.uuid == Self.service {
      peripheral.discoverCharacteristics([Self.measurement], for: s)
    }
  }

  func peripheral(_ peripheral: CBPeripheral, didDiscoverCharacteristicsFor service: CBService, error: Error?) {
    for c in service.characteristics ?? [] where c.uuid == Self.measurement {
      peripheral.setNotifyValue(true, for: c)
    }
  }

  func peripheral(_ peripheral: CBPeripheral, didUpdateValueFor characteristic: CBCharacteristic, error: Error?) {
    guard characteristic.uuid == Self.measurement, let data = characteristic.value, let bpm = Self.parse(data) else { return }
    emit("onHeartRate", ["bpm": bpm, "at": Date().timeIntervalSince1970 * 1000])
  }

  // Heart Rate Measurement: 첫 바이트 flags의 0번 비트가 1이면 심박이 2바이트(little endian), 0이면 1바이트
  static func parse(_ data: Data) -> Int? {
    let bytes = [UInt8](data)
    guard bytes.count >= 2 else { return nil }
    if bytes[0] & 0x01 == 0 { return Int(bytes[1]) }
    guard bytes.count >= 3 else { return nil }
    return Int(bytes[1]) | (Int(bytes[2]) << 8)
  }
}
