define('views/spaces/show',
[
  'backbone',
  'models/space',
  'views/spaces/resource_actions',
  'views/spaces/browser',
  'views/spaces/page_actionbar',
  'views/spaces/general_actionbar',
  'views/spaces/editor',
  'pagehub',
  'timed_operation'
], function(Backbone, Space, Browser, ResourceActions, PageActionBar, GeneralActionBar, Editor, UI, TimedOp) {
  return Backbone.View.extend({
    initialize: function(state) {
      UI.status.mark_pending();

      this.space = state.space;
      this.state = state;
      this.ctx = {
        settings_changed: false,
        settings: {
          runtime: { collapsed: [ ] }
        }
      }

      var data = {
        state: state,
        space: state.space,
        ctx:   this.ctx
      };

      this.resource_actions = new ResourceActions(data);
      this.browser          = new Browser(data);
      this.editor           = new Editor(data);
      this.page_actionbar   = new PageActionBar($.extend({}, data, { editor: this.editor }));
      this.page_actionbar   = new GeneralActionBar(data);

      this.space.folders.every(function(f) {
        this.space.folders.trigger('add', f);

        f.pages.every(function(p) {
          return this.pages.trigger('add', p);
        }, f);

        return true;
      }, this);

      this.space.folders.every(function(f) {
        return this.space.folders.trigger('change:parent.id', f);
      }, this);

      state.on('sync_runtime_preferences', this.queue_preferences_sync, this);

      this.preferences_autosaver = new TimedOp(this, this.autosave_preferences, {
        pulse: state.get('preferences.pulses.runtime_preferences')
      });

      UI.status.mark_ready();
    },

    queue_preferences_sync: function(prefs) {
      return this.preferences_autosaver.queue(prefs);
    },

    autosave_preferences: function(prefs, timed_invocation) {
      this.state.current_user.save($.extend({}, prefs, { no_object: true }), {
        patch: true
      })
    }
  });
})