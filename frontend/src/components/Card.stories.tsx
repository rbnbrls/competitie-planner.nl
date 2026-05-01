/*
 * File: frontend/src/components/Card.stories.tsx
 * Last updated: 2026-05-01
 * API version: 0.1.0
 * Author: Ruben Barels <ruben@rabar.nl>
 * Changelog:
 *   - 2026-05-01: Initial metadata header added
 */

import type { Meta, StoryObj } from '@storybook/react-vite';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './Card';
import { Button } from './Button';

const meta: Meta<typeof Card> = {
  title: 'Components/Card',
  component: Card,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    children: {
      control: 'text',
      description: 'Card content',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
  args: {
    children: 'Basic card content',
  },
};

export const WithHeader: Story = {
  render: () => (
    <Card>
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>This is a description of the card content.</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Card content goes here. You can add any elements inside.</p>
      </CardContent>
    </Card>
  ),
};

export const WithFooter: Story = {
  render: () => (
    <Card>
      <CardHeader>
        <CardTitle>Interactive Card</CardTitle>
        <CardDescription>Card with footer actions</CardDescription>
      </CardHeader>
      <CardContent>
        <p>This card has actions in the footer.</p>
      </CardContent>
      <CardFooter>
        <Button variant="secondary">Cancel</Button>
        <Button>Confirm</Button>
      </CardFooter>
    </Card>
  ),
};

export const CompleteCard: Story = {
  render: () => (
    <Card>
      <CardHeader>
        <CardTitle>Competition Planner</CardTitle>
        <CardDescription>Plan your competitions easily</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Create and manage your sports competitions with ease. Invite teams, schedule matches, and track results all in one place.</p>
      </CardContent>
      <CardFooter>
        <Button variant="outline">Learn More</Button>
        <Button>Get Started</Button>
      </CardFooter>
    </Card>
  ),
};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
      <Card>Default Card</Card>
      <Card style={{ maxWidth: '300px' }}>
        <CardHeader>
          <CardTitle>With Header</CardTitle>
          <CardDescription>Description text</CardDescription>
        </CardHeader>
        <CardContent>Content section</CardContent>
        <CardFooter>Footer section</CardFooter>
      </Card>
    </div>
  ),
};
