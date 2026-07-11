import type { Meta, StoryObj } from '@storybook/react';
import { PortalSkeleton } from './portal-skeleton';

const meta: Meta<typeof PortalSkeleton> = {
  title: 'Portal/PortalSkeleton',
  component: PortalSkeleton,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof PortalSkeleton>;

export const Default: Story = {
  args: {},
};
