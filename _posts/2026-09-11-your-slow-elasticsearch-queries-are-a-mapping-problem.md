---
title: "Your slow Elasticsearch queries are probably a mapping problem"
description: >-
  Most teams tune queries, add shards, and throw heap at a cluster that was
  never going to be fast — because the damage was done at index time.
tags: [elasticsearch, backend, data-engineering, performance]
draft: true
---

Every slow-search investigation I have been part of followed the same arc. Someone
profiles a query, finds an aggregation taking seconds, and starts tuning: adjust the
query DSL, add a filter, raise the heap, add a node. Sometimes it helps a little.

Then someone looks at the mapping, and the real answer is sitting there in plain
sight. The query was never the problem. The query was fine. The index it was running
against had been designed by nobody — which is to say, by Elasticsearch's dynamic
mapping defaults.

## What dynamic mapping actually does to you

Index a document with a string field and never define a mapping, and Elasticsearch
makes a decision on your behalf. That field becomes **two** fields:

```json
{
  "brand": {
    "type": "text",
    "fields": {
      "keyword": {
        "type": "keyword",
        "ignore_above": 256
      }
    }
  }
}
```

The `text` half gets analysed — tokenised, lowercased, run through the standard
analyser — and written to an inverted index for full-text matching. The `keyword`
half is stored verbatim with doc_values, which is what makes sorting, filtering and
aggregating cheap.

That default is a reasonable guess when Elasticsearch knows nothing about your data.
It is a bad outcome when you do. You are paying to index every string twice, in two
different structures, on every document, forever — and for most fields in a product
catalogue you only ever needed one of them.

A SKU is never full-text searched. A currency code has three characters and four
plausible values. A category ID is an exact-match filter. All three get the full
`text` + `keyword` treatment by default, and all three should be plain `keyword`.

## The three mistakes that actually cost you

**Aggregating on an analysed field.** This is the one that produces the dramatic
numbers. If you try to run a terms aggregation on a `text` field, Elasticsearch
refuses unless you set `fielddata: true` — and if you set it, the field gets loaded
into JVM heap, uninverted, at query time. It works in staging with a thousand
documents and takes the cluster down at scale. The fix is not to enable fielddata.
The fix is to aggregate on the `keyword` field, which already has doc_values.

**Letting user data become field names.** Dynamic mapping maps whatever keys it
sees. If you index scraped attributes as a free-form object, every new attribute
name a merchant invents becomes a new field in the mapping. Field count grows without
limit, cluster state grows with it, and every node has to hold that state. The default
`index.mapping.total_fields.limit` is 1000, and hitting it is the *good* outcome —
it fails loudly instead of quietly degrading the whole cluster.

The `flattened` type exists exactly for this. It maps an entire object as a single
field, so arbitrary keys cost you one mapping entry instead of thousands:

```json
{
  "attributes": {
    "type": "flattened"
  }
}
```

The trade-off is real: everything inside becomes keyword-ish, so you lose per-field
analysis and numeric range queries. For scraped attributes of unknown shape, that is
usually the right trade.

**Reaching for `nested` without meaning to.** `nested` is not a free way to keep
objects grouped. Every nested object is indexed as a separate hidden Lucene document,
so a product with 50 variants is 51 documents on disk, and nested queries have to join
across them. Use it when you genuinely need to match multiple fields *within the same
sub-object* — a variant that is both size L and in stock. If you only ever filter on
one field at a time, a plain object is cheaper and behaves fine.

## The settings nobody sets

Once you are writing mappings explicitly, a few flags earn their keep immediately:

- `"index": false` on fields you store but never query. You keep them in `_source`
  for retrieval and stop paying to index them.
- `"doc_values": false` on keyword fields you never sort, aggregate or filter on.
  Doc_values are on by default and they are not free on disk.
- `"norms": false` on short keyword-like text fields. Norms exist for relevance
  scoring by field length, which is meaningless for a two-word brand name.
- `"eager_global_ordinals": true` on keyword fields that back your hot terms
  aggregations. It moves the ordinal-building cost from query time to refresh time,
  which is the right place for it when reads outnumber writes.

None of these are clever. They are just decisions someone has to make, and dynamic
mapping makes all of them wrong by default.

## Why this is expensive to fix later

Here is the part that makes mappings worth getting right early: **you cannot change
the type of an existing field.** The mapping for a live index is effectively
immutable. Changing `text` to `keyword` means creating a new index with the correct
mapping and reindexing every document into it.

At small scale that is an afternoon. At [ your document count ] documents it is a
capacity-planned operation with an alias swap, a dual-write window, and a rollback
plan. The cost of a bad mapping is not the latency — it is that the latency becomes
architecture.

Runtime fields take some of the sting out. Since 7.11 you can define a field that is
computed at query time, which lets you fix a missing field without a reindex:

```json
{
  "runtime": {
    "price_with_tax": {
      "type": "double",
      "script": "emit(doc['price'].value * 1.2)"
    }
  }
}
```

That is a genuinely good escape hatch for fields you forgot. It is not a substitute
for a correct mapping on anything in your hot path, because you are paying the
computation on every document, on every query.

## What I do now

Before an index goes anywhere near production:

1. **Disable dynamic mapping on anything user-controlled.** Set
   `"dynamic": "strict"` and let indexing fail loudly on an unexpected field, rather
   than silently growing the mapping.
2. **Write the mapping by hand and check it into the repo,** next to the code that
   queries it. A mapping is schema. Schema belongs in version control.
3. **Decide, per field, what it is actually for** — match, filter, sort, aggregate,
   or just retrieve — and map only for that.
4. **Test the mapping against real query patterns,** not a handful of sample docs.
   The failure mode only appears at cardinality.

None of this is exotic. It is the same discipline you would apply to a relational
schema, applied to a system that will happily let you skip it.

The queries were never the problem.

---

*[ Draft note: replace the bracketed placeholders with your real figures — document
counts, latency before/after, the reindex window. Concrete numbers from the Crawlo
platform are what will make this land, and they are the one thing I could not write
for you. ]*
