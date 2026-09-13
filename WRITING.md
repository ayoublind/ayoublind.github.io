# Writing a post

## Filename

```
_posts/YYYY-MM-DD-a-url-slug.md
```

The date and the slug both matter: the date orders the listing, and the slug becomes
the URL — `_posts/2026-09-14-scaling-crawlers.md` publishes to `/blog/scaling-crawlers/`.
A file with an invalid or future date will not build.

## Front matter

Every post starts with a YAML block between `---` fences:

```yaml
---
title: "Why your Elasticsearch mappings decide your latency"
description: >-
  One or two sentences. Shown on the listing card, in the RSS feed,
  and as the meta description for search engines.
tags: [elasticsearch, backend, performance]
draft: true
---
```

| Key | Required | Notes |
|---|---|---|
| `title` | yes | Quote it if it contains a colon. |
| `description` | no | Falls back to the first paragraph. Worth writing. |
| `tags` | no | Lowercase, rendered as chips. |
| `draft` | no | `true` shows a Draft badge. **Remove it to publish properly.** |

`layout: post` is applied automatically — you do not need to set it.

## Drafts

`draft: true` only adds a visible badge; the post is **still published and still in the
RSS feed**. To keep something genuinely unpublished, either:

- keep it in `_drafts/` instead of `_posts/` (no date in the filename needed), or
- give it a future date — Jekyll skips those unless built with `--future`.

## Writing

Standard GitHub-flavoured Markdown. Fenced code blocks get syntax highlighting via
Rouge:

    ```json
    { "type": "keyword" }
    ```

One gotcha: Liquid runs before Markdown, so a literal `{{` or `{%` inside a code block
will be parsed as a template tag and break the build. Wrap those blocks:

    {% raw %}
    ```js
    const tpl = `{{ name }}`;
    ```
    {% endraw %}

## Publishing

```bash
git add _posts/2026-09-14-scaling-crawlers.md
git commit -m "post: scaling crawlers"
git push
```

GitHub Pages rebuilds automatically, usually within a minute. Build failures arrive by
email and show up under the repo's Actions tab.

## Previewing locally (optional)

Needs Ruby. From the repo root:

```bash
bundle install        # once
bundle exec jekyll serve --drafts --livereload
```

Then open <http://127.0.0.1:4000>. Changes to `_config.yml` require a restart; nothing
else does.
