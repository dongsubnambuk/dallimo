import ActivityKit
import Foundation

// 러닝 라이브 액티비티 데이터 (결정 로그 83항).
// 같은 정의가 targets/live-activity/DallimoRunAttributes.swift(위젯)에도 있다. 둘을 함께 바꾼다 (ActivityKit은 타입 이름 · 모양으로 맞춘다).
// 값은 휴대폰 src/shared/liveActivity/liveActivity.ts가 JSON으로 보낸다
@available(iOS 16.1, *)
struct DallimoRunAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    // running · paused · finished
    var status: String
    var distanceKm: String
    // 평균 페이스 · 현재 페이스(최근 구간). 예: 5'22"
    var pace: String
    var currentPace: String
    // 지금까지 달린 시간(초). 달리는 중이면 timerStart부터 위젯이 스스로 센다
    var elapsedSec: Double
    // 달리는 중일 때 "시간 0"이 되는 시각(epoch 초). 일시정지 · 끝이면 nil
    var timerStart: Double?
    // 모드별 한 줄 (목표 차이 · 코스 진행 · 인터벌 구간 · 함께 달리기 순위)
    var stripLabel: String?
    var stripValue: String?
    // accent · warning · neutral
    var stripTone: String?
    // 함께 달리기 참가자 (순위 순서, 최대 5명). 혼자 달리면 비어 있다
    var people: [DallimoRunPerson]
  }

  // 러닝 제목. 예: "자유 달리기", "수성못 둘레길 · PB 어택", "5km 레이스"
  var title: String
}

struct DallimoRunPerson: Codable, Hashable {
  var name: String
  var distanceKm: String
  // 목표 거리 대비 0~1. 거리 목표가 없으면 -1
  var progress: Double
  var me: Bool
  // running · finished · dnf · away
  var status: String
}
