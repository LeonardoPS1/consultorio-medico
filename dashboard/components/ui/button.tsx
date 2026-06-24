import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition duration-150 ease-custom-out focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97]',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow hoverable:hover:bg-primary/90',
        destructive:
          'bg-destructive text-destructive-foreground shadow-sm hoverable:hover:bg-destructive/90',
        outline:
          'border border-input bg-background shadow-sm hoverable:hover:bg-accent hoverable:hover:text-accent-foreground',
        secondary:
          'bg-secondary text-secondary-foreground shadow-sm hoverable:hover:bg-secondary/80',
        ghost: 'hoverable:hover:bg-accent hoverable:hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hoverable:hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-7 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-md px-5',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
