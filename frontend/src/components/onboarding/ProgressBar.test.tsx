import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, test, expect, vi } from 'vitest';
import { ProgressBar } from './ProgressBar';

expect.extend(toHaveNoViolations);

describe('ProgressBar', () => {
  const defaultProps = {
    currentStep: 2,
    totalSteps: 4,
    stepLabels: ['Vereniging', 'Teams', 'Banen', 'Wedstrijden'],
  };

  describe('Accessibility', () => {
    test('should have no accessibility violations', async () => {
      const { container } = render(<ProgressBar {...defaultProps} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('should have role="progressbar" with aria attributes on container', () => {
      render(<ProgressBar {...defaultProps} />);
      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '2');
      expect(progressbar).toHaveAttribute('aria-valuemin', '1');
      expect(progressbar).toHaveAttribute('aria-valuemax', '4');
    });

    test('should have aria-label on the navigation element', () => {
      render(<ProgressBar {...defaultProps} />);
      const nav = screen.getByRole('navigation', { name: /onboarding voortgang/i });
      expect(nav).toBeInTheDocument();
    });

    test('should have aria-current="step" on active step button', () => {
      render(<ProgressBar {...defaultProps} />);
      const activeButton = screen.getByRole('button', { name: /Stap 2: Teams, actief/i });
      expect(activeButton).toHaveAttribute('aria-current', 'step');
    });

    test('should not have aria-current on inactive step buttons', () => {
      render(<ProgressBar {...defaultProps} />);
      const inactiveButton = screen.getByRole('button', { name: /Stap 3: Banen/ });
      expect(inactiveButton).not.toHaveAttribute('aria-current');
    });

    test('should have aria-label on each step button', () => {
      render(<ProgressBar {...defaultProps} />);
      
      const completedButton = screen.getByRole('button', { name: /Stap 1: Vereniging, voltooid/i });
      expect(completedButton).toBeInTheDocument();

      const activeButton = screen.getByRole('button', { name: /Stap 2: Teams, actief/i });
      expect(activeButton).toBeInTheDocument();

      const futureButton1 = screen.getByRole('button', { name: /Stap 3: Banen/ });
      expect(futureButton1).toBeInTheDocument();

      const futureButton2 = screen.getByRole('button', { name: /Stap 4: Wedstrijden/ });
      expect(futureButton2).toBeInTheDocument();
    });

    test('should have aria-hidden="true" on inline SVG checkmark', () => {
      render(<ProgressBar {...defaultProps} />);
      const svg = screen.getByRole('button', { name: /Stap 1: Vereniging, voltooid/i }).querySelector('svg');
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('with onStepClick', () => {
    test('should have no accessibility violations when steps are clickable', async () => {
      const { container } = render(<ProgressBar {...defaultProps} onStepClick={() => {}} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('dynamic aria-valuenow', () => {
    test('should update aria-valuenow based on currentStep', () => {
      const { rerender } = render(<ProgressBar {...defaultProps} currentStep={1} />);
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');

      rerender(<ProgressBar {...defaultProps} currentStep={3} />);
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '3');
    });

    test('should move aria-current="step" when currentStep changes', () => {
      const { rerender } = render(<ProgressBar {...defaultProps} currentStep={1} />);
      expect(screen.getByRole('button', { name: /Stap 1: Vereniging, actief/i })).toHaveAttribute('aria-current', 'step');

      rerender(<ProgressBar {...defaultProps} currentStep={2} />);
      expect(screen.getByRole('button', { name: /Stap 2: Teams, actief/i })).toHaveAttribute('aria-current', 'step');
    });
  });

  describe('visual states', () => {
    test('should render correct number of steps', () => {
      render(<ProgressBar {...defaultProps} />);
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(4);
    });

    test('should display step labels correctly', () => {
      render(<ProgressBar {...defaultProps} />);
      defaultProps.stepLabels.forEach(label => {
        expect(screen.getByText(label)).toBeInTheDocument();
      });
    });

    test('should have active step with blue background and ring', () => {
      render(<ProgressBar {...defaultProps} />);
      const activeButton = screen.getByRole('button', { name: /Stap 2: Teams, actief/i });
      expect(activeButton).toHaveClass('bg-blue-600');
      expect(activeButton).toHaveClass('ring-4');
    });

    test('should have completed step with green background and checkmark', () => {
      render(<ProgressBar {...defaultProps} />);
      const completedButton = screen.getByRole('button', { name: /Stap 1: Vereniging, voltooid/i });
      expect(completedButton).toHaveClass('bg-green-600');
      expect(completedButton).toHaveClass('ring-4');
      expect(completedButton.querySelector('svg')).toBeInTheDocument();
    });

    test('should have pending step with gray background', () => {
      render(<ProgressBar {...defaultProps} />);
      const pendingButton = screen.getByRole('button', { name: /Stap 3: Banen/ });
      expect(pendingButton).toHaveClass('bg-gray-200');
      expect(pendingButton).toHaveClass('text-gray-500');
    });

    test('should have active step label with blue text', () => {
      render(<ProgressBar {...defaultProps} />);
      const activeLabel = screen.getByText('Teams');
      expect(activeLabel).toHaveClass('text-blue-700');
    });

    test('should have completed step label with green text', () => {
      render(<ProgressBar {...defaultProps} />);
      const completedLabel = screen.getByText('Vereniging');
      expect(completedLabel).toHaveClass('text-green-700');
    });

    test('should have pending step label with gray text', () => {
      render(<ProgressBar {...defaultProps} />);
      const pendingLabel = screen.getByText('Banen');
      expect(pendingLabel).toHaveClass('text-gray-500');
    });

    test('should render step number for active and pending steps', () => {
      render(<ProgressBar {...defaultProps} />);
      const activeButton = screen.getByRole('button', { name: /Stap 2: Teams, actief/i });
      const pendingButton = screen.getByRole('button', { name: /Stap 3: Banen/ });
      expect(activeButton).toHaveTextContent('2');
      expect(pendingButton).toHaveTextContent('3');
    });
  });

  describe('step clickability', () => {
    test('should not allow clicking completed steps when onStepClick is not provided', () => {
      render(<ProgressBar {...defaultProps} />);
      const completedButton = screen.getByRole('button', { name: /Stap 1: Vereniging, voltooid/i });
      expect(completedButton).toBeDisabled();
    });

    test('should not allow clicking active step when onStepClick is not provided', () => {
      render(<ProgressBar {...defaultProps} />);
      const activeButton = screen.getByRole('button', { name: /Stap 2: Teams, actief/i });
      expect(activeButton).toBeDisabled();
    });

    test('should not allow clicking pending steps when onStepClick is not provided', () => {
      render(<ProgressBar {...defaultProps} />);
      const pendingButton = screen.getByRole('button', { name: /Stap 3: Banen/ });
      expect(pendingButton).toBeDisabled();
    });

    test('should allow clicking completed steps when onStepClick is provided', async () => {
      const onStepClick = vi.fn();
      render(<ProgressBar {...defaultProps} onStepClick={onStepClick} />);
      const completedButton = screen.getByRole('button', { name: /Stap 1: Vereniging, voltooid/i });
      expect(completedButton).not.toBeDisabled();
      await userEvent.click(completedButton);
      expect(onStepClick).toHaveBeenCalledWith(1);
    });

    test('should not allow clicking active step even when onStepClick is provided', () => {
      const onStepClick = vi.fn();
      render(<ProgressBar {...defaultProps} onStepClick={onStepClick} />);
      const activeButton = screen.getByRole('button', { name: /Stap 2: Teams, actief/i });
      expect(activeButton).toBeDisabled();
    });

    test('should not allow clicking pending steps even when onStepClick is provided', () => {
      const onStepClick = vi.fn();
      render(<ProgressBar {...defaultProps} onStepClick={onStepClick} />);
      const pendingButton = screen.getByRole('button', { name: /Stap 3: Banen/ });
      expect(pendingButton).toBeDisabled();
    });

    test('should have cursor-pointer class on completed steps when clickable', () => {
      render(<ProgressBar {...defaultProps} onStepClick={() => {}} />);
      const completedButton = screen.getByRole('button', { name: /Stap 1: Vereniging, voltooid/i });
      expect(completedButton).toHaveClass('cursor-pointer');
    });

    test('should have cursor-default class on non-clickable steps', () => {
      render(<ProgressBar {...defaultProps} />);
      const completedButton = screen.getByRole('button', { name: /Stap 1: Vereniging, voltooid/i });
      const activeButton = screen.getByRole('button', { name: /Stap 2: Teams, actief/i });
      const pendingButton = screen.getByRole('button', { name: /Stap 3: Banen/ });
      expect(completedButton).toHaveClass('cursor-default');
      expect(activeButton).toHaveClass('cursor-default');
      expect(pendingButton).toHaveClass('cursor-default');
    });
  });

  describe('progress indicator', () => {
    test('should have green connector lines for completed steps', () => {
      render(<ProgressBar {...defaultProps} />);
      const connectors = screen.getByRole('navigation', { name: /onboarding voortgang/i })
        .querySelectorAll('.bg-green-500');
      expect(connectors.length).toBeGreaterThan(0);
    });

    test('should have gray connector lines for pending steps', () => {
      render(<ProgressBar {...defaultProps} />);
      const connectors = screen.getByRole('navigation', { name: /onboarding voortgang/i })
        .querySelectorAll('.bg-gray-200');
      expect(connectors.length).toBeGreaterThan(0);
    });
  });
});
