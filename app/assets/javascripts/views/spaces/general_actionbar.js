define('views/spaces/general_actionbar',
[ 'backbone' ],
function(Backbone) {
  return Backbone.View.extend({
    el: $("#general_actionbar"),

    events: {
      'click #switch_layout': 'switch_layout',
      'click #switch_scrolly': 'switch_scrolling',
      'click #switch_animability': 'switch_animability',
      'click #refresh_editor': 'delegate_refresh_editor'
    },

    initialize: function(data) {
      _.implode(this, data);

      this.elements = {
        switch_layout: this.$el.find('#switch_layout'),
        switch_scrolly: this.$el.find('#switch_scrolly'),
        switch_animability: this.$el.find('#switch_animability')
      }

      this.is_fluid = this.state.current_user.get('preferences.runtime.fluid_workspace');
      this.is_scrolly = this.state.current_user.get('preferences.runtime.scrolly_workspace');
      this.is_animable = this.state.current_user.get('preferences.runtime.animations');

      this.render();
    },

    render: function() {
      this.elements.switch_layout.toggleClass('selected', this.is_fluid);
      this.elements.switch_scrolly.toggleClass('selected', !this.is_scrolly);
      this.elements.switch_animability.toggleClass('selected', !this.is_animable);

      $("body").toggleClass("fluid", this.is_fluid);
      $("body").toggleClass("no-scroll", !this.is_scrolly);

      return this;
    },

    switch_layout: function() {
      this.is_fluid = !this.is_fluid;

      this.render();

      this.space.trigger('layout_changed', { fluid: this.is_fluid });
      this.state.trigger('sync_runtime_preferences', { preferences: { runtime: { fluid_workspace: this.is_fluid } } });

      return true;
    },

    switch_scrolling: function() {
      this.is_scrolly = !this.is_scrolly;

      this.render();

      this.space.trigger('layout_changed', { scrolly: this.is_scrolly });
      this.state.trigger('sync_runtime_preferences', { preferences: { runtime: { scrolly_workspace: this.is_scrolly } } });

      return true;
    },

    switch_animability: function() {
      this.is_animable = !this.is_animable;

      this.render();

      this.state.trigger('sync_runtime_preferences', { preferences: { runtime: { animations: this.is_animable } } });
    },

    delegate_refresh_editor: function() {
      this.space.trigger('refresh_editor');
    }
  });
})