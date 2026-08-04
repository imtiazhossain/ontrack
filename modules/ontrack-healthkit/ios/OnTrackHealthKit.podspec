Pod::Spec.new do |s|
  s.name           = 'OnTrackHealthKit'
  s.version        = '1.0.0'
  s.summary        = 'Device-only Apple Health integration for onTrack'
  s.description    = 'Reads authorized Apple Health summaries and interoperates with State of Mind.'
  s.author         = 'onTrack'
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = { :ios => '16.4' }
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks = 'HealthKit'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
  s.source_files = '**/*.{h,m,mm,swift,hpp,cpp}'
end
