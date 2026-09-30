import HealthKit
import SwiftUI
import WatchKit

// WATCH-001~004 달리모 워치 앱. 휴대폰이 GPS로 기록하고, 워치는 휴대폰이 보낸 상태를 보여 주고 조작 · 심박을 휴대폰으로 보낸다.
// 휴대폰에서 달리기를 시작하면 HealthKit startWatchApp으로 이 앱이 켜지고 운동 세션이 시작된다 (손목을 내려도 앱이 앞에 남는다).
@main
struct DallimoWatchApp: App {
  @WKApplicationDelegateAdaptor(WatchAppDelegate.self) private var delegate

  var body: some Scene {
    WindowGroup {
      RootView()
        .environmentObject(PhoneLink.shared)
        .environmentObject(WorkoutManager.shared)
    }
  }
}

final class WatchAppDelegate: NSObject, WKApplicationDelegate {
  func applicationDidFinishLaunching() {
    PhoneLink.shared.activate()
    WorkoutManager.shared.onHeartRate = { bpm in PhoneLink.shared.sendHeartRate(bpm) }
  }

  // 휴대폰 startWatchApp: 운동 세션을 시작한다
  func handle(_ workoutConfiguration: HKWorkoutConfiguration) {
    PhoneLink.shared.activate()
    WorkoutManager.shared.start(configuration: workoutConfiguration)
  }
}
