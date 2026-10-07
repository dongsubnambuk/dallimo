import SwiftUI

// 워치 화면. 1초 안에 읽히게 거리 · 시간 · 페이스 · 심박 + 모드별 한 줄만 (CLAUDE.md 6항 Active Run 규칙).
// 조작은 옆 페이지(일시정지 · 끝내기 · 다음 구간). 색만으로 구분하지 않도록 글자를 함께 쓴다.

extension Color {
  // 달리모 signal 민트 (src/design/tokens/color.ts)
  static let dallimoMint = Color(red: 0x2B / 255, green: 0xF0 / 255, blue: 0xC0 / 255)
  static let dallimoWarning = Color(red: 0xD9 / 255, green: 0x95 / 255, blue: 0x00 / 255)
  static let dallimoDanger = Color(red: 0xF0 / 255, green: 0x62 / 255, blue: 0x62 / 255)
}

func formatElapsed(_ total: Int) -> String {
  let h = total / 3600
  let m = (total % 3600) / 60
  let s = total % 60
  return h > 0 ? String(format: "%d:%02d:%02d", h, m, s) : String(format: "%d:%02d", m, s)
}

private func toneColor(_ tone: String?) -> Color {
  switch tone {
  case "warning": return .dallimoWarning
  case "accent", "success": return .dallimoMint
  default: return .secondary
  }
}

struct RootView: View {
  @EnvironmentObject private var link: PhoneLink
  @EnvironmentObject private var recorder: WatchRecorder

  var body: some View {
    // 워치에서 시작한 단독 기록이 먼저 (결정 로그 81항)
    switch recorder.phase {
    case let .countdown(count):
      VStack(spacing: 6) {
        CountdownView(title: "자유 달리기 · 워치 기록", count: count)
        Button("취소") { recorder.cancelCountdown() }
          .font(.footnote)
      }
    case .running, .paused:
      SoloRunPager()
    case .saved:
      SoloSummaryView()
    case .idle:
      phoneScreen
    }
  }

  @ViewBuilder
  private var phoneScreen: some View {
    switch link.screen {
    case .idle:
      IdleView()
    case let .countdown(title, count):
      CountdownView(title: title, count: count)
    case let .run(state):
      RunPager(state: state)
    case let .summary(summary):
      SummaryView(summary: summary)
    }
  }
}

// 대기 화면: 워치에서 바로 자유 달리기를 시작할 수 있다. 휴대폰에서 시작하면 휴대폰 러닝 화면으로 바뀐다
struct IdleView: View {
  @EnvironmentObject private var recorder: WatchRecorder

  var body: some View {
    ScrollView {
      VStack(spacing: 8) {
        Text("달리모")
          .font(.system(.title3, design: .rounded).weight(.heavy))
          .foregroundStyle(Color.dallimoMint)
        Button {
          recorder.start()
        } label: {
          Label("달리기 시작", systemImage: "figure.run")
        }
        .tint(Color.dallimoMint)
        if recorder.locationDenied {
          Text("위치 권한이 없어요. 워치 설정 › 개인정보 보호 › 위치 서비스에서 달리모를 허용해 주세요")
            .font(.footnote)
            .foregroundStyle(Color.dallimoWarning)
            .multilineTextAlignment(.center)
        } else {
          Text("휴대폰 없이 워치 GPS로 기록해요. 휴대폰에서 시작하면 휴대폰이 기록해요")
            .font(.caption2)
            .multilineTextAlignment(.center)
            .foregroundStyle(.secondary)
        }
        if recorder.pendingCount > 0 {
          Text("휴대폰에 보낼 기록 \(recorder.pendingCount)개 · 휴대폰과 연결되면 올라가요")
            .font(.caption2)
            .multilineTextAlignment(.center)
            .foregroundStyle(Color.dallimoWarning)
        }
      }
      .padding(.horizontal, 4)
    }
    .onAppear { recorder.refreshPending() }
  }
}

struct CountdownView: View {
  let title: String
  let count: Int

  var body: some View {
    VStack(spacing: 4) {
      Text(count > 0 ? "\(count)" : "출발")
        .font(.system(size: count > 0 ? 72 : 44, weight: .heavy, design: .rounded))
        .foregroundStyle(Color.dallimoMint)
        .contentTransition(.numericText())
      Text(title)
        .font(.footnote)
        .foregroundStyle(.secondary)
        .lineLimit(2)
        .multilineTextAlignment(.center)
    }
    .accessibilityElement(children: .combine)
  }
}

struct RunPager: View {
  let state: RunState
  @State private var page = 1

  var body: some View {
    TabView(selection: $page) {
      RunControlsView(state: state).tag(0)
      RunMetricsView(state: state).tag(1)
    }
    .tabViewStyle(.page)
  }
}

