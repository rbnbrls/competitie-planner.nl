import { Toaster, toast } from 'react-hot-toast';

export const ToastContainer = () => {
  return (
    <Toaster
      position="bottom-right"
      toastOptions={{
        duration: 5000,
        style: {
          background: '#333',
          color: '#fff',
        },
        success: {
          duration: 5000,
          theme: {
            primary: 'green',
            secondary: 'black',
          },
        },
        error: {
          duration: Infinity, // Persistent bij fouten totdat user het wegklikt? React-hot-toast automatically keeps it if user hovers, but to make it completely persistent we can set duration to Infinity. Prompt says "maar persistent bij fouten" -> duration: Infinity.
        },
      }}
    />
  );
};

export const showToast = {
  success: (message: string) => toast.success(message),
  error: (message: string) => toast.error(message, { duration: Infinity }),
  info: (message: string) => toast(message),
};
