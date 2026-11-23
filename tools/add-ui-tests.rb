require 'xcodeproj'
require 'pathname'
abort 'UI test project generation is CI-only.' unless ENV['CI'] == 'true'

root = Pathname.new(__dir__).parent
project = Xcodeproj::Project.new((root / 'artifacts/PreviewUITests.xcodeproj').to_s)
# Standalone UI runner: it controls the preinstalled shell by bundle ID and
# therefore never rebuilds the NativeScript application for an example change.
target = project.new_target(:ui_test_bundle, 'PreviewUITests', :ios, '16.0')
group = project.main_group.new_group('Preview integration tests')
source = group.new_file((root / 'tests/ios/PreviewUITests.swift').to_s)
target.source_build_phase.add_file_reference(source)
Dir.glob((root / 'dist/*.preview.txt').to_s).each do |filename|
  resource = group.new_file(filename)
  target.resources_build_phase.add_file_reference(resource)
end
target.build_configurations.each do |configuration|
  configuration.build_settings.merge!({
    'PRODUCT_BUNDLE_IDENTIFIER' => 'org.ivanpadavan.nativescriptpreview.uitests',
    'GENERATE_INFOPLIST_FILE' => 'YES',
    'SWIFT_VERSION' => '5.0',
    'CLANG_ENABLE_MODULES' => 'YES',
    'TARGETED_DEVICE_FAMILY' => '1,2',
    'DEVELOPMENT_TEAM' => '',
    'FRAMEWORK_SEARCH_PATHS' => ['$(inherited)', '$(PLATFORM_DIR)/Developer/Library/Frameworks'],
    'LD_RUNPATH_SEARCH_PATHS' => ['$(inherited)', '@executable_path/Frameworks', '@loader_path/Frameworks'],
  })
end
project.save
scheme = Xcodeproj::XCScheme.new
scheme.add_build_target(target)
scheme.add_test_target(target)
scheme.test_action.build_configuration = 'Debug'
scheme.save_as(project.path, 'PreviewIntegration', true)
