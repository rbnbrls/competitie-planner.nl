import type { Meta, StoryObj } from '@storybook/react';
import { Modal } from './Modal';
import { Button } from './Button';
import { useState } from 'react';

const meta: Meta<typeof Modal> = {
  title: 'Components/Modal',
  component: Modal,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    maxWidth: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl'],
      description: 'Maximum width of the modal',
    },
    showCloseButton: {
      control: 'boolean',
      description: 'Show close button in header',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Modal>;

const ModalWithState = (args: any) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Open Modal</Button>
      <Modal {...args} isOpen={isOpen} onClose={() => setIsOpen(false)}>
        {args.children}
      </Modal>
    </>
  );
};

export const Default: Story = {
  render: (args) => ModalWithState(args),
  args: {
    title: 'Modal Title',
    description: 'This is a modal description',
    children: <p>Modal content goes here.</p>,
    maxWidth: 'md',
    showCloseButton: true,
  },
};

export const WithFooter: Story = {
  render: (args) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <>
        <Button onClick={() => setIsOpen(true)}>Open Modal</Button>
        <Modal
          {...args}
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button onClick={() => setIsOpen(false)}>Confirm</Button>
            </>
          }
        >
          <p>Are you sure you want to proceed with this action?</p>
        </Modal>
      </>
    );
  },
  args: {
    title: 'Confirmation',
    description: 'Please confirm your action',
    children: <p>This action cannot be undone.</p>,
  },
};

export const Small: Story = {
  render: (args) => ModalWithState(args),
  args: {
    title: 'Small Modal',
    maxWidth: 'sm',
    children: <p>This is a small modal with limited width.</p>,
  },
};

export const Large: Story = {
  render: (args) => ModalWithState(args),
  args: {
    title: 'Large Modal',
    maxWidth: 'lg',
    children: (
      <div>
        <p>This is a large modal with more content space.</p>
        <p>Useful for complex forms or detailed information.</p>
      </div>
    ),
  },
};

export const WithoutCloseButton: Story = {
  render: (args) => ModalWithState(args),
  args: {
    title: 'Modal Without Close Button',
    showCloseButton: false,
    children: <p>Close button is hidden. Use Escape or backdrop to close.</p>,
    footer: <Button onClick={() => {}}>Close</Button>,
  },
};

export const AllSizes: Story = {
  render: () => {
    const [openSize, setOpenSize] = useState<string | null>(null);
    return (
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <Button size="sm" onClick={() => setOpenSize('xs')}>XS</Button>
        <Button size="sm" onClick={() => setOpenSize('sm')}>SM</Button>
        <Button size="sm" onClick={() => setOpenSize('md')}>MD</Button>
        <Button size="sm" onClick={() => setOpenSize('lg')}>LG</Button>
        <Button size="sm" onClick={() => setOpenSize('xl')}>XL</Button>
        {openSize && (
          <Modal
            isOpen={true}
            onClose={() => setOpenSize(null)}
            title={`Size: ${openSize.toUpperCase()}`}
            maxWidth={openSize as any}
          >
            <p>Modal width: {openSize}</p>
          </Modal>
        )}
      </div>
    );
  },
};
