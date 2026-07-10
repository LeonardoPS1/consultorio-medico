import type { Meta, StoryObj } from '@storybook/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './card';
import { Button } from './button';

const meta: Meta<typeof Card> = {
  title: 'UI/Card',
  component: Card,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card Description</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Card Content</p>
      </CardContent>
      <CardFooter>
        <p>Card Footer</p>
      </CardFooter>
    </Card>
  ),
};

export const WithAction: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Nuevo turno</CardTitle>
        <CardDescription>Agendá una cita médica</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm">Dr. Juan Pérez</p>
        <p className="text-sm text-muted-foreground">15 jul 2026 · 10:30</p>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline">Cancelar</Button>
        <Button>Confirmar</Button>
      </CardFooter>
    </Card>
  ),
};

export const Simple: Story = {
  render: () => (
    <Card className="w-[350px] p-6">
      <p className="text-sm font-semibold">Total pacientes hoy</p>
      <p className="text-3xl font-bold mt-1">12</p>
      <p className="text-xs text-muted-foreground mt-1">+3 vs ayer</p>
    </Card>
  ),
};
