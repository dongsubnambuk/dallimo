# COMPONENT-CONTRACTS

> 출처: `docs/spec/dallimo_master_spec_v1.8_feedback_features.docx` (달리모 통합 개발 명세서 v1.8)
> 옮긴 장: 112, 112.1, 113
> 명세서 원문을 그대로 옮겼다. 내용 수정은 명세서를 먼저 고친 뒤 반영한다.

## 112. Primitive 계약

| Primitive | 책임 | 금지 |
|---|---|---|
| AppText | semantic typography role, color role, scaling | 화면마다 fontSize 직접 지정 |
| AppPressable | pressed/disabled/a11y feedback | 모든 버튼을 같은 시각으로 강제 |
| AppSurface | canvas/surface/elevated semantic layer | 카드 남발 |
| AppDivider | 정보 그룹 분리 | 장식용 선 남용 |
| AppIcon | 일관된 icon adapter + accessibility | 여러 icon library 혼용 |

### 112.1 AppText API 초안

```text
type TextRole =
  | "metricHero"
  | "metricLarge"
  | "screenTitle"
  | "sectionTitle"
  | "body"
  | "label"
  | "caption";

type TextTone =
  | "primary"
  | "secondary"
  | "inverse"
  | "success"
  | "warning"
  | "danger";

<AppText
  role="metricHero"
  tone="inverse"
  tabular
>
  3.72
</AppText>
```

## 113. 핵심 컴포넌트 계약

| Component | Input | States | Hierarchy |
|---|---|---|---|
| MetricBlock | label/value/unit/status | default, emphasized, warning, unavailable | value > label > unit |
| CourseCard | title,distance,tags,proximity,recordContext | default, selected, compact, loading | course identity > distance > metadata |
| PrimaryRunButton | label,availability,loading | ready, disabledGPS, disabledPermission, loading | single dominant action |
| GpsStatus | quality,copy | acquiring,good,fair,poor,unavailable | icon + text + semantic color |
| GapIndicator | delta,direction,label | ahead,behind,tied,noData | direction + numeric gap |
| RankingRow | rank,user,time,relation,titles | normal,self,friend,podium,nearby | self anchor over decoration |
| CourseTitleBadge | kind | crown,legend | shape + spoken name, not color only (124장) |
| VerificationBadge | status | pending,verified,unverified,rejected | compact factual status |
| ParticipantChip | name,status,progress | invited,ready,running,disconnected,finished,DNF | state first |
| FilterChip | label,selected | default,selected,disabled | quick filter only |
