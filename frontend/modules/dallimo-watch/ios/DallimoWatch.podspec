Pod::Spec.new do |s|
  s.name           = 'DallimoWatch'
  s.version        = '1.0.0'
  s.summary        = 'Apple Watch 달리모 앱과 러닝 상태 · 조작 · 심박 주고받기 (WATCH-001~004)'
  s.description    = s.summary
  s.author         = 'DALLIMO'
  s.homepage       = 'https://github.com/dongsubnambuk/dallimo'
  s.license        = { :type => 'UNLICENSED' }
  s.platforms      = { :ios => '15.1' }
  s.source         = { :git => '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.frameworks = 'HealthKit', 'WatchConnectivity'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "**/*.{h,m,swift}"
end
