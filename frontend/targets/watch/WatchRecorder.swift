import CoreLocation
import Foundation
import WatchKit

// 워치 단독 기록 (결정 로그 81항). 휴대폰 없이 워치 GPS로 자유 달리기를 기록한다.
// 끝나면 파일(Documents/watch-runs/{runUuid}.json)로 남기고 휴대폰으로 보낸다(WatchConnectivity transferFile).
// 휴대폰이 멀리 있거나 꺼져 있어도 iOS가 보내기를 쥐고 있다가 다시 연결되면 보낸다. 휴대폰이 받으면 여기서 지운다.
// 휴대폰은 받은 파일을 휴대폰으로 달린 기록과 같은 달리모 기록으로 서버에 올린다 (src/features/watch/watchRunImport.ts).
//
// 위치 품질 판정은 휴대폰 recorder(src/features/run/engine/recorder.ts)와 같다: 정확도 20m 초과는 LOW_ACCURACY,
// 직전 정상 위치에서 초속 12m를 넘게 튀면 JUMP(3번 이어지면 새 위치를 기준으로 다시 잡는다). 거리는 OK 위치만 잇는다.

struct WatchRunFile: Codable {
  var v = 1
  var runUuid: String
  var mode = "FREE"
  var startedAt: Double
  var endedAt: Double?
  // [시작, 끝] epoch ms. 지금 달리는 구간은 끝을 넣지 않고 openSince에 둔다
  var segments: [[Double]]
  var openSince: Double?
  // [위도, 경도, 고도, 정확도, 속도, 시각, 품질(0 OK · 1 LOW_ACCURACY · 2 JUMP)]
  var points: [[Double?]]
  // [시각, bpm]
  var heart: [[Double]]
}

struct WatchRunSummary {
  let distanceKm: String
  let time: String
  let pace: String
  // 너무 짧아 남기지 않았다
  let discarded: Bool
}

enum RecorderPhase: Equatable {
  case idle
  case countdown(Int)
  case running
  case paused
  case saved
}

final class WatchRecorder: NSObject, ObservableObject {
  static let shared = WatchRecorder()

  // 휴대폰 recorder · RunPolicy와 같은 값
  private static let requiredAccuracyM = 20.0
  private static let maxSpeedMps = 12.0
  private static let jumpReanchorCount = 3
  private static let minPaceSampleM = 50.0
  // 심박은 5초에 하나 (휴대폰으로 보내는 간격과 같다)
  private static let heartEveryMs = 5_000.0
  // 이만큼 쌓이면 파일에 쓴다 (워치 앱이 갑자기 꺼져도 남게)
  private static let flushEvery = 20

  @Published private(set) var phase: RecorderPhase = .idle
  @Published private(set) var distanceM = 0.0
  @Published private(set) var gpsWeak = true
  @Published private(set) var locationDenied = false
  @Published private(set) var summary: WatchRunSummary?
  // 아직 휴대폰이 받지 않은 기록 수
  @Published private(set) var pendingCount = 0

  private let manager = CLLocationManager()
  private var file: WatchRunFile?
  private var lastAccepted: CLLocation?
  private var jumpStreak = 0
  private var lastHeartAt = 0.0
  private var unsaved = 0
  private var countdownTimer: Timer?

  var active: Bool { phase != .idle && phase != .saved }

  override init() {
    super.init()
    manager.delegate = self
    manager.desiredAccuracy = kCLLocationAccuracyBest
    manager.distanceFilter = kCLDistanceFilterNone
    manager.activityType = .fitness
    locationDenied = Self.denied(manager.authorizationStatus)
  }

  private static func denied(_ status: CLAuthorizationStatus) -> Bool {
    status == .denied || status == .restricted
  }

  private static func now() -> Double { Date().timeIntervalSince1970 * 1000 }

  // MARK: 시작 · 일시정지 · 끝내기

