define('views/header',
[
  'hb!header_path.hbs'
], function(PathTmpl) {
  return Backbone.View.extend({
    el: $("#header"),

    templates: {
      path: PathTmpl
    },

    initialize: function(app) {
      this.state = app;

      this.state.on('bootstrapped', function() {
        if (app.space) { // editing a space?
          this.space      = app.space;
          this.user       = app.space.creator;

          this.space.on('sync', this.render, this);

          if (app.workspace) {
            this.workspace  = app.workspace;

            app.workspace.on('folder_loaded', this.render, this);
            app.workspace.on('current_folder_updated', this.render, this);
            app.workspace.on('page_loaded',   this.render, this);
            app.workspace.on('current_page_updated', this.render, this);
          }

          // this.state.on('change:current_page', this.proxy_show_page_path, this);
        } else if (app.user) { // dashboard? profile?
          this.user = app.user;

        } else { // current user sections
          this.user = app.current_user;
          this.user.on('change:nickname', this.render, this);
        }

        this.render();
      }, this);

      this.state.on('highlight_nav_section', this.highlight, this);
    },

    render: function(additional_data) {
      var data = {};

      data.user = {
        nickname: this.user.get('nickname'),
        media:    this.user.get('media')
      }

      if (this.space) {
        data.space = {
          title: this.space.get('title'),
          media: this.space.get('media')
        };

        data.space_admin = this.space.is_admin(this.user);

        if (this.workspace) {
          if (this.workspace.current_page) {
            $.extend(true, data, this.build_page_path() || {});
          } else if (this.workspace.current_folder) {
            $.extend(true, data, this.build_folder_path() || {});
          }
        }
      }

      console.log(data)
      this.$el.find('#path').html(this.templates.path(data));

      return this;
    },

    highlight: function(section) {
      this.$el.find('a#' + section + '_link').addClass('selected');
    },

    folder_hierarchy: function(folder) {
      if (!folder.has_parent()) { return []; }
      var folders = _.reject(folder.ancestors(), function(f) { return !f.has_parent(); });

      return folders.reverse();
    },

    build_folder_path: function(data) {
      var folder = this.workspace.current_folder;

      if (!folder) {
        return false;
      }

      console.log('[header] showing folder path')

      // console.log("rendering folder path: " + folder.path())
      return $.extend(true, {
        folders: _.collect(
          this.folder_hierarchy(folder),
          function(f) {
            return {
              title: f.get('title'),
              path:  f.path()
            }
          })
      }, data || {});
    },

    build_page_path: function() {
      var page = this.workspace.current_page;

      if (!page) {
        return false;
      }

      console.log("[header] rendering page path: " + page.path())

      return this.build_folder_path({
        page: {
          title: page.get('title'),
          path: page.path()
        }
      });
    }
  });
});