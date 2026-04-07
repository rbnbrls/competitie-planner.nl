import type { Meta, StoryObj } from '@storybook/react';
import { Pagination } from './Pagination';
import { useState } from 'react';

const meta: Meta<typeof Pagination> = {
  title: 'Components/Pagination',
  component: Pagination,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Pagination>;

export const Default: Story = {
  args: {
    currentPage: 1,
    totalPages: 10,
    onPageChange: () => {},
  },
};

export const MiddlePage: Story = {
  args: {
    currentPage: 5,
    totalPages: 10,
    onPageChange: () => {},
  },
};

export const LastPage: Story = {
  args: {
    currentPage: 10,
    totalPages: 10,
    onPageChange: () => {},
  },
};

export const FewPages: Story = {
  args: {
    currentPage: 2,
    totalPages: 3,
    onPageChange: () => {},
  },
};

export const Disabled: Story = {
  args: {
    currentPage: 3,
    totalPages: 10,
    onPageChange: () => {},
    isDisabled: true,
  },
};

export const Interactive: Story = {
  render: () => {
    const [page, setPage] = useState(1);
    return (
      <div style={{ width: '100%', minWidth: '400px' }}>
        <Pagination currentPage={page} totalPages={10} onPageChange={setPage} />
        <p style={{ textAlign: 'center', marginTop: '1rem', color: '#666' }}>Current page: {page}</p>
      </div>
    );
  },
};

export const ManyPages: Story = {
  render: () => {
    const [page, setPage] = useState(1);
    return (
      <div style={{ width: '100%', minWidth: '400px' }}>
        <Pagination currentPage={page} totalPages={50} onPageChange={setPage} />
        <p style={{ textAlign: 'center', marginTop: '1rem', color: '#666' }}>Current page: {page}</p>
      </div>
    );
  },
};
