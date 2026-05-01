/*
 * File: frontend/src/components/LoadingSkeleton.stories.tsx
 * Last updated: 2026-05-01
 * API version: 0.1.0
 * Author: Ruben Barels <ruben@rabar.nl>
 * Changelog:
 *   - 2026-05-01: Initial metadata header added
 */

import type { Meta, StoryObj } from '@storybook/react-vite';
import { LoadingSkeleton, Skeleton } from './LoadingSkeleton';

const meta: Meta<typeof LoadingSkeleton> = {
  title: 'Components/LoadingSkeleton',
  component: LoadingSkeleton,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    rows: {
      control: 'number',
      description: 'Number of skeleton rows',
    },
  },
};

export default meta;
type Story = StoryObj<typeof LoadingSkeleton>;

export const Default: Story = {
  args: {
    rows: 3,
  },
};

export const SingleRow: Story = {
  args: {
    rows: 1,
  },
};

export const FiveRows: Story = {
  args: {
    rows: 5,
  },
};

export const WithHeader: Story = {
  render: () => (
    <div style={{ width: '300px' }}>
      <LoadingSkeleton />
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
        <Skeleton className="h-12 w-12 rounded-full" />
        <div style={{ flex: 1 }}>
          <LoadingSkeleton rows={2} />
        </div>
      </div>
    </div>
  ),
};

export const CardExample: Story = {
  render: () => (
    <div style={{ width: '300px' }}>
      <Skeleton className="h-48 w-full rounded-xl mb-4" />
      <Skeleton className="h-6 w-full mb-2" />
      <Skeleton className="h-4 w-3/4 mb-2" />
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
        <Skeleton className="h-8 w-20 rounded" />
        <Skeleton className="h-8 w-20 rounded" />
      </div>
    </div>
  ),
};
