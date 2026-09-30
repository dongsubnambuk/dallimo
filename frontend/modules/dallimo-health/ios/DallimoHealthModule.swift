import CoreLocation
import ExpoModulesCore
import HealthKit

// 명세 122장 외부 러닝 기록 가져오기: Apple 건강(HealthKit)에 저장된 달리기 운동과 경로를 읽는다.
// 읽기만 한다 (쓰기는 Apple Watch 동반 앱 브랜치에서). 앱 쪽 경계는 src/shared/health/appleHealth.ts
public class DallimoHealthModule: Module {
  private let store = HKHealthStore()

  // 달리모가 워치로 함께 기록한 운동에 붙이는 메타데이터 키. 가져오기 후보에서 뺀다
  static let dallimoRunKey = "DallimoClientRunUuid"

  public func definition() -> ModuleDefinition {
    Name("DallimoHealth")

    // 이 기기에서 건강 데이터를 쓸 수 있는가 (iPad 일부 · 시뮬레이터는 아닐 수 있다)
    Function("isAvailable") { () -> Bool in
      HKHealthStore.isHealthDataAvailable()
    }

    // 읽기 권한을 묻는다. HealthKit은 읽기 허용 여부를 앱에 알려 주지 않으므로 창을 띄웠는지만 돌려준다
    AsyncFunction("requestAuthorization") { (promise: Promise) in
      guard HKHealthStore.isHealthDataAvailable() else {
        promise.resolve(false)
        return
      }
      var read: Set<HKObjectType> = [HKObjectType.workoutType(), HKSeriesType.workoutRoute()]
      if let distance = HKObjectType.quantityType(forIdentifier: .distanceWalkingRunning) {
        read.insert(distance)
      }
      self.store.requestAuthorization(toShare: nil, read: read) { success, error in
        if let error = error {
          promise.reject("E_HEALTH_AUTH", error.localizedDescription)
          return
        }
        promise.resolve(success)
      }
    }

    // sinceMs 이후에 시작한 달리기 운동 (최근 먼저, limit개까지)
    AsyncFunction("getRunningWorkouts") { (sinceMs: Double, limit: Int, promise: Promise) in
      let since = Date(timeIntervalSince1970: sinceMs / 1000)
      let predicate = NSCompoundPredicate(andPredicateWithSubpredicates: [
        HKQuery.predicateForWorkouts(with: .running),
        HKQuery.predicateForSamples(withStart: since, end: nil, options: .strictStartDate),
      ])
      let sort = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)
      let query = HKSampleQuery(sampleType: HKObjectType.workoutType(), predicate: predicate, limit: max(1, limit), sortDescriptors: [sort]) { _, samples, error in
        if let error = error {
          promise.reject("E_HEALTH_QUERY", error.localizedDescription)
          return
        }
        let workouts = (samples as? [HKWorkout]) ?? []
        promise.resolve(workouts.map { DallimoHealthModule.describe($0) })
      }
      self.store.execute(query)
    }

    // 운동 하나의 경로 (시각 순). 경로가 없으면(실내) 빈 목록
    AsyncFunction("getWorkoutRoute") { (workoutId: String, promise: Promise) in
      guard let uuid = UUID(uuidString: workoutId) else {
        promise.reject("E_HEALTH_ID", "운동 id가 올바르지 않아요")
        return
      }
      let workoutQuery = HKSampleQuery(sampleType: HKObjectType.workoutType(), predicate: HKQuery.predicateForObject(with: uuid), limit: 1, sortDescriptors: nil) { _, samples, error in
        if let error = error {
          promise.reject("E_HEALTH_QUERY", error.localizedDescription)
          return
        }
        guard let workout = samples?.first as? HKWorkout else {
          promise.reject("E_HEALTH_NOT_FOUND", "운동을 찾을 수 없어요")
          return
        }
        self.readRoute(of: workout, promise: promise)
      }
      self.store.execute(workoutQuery)
    }
  }

  private func readRoute(of workout: HKWorkout, promise: Promise) {
    let routeQuery = HKSampleQuery(sampleType: HKSeriesType.workoutRoute(), predicate: HKQuery.predicateForObjects(from: workout), limit: HKObjectQueryNoLimit, sortDescriptors: nil) { _, samples, error in
      if let error = error {
        promise.reject("E_HEALTH_QUERY", error.localizedDescription)
        return
      }
      let routes = (samples as? [HKWorkoutRoute]) ?? []
      if routes.isEmpty {
        promise.resolve([[String: Any]]())
        return
      }
      var points: [[String: Any]] = []
      var failure: Error?
      let lock = NSLock()
      let group = DispatchGroup()
      for route in routes {
        group.enter()
        // 경로 point는 여러 번에 나눠 온다. done이면 이 경로는 끝
        let query = HKWorkoutRouteQuery(route: route) { _, locations, done, error in
          lock.lock()
          if let locations = locations {
            points.append(contentsOf: locations.map { DallimoHealthModule.describe($0) })
          }
          if let error = error { failure = error }
          lock.unlock()
          if done || error != nil { group.leave() }
        }
        self.store.execute(query)
      }
      group.notify(queue: DispatchQueue.global(qos: .userInitiated)) {
        if let failure = failure, points.isEmpty {
          promise.reject("E_HEALTH_ROUTE", failure.localizedDescription)
          return
        }
        points.sort { ($0["timestampMs"] as? Double ?? 0) < ($1["timestampMs"] as? Double ?? 0) }
        promise.resolve(points)
      }
    }
    store.execute(routeQuery)
  }

  static func describe(_ w: HKWorkout) -> [String: Any] {
    var out: [String: Any] = [
      "id": w.uuid.uuidString,
      "startMs": w.startDate.timeIntervalSince1970 * 1000,
      "endMs": w.endDate.timeIntervalSince1970 * 1000,
      // 일시정지를 뺀 운동 시간
      "durationSec": w.duration,
      "sourceName": w.sourceRevision.source.name,
      "bundleId": w.sourceRevision.source.bundleIdentifier,
      "indoor": (w.metadata?[HKMetadataKeyIndoorWorkout] as? NSNumber)?.boolValue ?? false,
    ]
    if let distance = distanceMeters(of: w) { out["distanceM"] = distance }
    if let device = w.device?.name ?? w.device?.model { out["deviceName"] = device }
    if let runUuid = w.metadata?[dallimoRunKey] as? String { out["dallimoRunUuid"] = runUuid }
    return out
  }

  private static func distanceMeters(of w: HKWorkout) -> Double? {
    if #available(iOS 16.0, *),
       let type = HKQuantityType.quantityType(forIdentifier: .distanceWalkingRunning),
       let sum = w.statistics(for: type)?.sumQuantity() {
      return sum.doubleValue(for: .meter())
    }
    return w.totalDistance?.doubleValue(for: .meter())
  }

  static func describe(_ l: CLLocation) -> [String: Any] {
    var out: [String: Any] = [
      "latitude": l.coordinate.latitude,
      "longitude": l.coordinate.longitude,
      "altitude": l.altitude,
      "horizontalAccuracy": l.horizontalAccuracy,
      "timestampMs": l.timestamp.timeIntervalSince1970 * 1000,
    ]
    if l.speed >= 0 { out["speed"] = l.speed }
    return out
  }
}
