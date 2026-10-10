import { render, screen } from '@testing-library/react';
import { Save } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { Button } from '@/components/ui/button';

describe('Button', () => {
  it('shows a spinner, hides the leading icon and disables itself while loading', () => {
    const { rerender, container } = render(
      <Button>
        <Save aria-hidden />
        Save
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toBeEnabled();
    expect(container.querySelector('[data-spinner]')).toBeNull();

    rerender(
      <Button loading>
        <Save aria-hidden />
        Save
      </Button>,
    );
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(container.querySelector('[data-spinner]')).not.toBeNull();
  });
});
