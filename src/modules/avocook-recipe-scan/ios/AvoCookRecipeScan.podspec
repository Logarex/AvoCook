require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'AvoCookRecipeScan'
  s.version        = package['version']
  s.summary        = package['description']
  s.description    = package['description']
  s.license        = package['license']
  s.author         = 'AvoCook'
  s.homepage       = 'https://github.com/Logarex/AvoCook'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { :path => '.' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.frameworks = 'Vision', 'PDFKit'
  # Apple Intelligence exists only on iOS 26+; weak linking keeps the app running on older iOS.
  s.weak_frameworks = 'FoundationModels'
  s.source_files = '**/*.{h,m,swift}'
end
