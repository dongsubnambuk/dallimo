Pod::Spec.new do |s|
  s.name           = 'DallimoHealth'
  s.version        = '1.0.0'
  s.summary        = 'Apple 건강에 저장된 달리기 기록 읽기 (달리모 외부 기록 가져오기, 명세 122장)'
  s.description    = s.summary
  s.author         = 'DALLIMO'
  s.homepage       = 'https://github.com/dongsubnambuk/dallimo'
  s.license        = { :type => 'UNLICENSED' }
  s.platforms      = { :ios => '15.1' }
  s.source         = { :git => '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.frameworks = 'HealthKit', 'CoreLocation'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "**/*.{h,m,swift}"
end
