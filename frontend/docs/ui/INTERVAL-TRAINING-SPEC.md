# Interval Training Spec

## Builder
Blocks contain ordered Steps. Repeat groups can wrap multiple steps.

Step fields:
- stepType
- endConditionType
- endConditionValue
- targetType
- targetMin
- targetMax

Initial conditions: DISTANCE, TIME, MANUAL.
Initial targets: TARGET_TIME, TARGET_PACE.

## Active Run
Show only critical information:
- current step
- remaining distance/time
- target
- current vs target gap
- next step

Use audio/haptic transitions. Do not overload the active run HUD.
