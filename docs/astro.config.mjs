import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';

export default defineConfig({
  integrations: [
    starlight({
      title: 'DesignRail',
      description: 'Design-to-engineering handoff review platform.',
      sidebar: [
        { label: 'Overview', link: '/' },
        { label: 'Checkpoint 1 Contract', link: '/c1-contract/' },
        { label: 'Checkpoint 2 Pipeline', link: '/c2-pipeline/' },
        {
          label: 'Architecture Decisions',
          autogenerate: { directory: 'decisions' },
        },
      ],
    }),
  ],
});
