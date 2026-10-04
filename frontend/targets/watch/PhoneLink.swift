import Foundation
import WatchConnectivity
import WatchKit

// 휴대폰과 주고받기 (WatchConnectivity). 메시지 모양은 휴대폰 src/features/watch/watchMessages.ts와 같다 (v1).
// 휴대폰 → 워치: run(1초마다) · countdown · cue(햅틱) · end(저장 요약) · idle(러닝 없음)
// 워치 → 휴대폰: hello(켜짐, 지금 상태를 달라) · cmd(pause · resume · finish · next) · hr(심박)
//               · 워치 단독 기록 파일(transferFile, metadata t=watchRun, 결정 로그 81항)

struct RunState {
  let status: String
  let running: Bool
  let title: String
  let distanceKm: String
  let activeMs: Double
  let sentAt: Double
  let pace: String
  let notice: String?
  let noticeTone: String?
  let stripLabel: String?
  let stripValue: String?
  let stripTone: String?
  let manualStep: Bool
  let completed: Bool
  let saveLabel: String
  let canPause: Bool
  let canFinish: Bool
  let finishLabel: String

  init?(_ m: [String: Any]) {
    guard let status = m["status"] as? String, let title = m["title"] as? String else { return nil }
    self.status = status
    self.running = m["running"] as? Bool ?? false
    self.title = title
    self.distanceKm = m["distanceKm"] as? String ?? "0.00"
    self.activeMs = (m["activeMs"] as? NSNumber)?.doubleValue ?? 0
    self.sentAt = (m["sentAt"] as? NSNumber)?.doubleValue ?? Date().timeIntervalSince1970 * 1000
    self.pace = m["pace"] as? String ?? "--"
    self.notice = m["notice"] as? String
    self.noticeTone = m["noticeTone"] as? String
    self.stripLabel = m["stripLabel"] as? String
    self.stripValue = m["stripValue"] as? String
    self.stripTone = m["stripTone"] as? String
    self.manualStep = m["manualStep"] as? Bool ?? false
    self.completed = m["completed"] as? Bool ?? false
    self.saveLabel = m["saveLabel"] as? String ?? "기록 저장"
    self.canPause = m["canPause"] as? Bool ?? true
    self.canFinish = m["canFinish"] as? Bool ?? true
    self.finishLabel = m["finishLabel"] as? String ?? "끝내기"
  }

  var paused: Bool { status == "PAUSED" }

  /// 휴대폰이 보낸 뒤 흐른 시간을 더한다 (1초마다 새로 오지만 사이에도 초가 넘어가게)
  func elapsedSec(at date: Date) -> Int {
    let extra = running ? max(0, date.timeIntervalSince1970 * 1000 - sentAt) : 0
    return Int((activeMs + extra) / 1000)
  }
}

struct RunSummary {
  let title: String
  let distanceKm: String
  let time: String
  let pace: String
}

enum WatchScreen {
  case idle
  case countdown(title: String, count: Int)
  case run(RunState)
  case summary(RunSummary)
}

final class PhoneLink: NSObject, ObservableObject {
  static let shared = PhoneLink()
  static let protocolVersion = 1
  // 휴대폰이 남긴 마지막 상태가 이보다 오래됐으면 보여 주지 않는다
  private static let staleContextMs: Double = 6 * 3_600_000

  @Published private(set) var screen: WatchScreen = .idle
  @Published private(set) var reachable = false
  // 휴대폰에 조작을 보내지 못했을 때 잠깐 보여 준다
  @Published var commandError: String?

  private var lastHeartSent = Date.distantPast

  func activate() {
    guard WCSession.isSupported() else { return }
    let session = WCSession.default
    if session.delegate == nil { session.delegate = self }
    if session.activationState != .activated { session.activate() }
  }

  // MARK: 워치 → 휴대폰

  func send(command: String) {
    let session = WCSession.default
    guard session.activationState == .activated, session.isReachable else {
      fail()
      return
    }
    session.sendMessage(["t": "cmd", "cmd": command], replyHandler: { _ in }, errorHandler: { _ in
      DispatchQueue.main.async { self.fail() }
    })
  }

  // 5초에 한 번 (휴대폰 화면은 초마다 바뀔 필요가 없다)
  func sendHeartRate(_ bpm: Int) {
    let session = WCSession.default
    guard session.activationState == .activated, session.isReachable, Date().timeIntervalSince(lastHeartSent) >= 5 else { return }
    lastHeartSent = Date()
    session.sendMessage(["t": "hr", "bpm": bpm, "at": Date().timeIntervalSince1970 * 1000], replyHandler: nil, errorHandler: nil)
  }

