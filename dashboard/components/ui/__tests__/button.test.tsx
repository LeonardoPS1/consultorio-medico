import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@/components/ui/button';

describe('Button', () => {
  it('renderiza con texto', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('renderiza con variante default por defecto', () => {
    render(<Button>Default</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-primary');
  });

  it('aplica variante destructive', () => {
    render(<Button variant="destructive">Eliminar</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-destructive');
  });

  it('aplica variante outline', () => {
    render(<Button variant="outline">Outline</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('border-input');
  });

  it('aplica variante ghost', () => {
    render(<Button variant="ghost">Ghost</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('hoverable:hover:bg-accent');
  });

  it('aplica variante link', () => {
    render(<Button variant="link">Link</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('underline-offset-4');
  });

  it('aplica tamaño sm', () => {
    render(<Button size="sm">Small</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('h-7');
  });

  it('aplica tamaño lg', () => {
    render(<Button size="lg">Large</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('h-10');
  });

  it('aplica tamaño icon', () => {
    render(<Button size="icon">+</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('w-9');
  });

  it('está deshabilitado cuando disabled=true', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('renderiza como Slot si asChild=true', () => {
    render(
      <Button asChild>
        <a href="/test">Link Button</a>
      </Button>,
    );
    const link = screen.getByRole('link', { name: /link button/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveClass('bg-primary');
  });

  it('maneja clics', async () => {
    const user = userEvent.setup();
    let clicked = false;
    render(
      <Button
        onClick={() => {
          clicked = true;
        }}
      >
        Click
      </Button>,
    );

    await user.click(screen.getByRole('button'));
    expect(clicked).toBe(true);
  });

  it('no dispara onClick cuando está disabled', async () => {
    const user = userEvent.setup();
    let clicked = false;
    render(
      <Button
        disabled
        onClick={() => {
          clicked = true;
        }}
      >
        No Click
      </Button>,
    );

    await user.click(screen.getByRole('button'));
    expect(clicked).toBe(false);
  });
});
