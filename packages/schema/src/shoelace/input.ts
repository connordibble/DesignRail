import { defineComponentSchema, defineProp, type ShoelaceComponentSchema } from '../core.js';

/** Shoelace `<sl-input>` — https://shoelace.style/components/input */
export const inputSchema: ShoelaceComponentSchema = defineComponentSchema({
  componentType: 'Input',
  tag: 'sl-input',
  sourceUrl: 'https://shoelace.style/components/input',
  props: [
    defineProp({
      name: 'type',
      kind: 'enum',
      values: ['text', 'email', 'number', 'password', 'search', 'tel', 'url', 'date'],
      default: 'text',
      intentKeys: ['type', 'inputType'],
    }),
    defineProp({
      name: 'size',
      kind: 'enum',
      values: ['small', 'medium', 'large'],
      default: 'medium',
      intentKeys: ['size'],
    }),
    defineProp({ name: 'label', kind: 'string', intentKeys: ['label'] }),
    defineProp({ name: 'placeholder', kind: 'string', intentKeys: ['placeholder'] }),
    defineProp({ name: 'value', kind: 'string', intentKeys: ['value', 'defaultValue'] }),
    // help-text diverges between markup (kebab) and the React wrapper (camel).
    defineProp({
      name: 'helpText',
      kind: 'string',
      htmlAttribute: 'help-text',
      reactProp: 'helpText',
      intentKeys: ['helpText', 'help'],
    }),
    defineProp({ name: 'disabled', kind: 'boolean', default: false, intentKeys: ['disabled'] }),
    defineProp({ name: 'required', kind: 'boolean', default: false, intentKeys: ['required'] }),
  ],
  // No `default` slot: an input is childless, rendered as <sl-input ...></sl-input>.
  slots: [
    { name: 'label', description: 'The input label, when richer than plain text.' },
    { name: 'help-text', description: 'Help text shown below the input.' },
  ],
  events: [
    { designEvent: 'input', kind: 'custom', shoelaceEvent: 'sl-input', reactHandler: 'onSlInput' },
    {
      designEvent: 'change',
      kind: 'custom',
      shoelaceEvent: 'sl-change',
      reactHandler: 'onSlChange',
    },
    { designEvent: 'focus', kind: 'custom', shoelaceEvent: 'sl-focus', reactHandler: 'onSlFocus' },
    { designEvent: 'blur', kind: 'custom', shoelaceEvent: 'sl-blur', reactHandler: 'onSlBlur' },
  ],
  parts: ['form-control', 'form-control-label', 'base', 'input', 'prefix', 'suffix'],
});
