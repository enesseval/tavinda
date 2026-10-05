Pod::Spec.new do |s|
  s.name           = 'TavindaLiveActivity'
  s.version        = '1.0.0'
  s.summary        = 'Starts, updates and ends the time-block Live Activity.'
  s.description    = 'Starts, updates and ends the time-block Live Activity for Tavında.'
  s.author         = ''
  s.homepage       = 'https://github.com/enesseval/tavinda'
  s.license        = 'UNLICENSED'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true
  # Swift 5 mode keeps strict Swift 6 concurrency checks (Xcode 26) out of this small module.
  s.swift_version  = '5.9'

  s.dependency 'ExpoModulesCore'
  # ActivityKit exists from iOS 16.1; weak linking keeps the app launching on iOS 15.
  s.weak_frameworks = 'ActivityKit'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = '**/*.{h,m,mm,swift}'
end
