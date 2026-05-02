import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CompetitionStep } from './CompetitionStep';
import { vi } from 'vitest';
import { onboardingApi, ApiError } from '../../lib/api';

vi.mock('../../lib/api', () => ({
  onboardingApi: {
    saveCompetition: vi.fn(),
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

describe('CompetitionStep', () => {
  const mockOnNext = vi.fn();
  const mockOnBack = vi.fn();

  beforeEach(() => {
    mockOnNext.mockClear();
    mockOnBack.mockClear();
    vi.clearAllMocks();
  });

  const getFutureDate = (daysFromNow: number): string => {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date.toISOString().split('T')[0];
  };

  describe('Rendering', () => {
    test('should render competition form with all fields', () => {
      render(<CompetitionStep onNext={mockOnNext} onBack={mockOnBack} />);

      expect(screen.getByText(/eerste competitie aanmaken/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/naam competitie/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/speeldag/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/startdatum/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/einddatum/i)).toBeInTheDocument();
    });

    test('should mark naam, speeldag, startdatum, and einddatum as required', () => {
      render(<CompetitionStep onNext={mockOnNext} onBack={mockOnBack} />);

      expect(screen.getByText(/naam competitie/i)).toHaveTextContent('*');
      expect(screen.getByText(/speeldag/i)).toHaveTextContent('*');
      expect(screen.getByText(/startdatum/i)).toHaveTextContent('*');
      expect(screen.getByText(/einddatum/i)).toHaveTextContent('*');
    });

    test('should initialize with empty form values except speeldag', () => {
      render(<CompetitionStep onNext={mockOnNext} onBack={mockOnBack} />);

      expect(screen.getByLabelText(/naam competitie/i)).toHaveValue('');
      expect(screen.getByLabelText(/speeldag/i)).toHaveValue('zaterdag');
      expect(screen.getByLabelText(/startdatum/i)).toHaveValue('');
      expect(screen.getByLabelText(/einddatum/i)).toHaveValue('');
    });

    test('should render speeldag options', () => {
      render(<CompetitionStep onNext={mockOnNext} onBack={mockOnBack} />);

      const select = screen.getByLabelText(/speeldag/i);
      const options = select?.querySelectorAll('option');
      expect(options).toHaveLength(7);

      expect(screen.getByRole('option', { name: /maandag/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /zaterdag/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /zondag/i })).toBeInTheDocument();
    });
  });

  describe('Zod validation (onBlur)', () => {
    test('should show error for empty competition name', async () => {
      render(<CompetitionStep onNext={mockOnNext} onBack={mockOnBack} />);

      const naamInput = screen.getByLabelText(/naam competitie/i);
      await userEvent.type(naamInput, 'A');
      await userEvent.tab();

      await waitFor(() => {
        expect(screen.queryByText(/vul een naam in voor de competitie/i)).not.toBeInTheDocument();
      });
    });

    test('should show error for empty naam on blur', async () => {
      render(<CompetitionStep onNext={mockOnNext} onBack={mockOnBack} />);

      const naamInput = screen.getByLabelText(/naam competitie/i);
      await userEvent.click(naamInput);
      await userEvent.tab();

      await waitFor(() => {
        expect(screen.getByText(/vul een naam in voor de competitie/i)).toBeInTheDocument();
      });
    });

    test('should show error for start date in the past', async () => {
      render(<CompetitionStep onNext={mockOnNext} onBack={mockOnBack} />);

      const startDateInput = screen.getByLabelText(/startdatum/i);
      await userEvent.type(startDateInput, '2020-01-01');
      await userEvent.tab();

      await waitFor(() => {
        expect(screen.getByText(/de startdatum moet in de toekomst liggen/i)).toBeInTheDocument();
      });
    });

    test('should show error for empty start date', async () => {
      render(<CompetitionStep onNext={mockOnNext} onBack={mockOnBack} />);

      const startDateInput = screen.getByLabelText(/startdatum/i);
      await userEvent.click(startDateInput);
      await userEvent.tab();

      await waitFor(() => {
        expect(screen.getByText(/selecteer een startdatum/i)).toBeInTheDocument();
      });
    });

    test('should show error for empty end date', async () => {
      render(<CompetitionStep onNext={mockOnNext} onBack={mockOnBack} />);

      const endDateInput = screen.getByLabelText(/einddatum/i);
      await userEvent.click(endDateInput);
      await userEvent.tab();

      await waitFor(() => {
        expect(screen.getByText(/selecteer een einddatum/i)).toBeInTheDocument();
      });
    });
  });

  describe('Date validation', () => {
    test('should show error when end date is before or equal to start date', async () => {
      render(<CompetitionStep onNext={mockOnNext} onBack={mockOnBack} />);

      const startDateInput = screen.getByLabelText(/startdatum/i);
      const endDateInput = screen.getByLabelText(/einddatum/i);

      const startDate = getFutureDate(10);
      const endDate = getFutureDate(5);

      await userEvent.type(startDateInput, startDate);
      await userEvent.type(endDateInput, endDate);
      await userEvent.tab();

      await waitFor(() => {
        expect(screen.getByText(/de einddatum moet na de startdatum liggen/i)).toBeInTheDocument();
      });
    });

    test('should show error when competition is less than 4 weeks', async () => {
      render(<CompetitionStep onNext={mockOnNext} onBack={mockOnBack} />);

      const startDateInput = screen.getByLabelText(/startdatum/i);
      const endDateInput = screen.getByLabelText(/einddatum/i);

      const startDate = getFutureDate(10);
      const endDate = getFutureDate(20);

      await userEvent.type(startDateInput, startDate);
      await userEvent.type(endDateInput, endDate);
      await userEvent.tab();

      await waitFor(() => {
        expect(screen.getByText(/de competitie moet minimaal 4 weken duren/i)).toBeInTheDocument();
      });
    });

    test('should not show error when competition is 4 weeks or more', async () => {
      render(<CompetitionStep onNext={mockOnNext} onBack={mockOnBack} />);

      const startDateInput = screen.getByLabelText(/startdatum/i);
      const endDateInput = screen.getByLabelText(/einddatum/i);

      const startDate = getFutureDate(10);
      const endDate = getFutureDate(50);

      await userEvent.type(startDateInput, startDate);
      await userEvent.type(endDateInput, endDate);
      await userEvent.tab();

      await waitFor(() => {
        expect(screen.queryByText(/de competitie moet minimaal 4 weken duren/i)).not.toBeInTheDocument();
      });
    });

    test('should accept valid date range (4+ weeks)', async () => {
      const mockSaveCompetition = vi.mocked(onboardingApi.saveCompetition);
      mockSaveCompetition.mockResolvedValue({ data: { competitie_id: 'comp-123' } });

      render(<CompetitionStep onNext={mockOnNext} onBack={mockOnBack} />);

      const naamInput = screen.getByLabelText(/naam competitie/i);
      await userEvent.type(naamInput, 'Zomercompetitie 2025');

      const startDateInput = screen.getByLabelText(/startdatum/i);
      const endDateInput = screen.getByLabelText(/einddatum/i);

      const startDate = getFutureDate(10);
      const endDate = getFutureDate(50);

      await userEvent.type(startDateInput, startDate);
      await userEvent.type(endDateInput, endDate);

      const submitButton = screen.getByRole('button', { name: /volgende stap/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnNext).toHaveBeenCalledWith('comp-123');
      });
    });
  });

  describe('Submit', () => {
    test('should call onNext with competitieId on successful submit', async () => {
      const mockSaveCompetition = vi.mocked(onboardingApi.saveCompetition);
      mockSaveCompetition.mockResolvedValue({ data: { competitie_id: 'comp-123' } });

      render(<CompetitionStep onNext={mockOnNext} onBack={mockOnBack} />);

      const naamInput = screen.getByLabelText(/naam competitie/i);
      await userEvent.type(naamInput, 'Zomercompetitie 2025');

      const startDateInput = screen.getByLabelText(/startdatum/i);
      const endDateInput = screen.getByLabelText(/einddatum/i);

      const startDate = getFutureDate(10);
      const endDate = getFutureDate(50);

      await userEvent.type(startDateInput, startDate);
      await userEvent.type(endDateInput, endDate);

      const submitButton = screen.getByRole('button', { name: /volgende stap/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSaveCompetition).toHaveBeenCalledWith({
          naam: 'Zomercompetitie 2025',
          speeldag: 'zaterdag',
          start_datum: startDate,
          eind_datum: endDate,
        });
        expect(mockOnNext).toHaveBeenCalledWith('comp-123');
      });
    });

    test('should not call onNext when validation fails', async () => {
      render(<CompetitionStep onNext={mockOnNext} onBack={mockOnBack} />);

      const submitButton = screen.getByRole('button', { name: /volgende stap/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnNext).not.toHaveBeenCalled();
      });
    });

    test('should show API error on save failure', async () => {
      const mockSaveCompetition = vi.mocked(onboardingApi.saveCompetition);
      mockSaveCompetition.mockRejectedValue(new ApiError('Save failed', {
        data: { detail: 'Er ging iets mis met opslaan' }
      }));

      render(<CompetitionStep onNext={mockOnNext} onBack={mockOnBack} />);

      const naamInput = screen.getByLabelText(/naam competitie/i);
      await userEvent.type(naamInput, 'Zomercompetitie 2025');

      const startDateInput = screen.getByLabelText(/startdatum/i);
      const endDateInput = screen.getByLabelText(/einddatum/i);

      const startDate = getFutureDate(10);
      const endDate = getFutureDate(50);

      await userEvent.type(startDateInput, startDate);
      await userEvent.type(endDateInput, endDate);

      const submitButton = screen.getByRole('button', { name: /volgende stap/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/er ging iets mis met opslaan/i)).toBeInTheDocument();
        expect(mockOnNext).not.toHaveBeenCalled();
      });
    });

    test('should show generic error on unknown save failure', async () => {
      const mockSaveCompetition = vi.mocked(onboardingApi.saveCompetition);
      mockSaveCompetition.mockRejectedValue(new Error('Unknown error'));

      render(<CompetitionStep onNext={mockOnNext} onBack={mockOnBack} />);

      const naamInput = screen.getByLabelText(/naam competitie/i);
      await userEvent.type(naamInput, 'Zomercompetitie 2025');

      const startDateInput = screen.getByLabelText(/startdatum/i);
      const endDateInput = screen.getByLabelText(/einddatum/i);

      const startDate = getFutureDate(10);
      const endDate = getFutureDate(50);

      await userEvent.type(startDateInput, startDate);
      await userEvent.type(endDateInput, endDate);

      const submitButton = screen.getByRole('button', { name: /volgende stap/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/er is iets misgegaan/i)).toBeInTheDocument();
        expect(mockOnNext).not.toHaveBeenCalled();
      });
    });

    test('should disable submit button while saving', async () => {
      const mockSaveCompetition = vi.mocked(onboardingApi.saveCompetition);
      mockSaveCompetition.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(<CompetitionStep onNext={mockOnNext} onBack={mockOnBack} />);

      const naamInput = screen.getByLabelText(/naam competitie/i);
      await userEvent.type(naamInput, 'Zomercompetitie 2025');

      const startDateInput = screen.getByLabelText(/startdatum/i);
      const endDateInput = screen.getByLabelText(/einddatum/i);

      const startDate = getFutureDate(10);
      const endDate = getFutureDate(50);

      await userEvent.type(startDateInput, startDate);
      await userEvent.type(endDateInput, endDate);

      const submitButton = screen.getByRole('button', { name: /volgende stap/i });
      await userEvent.click(submitButton);

      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveTextContent(/opslaan/i);

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });
    });

    test('should call onBack when clicking back button', async () => {
      render(<CompetitionStep onNext={mockOnNext} onBack={mockOnBack} />);

      const backButton = screen.getByRole('button', { name: /terug/i });
      await userEvent.click(backButton);

      expect(mockOnBack).toHaveBeenCalled();
    });
  });

  describe('Help section', () => {
    test('should show help text when help button is clicked', async () => {
      render(<CompetitionStep onNext={mockOnNext} onBack={mockOnBack} />);

      const helpButton = screen.getByRole('button', { name: /wat is een competitieperiode/i });
      await userEvent.click(helpButton);

      expect(screen.getByText(/vaste speeldag/i)).toBeInTheDocument();
      expect(screen.getByText(/minimaal 4 weken/i)).toBeInTheDocument();
    });

    test('should hide help text when help button is clicked again', async () => {
      render(<CompetitionStep onNext={mockOnNext} onBack={mockOnBack} />);

      const helpButton = screen.getByRole('button', { name: /wat is een competitieperiode/i });
      await userEvent.click(helpButton);
      await userEvent.click(helpButton);

      expect(screen.queryByText(/vaste speeldag/i)).not.toBeInTheDocument();
    });
  });
});
