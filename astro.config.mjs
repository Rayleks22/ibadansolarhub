import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://ibadansolarhub.com.ng',
  output: 'static',

  /*
    Make the trailing-slash policy explicit rather than implicit.
    Every page is /foo/ and /foo 308-redirects to it — which is already what the
    live host does, but pinning it here stops a future config change from
    silently introducing duplicate URLs.
  */
  trailingSlash: 'always',

  build: {
    /*
      Emit /foo/index.html so the host can serve clean URLs, and keep assets
      grouped under /_astro (already covered by the immutable cache rule in
      public/_headers).
    */
    format: 'directory',
  },

  integrations: [
    tailwind({
      applyBaseStyles: false,
    }),
    react(),
    sitemap({
      /*
        NOTE ON lastmod: intentionally omitted.
        The only honest source would be per-page modification dates. Emitting the
        build timestamp on every URL makes lastmod meaningless noise on a site
        that rebuilds often, and Google learns to ignore it. If per-page dates
        are added to the content later, wire them here via `serialize`.

        Also: sitemap-index.xml + sitemap-0.xml are the authoritative maps.
        A stale hand-written public/sitemap.xml was removed on 5 Oct 2026.
      */
      filter: (page) => !page.includes('/404'),
    }),
  ],
});
