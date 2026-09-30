import ExpoModulesCore
import HealthKit
import WatchConnectivity

// WATCH-001~004: 휴대폰이 기록하고 Apple Watch 달리모 앱(targets/watch)은 보여 주기 · 조작 · 심박을 맡는다.
// 휴대폰 → 워치: 러닝 상태(1초마다) · 카운트다운 · 햅틱 · 저장 요약. 워치 → 휴대폰: 일시정지 · 계속 · 끝내기 · 다음 구간 · 심박.
// 앱 쪽 경계는 src/shared/watch/watchTransport.ts
public class DallimoWatchModule: Module {
  private let store = HKHealthStore()
  private var bridge: WatchSessionBridge?

  public func definition() -> ModuleDefinition {
    Name("DallimoWatch")

    Events("onMessage", "onState")

    OnCreate {
      guard WCSession.isSupported() else { return }
      let bridge = WatchSessionBridge(
        onMessage: { [weak self] message in self?.sendEvent("onMessage", message) },
        onState: { [weak self] state in self?.sendEvent("onState", state) }
      )
      self.bridge = bridge
      WCSession.default.delegate = bridge
      WCSession.default.activate()
    }

    // 페어링 · 워치 앱 설치 · 지금 바로 주고받을 수 있는지
    Function("getState") { () -> [String: Any] in
      WatchSessionBridge.state()
    }

    // 워치 앱을 켠다. 워치 앱은 WKApplicationDelegate.handle(_:)로 운동 설정을 받아 운동 세션을 시작한다
    AsyncFunction("startWatchApp") { (promise: Promise) in
      guard WCSession.isSupported(), HKHealthStore.isHealthDataAvailable() else {
        promise.resolve(false)
        return
      }
      let session = WCSession.default
      guard session.activationState == .activated, session.isPaired, session.isWatchAppInstalled else {
        promise.resolve(false)
        return
      }
      let configuration = HKWorkoutConfiguration()
      configuration.activityType = .running
      configuration.locationType = .outdoor
      self.store.startWatchApp(with: configuration) { success, _ in
        promise.resolve(success)
      }
    }

    // 바로 보낸다. 워치 앱이 꺼져 있으면(바로 연결 안 됨) 버린다
    Function("sendMessage") { (message: [String: Any]) in
      guard WCSession.isSupported() else { return }
      let session = WCSession.default
      guard session.activationState == .activated, session.isReachable else { return }
      session.sendMessage(message, replyHandler: nil, errorHandler: nil)
    }

    // 마지막 상태를 남긴다. 워치 앱이 나중에 켜지면 이 값부터 받는다
    Function("updateContext") { (context: [String: Any]) in
      guard WCSession.isSupported() else { return }
      let session = WCSession.default
      guard session.activationState == .activated, session.isPaired, session.isWatchAppInstalled else { return }
      try? session.updateApplicationContext(context)
    }
  }
}

final class WatchSessionBridge: NSObject, WCSessionDelegate {
  private let onMessage: ([String: Any]) -> Void
  private let onState: ([String: Any]) -> Void

  init(onMessage: @escaping ([String: Any]) -> Void, onState: @escaping ([String: Any]) -> Void) {
    self.onMessage = onMessage
    self.onState = onState
  }

  static func state() -> [String: Any] {
    guard WCSession.isSupported() else {
      return ["supported": false, "paired": false, "installed": false, "reachable": false]
    }
    let session = WCSession.default
    let active = session.activationState == .activated
    return [
      "supported": true,
      "paired": active && session.isPaired,
      "installed": active && session.isWatchAppInstalled,
      "reachable": active && session.isReachable,
    ]
  }

  func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
    onState(Self.state())
  }

  func sessionDidBecomeInactive(_ session: WCSession) {}

  // 다른 워치로 바꾸면 새 워치와 다시 연결한다
  func sessionDidDeactivate(_ session: WCSession) {
    session.activate()
  }

  func sessionWatchStateDidChange(_ session: WCSession) {
    onState(Self.state())
  }

  func sessionReachabilityDidChange(_ session: WCSession) {
    onState(Self.state())
  }

  func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
    onMessage(message)
  }

  // 워치의 조작은 받았다는 답을 기다린다 (연결이 끊겼으면 워치가 알려 준다)
  func session(_ session: WCSession, didReceiveMessage message: [String: Any], replyHandler: @escaping ([String: Any]) -> Void) {
    onMessage(message)
    replyHandler(["ok": true])
  }
}
