import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClubStep } from './ClubStep';
import { vi } from 'vitest';
import { onboardingApi, ApiError } from '../../lib/api';

vi.mock('../../lib/api', () => ({
  onboardingApi: {
    saveClub: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    public data?: { detail?: string };
    constructor(message: string, options?: { data?: { detail?: string } }) {
      super(message);
      this.name = 'ApiError';
      this.data = options?.data;
    }
  },
}));

describe('ClubStep', () => {
  const mockOnNext = vi.fn();

  beforeEach(() => {
    mockOnNext.mockClear();
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    test('should render club info form with all fields', () => {
      render(<ClubStep onNext={mockOnNext} />);

      expect(screen.getByText(/club-informatie/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^Clubnaam/)).toBeInTheDocument();
      expect(screen.getByLabelText(/^Adres/)).toBeInTheDocument();
      expect(screen.getByLabelText(/^Postcode/)).toBeInTheDocument();
      expect(screen.getByLabelText(/^Plaats/)).toBeInTheDocument();
      expect(screen.getByLabelText(/^Telefoonnummer/)).toBeInTheDocument();
      expect(screen.getByLabelText(/^E-mailadres/)).toBeInTheDocument();
    });

    test('should mark clubnaam as required', () => {
      render(<ClubStep onNext={mockOnNext} />);
      const naamLabel = screen.getByText(/^Clubnaam/);
      expect(naamLabel).toHaveTextContent('*');
    });

    test('should initialize with empty form values', () => {
      render(<ClubStep onNext={mockOnNext} />);
      expect(screen.getByLabelText(/^Clubnaam/)).toHaveValue('');
      expect(screen.getByLabelText(/^Adres/)).toHaveValue('');
      expect(screen.getByLabelText(/^Postcode/)).toHaveValue('');
      expect(screen.getByLabelText(/^Plaats/)).toHaveValue('');
      expect(screen.getByLabelText(/^Telefoonnummer/)).toHaveValue('');
      expect(screen.getByLabelText(/^E-mailadres/)).toHaveValue('');
    });

    test('should initialize with provided initial data', () => {
      const initialData = {
        naam: 'Test Club',
        adres: 'Teststraat 1',
        postcode: '1234AB',
        stad: 'Amsterdam',
        telefoon: '06-12345678',
        email: 'info@testclub.nl',
      };

      render(<ClubStep onNext={mockOnNext} initialData={initialData} />);

      expect(screen.getByLabelText(/^Clubnaam/)).toHaveValue('Test Club');
      expect(screen.getByLabelText(/^Adres/)).toHaveValue('Teststraat 1');
      expect(screen.getByLabelText(/^Postcode/)).toHaveValue('1234AB');
      expect(screen.getByLabelText(/^Plaats/)).toHaveValue('Amsterdam');
      expect(screen.getByLabelText(/^Telefoonnummer/)).toHaveValue('06-12345678');
      expect(screen.getByLabelText(/^E-mailadres/)).toHaveValue('info@testclub.nl');
    });
  });

  describe('Postal code auto-uppercase', () => {
    test('should auto-uppercase postal code input', async () => {
      render(<ClubStep onNext={mockOnNext} />);

      const postcodeInput = screen.getByLabelText(/^Postcode/);
      await userEvent.type(postcodeInput, '1234ab');

      expect(postcodeInput).toHaveValue('1234AB');
    });

    test('should auto-uppercase postal code on blur', async () => {
      render(<ClubStep onNext={mockOnNext} />);

      const postcodeInput = screen.getByLabelText(/^Postcode/);
      await userEvent.type(postcodeInput, '1234ab');
      await userEvent.tab();

      expect(postcodeInput).toHaveValue('1234AB');
    });
  });

  describe('Zod validation', () => {
    test('should show error for club name shorter than 2 characters', async () => {
      render(<ClubStep onNext={mockOnNext} />);

      const naamInput = screen.getByLabelText(/clubnaam/i);
      await userEvent.type(naamInput, 'A');
      await userEvent.tab();

      await waitFor(() => {
        expect(screen.getByText(/clubnaam moet minimaal 2 karakters bevatten/i)).toBeInTheDocument();
      });
    });

    test('should show error for invalid postal code format', async () => {
      render(<ClubStep onNext={mockOnNext} />);

      const postcodeInput = screen.getByLabelText(/^Postcode/);
      await userEvent.type(postcodeInput, '123AB');
      await userEvent.tab();

      await waitFor(() => {
        expect(screen.getByText(/voer een geldige nederlandse postcode in/i)).toBeInTheDocument();
      });
    });

    test('should show error for invalid email format', async () => {
      render(<ClubStep onNext={mockOnNext} />);

      const emailInput = screen.getByLabelText(/^E-mailadres/);
      await userEvent.type(emailInput, 'invalid-email');
      await userEvent.tab();

      await waitFor(() => {
        expect(screen.getByText(/voer een geldig e-mailadres in/i)).toBeInTheDocument();
      });
    });

    test('should accept valid postal code', async () => {
      render(<ClubStep onNext={mockOnNext} />);

      const postcodeInput = screen.getByLabelText(/^Postcode/);
      await userEvent.type(postcodeInput, '1234AB');
      await userEvent.tab();

      await waitFor(() => {
        expect(screen.queryByText(/voer een geldige nederlandse postcode in/i)).not.toBeInTheDocument();
      });
    });

    test('should accept valid email', async () => {
      render(<ClubStep onNext={mockOnNext} />);

      const emailInput = screen.getByLabelText(/^E-mailadres/);
      await userEvent.type(emailInput, 'info@testclub.nl');
      await userEvent.tab();

      await waitFor(() => {
        expect(screen.queryByText(/voer een geldig e-mailadres in/i)).not.toBeInTheDocument();
      });
    });

    test('should show validation errors on form submit', async () => {
      render(<ClubStep onNext={mockOnNext} />);

      const naamInput = screen.getByLabelText(/^Clubnaam/);
      await userEvent.type(naamInput, 'A');

      const emailInput = screen.getByLabelText(/^E-mailadres/);
      await userEvent.type(emailInput, 'invalid-email');

      const submitButton = screen.getByRole('button', { name: /volgende stap/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/clubnaam moet minimaal 2 karakters bevatten/i)).toBeInTheDocument();
        expect(screen.getByText(/voer een geldig e-mailadres in/i)).toBeInTheDocument();
      });
    });

    test('should clear validation error when user corrects input', async () => {
      render(<ClubStep onNext={mockOnNext} />);

      const naamInput = screen.getByLabelText(/^Clubnaam/);
      await userEvent.type(naamInput, 'A');
      await userEvent.tab();

      await waitFor(() => {
        expect(screen.getByText(/clubnaam moet minimaal 2 karakters bevatten/i)).toBeInTheDocument();
      });

      await userEvent.type(naamInput, 'BC');

      await waitFor(() => {
        expect(screen.queryByText(/clubnaam moet minimaal 2 karakters bevatten/i)).not.toBeInTheDocument();
      });
    });

    test('should allow optional fields to be empty', async () => {
      render(<ClubStep onNext={mockOnNext} />);

      const naamInput = screen.getByLabelText(/^Clubnaam/);
      await userEvent.type(naamInput, 'Valid Club Name');

      const submitButton = screen.getByRole('button', { name: /volgende stap/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnNext).toHaveBeenCalled();
      });
    });
  });

  describe('Submit', () => {
    test('should call onNext with correct data on successful submit', async () => {
      const mockSaveClub = vi.mocked(onboardingApi.saveClub);
      mockSaveClub.mockResolvedValue({ data: {} });

      render(<ClubStep onNext={mockOnNext} />);

      const naamInput = screen.getByLabelText(/^Clubnaam/);
      await userEvent.type(naamInput, 'Tennis Club Amsterdam');

      const postcodeInput = screen.getByLabelText(/^Postcode/);
      await userEvent.type(postcodeInput, '1012AB');

      const emailInput = screen.getByLabelText(/^E-mailadres/);
      await userEvent.type(emailInput, 'info@tcamsterdam.nl');

      const submitButton = screen.getByRole('button', { name: /volgende stap/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSaveClub).toHaveBeenCalledWith({
          naam: 'Tennis Club Amsterdam',
          postcode: '1012AB',
          email: 'info@tcamsterdam.nl',
        });
        expect(mockOnNext).toHaveBeenCalled();
      });
    });

    test('should trim whitespace from submitted values', async () => {
      const mockSaveClub = vi.mocked(onboardingApi.saveClub);
      mockSaveClub.mockResolvedValue({ data: {} });

      render(<ClubStep onNext={mockOnNext} />);

      const naamInput = screen.getByLabelText(/^Clubnaam/);
      await userEvent.type(naamInput, '  Tennis Club  ');

      const submitButton = screen.getByRole('button', { name: /volgende stap/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSaveClub).toHaveBeenCalledWith({
          naam: 'Tennis Club',
        });
        expect(mockOnNext).toHaveBeenCalled();
      });
    });

    test('should show API error on save failure', async () => {
      const mockSaveClub = vi.mocked(onboardingApi.saveClub);
      mockSaveClub.mockRejectedValue(new ApiError('Save failed', {
        data: { detail: 'Er ging iets mis met opslaan' }
      }));

      render(<ClubStep onNext={mockOnNext} />);

      const naamInput = screen.getByLabelText(/^Clubnaam/);
      await userEvent.type(naamInput, 'Tennis Club');

      const submitButton = screen.getByRole('button', { name: /volgende stap/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/er ging iets mis met opslaan/i)).toBeInTheDocument();
        expect(mockOnNext).not.toHaveBeenCalled();
      });
    });

    test('should show generic error on unknown save failure', async () => {
      const mockSaveClub = vi.mocked(onboardingApi.saveClub);
      mockSaveClub.mockRejectedValue(new Error('Unknown error'));

      render(<ClubStep onNext={mockOnNext} />);

      const naamInput = screen.getByLabelText(/^Clubnaam/);
      await userEvent.type(naamInput, 'Tennis Club');

      const submitButton = screen.getByRole('button', { name: /volgende stap/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/er is iets misgegaan/i)).toBeInTheDocument();
        expect(mockOnNext).not.toHaveBeenCalled();
      });
    });

    test('should disable submit button while saving', async () => {
      const mockSaveClub = vi.mocked(onboardingApi.saveClub);
      mockSaveClub.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(<ClubStep onNext={mockOnNext} />);

      const naamInput = screen.getByLabelText(/^Clubnaam/);
      await userEvent.type(naamInput, 'Tennis Club');

      const submitButton = screen.getByRole('button', { name: /volgende stap/i });
      await userEvent.click(submitButton);

      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveTextContent(/opslaan/i);

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });
    });
  });
});