struct RunMetricsView: View {
  let state: RunState
  @EnvironmentObject private var link: PhoneLink
  @EnvironmentObject private var workout: WorkoutManager

  private var statusLine: (text: String, color: Color) {
    if !link.reachable { return ("휴대폰 연결 끊김", .dallimoWarning) }
    if let notice = state.notice { return (notice, toneColor(state.noticeTone)) }
    switch state.status {
    case "PAUSED": return ("일시정지", .dallimoWarning)
    case "RECOVERY": return ("이어서 기록 준비", .secondary)
    case "FINISHING": return ("저장 중", .secondary)
    default: return ("기록 중", .dallimoMint)
    }
  }

  var body: some View {
    TimelineView(.periodic(from: .now, by: 1)) { context in
      VStack(alignment: .leading, spacing: 2) {
        Text(statusLine.text)
          .font(.footnote.weight(.semibold))
          .foregroundStyle(statusLine.color)
          .lineLimit(1)
        Text(formatElapsed(state.elapsedSec(at: context.date)))
          .font(.system(.title3, design: .rounded).weight(.semibold).monospacedDigit())
          .foregroundStyle(state.paused ? Color.dallimoWarning : Color.dallimoMint)
        HStack(alignment: .firstTextBaseline, spacing: 2) {
          Text(state.distanceKm)
            .font(.system(size: 40, weight: .bold, design: .rounded).monospacedDigit())
            .minimumScaleFactor(0.6)
          Text("km").font(.footnote).foregroundStyle(.secondary)
        }
        HStack(spacing: 10) {
          Text("\(state.pace)/km")
            .font(.body.monospacedDigit())
          if let bpm = workout.heartRate {
            Label("\(bpm)", systemImage: "heart.fill")
              .font(.body.monospacedDigit())
              .foregroundStyle(Color.dallimoDanger)
              .accessibilityLabel("심박 \(bpm)")
          }
        }
        if let label = state.stripLabel, let value = state.stripValue {
          VStack(alignment: .leading, spacing: 0) {
            Text(label).font(.caption2).foregroundStyle(.secondary).lineLimit(1)
            Text(value).font(.footnote.weight(.semibold)).foregroundStyle(toneColor(state.stripTone)).lineLimit(2)
          }
          .padding(.top, 2)
        }
      }
      .frame(maxWidth: .infinity, alignment: .leading)
    }
  }
}

struct RunControlsView: View {
  let state: RunState
  @EnvironmentObject private var link: PhoneLink
  @State private var confirming = false

  var body: some View {
    ScrollView {
      VStack(spacing: 8) {
        if let error = link.commandError {
          Text(error).font(.footnote).foregroundStyle(Color.dallimoWarning)
        }
        if state.completed && state.canFinish {
          // 코스 완주 · 인터벌을 모두 마쳤으면 확인 없이 저장 (휴대폰과 같다)
          Button {
            link.send(command: "finish")
          } label: {
            Label(state.saveLabel, systemImage: "flag.checkered")
          }
          .tint(Color.dallimoMint)
        }
        if state.manualStep {
          Button {
            link.send(command: "next")
          } label: {
            Label("다음 구간", systemImage: "forward.end.fill")
          }
          .tint(Color.dallimoMint)
        }
        if state.canPause {
          Button {
            link.send(command: state.paused ? "resume" : "pause")
          } label: {
            Label(state.paused ? "계속 달리기" : "일시정지", systemImage: state.paused ? "play.fill" : "pause.fill")
          }
          .tint(state.paused ? Color.dallimoMint : Color.dallimoWarning)
        }
        if state.canFinish && !state.completed {
          Button(role: .destructive) {
            confirming = true
          } label: {
            Label(state.finishLabel, systemImage: "stop.fill")
          }
        }
      }
    }
    .confirmationDialog("\(state.finishLabel)할까요?", isPresented: $confirming, titleVisibility: .visible) {
      Button(state.finishLabel, role: .destructive) {
        link.send(command: "finish")
      }
      Button("계속 달리기", role: .cancel) {}
    }
  }
}

struct SummaryView: View {
  let summary: RunSummary
  @EnvironmentObject private var link: PhoneLink

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 4) {
        Text("기록 저장").font(.footnote.weight(.semibold)).foregroundStyle(Color.dallimoMint)
        Text(summary.title).font(.footnote).foregroundStyle(.secondary).lineLimit(2)
        HStack(alignment: .firstTextBaseline, spacing: 2) {
          Text(summary.distanceKm).font(.system(size: 36, weight: .bold, design: .rounded).monospacedDigit())
          Text("km").font(.footnote).foregroundStyle(.secondary)
        }
        Text(summary.time).font(.title3.monospacedDigit())
        Text("\(summary.pace)/km").font(.body.monospacedDigit()).foregroundStyle(.secondary)
        Text("자세한 결과는 휴대폰에서 볼 수 있어요").font(.caption2).foregroundStyle(.secondary).padding(.top, 4)
        Button("완료") { link.dismissSummary() }
          .padding(.top, 4)
      }
      .frame(maxWidth: .infinity, alignment: .leading)
    }
  }
}

