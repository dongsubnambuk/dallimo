import ActivityKit
import SwiftUI
import WidgetKit

// 잠금 화면 · 다이내믹 아일랜드 (결정 로그 83항). 1초 안에 읽히게 거리 · 시간 · 페이스 + 모드별 한 줄 (CLAUDE.md 6항).
// 함께 달리기면 참가자 진행 막대를 함께 보여 준다 (위치는 보내지 않는다). 색만으로 구분하지 않도록 글자를 함께 쓴다.

extension Color {
  // 달리모 signal 민트 (src/design/tokens/color.ts)
  static let dallimoMint = Color(red: 0x2B / 255, green: 0xF0 / 255, blue: 0xC0 / 255)
  static let dallimoWarning = Color(red: 0xD9 / 255, green: 0x95 / 255, blue: 0x00 / 255)
}

private func toneColor(_ tone: String?) -> Color {
  switch tone {
  case "accent": return .dallimoMint
  case "warning": return .dallimoWarning
  default: return .white.opacity(0.75)
  }
}

private func formatElapsed(_ total: Int) -> String {
  let h = total / 3600
  let m = (total % 3600) / 60
  let s = total % 60
  return h > 0 ? String(format: "%d:%02d:%02d", h, m, s) : String(format: "%d:%02d", m, s)
}

/// 달리는 중이면 위젯이 스스로 세는 타이머, 멈췄으면 고정된 시간
struct RunTime: View {
  let state: DallimoRunAttributes.ContentState

  var body: some View {
    if let start = state.timerStart, state.status == "running" {
      Text(Date(timeIntervalSince1970: start), style: .timer)
        .monospacedDigit()
    } else {
      Text(formatElapsed(Int(state.elapsedSec)))
        .monospacedDigit()
    }
  }
}

private func statusLabel(_ state: DallimoRunAttributes.ContentState) -> (String, Color) {
  switch state.status {
  case "paused": return ("일시정지", .dallimoWarning)
  case "finished": return ("기록 저장", .dallimoMint)
  default: return ("기록 중", .dallimoMint)
  }
}

struct PeopleBars: View {
  let people: [DallimoRunPerson]

  private func trailing(_ p: DallimoRunPerson) -> String {
    switch p.status {
    case "finished": return "완주"
    case "dnf": return "포기"
    case "away": return "끊김"
    default: return "\(p.distanceKm)km"
    }
  }

  var body: some View {
    VStack(spacing: 4) {
      ForEach(Array(people.prefix(4).enumerated()), id: \.offset) { index, p in
        HStack(spacing: 6) {
          Text("\(index + 1)")
            .font(.caption2.weight(.bold).monospacedDigit())
            .foregroundStyle(p.me ? Color.dallimoMint : .white.opacity(0.6))
            .frame(width: 12, alignment: .leading)
          Text(p.name)
            .font(.caption.weight(p.me ? .bold : .regular))
            .lineLimit(1)
            .frame(width: 56, alignment: .leading)
          if p.progress >= 0 {
            GeometryReader { geo in
              ZStack(alignment: .leading) {
                Capsule().fill(Color.white.opacity(0.15))
                Capsule()
                  .fill(p.me ? Color.dallimoMint : Color.white.opacity(0.7))
                  .frame(width: max(4, geo.size.width * p.progress))
              }
            }
            .frame(height: 5)
          } else {
            Spacer(minLength: 0)
          }
          Text(trailing(p))
            .font(.caption.monospacedDigit())
            .foregroundStyle(p.status == "running" ? Color.white : .white.opacity(0.6))
            .frame(width: 52, alignment: .trailing)
        }
        .accessibilityElement(children: .combine)
      }
    }
  }
}

struct LockScreenView: View {
  let context: ActivityViewContext<DallimoRunAttributes>

