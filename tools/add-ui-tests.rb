require 'xcodeproj'
require 'pathname'
abort 'UI test project generation is CI-only.' unless ENV['CI'] == 'true'

root = Pathname.new(__dir__).parent
project = Xcodeproj::Project.open(ENV.fetch('NS_PROJECT'))
app = project.targets.find { |target| target.product_type == 'com.apple.product-type.application' }
abort 'NativeScript application target not found.' unless app
target = project.new_target(:ui_test_bundle, 'PreviewUITests', :ios, '16.0')
target.add_dependency(app)
group = project.main_group.new_group('Preview integration tests')
source = group.new_file((root / 'tests/ios/PreviewUITests.swift').to_s)
target.source_build_phase.add_file_reference(source)
resource = group.new_file((root / 'dist/gpu-check.preview.txt').to_s)
target.resources_build_phase.add_file_reference(resource)
target.build_configurations.each do |configuration|
  configuration.build_settings.merge!({
    'PRODUCT_BUNDLE_IDENTIFIER' => 'org.ivanpadavan.nativescriptpreview.uitests',
    'GENERATE_INFOPLIST_FILE' => 'YES',
    'SWIFT_VERSION' => '5.0',
    'CLANG_ENABLE_MODULES' => 'YES',
    'TEST_TARGET_NAME' => app.name,
    'TARGETED_DEVICE_FAMILY' => '1,2',
    'DEVELOPMENT_TEAM' => '',
    'FRAMEWORK_SEARCH_PATHS' => ['$(inherited)', '$(PLATFORM_DIR)/Developer/Library/Frameworks'],
    'LD_RUNPATH_SEARCH_PATHS' => ['$(inherited)', '@executable_path/Frameworks', '@loader_path/Frameworks'],
  })
end
project.save
scheme = Xcodeproj::XCScheme.new
scheme.add_build_target(app)
scheme.add_build_target(target)
scheme.set_launch_target(app)
scheme.add_test_target(target)
scheme.test_action.build_configuration = 'Debug'
scheme.save_as(project.path, 'PreviewIntegration', true)