// MARK: 워치 단독 기록 (결정 로그 81항)

struct SoloRunPager: View {
  @State private var page = 1

  var body: some View {
    TabView(selection: $page) {
      SoloControlsView().tag(0)
      SoloMetricsView().tag(1)
    }
    .tabViewStyle(.page)
  }
}

struct SoloMetricsView: View {
  @EnvironmentObject private var recorder: WatchRecorder
  @EnvironmentObject private var workout: WorkoutManager

  private var statusLine: (text: String, color: Color) {
    if recorder.phase == .paused { return ("일시정지", .dallimoWarning) }
    if recorder.gpsWeak { return ("GPS 약함 · 워치 기록", .dallimoWarning) }
    return ("기록 중 · 워치", .dallimoMint)
  }

  var body: some View {
    TimelineView(.periodic(from: .now, by: 1)) { context in
      VStack(alignment: .leading, spacing: 2) {
        Text(statusLine.text)
          .font(.footnote.weight(.semibold))
          .foregroundStyle(statusLine.color)
          .lineLimit(1)
        Text(formatElapsed(Int(recorder.activeMs(at: context.date) / 1000)))
          .font(.system(.title3, design: .rounded).weight(.semibold).monospacedDigit())
          .foregroundStyle(recorder.phase == .paused ? Color.dallimoWarning : Color.dallimoMint)
        HStack(alignment: .firstTextBaseline, spacing: 2) {
          Text(recorder.distanceKm)
            .font(.system(size: 40, weight: .bold, design: .rounded).monospacedDigit())
            .minimumScaleFactor(0.6)
          Text("km").font(.footnote).foregroundStyle(.secondary)
        }
        HStack(spacing: 10) {
          Text("\(recorder.avgPace(at: context.date))/km")
            .font(.body.monospacedDigit())
          if let bpm = workout.heartRate {
            Label("\(bpm)", systemImage: "heart.fill")
              .font(.body.monospacedDigit())
              .foregroundStyle(Color.dallimoDanger)
              .accessibilityLabel("심박 \(bpm)")
          }
        }
      }
      .frame(maxWidth: .infinity, alignment: .leading)
    }
  }
}

struct SoloControlsView: View {
  @EnvironmentObject private var recorder: WatchRecorder
  @State private var confirming = false

  var body: some View {
    ScrollView {
      VStack(spacing: 8) {
        Button {
          if recorder.phase == .paused { recorder.resume() } else { recorder.pause() }
        } label: {
          Label(recorder.phase == .paused ? "계속 달리기" : "일시정지", systemImage: recorder.phase == .paused ? "play.fill" : "pause.fill")
        }
        .tint(recorder.phase == .paused ? Color.dallimoMint : Color.dallimoWarning)
        Button(role: .destructive) {
          confirming = true
        } label: {
          Label("끝내기", systemImage: "stop.fill")
        }
      }
    }
    .confirmationDialog("끝내고 저장할까요?", isPresented: $confirming, titleVisibility: .visible) {
      Button("끝내기", role: .destructive) { recorder.finish() }
      Button("계속 달리기", role: .cancel) {}
    }
  }
}

struct SoloSummaryView: View {
  @EnvironmentObject private var recorder: WatchRecorder
  @EnvironmentObject private var link: PhoneLink

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 4) {
        if let summary = recorder.summary {
          if summary.discarded {
            Text("기록이 너무 짧아요").font(.footnote.weight(.semibold)).foregroundStyle(Color.dallimoWarning)
            Text("위치를 받기 전에 끝나서 저장하지 않았어요").font(.caption2).foregroundStyle(.secondary)
          } else {
            Text("기록 저장").font(.footnote.weight(.semibold)).foregroundStyle(Color.dallimoMint)
            HStack(alignment: .firstTextBaseline, spacing: 2) {
              Text(summary.distanceKm).font(.system(size: 36, weight: .bold, design: .rounded).monospacedDigit())
              Text("km").font(.footnote).foregroundStyle(.secondary)
            }
            Text(summary.time).font(.title3.monospacedDigit())
            Text("\(summary.pace)/km").font(.body.monospacedDigit()).foregroundStyle(.secondary)
            Text(link.reachable ? "휴대폰으로 보내고 있어요. 달리모에서 결과를 볼 수 있어요" : "휴대폰과 연결되면 달리모에 올라가요")
              .font(.caption2)
              .foregroundStyle(.secondary)
              .padding(.top, 4)
          }
        }
        Button("완료") { recorder.dismissSummary() }
          .padding(.top, 4)
      }
      .frame(maxWidth: .infinity, alignment: .leading)
    }
  }
}
