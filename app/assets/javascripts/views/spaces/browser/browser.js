define('views/spaces/browser/browser',
[
  'jquery',
  'backbone',
  'views/spaces/browser/drag_manager',
  'views/spaces/browser/actionbar',
  'views/spaces/browser/settings',
  'views/spaces/browser/_impl',
  'views/spaces/browser/finder',
  'views/spaces/browser/explorer',
  'hb!browser/folder.hbs',
  'hb!browser/page.hbs',
  'hb!dialogs/destroy_folder.hbs',
  'pagehub',
  'shortcut',
  'jquery.tinysort'
],
function( $, Backbone, DragManager, ActionBar, Settings, BrowserImplementation, Finder, Explorer, FolderTemplate, PageTemplate, DestroyFolderTmpl, UI, Shortcut ) {

  return Backbone.View.extend({
    el: $("#browser"),

    templates: {
      folder: FolderTemplate,
      page:   PageTemplate
    },

    events: {
      'click .folder > a:not(.selected, .current)': 'proxy_highlight_folder',
      'click .page   > a:not(.selected, .current)': 'proxy_highlight_page',
      'click .current': 'reset_highlights',

    },

    initialize: function(data) {
      var view = this;

      _.implode(this, data);

      this.offset = 145;

      // workspace events
      this.space.on('load_folder',  this.switch_to_folder, this);
      this.space.on('load_page',    this.switch_to_folder_and_load_page, this);
      // this.space.on('page_loaded',  this.proxy_highlight_page, this);

      // -- disabled --
      // focus/scrolling behaviour is really inconsistent across browsers
      // disabling for now
      //
      // this.space.on('page_loaded',  this.focus,     this);
      $(window).on('resize', function() { return view.resize(); });

      // TODO:  make this trigger a route so that there's a single entry point
      //        into loading pages
      // this.space.on('page_created', this.switch_to_folder_and_load_page, this);
      this.space.on('reset', this.reset_highlights, this);
      this.space.on('reset', this.reset_context, this);

      // folder events
      this.space.folders.on('add', this.render_folder, this);
      this.space.folders.on('remove', this.remove_folder, this);
      this.space.folders.on('change:title', this.update_title, this);
      this.space.folders.on('change:title', this.reorder_folder, this);
      this.space.folders.on('change:parent.id', this.reorder_folder, this);
      this.space.folders.on('change:parent.id', this.update_title, this);

      this.state.current_user.on('change:preferences.workspace.browser.type', this.render, this);
      this.state.current_user.on('change:preferences.workspace.scrolling', this.resize, this);

      // this.drag_manager = new DragManager(data);
      this.actionbar = new ActionBar({ browser: this });
      this.settings  = new Settings({  browser: this });

      this.elements = {
        scroller: $("#browser_scroller")
      }

      // this.impl = new BrowserImplementation();
      this.__finder   = new Finder({ state: this.state, browser: this });
      this.__explorer = new Explorer({ state: this.state });

      Shortcut.add('ctrl+alt+g', function() {
        view.set_browser_type(view.impl.browser_type == 'explorer' ? 'finder' : 'explorer');
      });

      this.render();

      this.state.on('bootstrapped', function() {
        this.$el.show();
      }, this);
    },

    set_browser_type: function(type) {
      if (this.impl && this.impl.browser_type == type) {
        return this;
      }

      if (this.impl) {
        this.impl.reset(this.ctx);
      }

      this.impl = type == 'explorer' ? this.__explorer : this.__finder;
      this.impl.render(this.ctx);

      return this;
    },

    render: function() {
      this.resize();
      this.set_browser_type(this.state.current_user.get('preferences.workspace.browser.type') || 'finder');

      if (this.ctx.current_page) {
        this.ctx.current_page.ctx.browser.title.focus();
      }
      else if (this.ctx.current_folder) {
        this.ctx.current_folder.ctx.browser.title.focus();
      }

      return this;
    },

    pass: function(e) {
    //   // e.propagateEvent();
      return true;
    },

    consume: function(e) {
      e.preventDefault();
      return false;
    },

    reset_highlights: function() {
      console.log('[browser] -- resetting highlights -- ');

      this.impl.dehighlight_folder();
      this.impl.dehighlight_page();

      this.ctx.selected_folder  = null;
      this.ctx.selected_page    = null;
    },


    reset_current_highlights: function() {
      console.log('[browser] -- resetting current highlights -- ');

      this.impl.dehighlight_current_folder( this.ctx.current_folder);
      this.impl.dehighlight_current_page(   this.ctx.current_page);
    },

    reset_context: function() {
      console.log('[browser] -- resetting context -- ');

      this.reset_current_highlights();

      this.ctx.current_folder = null;
      this.ctx.current_page   = null;
      // this.state.set('current_page',  null);
      // this.state.set('current_folder', null);
    },

    resize: function() {
      if (this.state.current_user.get('preferences.workspace.scrolling')) {
        this.elements.scroller.css({
          "max-height": $(window).height() - this.offset,
          "min-height": "inherit"
        });
      } else {
        this.elements.scroller.css({
          "max-height": "inherit",
          "min-height": $(window).height() - this.offset
        });
      }
    },

    // -- utility -- //
    folder_from_title: function(el) {
      var folder_el = $(el).parents(".folder:first"),
          id        = null;

      if (folder_el.attr('data-folder')) {
        id = folder_el.attr('data-folder');
      } else if (folder_el.attr('id')) {
        id = folder_el.attr("id").replace('folder_', '');
      }
      return this.space.folders.get( id );
    },

    // -- utility -- //
    page_from_title: function(el) {
      var el = $(el).parents(".page:first"),
          folder_id = null,
          page_id   = null;

      var folder = this.space.folders.get(el.attr('data-folder'));
      if (folder) {
        return folder.pages.get(el.attr('data-page'));
      }

      return null;
    },

    resource_data: function(resource) {
      return $.extend(true, resource.toJSON(), {
        path: resource.path()
      });
    },


    render_folder: function(f) {
      var data    = this.resource_data(f),
          entry   = this.templates.folder(data),
          target  = this.$el,
          el      = target.append( entry ).children().last();

      console.log("- rendering folder -")

      f.ctx.browser = {
        el:               el,
        title:            el.find('> a.folder-title'),
        anchor:           el.find('> a.folder-title'),
        title_icon:       el.find('> a.folder-title i'),
        folder_listing:   el.find('ol.folders'),
        collapser:        el.find('button[data-collapse]'),
        page_listing:     el.find('ol.pages'),
        empty_label:      el.find('.empty-folder')
      };

      f.pages.on('add',           this.render_page, this);
      // f.pages.on('add',           this.reorder_page, this);
      f.pages.on('remove',        this.remove_page, this);
      f.pages.on('sync',          this.on_page_loaded, this);
      f.pages.on('change:title',  this.update_title, this);
      f.pages.on('change:title',  this.reorder_page, this);
      f.pages.on('change:folder_id',  this.reparent_page, this);

      f.ctx.browser.empty_label.show();

      f.trigger('change:parent.id', f);

      this.impl.on_folder_rendered(f);

      return this;
    },

    remove_folder: function(folder) {
      folder.ctx.browser.el.remove();

      if (this.ctx.current_folder == folder) {
        this.space.trigger('reset');
      }
    },


    render_page: function(page) {
      var data    = $.extend(true, this.resource_data(page), { folder: { id: page.folder.get('id') } }),
          folder  = page.folder,
          el      = folder.ctx.browser.page_listing.
                    append(this.templates.page(data)).children().last();

      folder.ctx.browser.empty_label.hide();

      page.ctx.browser = {
        el:         el,
        anchor:     el.find('a'),
        title:      el.find('a'),
        title_icon: el.find('i')
      }

      // TODO: what's up with this?
      // if (page.isNew()) {
      //   page.save();
      // }

      this.impl.on_page_rendered(page);

      return this;
    },

    remove_page: function(page) {
      page.ctx.browser.el.remove();

      // is the last folder empty now?
      if (page.collection.folder.pages.length == 0) {
        page.collection.folder.ctx.browser.empty_label.show();
      }

      // TODO: the conditional is redundant since only the current
      // page can be destroyed anyway
      if (this.ctx.current_page == page) {
        this.space.trigger('reset', page);
        this.ctx.current_folder = page.folder;
      }
    },

    proxy_highlight_folder: function(e) {
      var folder = this.folder_from_title($(e.target));

      this.highlight_folder(folder);

      e.preventDefault();
      return false;
    },

    highlight_folder: function(folder) {
      this.reset_highlights();

      if (this.ctx.selected_folder) {
        this.impl.dehighlight_folder(this.ctx.selected_folder);
      }

      this.impl.highlight_folder(folder);
      this.ctx.selected_folder = folder;
      this.space.trigger('folder_selected', folder);
    },

    proxy_highlight_page: function(e) {
      var page = this.page_from_title($(e.target));

      this.highlight_page(page);

      e.preventDefault();
      return false;
    },

    highlight_page: function(page) {
      this.reset_highlights();

      if (this.ctx.selected_page) {
        this.impl.dehighlight_page(this.ctx.selected_page);
      }

      this.impl.highlight_page(page);
      this.ctx.selected_page = page;
      this.space.trigger('page_selected', page);
    },

    // focus: function(page) {
    //   this.elements.scroller.scrollTop(page.ctx.browser.el.position().top);

    //   return this;
    // },

    switch_to_folder: function(f, silent) {
      if (!f) { console.log("[browser] WARNING: switch_to_folder called with an undefined folder"); return false; } // TODO: when does this happen?

      var last_folder = this.ctx.current_folder;

      if (!silent)
        this.space.trigger('reset');

      if (f == this.ctx.current_folder) {
        return false;
      }

      this.impl.on_folder_loaded(f, last_folder);
      this.impl.highlight_current_folder(f);

      this.ctx.current_folder = f;
      this.space.trigger('folder_loaded', f);

      return true;
    },

    switch_to_folder_and_load_page: function(page) {
      var browser = this;

      console.log('[browser] -- switching to page --');

      page.fetch({
        wait: true,
        success: function() {
          if (page.folder != browser.ctx.current_folder)
            browser.switch_to_folder(page.folder, true);

          browser.reset_current_highlights();

          browser.ctx.current_page  = page;
          // browser.ctx.current_folder = page.folder;

          browser.impl.highlight_current_page(page);
          browser.space.trigger('page_loaded', page);
        }
      });

      return true;
    },

    reparent_page: function(page) {
      var old_folder = this.space.folders.get(page._previousAttributes.folder_id),
          folder     = this.space.folders.get(page.get('folder_id'));

      if (!old_folder) {
        console.log("Unable to locate old folder of page " + page.get('id') + "! can't reparent");
        return false;
      }

      old_folder.pages.remove(page);
      folder.pages.add(page);

      this.space.trigger('reset');
      this.space.trigger('load_page', page);
      this.space.trigger('current_page_updated', page);

      this.reorder_page(page);

      return true;
    },

    update_title: function(r) {
      var icon = r.ctx.browser.title_icon.detach();

      r.ctx.browser.title.html(r.get('title')).prepend(icon);
      r.ctx.browser.anchor.attr('href', '#' + r.path());

      return true;
    },

    reorder_folder: function(f) {
      var parent = f.get_parent();

      if (f.ctx.browser && parent && parent.ctx.browser) {
        var listing = parent.ctx.browser.folder_listing,
            el      = f.ctx.browser.el;

        // parent.ctx.browser.el.show();

        listing.append(el);
        listing.find('> li').tsort('> .folder-title');
      }
    },

    reorder_page: function(page) {
      var listing = page.collection.folder.ctx.browser.page_listing,
          el      = page.ctx.browser.el;

      console.log("repositioning page within " + page.collection.folder.get("title"))

      listing.append(el);
      listing.find('li').tsort('> a:first-child');
    }

  });
});