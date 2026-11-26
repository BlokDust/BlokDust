import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const copy = {
  title: z.string().min(1),
  heading: z.string().min(1).optional(),
  description: z.string().min(1),
  legacySource: z.string().url().optional(),
  artwork: z.string().optional(),
  tileTitle: z.string().min(1).optional(),
  image: z
    .object({
      src: z.string().startsWith('/guide-media/'),
      alt: z.string().min(1),
      theme: z
        .enum([
          'arrow-mountain',
          'ash-peak',
          'fjord',
          'friends',
          'ikko',
          'mode-stereo',
          'pencil-control',
          'sea-cucumber',
          'volcanologist',
        ])
        .optional(),
      width: z.number().int().positive(),
      height: z.number().int().positive(),
    })
    .optional(),
};

const blocks = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/blocks' }),
  schema: z.object({
    ...copy,
    blockId: z.string(),
    category: z.enum(['source', 'effect', 'power', 'interaction']),
    examples: z
      .array(
        z.object({
          title: z.string().min(1),
          href: z
            .string()
            .refine(
              (href) => /^\/(?!\/)/.test(href) || href.startsWith('https://'),
              'Use a site path or an HTTPS URL',
            ),
        }),
      )
      .default([]),
  }),
});

const shortcut = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
});

const guide = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/guide' }),
  schema: z.object({
    ...copy,
    shortcuts: z
      .array(
        z.object({
          title: z.string().min(1),
          rows: z
            .array(
              z.union([
                shortcut.extend({
                  keys: z.array(z.array(z.string().min(1)).nonempty()).nonempty(),
                }),
                shortcut.extend({
                  piano: z.array(z.array(z.string().min(1)).min(1).max(2)).nonempty(),
                }),
              ]),
            )
            .nonempty(),
        }),
      )
      .nonempty()
      .optional(),
    platforms: z
      .array(
        z.object({
          key: z.enum(['macos', 'windows']),
          title: z.string().min(1),
          description: z.string().min(1),
          linkLabel: z.string().min(1),
        }),
      )
      .optional(),
    route: z.string().regex(/^[a-z0-9-]+(?:\/[a-z0-9-]+)*$/),
  }),
});

export const collections = { blocks, guide };
