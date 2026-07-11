import type { Meta, StoryObj } from '@storybook/react';
import { PortalBadge } from './portal-badge';

const meta: Meta<typeof PortalBadge> = {
  title: 'Portal/PortalBadge',
  component: PortalBadge,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'success', 'warning', 'destructive', 'muted', 'accent'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof PortalBadge>;

export const Primary: Story = {
  args: {
    children: 'Activo',
    variant: 'primary',
  },
};

export const Success: Story = {
  args: {
    children: 'Completado',
    variant: 'success',
  },
};

export const Warning: Story = {
  args: {
    children: 'Pendiente',
    variant: 'warning',
  },
};

export const Destructive: Story = {
  args: {
    children: 'Cancelado',
    variant: 'destructive',
  },
};

export const Muted: Story = {
  args: {
    children: 'Inactivo',
    variant: 'muted',
  },
};

export const Accent: Story = {
  args: {
    children: 'Premium',
    variant: 'accent',
  },
};

export const WithDot: Story = {
  args: {
    children: (
      <>
        <span className="w-1.5 h-1.5 rounded-full bg-current mr-1" />
        En línea
      </>
    ),
    variant: 'success',
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <PortalBadge variant="primary">Primary</PortalBadge>
      <PortalBadge variant="success">Success</PortalBadge>
      <PortalBadge variant="warning">Warning</PortalBadge>
      <PortalBadge variant="destructive">Destructive</PortalBadge>
      <PortalBadge variant="muted">Muted</PortalBadge>
      <PortalBadge variant="accent">Accent</PortalBadge>
    </div>
  ),
};
