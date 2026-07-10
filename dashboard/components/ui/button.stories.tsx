import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './button';
import { ChevronRight, Trash2, Sun, X } from 'lucide-react';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg', 'icon'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {
  args: {
    children: 'Button',
    variant: 'default',
  },
};

export const Destructive: Story = {
  args: {
    children: 'Eliminar',
    variant: 'destructive',
  },
};

export const Outline: Story = {
  args: {
    children: 'Cancelar',
    variant: 'outline',
  },
};

export const Secondary: Story = {
  args: {
    children: 'Guardar borrador',
    variant: 'secondary',
  },
};

export const Ghost: Story = {
  args: {
    children: 'Descartar',
    variant: 'ghost',
  },
};

export const Link: Story = {
  args: {
    children: 'Ver más',
    variant: 'link',
  },
};

export const Small: Story = {
  args: {
    children: 'Editar',
    size: 'sm',
  },
};

export const Large: Story = {
  args: {
    children: 'Crear turno',
    size: 'lg',
  },
};

export const Icon: Story = {
  args: {
    children: <Trash2 className="h-4 w-4" />,
    size: 'icon',
    'aria-label': 'Eliminar',
  },
};

export const WithIcon: Story = {
  args: {
    children: (
      <>
        Siguiente <ChevronRight className="ml-1 h-4 w-4" />
      </>
    ),
  },
};

export const Disabled: Story = {
  args: {
    children: 'Guardar',
    disabled: true,
  },
};

export const AsChildLink: Story = {
  args: {
    children: <a href="https://example.com">Ir al sitio</a>,
    asChild: true,
    variant: 'link',
  },
};