  var body: some View {
    let state = context.state
    let status = statusLabel(state)
    VStack(alignment: .leading, spacing: 8) {
      HStack {
        Text("달리모")
          .font(.caption.weight(.heavy))
          .foregroundStyle(Color.dallimoMint)
        Text(context.attributes.title)
          .font(.caption)
          .foregroundStyle(.white.opacity(0.7))
          .lineLimit(1)
        Spacer()
        Text(status.0)
          .font(.caption.weight(.semibold))
          .foregroundStyle(status.1)
      }
      HStack(alignment: .firstTextBaseline, spacing: 14) {
        HStack(alignment: .firstTextBaseline, spacing: 2) {
          Text(state.distanceKm)
            .font(.system(size: 34, weight: .heavy, design: .rounded).monospacedDigit())
          Text("km").font(.caption).foregroundStyle(.white.opacity(0.7))
        }
        RunTime(state: state)
          .font(.system(size: 22, weight: .semibold, design: .rounded))
        VStack(alignment: .leading, spacing: 0) {
          Text("\(state.pace)/km")
            .font(.system(size: 17, weight: .medium, design: .rounded).monospacedDigit())
            .foregroundStyle(.white.opacity(0.85))
          Text("현재 \(state.currentPace)")
            .font(.caption2.monospacedDigit())
            .foregroundStyle(.white.opacity(0.6))
        }
      }
      if !state.people.isEmpty {
        PeopleBars(people: state.people)
      } else if let label = state.stripLabel, let value = state.stripValue {
        HStack {
          Text(label).font(.caption).foregroundStyle(.white.opacity(0.7))
          Spacer()
          Text(value).font(.caption.weight(.semibold)).foregroundStyle(toneColor(state.stripTone))
        }
      }
    }
    .foregroundStyle(.white)
    .padding(14)
  }
}

struct DallimoRunLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: DallimoRunAttributes.self) { context in
      LockScreenView(context: context)
        .activityBackgroundTint(Color.black.opacity(0.85))
        .activitySystemActionForegroundColor(.dallimoMint)
    } dynamicIsland: { context in
      let state = context.state
      return DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          VStack(alignment: .leading, spacing: 0) {
            Text(state.distanceKm)
              .font(.system(size: 30, weight: .heavy, design: .rounded).monospacedDigit())
              .foregroundStyle(Color.dallimoMint)
            Text("km").font(.caption2).foregroundStyle(.secondary)
          }
        }
        DynamicIslandExpandedRegion(.trailing) {
          VStack(alignment: .trailing, spacing: 0) {
            RunTime(state: state)
              .font(.system(size: 22, weight: .semibold, design: .rounded))
            Text("현재 \(state.currentPace)/km").font(.caption.monospacedDigit()).foregroundStyle(.secondary)
          }
        }
        DynamicIslandExpandedRegion(.center) {
          Text(context.attributes.title)
            .font(.caption)
            .foregroundStyle(.secondary)
            .lineLimit(1)
        }
        DynamicIslandExpandedRegion(.bottom) {
          if !state.people.isEmpty {
            PeopleBars(people: Array(state.people.prefix(3)))
          } else if let label = state.stripLabel, let value = state.stripValue {
            HStack {
              Text(label).font(.caption).foregroundStyle(.secondary)
              Spacer()
              Text(value).font(.caption.weight(.semibold)).foregroundStyle(toneColor(state.stripTone))
            }
          }
        }
      } compactLeading: {
        // 왼쪽: 거리 (달리모 민트)
        Text(state.distanceKm)
          .font(.system(size: 14, weight: .heavy, design: .rounded).monospacedDigit())
          .foregroundStyle(Color.dallimoMint)
      } compactTrailing: {
        // 오른쪽: 함께 달리기면 내 순위, 아니면 시간
        if let rank = state.people.firstIndex(where: { $0.me }), state.people.count > 1 {
          Text("\(rank + 1)위")
            .font(.system(size: 14, weight: .bold, design: .rounded))
        } else {
          RunTime(state: state)
            .font(.system(size: 14, weight: .semibold, design: .rounded))
            .frame(maxWidth: 52)
        }
      } minimal: {
        Image(systemName: state.status == "paused" ? "pause.fill" : "figure.run")
          .foregroundStyle(state.status == "paused" ? Color.dallimoWarning : Color.dallimoMint)
      }
      // 누르면 달리모가 열린다 (지금 러닝 화면으로 돌아간다)
      .keylineTint(.dallimoMint)
    }
  }
}

@main
struct DallimoLiveActivityBundle: WidgetBundle {
  var body: some Widget {
    DallimoRunLiveActivity()
  }
}
