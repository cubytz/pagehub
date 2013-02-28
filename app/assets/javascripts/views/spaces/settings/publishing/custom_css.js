define(
'views/spaces/settings/publishing/custom_css',
[
  'jquery',
  'views/spaces/settings/setting_view',
  'views/spaces/editor'
],
function($, SettingView, Editor) {
  return SettingView.extend({
    el: $("form#custom_css_settings"),

    events: {
      'change input': 'request_update'
    },

    initialize: function(ctx) {
      SettingView.prototype.initialize.apply(this, arguments);
      this.path = 'custom_css';
      this.editor = new Editor({
        space:  this.space,
        config: {
          el:   "#css_editor",
          mode: "css"
        }
      });
      this.editor.resize_editor(300);
    },

    render: function() {
      this.editor.reset().editor.setValue(this.space.get('preferences.publishing.custom_css') || '');
      return this;
    },

    serialize: function() {
      var data = this.editor.serialize();

      return {
        custom_css: data
      }
    }
  });
});