import type { Meta, StoryObj } from '@storybook/react';
import { ToastContainer, showToast } from './Toast';

const meta: Meta<typeof ToastContainer> = {
  title: 'Components/Toast',
  component: ToastContainer,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ToastContainer>;

export const Container: Story = {
  render: () => (
    <div style={{ padding: '2rem' }}>
      <p style={{ marginBottom: '1rem' }}>Toast container is automatically positioned at bottom-right.</p>
      <ToastContainer />
    </div>
  ),
};

export const Demo: Story = {
  render: () => {
    const handleSuccess = () => showToast.success('Operation completed successfully!');
    const handleError = () => showToast.error('Something went wrong. Please try again.');
    const handleInfo = () => showToast.info('This is an informational message.');

    return (
      <div style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
          <button onClick={handleSuccess} style={{ padding: '0.5rem 1rem', background: 'green', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Show Success
          </button>
          <button onClick={handleError} style={{ padding: '0.5rem 1rem', background: 'red', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Show Error
          </button>
          <button onClick={handleInfo} style={{ padding: '0.5rem 1rem', background: 'gray', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Show Info
          </button>
        </div>
        <ToastContainer />
      </div>
    );
  },
};
