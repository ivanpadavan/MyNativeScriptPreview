require 'xcodeproj'
abort 'Native layout discovery is CI-only.' unless ENV['CI'] == 'true'
projects = Dir.glob('platforms/ios/*.xcodeproj')
abort "Expected one native project, found #{projects.inspect}" unless projects.length == 1
project = Xcodeproj::Project.open(projects.first)
app = project.targets.find { |target| target.product_type == 'com.apple.product-type.application' }
abort 'Application target not found.' unless app
workspace = Dir.glob('platforms/ios/*.xcworkspace').first
values = {
  'NS_PROJECT' => File.expand_path(projects.first),
  'NS_CONTAINER_FLAG' => workspace ? '-workspace' : '-project',
  'NS_CONTAINER_PATH' => File.expand_path(workspace || projects.first),
  'NS_SCHEME' => app.name,
}
File.open(ENV.fetch('GITHUB_ENV'), 'a') do |output|
  values.each { |key, value| output.puts "#{key}=#{value}" }
end
puts "Native container: #{values['NS_CONTAINER_PATH']}; scheme: #{app.name}"
