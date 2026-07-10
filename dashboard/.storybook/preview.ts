import type { Preview } from '@storybook/react';
import '../app/globals.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: 'hsl(210 20% 98%)' },
        { name: 'dark', value: 'hsl(168 15% 6%)' },
      ],
    },
  },
  tags: ['autodocs'],
};

export default preview;
