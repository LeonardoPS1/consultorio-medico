import type { Meta, StoryObj } from '@storybook/react';
import { PortalButton } from './portal-button';
import { ChevronRight, ShieldCheck } from 'lucide-react';

const meta: Meta<typeof PortalButton> = {
  title: 'Portal/PortalButton',
  component: PortalButton,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof PortalButton>;

export const Primary: Story = {
  args: {
    children: 'Agendar turno',
    variant: 'primary',
  },
};

export const Secondary: Story = {
  args: {
    children: 'Cancelar',
    variant: 'secondary',
  },
};

export const Ghost: Story = {
  args: {
    children: 'Descartar',
    variant: 'ghost',
  },
};

export const Loading: Story = {
  args: {
    children: 'Guardando...',
    loading: true,
  },
};

export const FullWidth: Story = {
  args: {
    children: 'Confirmar pago',
    fullWidth: true,
  },
};

export const Disabled: Story = {
  args: {
    children: 'Guardar',
    disabled: true,
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

export const SecondaryFullWidth: Story = {
  args: {
    children: (
      <>
        <ShieldCheck className="mr-1.5 h-4 w-4" />
        Verificar
      </>
    ),
    variant: 'secondary',
    fullWidth: true,
  },
};
