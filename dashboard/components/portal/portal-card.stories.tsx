import type { Meta, StoryObj } from '@storybook/react';
import { PortalCard } from './portal-card';

const meta: Meta<typeof PortalCard> = {
  title: 'Portal/PortalCard',
  component: PortalCard,
  tags: ['autodocs'],
  argTypes: {
    padding: {
      control: 'select',
      options: ['none', 'sm', 'md', 'lg'],
    },
    hover: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof PortalCard>;

export const Default: Story = {
  args: {
    children: <div className="text-sm">Contenido de la tarjeta</div>,
    padding: 'md',
  },
};

export const WithHover: Story = {
  args: {
    children: <div className="text-sm">Tarjeta con hover effect</div>,
    hover: true,
    padding: 'md',
  },
};

export const PaddingSm: Story = {
  args: {
    children: <div className="text-sm">Padding pequeño</div>,
    padding: 'sm',
  },
};

export const PaddingLg: Story = {
  args: {
    children: (
      <div className="space-y-2">
        <p className="font-semibold text-portal-fg">Título</p>
        <p className="text-sm text-portal-muted-fg">
          Tarjeta con padding grande y contenido multiple
        </p>
      </div>
    ),
    padding: 'lg',
  },
};

export const Clickable: Story = {
  args: {
    children: <div className="text-sm">Hacé clic aquí</div>,
    hover: true,
    onClick: () => alert('Clic en la tarjeta'),
    padding: 'md',
  },
};

export const NoPadding: Story = {
  args: {
    children: (
      <div className="p-4 text-sm">Sin padding (control manual)</div>
    ),
    padding: 'none',
  },
};
