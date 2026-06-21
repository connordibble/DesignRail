import { defineComponentSchema, defineProp, type ShoelaceComponentSchema } from '../core.js';

/** Shoelace `<sl-button>` — https://shoelace.style/components/button */
export const buttonSchema: ShoelaceComponentSchema = defineComponentSchema({
  componentType: 'Button',
  tag: 'sl-button',
  sourceUrl: 'https://shoelace.style/components/button',
  props: [
    defineProp({
      name: 'variant',
      kind: 'enum',
      values: ['default', 'primary', 'success', 'neutral', 'warning', 'danger', 'text'],
      default: 'default',
      intentKeys: ['variant', 'appearance'],
    }),
    defineProp({
      name: 'size',
      kind: 'enum',
      values: ['small', 'medium', 'large'],
      default: 'medium',
      intentKeys: ['size'],
    }),
    defineProp({ name: 'disabled', kind: 'boolean', default: false, intentKeys: ['disabled'] }),
  ],
  slots: [{ name: 'default', label: 'Label', description: 'The button label.' }],
  events: [
    // Button click is the native DOM event; Shoelace does not emit a custom click.
    { designEvent: 'click', kind: 'native', reactHandler: 'onClick' },
    { designEvent: 'focus', kind: 'custom', shoelaceEvent: 'sl-focus', reactHandler: 'onSlFocus' },
    { designEvent: 'blur', kind: 'custom', shoelaceEvent: 'sl-blur', reactHandler: 'onSlBlur' },
  ],
  parts: ['base', 'prefix', 'label', 'suffix', 'caret', 'spinner'],
});
