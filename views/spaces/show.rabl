object @space

extends "spaces/_show"

node(:root_folder) do |s|
  partial "folders/_show", object: s.root_folder
end

node(:folders) do |s|
  s.folders.map { |f| partial "folders/_show_with_pages", object: f }
end

node(:memberships) do |s|
  s.users.collect { |u|
    out = {
      id:       u.id,
      nickname: u.nickname,
      role:     s.role_of(u),
      contributions: {
        nr_pages: s.pages.all({ creator: u }).count,
        nr_folders: s.folders.all({ creator: u }).count
      }
    }

    if respond_to?(:gravatar_url)
      out[:gravatar] = gravatar_url(u.gravatar_email, :size => 24)
    end

    out
  }
end

node(:preferences) do |s|
  s.preferences
end