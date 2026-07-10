import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from './badge';

const meta: Meta<typeof Badge> = {
  title: 'UI/Badge',
  component: Badge,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'secondary', 'destructive', 'outline'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Default: Story = {
  args: {
    children: 'Activo',
    variant: 'default',
  },
};

export const Secondary: Story = {
  args: {
    children: 'Pendiente',
    variant: 'secondary',
  },
};

export const Destructive: Story = {
  args: {
    children: 'Cancelado',
    variant: 'destructive',
  },
};

export const Outline: Story = {
  args: {
    children: 'Borrador',
    variant: 'outline',
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex gap-2 flex-wrap">
      <Badge variant="default">Activo</Badge>
      <Badge variant="secondary">Pendiente</Badge>
      <Badge variant="destructive">Cancelado</Badge>
      <Badge variant="outline">Borrador</Badge>
    </div>
  ),
};
