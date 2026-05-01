/*
 * File: frontend/src/components/Select.stories.tsx
 * Last updated: 2026-05-01
 * API version: 0.1.0
 * Author: Ruben Barels <ruben@rabar.nl>
 * Changelog:
 *   - 2026-05-01: Initial metadata header added
 */

import type { Meta, StoryObj } from '@storybook/react-vite';
import { Select } from './Select';

const meta: Meta<typeof Select> = {
  title: 'Components/Select',
  component: Select,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    disabled: {
      control: 'boolean',
      description: 'Disables the select',
    },
    required: {
      control: 'boolean',
      description: 'Shows required indicator',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Select>;

export const Default: Story = {
  args: {
    options: [
      { value: 'option1', label: 'Option 1' },
      { value: 'option2', label: 'Option 2' },
      { value: 'option3', label: 'Option 3' },
    ],
  },
};

export const WithLabel: Story = {
  args: {
    label: 'Select Option',
    options: [
      { value: 'option1', label: 'Option 1' },
      { value: 'option2', label: 'Option 2' },
      { value: 'option3', label: 'Option 3' },
    ],
  },
};

export const WithHelperText: Story = {
  args: {
    label: 'Category',
    helperText: 'Choose a category',
    options: [
      { value: 'sports', label: 'Sports' },
      { value: 'music', label: 'Music' },
      { value: 'art', label: 'Art' },
    ],
  },
};

export const WithError: Story = {
  args: {
    label: 'Selection',
    error: 'Please select an option',
    options: [
      { value: 'option1', label: 'Option 1' },
      { value: 'option2', label: 'Option 2' },
    ],
  },
};

export const Required: Story = {
  args: {
    label: 'Required Select',
    required: true,
    options: [
      { value: '', label: 'Select...' },
      { value: 'a', label: 'Option A' },
      { value: 'b', label: 'Option B' },
    ],
  },
};

export const Disabled: Story = {
  args: {
    label: 'Disabled Select',
    disabled: true,
    options: [
      { value: 'option1', label: 'Option 1' },
      { value: 'option2', label: 'Option 2' },
    ],
  },
};

export const AllStates: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '300px' }}>
      <Select label="Default" options={[{ value: '1', label: 'Option' }]} />
      <Select label="Required" required options={[{ value: '1', label: 'Option' }]} />
      <Select label="Error" error="Error message" options={[{ value: '1', label: 'Option' }]} />
      <Select label="Helper" helperText="Helper text" options={[{ value: '1', label: 'Option' }]} />
      <Select label="Disabled" disabled options={[{ value: '1', label: 'Option' }]} />
    </div>
  ),
};