  /// 워치에서 "달리기 시작": 운동 세션과 GPS를 먼저 켜고(위치를 잡는 동안) 3 · 2 · 1 뒤에 기록한다
  func start() {
    guard !active else { return }
    if Self.denied(manager.authorizationStatus) {
      locationDenied = true
      return
    }
    if manager.authorizationStatus == .notDetermined { manager.requestWhenInUseAuthorization() }
    summary = nil
    distanceM = 0
    gpsWeak = true
    lastAccepted = nil
    jumpStreak = 0
    WorkoutManager.shared.start(standalone: true)
    manager.allowsBackgroundLocationUpdates = true
    manager.startUpdatingLocation()
    phase = .countdown(3)
    WKInterfaceDevice.current().play(.click)
    countdownTimer?.invalidate()
    countdownTimer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] timer in
      guard let self = self, case let .countdown(n) = self.phase else {
        timer.invalidate()
        return
      }
      if n > 1 {
        self.phase = .countdown(n - 1)
        WKInterfaceDevice.current().play(.click)
      } else {
        timer.invalidate()
        self.begin()
      }
    }
  }

  /// 카운트다운 중 취소: 아무것도 남기지 않는다
  func cancelCountdown() {
    guard case .countdown = phase else { return }
    countdownTimer?.invalidate()
    manager.stopUpdatingLocation()
    WorkoutManager.shared.end(save: false, runUuid: nil)
    phase = .idle
  }

  private func begin() {
    let at = Self.now()
    file = WatchRunFile(runUuid: UUID().uuidString.lowercased(), startedAt: at, segments: [], openSince: at, points: [], heart: [])
    phase = .running
    WKInterfaceDevice.current().play(.start)
    flush()
  }

  func pause() {
    guard phase == .running, var f = file, let since = f.openSince else { return }
    let at = Self.now()
    f.segments.append([since, max(since, at)])
    f.openSince = nil
    file = f
    // 멈춘 동안 움직인 거리를 잇지 않는다
    lastAccepted = nil
    phase = .paused
    WorkoutManager.shared.pause()
    WKInterfaceDevice.current().play(.stop)
    flush()
  }

  func resume() {
    guard phase == .paused, var f = file else { return }
    f.openSince = Self.now()
    file = f
    phase = .running
    WorkoutManager.shared.resume()
    WKInterfaceDevice.current().play(.start)
    flush()
  }

  func finish() {
    guard phase == .running || phase == .paused, var f = file else { return }
    let at = Self.now()
    if let since = f.openSince {
      f.segments.append([since, max(since, at)])
      f.openSince = nil
    }
    f.endedAt = at
    file = nil
    manager.stopUpdatingLocation()
    manager.allowsBackgroundLocationUpdates = false

    let activeMs = f.segments.reduce(0.0) { $0 + max(0, $1[1] - $1[0]) }
    // 위치를 두 번도 못 받았으면 기록으로 남기지 않는다 (잘못 눌러 바로 끝낸 경우)
    let discarded = f.points.count < 2
    if discarded {
      remove(f.runUuid)
      WorkoutManager.shared.end(save: false, runUuid: nil)
    } else {
      write(f)
      WorkoutManager.shared.end(save: true, runUuid: f.runUuid)
      PhoneLink.shared.sendPendingRuns()
    }
    summary = WatchRunSummary(
      distanceKm: String(format: "%.2f", floor(distanceM / 10) / 100),
      time: formatElapsed(Int(activeMs / 1000)),
      pace: Self.pace(distanceM: distanceM, activeMs: activeMs),
      discarded: discarded
    )
    phase = .saved
    WKInterfaceDevice.current().play(.success)
    refreshPending()
  }

  func dismissSummary() {
    summary = nil
    phase = .idle
  }

  func heartRate(_ bpm: Int) {
    guard phase == .running, var f = file else { return }
    let at = Self.now()
    guard at - lastHeartAt >= Self.heartEveryMs else { return }
    lastHeartAt = at
    f.heart.append([at, Double(bpm)])
    file = f
  }

  // MARK: 화면 값

  func activeMs(at date: Date) -> Double {
    guard let f = file else { return 0 }
    let closed = f.segments.reduce(0.0) { $0 + max(0, $1[1] - $1[0]) }
    let open = f.openSince.map { max(0, date.timeIntervalSince1970 * 1000 - $0) } ?? 0
    return closed + open
  }

  var distanceKm: String { String(format: "%.2f", floor(distanceM / 10) / 100) }

  func avgPace(at date: Date) -> String {
    Self.pace(distanceM: distanceM, activeMs: activeMs(at: date))
  }

  private static func pace(distanceM: Double, activeMs: Double) -> String {
    guard distanceM >= minPaceSampleM, activeMs > 0 else { return "--" }
    let sec = Int((activeMs / 1000) / (distanceM / 1000))
    return String(format: "%d'%02d\"", sec / 60, sec % 60)
  }

  // MARK: 파일

  private static var directory: URL? {
    guard let base = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first else { return nil }
    let dir = base.appendingPathComponent("watch-runs", isDirectory: true)
    try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
    return dir
  }

  static func url(_ runUuid: String) -> URL? {
    directory?.appendingPathComponent("\(runUuid).json")
  }

  private func flush() {
    guard let f = file else { return }
    unsaved = 0
    write(f)
  }

  private func write(_ f: WatchRunFile) {
    guard let url = Self.url(f.runUuid), let data = try? JSONEncoder().encode(f) else { return }
    try? data.write(to: url, options: .atomic)
  }

  func remove(_ runUuid: String) {
    guard let url = Self.url(runUuid) else { return }
    try? FileManager.default.removeItem(at: url)
    refreshPending()
  }

  /// 휴대폰으로 보낼 끝난 기록 파일
  func finishedRuns() -> [(id: String, url: URL)] {
    guard let dir = Self.directory,
          let urls = try? FileManager.default.contentsOfDirectory(at: dir, includingPropertiesForKeys: nil) else { return [] }
    return urls.filter { $0.pathExtension == "json" }.compactMap { url -> (id: String, url: URL)? in
      let id = url.deletingPathExtension().lastPathComponent
      if id == file?.runUuid { return nil }
      return (id, url)
    }
  }

  func refreshPending() {
    pendingCount = finishedRuns().count
  }

  /// 앱을 켤 때: 끝내지 못하고 꺼진 기록(앱이 갑자기 꺼짐)을 마지막 위치 시각으로 끝낸다
  func recoverInterrupted() {
    guard let dir = Self.directory,
          let urls = try? FileManager.default.contentsOfDirectory(at: dir, includingPropertiesForKeys: nil) else { return }
    for url in urls where url.pathExtension == "json" {
      guard let data = try? Data(contentsOf: url), var f = try? JSONDecoder().decode(WatchRunFile.self, from: data), f.endedAt == nil else { continue }
      let last = f.points.last.flatMap { $0[5] } ?? f.segments.last?[1] ?? f.startedAt
      if let since = f.openSince {
        f.segments.append([since, max(since, last)])
        f.openSince = nil
      }
      f.endedAt = max(f.startedAt, last)
      if f.points.count < 2 {
        try? FileManager.default.removeItem(at: url)
      } else {
        write(f)
      }
    }
    refreshPending()
  }

  // MARK: 위치

  private func classify(_ l: CLLocation) -> Int {
    if l.horizontalAccuracy < 0 || l.horizontalAccuracy > Self.requiredAccuracyM { return 1 }
    if let last = lastAccepted, jumpStreak < Self.jumpReanchorCount {
      // 1초보다 짧은 간격은 1초로 본다
      let sec = max(1, l.timestamp.timeIntervalSince(last.timestamp))
      if l.distance(from: last) / sec > Self.maxSpeedMps {
        jumpStreak += 1
        return 2
      }
    }
    jumpStreak = 0
    return 0
  }

  private func record(_ l: CLLocation) {
    guard phase == .running, var f = file, let since = f.openSince else { return }
    let at = l.timestamp.timeIntervalSince1970 * 1000
    // 시작 · 재개 전 위치, 이미 받은 시각은 넣지 않는다
    guard at >= since, at > (f.points.last.flatMap { $0[5] } ?? 0) else { return }
    let q = classify(l)
    if q == 0 {
      if let last = lastAccepted { distanceM += l.distance(from: last) }
      lastAccepted = l
      WorkoutManager.shared.addRoute(l)
    } else if q == 1 {
      // 정확도가 낮은 위치는 다음 좋은 위치와도 잇지 않는다 (휴대폰 거리 계산과 같게)
      lastAccepted = nil
    }
    f.points.append([
      l.coordinate.latitude,
      l.coordinate.longitude,
      l.verticalAccuracy >= 0 ? l.altitude : nil,
      l.horizontalAccuracy >= 0 ? l.horizontalAccuracy : nil,
      l.speed >= 0 ? l.speed : nil,
      at,
      Double(q),
    ])
    file = f
    unsaved += 1
    if unsaved >= Self.flushEvery { flush() }
  }
}

extension WatchRecorder: CLLocationManagerDelegate {
  func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
    DispatchQueue.main.async {
      for l in locations.sorted(by: { $0.timestamp < $1.timestamp }) {
        self.gpsWeak = l.horizontalAccuracy < 0 || l.horizontalAccuracy > Self.requiredAccuracyM
        self.record(l)
      }
    }
  }

  func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
    let status = manager.authorizationStatus
    DispatchQueue.main.async {
      self.locationDenied = Self.denied(status)
      // 카운트다운 중에 거부하면 시작하지 않는다
      if self.locationDenied, case .countdown = self.phase { self.cancelCountdown() }
    }
  }

  func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {}
}
