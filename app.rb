# encoding: UTF-8

$ROOT ||= File.dirname(__FILE__)
$LOAD_PATH << $ROOT

# Encoding.default_external = "UTF-8"

require 'rubygems'
require 'bundler/setup'

Bundler.require(:default)

# ----
# Validating that configuration files exist and are readable...
config_files = [ 'application', 'database', 'cors' ]
config_files << 'credentials' unless settings.test?
config_files.each { |config_file|
  unless File.exists?(File.join($ROOT, 'config', "%s.yml" %[config_file] ))
    class ConfigFileError < StandardError; end;
    raise ConfigFileError, "Missing required config file: config/%s.yml" %[config_file]
  end
}

require 'config/initializer'

configure :test do
  set :credentials, { 'cookie' => { 'secret' => 'adooken' } }
  # set :show_exceptions, true
end

configure :development, :production do
  config_file 'config/credentials.yml'
end

configure do
  config_files.each { |cf| config_file 'config/%s.yml' %[cf] }

  respond_to :html, :json, :text

  use Rack::Session::Cookie, :secret => settings.credentials['cookie']['secret']

  PageHub::Markdown::configure({}, { with_toc_data: true } )

  # the configurator should be loaded before the models
  require 'lib/pagehub'
  PageHub::Config.init

  [ 'lib', 'helpers', 'models' ].each { |d|
    Dir.glob("#{d}/**/*.rb").reject { |f| f =~ /\.exclude/ }.each { |f| require f }
  }

  require 'controllers/sessions'
  require 'controllers/users'
  require 'controllers/folders'
  require 'controllers/spaces'
  require 'controllers/application'
  require 'controllers/pages'
  require 'controllers/browser'
  require 'controllers/errors'

  set :default_preferences, PageHub::Config.defaults
  DefaultPreferences = User.new
  DefaultPreferences.__override_preferences(PageHub::Config.defaults)

  require 'config/initializers/datamapper'
  require 'config/initializers/cors'
  require 'config/initializers/rabl'
  require 'config/initializers/pagehub_markdown'
end

configure :production, :development do |app|
  helpers Gravatarify::Helper

  # Gravatarify.options[:default] = "wavatar"
  Gravatarify.options[:filetype] = :png
  Gravatarify.styles[:mini] = { size: 16, html: { :class => 'gravatar gravatar-mini' } }
  Gravatarify.styles[:icon] = { size: 32, html: { :class => 'gravatar gravatar-icon' } }
  Gravatarify.styles[:default] = { size: 96, html: { :class => 'gravatar' } }
  Gravatarify.styles[:profile] = { size: 128, html: { :class => 'gravatar' } }

  use OmniAuth::Builder do
    provider :developer if app.settings.development?

    provider :facebook,
      app.settings.credentials['facebook']['key'],
      app.settings.credentials['facebook']['secret']
    # provider :twitter,  settings.credentials['twitter']['key'],  settings.credentials['twitter']['secret']

    provider :google_oauth2,
      app.settings.credentials['google']['key'],
      app.settings.credentials['google']['secret'],
      { access_type: "offline", approval_prompt: "" }

    suffix = app.settings.development? ? '_development' : ''

    provider :github,
      app.settings.credentials["github#{suffix}"]['key'],
      app.settings.credentials["github#{suffix}"]['secret']
  end

  settings.courier.configure(settings.credentials['courier'])
end

configure :production do
  Bundler.require(:production)
end

configure :development do
  Bundler.require(:development)
end