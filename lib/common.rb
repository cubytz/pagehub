# encoding: UTF-8

require 'addressable/uri'

class Hash
  # Removes a key from the hash and returns the hash
  def delete!(key)
    self.delete(key)
    self
  end

  # Merges self with another hash, recursively.
  #
  # This code was lovingly stolen from some random gem:
  # http://gemjack.com/gems/tartan-0.1.1/classes/Hash.html
  #
  # Thanks to whoever made it.
  def deep_merge(hash)
    target = dup

    hash.keys.each do |key|
      if hash[key].is_a? Hash and self[key].is_a? Hash
        target[key] = target[key].deep_merge(hash[key])
        next
      end

      target[key] = hash[key]
    end

    target
  end
end

class String
  def sanitize
    Addressable::URI.
      parse(self.
            downcase.
            gsub(/[[:^word:]]/u,'-').
            squeeze('-').chomp('-')
      ).normalized_path
  end

  def is_email?
    (self =~ /^[a-zA-Z][\w\.-]*[a-zA-Z0-9]@[a-zA-Z0-9][\w\.-]*[a-zA-Z0-9]\.[a-zA-Z][a-zA-Z\.]*[a-zA-Z]$/u) != nil
  end

  def to_markdown
    PageHub::Markdown.render!(self)
  end

  def minify(type = :css)
    case type
    when :css
      self.gsub(/(;\s+)/, ';').gsub(/\n+\s*/, '').gsub(/\s+\{\s*/, '{').gsub(/\s+\}/, '}')
    end
  end
end