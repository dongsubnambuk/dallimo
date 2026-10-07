Pod::Spec.new do |s|
  s.name           = 'DallimoLiveActivity'
  s.version        = '1.0.0'
  s.summary        = '러닝 라이브 액티비티(잠금 화면 · 다이내믹 아일랜드) 시작 · 갱신 · 끝내기'
  s.description    = s.summary
  s.author         = 'DALLIMO'
  s.homepage       = 'https://github.com/dongsubnambuk/dallimo'
  s.license        = { :type => 'UNLICENSED' }
  s.platforms      = { :ios => '15.1' }
  s.source         = { :git => '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.weak_frameworks = 'ActivityKit'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "**/*.{h,m,swift}"
end
