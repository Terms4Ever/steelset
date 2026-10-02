Pod::Spec.new do |s|
  s.name           = 'SteelsetWatchBridge'
  s.version        = '1.0.0'
  s.summary        = 'Apple Watch bridge for the Steelset workout tracker'
  s.description    = 'Starts the Steelset watch workout, sends rest state and receives the end from the watch.'
  s.author         = 'Steelset'
  s.homepage       = 'https://github.com/Terms4Ever/steelset'
  s.license        = 'MIT'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { :git => '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks     = 'HealthKit', 'WatchConnectivity'
  s.source_files   = '**/*.swift'
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }
end
