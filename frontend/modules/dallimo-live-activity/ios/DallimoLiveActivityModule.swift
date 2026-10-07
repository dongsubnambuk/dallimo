import ActivityKit
import ExpoModulesCore
import Foundation

// 러닝 라이브 액티비티 (잠금 화면 · 다이내믹 아일랜드, 결정 로그 83항). 화면은 targets/live-activity 위젯이 그린다.
// 앱이 달리는 동안(백그라운드 위치로 깨어 있음) 몇 초마다 상태를 바꾼다. 시간은 위젯이 스스로 센다.
// 앱 쪽 경계는 src/shared/liveActivity/liveActivity.ts. 상태는 JSON 문자열로 받는다
public class DallimoLiveActivityModule: Module {
  public func definition() -> ModuleDefinition {
    Name("DallimoLiveActivity")

    // 이 기기 · 사용자 설정에서 라이브 액티비티를 쓸 수 있나 (iOS 16.2 이상, 설정 › 달리모 › 실시간 현황)
    Function("isEnabled") { () -> Bool in
      guard #available(iOS 16.2, *) else { return false }
      return ActivityAuthorizationInfo().areActivitiesEnabled
    }

    // 새로 시작한다. 남아 있던 러닝 라이브 액티비티는 먼저 끝낸다. 시작한 id (못 하면 nil)
    AsyncFunction("start") { (title: String, stateJson: String) -> String? in
      guard #available(iOS 16.2, *), let state = DallimoLiveActivityModule.decode(stateJson) else { return nil }
      for old in Activity<DallimoRunAttributes>.activities {
        await old.end(nil, dismissalPolicy: .immediate)
      }
      do {
        let activity = try Activity.request(
          attributes: DallimoRunAttributes(title: title),
          content: ActivityContent(state: state, staleDate: nil),
          pushType: nil
        )
        return activity.id
      } catch {
        return nil
      }
    }

    AsyncFunction("update") { (id: String, stateJson: String) in
      guard #available(iOS 16.2, *), let state = DallimoLiveActivityModule.decode(stateJson) else { return }
      guard let activity = Activity<DallimoRunAttributes>.activities.first(where: { $0.id == id }) else { return }
      await activity.update(ActivityContent(state: state, staleDate: nil))
    }

    // 마지막 상태(저장 요약)를 잠깐 보여 준 뒤 사라진다. stateJson이 비면 바로 지운다
    AsyncFunction("end") { (id: String, stateJson: String, dismissAfterSec: Double) in
      guard #available(iOS 16.2, *) else { return }
      guard let activity = Activity<DallimoRunAttributes>.activities.first(where: { $0.id == id }) else { return }
      if let state = DallimoLiveActivityModule.decode(stateJson) {
        await activity.end(ActivityContent(state: state, staleDate: nil), dismissalPolicy: .after(Date().addingTimeInterval(dismissAfterSec)))
      } else {
        await activity.end(nil, dismissalPolicy: .immediate)
      }
    }

    // 앱을 켤 때: 앱이 꺼지며 남은 라이브 액티비티를 지운다 (이어 달리기는 다시 시작한다)
    AsyncFunction("endAll") {
      guard #available(iOS 16.2, *) else { return }
      for activity in Activity<DallimoRunAttributes>.activities {
        await activity.end(nil, dismissalPolicy: .immediate)
      }
    }
  }

  @available(iOS 16.1, *)
  private static func decode(_ json: String) -> DallimoRunAttributes.ContentState? {
    guard let data = json.data(using: .utf8) else { return nil }
    return try? JSONDecoder().decode(DallimoRunAttributes.ContentState.self, from: data)
  }
}