  /// 워치 단독 기록을 휴대폰으로 보낸다. 휴대폰이 멀리 있어도 iOS가 쥐고 있다가 연결되면 보낸다 (이미 보내는 중인 파일은 건너뛴다)
  func sendPendingRuns() {
    guard WCSession.isSupported() else { return }
    let session = WCSession.default
    guard session.activationState == .activated else { return }
    let sending = Set(session.outstandingFileTransfers.compactMap { $0.file.metadata?["runUuid"] as? String })
    for run in WatchRecorder.shared.finishedRuns() where !sending.contains(run.id) {
      session.transferFile(run.url, metadata: ["t": "watchRun", "runUuid": run.id])
    }
  }

  private func hello() {
    let session = WCSession.default
    guard session.activationState == .activated, session.isReachable else { return }
    session.sendMessage(["t": "hello", "v": Self.protocolVersion], replyHandler: nil, errorHandler: nil)
  }

  private func fail() {
    commandError = "휴대폰과 연결이 끊겼어요"
    WKInterfaceDevice.current().play(.failure)
    DispatchQueue.main.asyncAfter(deadline: .now() + 3) { self.commandError = nil }
  }

  func dismissSummary() {
    screen = .idle
  }

  // MARK: 휴대폰 → 워치

  private func handle(_ m: [String: Any], fromContext: Bool) {
    guard let type = m["t"] as? String else { return }
    // 워치에서 시작해 혼자 기록하는 중이면 휴대폰 러닝 화면 · 운동 조작을 받지 않는다
    if WatchRecorder.shared.active { return }
    switch type {
    case "run":
      guard let state = RunState(m) else { return }
      if fromContext && Date().timeIntervalSince1970 * 1000 - state.sentAt > Self.staleContextMs { return }
      screen = .run(state)
      let workout = WorkoutManager.shared
      if !workout.active && !fromContext { workout.start() }
      if state.paused { workout.pause() } else { workout.resume() }
    case "countdown":
      guard !fromContext else { return }
      let count = (m["count"] as? NSNumber)?.intValue ?? 0
      screen = .countdown(title: m["title"] as? String ?? "", count: count)
      if !WorkoutManager.shared.active { WorkoutManager.shared.start() }
      WKInterfaceDevice.current().play(count > 0 ? .click : .start)
    case "cue":
      guard !fromContext, let kind = m["kind"] as? String else { return }
      Self.play(cue: kind)
    case "end":
      WorkoutManager.shared.end(save: true, runUuid: m["runUuid"] as? String)
      if fromContext, case .idle = screen { return }
      screen = .summary(RunSummary(
        title: m["title"] as? String ?? "",
        distanceKm: m["distanceKm"] as? String ?? "0.00",
        time: m["time"] as? String ?? "--",
        pace: m["pace"] as? String ?? "--"
      ))
    case "idle":
      WorkoutManager.shared.end(save: false, runUuid: nil)
      screen = .idle
    default:
      break
    }
  }

  // 휴대폰 햅틱과 같은 때 (src/shared/haptics.ts) + 1km마다
  private static func play(cue: String) {
    let type: WKHapticType
    switch cue {
    case "countdownTick", "runControl": type = .click
    case "runStart": type = .start
    case "warning": type = .failure
    case "intervalStep": type = .notification
    case "complete": type = .success
    case "split": type = .directionUp
    default: return
    }
    WKInterfaceDevice.current().play(type)
  }
}

extension PhoneLink: WCSessionDelegate {
  func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
    let context = session.receivedApplicationContext
    DispatchQueue.main.async {
      self.reachable = session.isReachable
      if !context.isEmpty { self.handle(context, fromContext: true) }
      self.hello()
      self.sendPendingRuns()
    }
  }

  // 휴대폰이 워치 단독 기록 파일을 받았다: 워치에서 지운다. 실패하면 다음에 다시 보낸다
  func session(_ session: WCSession, didFinish fileTransfer: WCSessionFileTransfer, error: Error?) {
    guard let id = fileTransfer.file.metadata?["runUuid"] as? String else { return }
    DispatchQueue.main.async {
      if error == nil {
        WatchRecorder.shared.remove(id)
      } else {
        DispatchQueue.main.asyncAfter(deadline: .now() + 30) { self.sendPendingRuns() }
      }
    }
  }

  func sessionReachabilityDidChange(_ session: WCSession) {
    DispatchQueue.main.async {
      self.reachable = session.isReachable
      if session.isReachable {
        self.hello()
        self.sendPendingRuns()
      }
    }
  }

  func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
    DispatchQueue.main.async { self.handle(message, fromContext: false) }
  }

  func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
    DispatchQueue.main.async { self.handle(applicationContext, fromContext: true) }
  }
}
