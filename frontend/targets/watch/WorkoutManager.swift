import Foundation
import HealthKit

// 워치 운동 세션: 앱을 앞에 붙잡아 두고(손목을 내려도 화면이 켜진 달리기 앱) 심박을 잰다.
// 기록(거리 · 경로 · 시간)은 휴대폰이 한다. 끝나면 건강 앱에 운동으로 남기고 DallimoClientRunUuid를 붙인다
// (휴대폰 "외부 기록 가져오기"가 달리모 기록을 다시 가져오지 않게, modules/dallimo-health).
final class WorkoutManager: NSObject, ObservableObject {
  static let shared = WorkoutManager()
  static let dallimoRunKey = "DallimoClientRunUuid"

  private let store = HKHealthStore()
  private var session: HKWorkoutSession?
  private var builder: HKLiveWorkoutBuilder?

  @Published private(set) var heartRate: Int?
  @Published private(set) var active = false

  var onHeartRate: ((Int) -> Void)?

  private static func runningConfiguration() -> HKWorkoutConfiguration {
    let configuration = HKWorkoutConfiguration()
    configuration.activityType = .running
    configuration.locationType = .outdoor
    return configuration
  }

  func start(configuration: HKWorkoutConfiguration? = nil) {
    guard HKHealthStore.isHealthDataAvailable() else { return }
    let config = configuration ?? Self.runningConfiguration()
    var read: Set<HKObjectType> = [HKObjectType.workoutType()]
    if let heart = HKObjectType.quantityType(forIdentifier: .heartRate) {
      read.insert(heart)
    }
    store.requestAuthorization(toShare: [HKObjectType.workoutType()], read: read) { _, _ in
      DispatchQueue.main.async { self.begin(config) }
    }
  }

  private func begin(_ configuration: HKWorkoutConfiguration) {
    guard session == nil else { return }
    do {
      let session = try HKWorkoutSession(healthStore: store, configuration: configuration)
      let builder = session.associatedWorkoutBuilder()
      builder.dataSource = HKLiveWorkoutDataSource(healthStore: store, workoutConfiguration: configuration)
      session.delegate = self
      builder.delegate = self
      self.session = session
      self.builder = builder
      let start = Date()
      session.startActivity(with: start)
      builder.beginCollection(withStart: start) { _, _ in }
      active = true
    } catch {
      self.session = nil
      self.builder = nil
    }
  }

  // 휴대폰이 일시정지 · 계속하면 워치 운동도 같이 (운동 시간이 휴대폰 기록과 맞게)
  func pause() {
    if session?.state == .running { session?.pause() }
  }

  func resume() {
    if session?.state == .paused { session?.resume() }
  }

  /// save: 휴대폰이 기록을 저장했으면 건강 앱에 운동으로 남긴다. 취소면 버린다
  func end(save: Bool, runUuid: String?) {
    guard let session = session, let builder = builder else { return }
    self.session = nil
    self.builder = nil
    active = false
    heartRate = nil
    session.end()
    builder.endCollection(withEnd: Date()) { _, _ in
      guard save else {
        builder.discardWorkout()
        return
      }
      let metadata: [String: Any] = runUuid.map { [WorkoutManager.dallimoRunKey: $0] } ?? [:]
      builder.addMetadata(metadata) { _, _ in
        builder.finishWorkout { _, _ in }
      }
    }
  }
}

extension WorkoutManager: HKWorkoutSessionDelegate {
  func workoutSession(_ workoutSession: HKWorkoutSession, didChangeTo toState: HKWorkoutSessionState, from fromState: HKWorkoutSessionState, date: Date) {}

  func workoutSession(_ workoutSession: HKWorkoutSession, didFailWithError error: Error) {
    DispatchQueue.main.async {
      self.session = nil
      self.builder = nil
      self.active = false
    }
  }
}

extension WorkoutManager: HKLiveWorkoutBuilderDelegate {
  func workoutBuilderDidCollectEvent(_ workoutBuilder: HKLiveWorkoutBuilder) {}

  func workoutBuilder(_ workoutBuilder: HKLiveWorkoutBuilder, didCollectDataOf collectedTypes: Set<HKSampleType>) {
    guard let heartType = HKQuantityType.quantityType(forIdentifier: .heartRate),
          collectedTypes.contains(heartType),
          let quantity = workoutBuilder.statistics(for: heartType)?.mostRecentQuantity() else { return }
    let bpm = Int(quantity.doubleValue(for: HKUnit.count().unitDivided(by: .minute())).rounded())
    DispatchQueue.main.async {
      self.heartRate = bpm
      self.onHeartRate?(bpm)
    }
  }
}
