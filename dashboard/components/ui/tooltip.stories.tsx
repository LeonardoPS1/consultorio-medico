import type { Meta, StoryObj } from '@storybook/react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './tooltip';
import { Button } from './button';

const meta: Meta<typeof TooltipContent> = {
  title: 'UI/Tooltip',
  component: TooltipContent,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof TooltipContent>;

export const Default: Story = {
  render: () => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="icon" aria-label="Editar">
            ✏️
          </Button>
        </TooltipTrigger>
        <TooltipContent>Editar paciente</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
};

export const RichContent: Story = {
  render: () => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline">Hover me</Button>
        </TooltipTrigger>
        <TooltipContent className="space-y-1">
          <p className="font-medium">Juan Pérez</p>
          <p className="text-muted-foreground">+56 9 1234 5678</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
};
