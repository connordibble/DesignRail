import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        dr: {
          accent: 'var(--dr-color-accent)',
          'accent-hover': 'var(--dr-color-accent-hover)',
          'accent-soft': 'var(--dr-color-accent-soft)',
          canvas: 'var(--dr-color-canvas)',
          shell: 'var(--dr-color-shell)',
          panel: 'var(--dr-color-panel)',
          'panel-raised': 'var(--dr-color-panel-raised)',
          'panel-hover': 'var(--dr-color-panel-hover)',
          border: 'var(--dr-color-border)',
          'border-strong': 'var(--dr-color-border-strong)',
          text: 'var(--dr-color-text)',
          muted: 'var(--dr-color-text-muted)',
          subtle: 'var(--dr-color-text-subtle)',
          'code-bg': 'var(--dr-color-code-bg)',
          'code-border': 'var(--dr-color-code-border)',
          success: 'var(--dr-color-success)',
          warning: 'var(--dr-color-warning)',
          danger: 'var(--dr-color-danger)',
          info: 'var(--dr-color-info)',
          edited: 'var(--dr-color-edited)',
        },
      },
      spacing: {
        'dr-xxs': 'var(--dr-space-xxs)',
        'dr-xs': 'var(--dr-space-xs)',
        'dr-sm': 'var(--dr-space-sm)',
        'dr-md': 'var(--dr-space-md)',
        'dr-lg': 'var(--dr-space-lg)',
        'dr-xl': 'var(--dr-space-xl)',
      },
      borderRadius: {
        'dr-xs': 'var(--dr-radius-xs)',
        'dr-sm': 'var(--dr-radius-sm)',
        'dr-md': 'var(--dr-radius-md)',
        'dr-lg': 'var(--dr-radius-lg)',
      },
      fontFamily: {
        ui: 'var(--dr-font-ui)',
        mono: 'var(--dr-font-mono)',
      },
      fontSize: {
        'dr-page-title': ['24px', { lineHeight: '32px', letterSpacing: '0' }],
        'dr-section-title': ['15px', { lineHeight: '22px', letterSpacing: '0' }],
        'dr-body': ['14px', { lineHeight: '20px', letterSpacing: '0' }],
        'dr-small': ['13px', { lineHeight: '18px', letterSpacing: '0' }],
        'dr-caption': ['12px', { lineHeight: '16px', letterSpacing: '0' }],
        'dr-code': ['12.5px', { lineHeight: '18px', letterSpacing: '0' }],
      },
    },
  },
  plugins: [],
};

export default config;
