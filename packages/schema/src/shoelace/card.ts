import { defineComponentSchema, type ShoelaceComponentSchema } from '../core.js';

/** Shoelace `<sl-card>` — https://shoelace.style/components/card */
export const cardSchema: ShoelaceComponentSchema = defineComponentSchema({
  componentType: 'Card',
  tag: 'sl-card',
  sourceUrl: 'https://shoelace.style/components/card',
  // sl-card is a styling/layout container: no reactive props and no custom events.
  props: [],
  slots: [
    { name: 'default', label: 'Content', description: 'The card body content.' },
    { name: 'header', description: 'The card header.' },
    { name: 'footer', description: 'The card footer.' },
    { name: 'image', description: 'A cover image at the top of the card.' },
  ],
  events: [],
  parts: ['base', 'image', 'header', 'body', 'footer'],
  // A card is a container, not a labelled control — it does not require an accessible name.
  requiresAccessibleName: false,
});
