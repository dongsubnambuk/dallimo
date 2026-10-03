Pod::Spec.new do |s|
  s.name           = 'DallimoHeart'
  s.version        = '1.0.0'
  s.summary        = '블루투스 심박 센서(표준 Heart Rate Service)에서 달리는 동안 심박 받기'
  s.description    = s.summary
  s.author         = 'DALLIMO'
  s.homepage       = 'https://github.com/dongsubnambuk/dallimo'
  s.license        = { :type => 'UNLICENSED' }
  s.platforms      = { :ios => '15.1' }
  s.source         = { :git => '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.frameworks = 'CoreBluetooth'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "**/*.{h,m,swift}"
end
