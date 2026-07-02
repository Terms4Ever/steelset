Pod::Spec.new do |s|
  s.name           = 'SteelsetLiveActivity'
  s.version        = '1.0.0'
  s.summary        = 'Live Activity bridge for the Steelset workout tracker'
  s.description    = 'Starts, updates and ends the running-workout Live Activity from JS.'
  s.author         = 'Steelset'
  s.homepage       = 'https://setly.cz'
  s.license        = 'MIT'
  s.platforms      = { :ios => '15.1' }
  s.source         = { :git => '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files   = '**/*.swift'
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }
end
