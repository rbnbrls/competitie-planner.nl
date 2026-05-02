import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CourtsStep } from './CourtsStep';
import { vi } from 'vitest';
import { onboardingApi, ApiError } from '../../lib/api';

vi.mock('../../lib/api', () => ({
  onboardingApi: {
    saveCourts: vi.fn(),
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

describe('CourtsStep', () => {
  const mockOnNext = vi.fn();
  const mockOnBack = vi.fn();

  beforeEach(() => {
    mockOnNext.mockClear();
    mockOnBack.mockClear();
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    test('should render court inputs with associated labels', () => {
      render(<CourtsStep onNext={mockOnNext} onBack={mockOnBack} />);

      const courtNaamLabel = screen.getByText(/naam/i);
      expect(courtNaamLabel).toHaveAttribute('for', 'court_naam_0');

      const courtNaamInput = document.getElementById('court_naam_0');
      expect(courtNaamInput).toBeInTheDocument();

      const courtOndergrondLabel = screen.getByText(/ondergrond/i);
      expect(courtOndergrondLabel).toHaveAttribute('for', 'court_ondergrond_0');

      const courtOndergrondSelect = document.getElementById('court_ondergrond_0');
      expect(courtOndergrondSelect).toBeInTheDocument();

      const priorityInput = screen.getByLabelText(/prioriteitsscore:/i, { selector: 'input[type="range"]' });
      expect(priorityInput).toHaveAttribute('id', 'court_prioriteit_score_0');
    });

    test('should render court name as required field', () => {
      render(<CourtsStep onNext={mockOnNext} onBack={mockOnBack} />);
      const naamLabel = screen.getByText(/naam/i);
      expect(naamLabel).toHaveTextContent('*');
    });

    test('should render ondergrond as required field', () => {
      render(<CourtsStep onNext={mockOnNext} onBack={mockOnBack} />);
      const ondergrondLabel = screen.getByText(/ondergrond/i);
      expect(ondergrondLabel).toHaveTextContent('*');
    });

    test('should render surface type options', () => {
      render(<CourtsStep onNext={mockOnNext} onBack={mockOnBack} />);
      const select = document.getElementById('court_ondergrond_0');
      expect(select).toBeInTheDocument();
      expect(select).toHaveValue('gravel');

      const options = select?.querySelectorAll('option');
      expect(options).toHaveLength(4);
    });

    test('should render priority score range input with correct attributes', () => {
      render(<CourtsStep onNext={mockOnNext} onBack={mockOnBack} />);
      const priorityInput = screen.getByLabelText(/prioriteitsscore:/i, { selector: 'input[type="range"]' });
      expect(priorityInput).toHaveAttribute('min', '1');
      expect(priorityInput).toHaveAttribute('max', '10');
      expect(priorityInput).toHaveAttribute('aria-valuemin', '1');
      expect(priorityInput).toHaveAttribute('aria-valuemax', '10');
    });

    test('should display current priority score value', () => {
      render(<CourtsStep onNext={mockOnNext} onBack={mockOnBack} />);
      const priorityLabel = screen.getByText(/prioriteitsscore:/i);
      expect(priorityLabel).toHaveTextContent('5');
    });

    test('should render additional court inputs with associated labels when added', async () => {
      render(<CourtsStep onNext={mockOnNext} onBack={mockOnBack} />);

      const addCourtButton = screen.getByRole('button', { name: /nog een baan toevoegen/i });
      expect(addCourtButton).toBeInTheDocument();
      await userEvent.click(addCourtButton);

      const naamLabels = screen.getAllByText(/naam/i);
      expect(naamLabels[1]).toHaveAttribute('for', 'court_naam_1');
      expect(document.getElementById('court_naam_1')).toBeInTheDocument();

      const ondergrondLabels = screen.getAllByText(/ondergrond/i);
      expect(ondergrondLabels[1]).toHaveAttribute('for', 'court_ondergrond_1');
      expect(document.getElementById('court_ondergrond_1')).toBeInTheDocument();

      const priorityInputs = screen.getAllByLabelText(/prioriteitsscore:/i, { selector: 'input[type="range"]' });
      expect(priorityInputs[1]).toHaveAttribute('id', 'court_prioriteit_score_1');
    });
  });

  describe('Add/Remove courts', () => {
    test('should add a new court when clicking add button', async () => {
      render(<CourtsStep onNext={mockOnNext} onBack={mockOnBack} />);

      const addCourtButton = screen.getByRole('button', { name: /nog een baan toevoegen/i });
      await userEvent.click(addCourtButton);

      const courtHeaders = screen.getAllByRole('heading', { level: 3 });
      expect(courtHeaders).toHaveLength(2);
      expect(courtHeaders[0]).toHaveTextContent('Baan 1');
      expect(courtHeaders[1]).toHaveTextContent('Baan 2');
    });

    test('should add multiple courts', async () => {
      render(<CourtsStep onNext={mockOnNext} onBack={mockOnBack} />);

      const addCourtButton = screen.getByRole('button', { name: /nog een baan toevoegen/i });
      await userEvent.click(addCourtButton);
      await userEvent.click(addCourtButton);

      const courtHeaders = screen.getAllByRole('heading', { level: 3 });
      expect(courtHeaders).toHaveLength(3);
    });

    test('should not show remove button when only one court exists', () => {
      render(<CourtsStep onNext={mockOnNext} onBack={mockOnBack} />);
      expect(screen.queryByRole('button', { name: /verwijderen/i })).not.toBeInTheDocument();
    });

    test('should show remove button when multiple courts exist', async () => {
      render(<CourtsStep onNext={mockOnNext} onBack={mockOnBack} />);

      const addCourtButton = screen.getByRole('button', { name: /nog een baan toevoegen/i });
      await userEvent.click(addCourtButton);

      const removeButtons = screen.getAllByRole('button', { name: /verwijderen/i });
      expect(removeButtons).toHaveLength(2);
    });

    test('should remove a court when clicking remove button', async () => {
      render(<CourtsStep onNext={mockOnNext} onBack={mockOnBack} />);

      const addCourtButton = screen.getByRole('button', { name: /nog een baan toevoegen/i });
      await userEvent.click(addCourtButton);
      await userEvent.click(addCourtButton);

      let courtHeaders = screen.getAllByRole('heading', { level: 3 });
      expect(courtHeaders).toHaveLength(3);

      const removeButtons = screen.getAllByRole('button', { name: /verwijderen/i });
      await userEvent.click(removeButtons[1]);

      courtHeaders = screen.getAllByRole('heading', { level: 3 });
      expect(courtHeaders).toHaveLength(2);
    });

    test('should renumber courts after removal', async () => {
      render(<CourtsStep onNext={mockOnNext} onBack={mockOnBack} />);

      const addCourtButton = screen.getByRole('button', { name: /nog een baan toevoegen/i });
      await userEvent.click(addCourtButton);

      const removeButtons = screen.getAllByRole('button', { name: /verwijderen/i });
      await userEvent.click(removeButtons[0]);

      const courtHeaders = screen.getAllByRole('heading', { level: 3 });
      expect(courtHeaders).toHaveLength(1);
      expect(courtHeaders[0]).toHaveTextContent('Baan 1');
    });
  });

  describe('Validation', () => {
    test('should show error when court name is empty on submit', async () => {
      render(<CourtsStep onNext={mockOnNext} onBack={mockOnBack} />);

      const submitButton = screen.getByRole('button', { name: /volgende stap/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/vul een naam in voor baan 1/i)).toBeInTheDocument();
      });
    });

    test('should show error for each court with empty name', async () => {
      render(<CourtsStep onNext={mockOnNext} onBack={mockOnBack} />);

      const addCourtButton = screen.getByRole('button', { name: /nog een baan toevoegen/i });
      await userEvent.click(addCourtButton);

      const submitButton = screen.getByRole('button', { name: /volgende stap/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/vul een naam in voor baan 1/i)).toBeInTheDocument();
        expect(screen.getByText(/vul een naam in voor baan 2/i)).toBeInTheDocument();
      });
    });

    test('should show validation error with red border on input', async () => {
      render(<CourtsStep onNext={mockOnNext} onBack={mockOnBack} />);

      const submitButton = screen.getByRole('button', { name: /volgende stap/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        const nameInput = document.getElementById('court_naam_0');
        expect(nameInput).toHaveClass('border-red-400');
        expect(nameInput).toHaveClass('bg-red-50');
      });
    });

    test('should not call onNext when validation fails', async () => {
      render(<CourtsStep onNext={mockOnNext} onBack={mockOnBack} />);

      const submitButton = screen.getByRole('button', { name: /volgende stap/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnNext).not.toHaveBeenCalled();
      });
    });

    test('should clear validation error when user types in court name', async () => {
      render(<CourtsStep onNext={mockOnNext} onBack={mockOnBack} />);

      const submitButton = screen.getByRole('button', { name: /volgende stap/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/vul een naam in voor baan 1/i)).toBeInTheDocument();
      });

      const courtNameInput = screen.getByLabelText(/naam/i);
      await userEvent.type(courtNameInput, 'Baan 1 - Gravel');

      await waitFor(() => {
        expect(screen.queryByText(/vul een naam in voor baan 1/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Submit courts', () => {
    test('should save courts and call onNext on successful submit', async () => {
      const mockSaveCourts = vi.mocked(onboardingApi.saveCourts);
      mockSaveCourts.mockResolvedValue({ data: {} });

      render(<CourtsStep onNext={mockOnNext} onBack={mockOnBack} />);

      const courtNameInput = screen.getByLabelText(/naam/i);
      await userEvent.type(courtNameInput, 'Baan 1 - Gravel');

      const submitButton = screen.getByRole('button', { name: /volgende stap/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSaveCourts).toHaveBeenCalledWith({
          banen: [{
            naam: 'Baan 1 - Gravel',
            ondergrond: 'gravel',
            prioriteit_score: 5,
            nummer: 1,
          }]
        });
        expect(mockOnNext).toHaveBeenCalled();
      });
    });

    test('should show API error on save failure', async () => {
      const mockSaveCourts = vi.mocked(onboardingApi.saveCourts);
      mockSaveCourts.mockRejectedValue(new ApiError('Save failed', {
        data: { detail: 'Er ging iets mis met opslaan' }
      }));

      render(<CourtsStep onNext={mockOnNext} onBack={mockOnBack} />);

      const courtNameInput = screen.getByLabelText(/naam/i);
      await userEvent.type(courtNameInput, 'Baan 1 - Gravel');

      const submitButton = screen.getByRole('button', { name: /volgende stap/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/er ging iets mis met opslaan/i)).toBeInTheDocument();
        expect(mockOnNext).not.toHaveBeenCalled();
      });
    });

    test('should show generic error on unknown save failure', async () => {
      const mockSaveCourts = vi.mocked(onboardingApi.saveCourts);
      mockSaveCourts.mockRejectedValue(new Error('Unknown error'));

      render(<CourtsStep onNext={mockOnNext} onBack={mockOnBack} />);

      const courtNameInput = screen.getByLabelText(/naam/i);
      await userEvent.type(courtNameInput, 'Baan 1 - Gravel');

      const submitButton = screen.getByRole('button', { name: /volgende stap/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/er is iets misgegaan/i)).toBeInTheDocument();
        expect(mockOnNext).not.toHaveBeenCalled();
      });
    });

    test('should disable submit button while saving', async () => {
      const mockSaveCourts = vi.mocked(onboardingApi.saveCourts);
      mockSaveCourts.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(<CourtsStep onNext={mockOnNext} onBack={mockOnBack} />);

      const courtNameInput = screen.getByLabelText(/naam/i);
      await userEvent.type(courtNameInput, 'Baan 1 - Gravel');

      const submitButton = screen.getByRole('button', { name: /volgende stap/i });
      await userEvent.click(submitButton);

      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveTextContent(/opslaan/i);

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });
    });

    test('should call onBack when clicking back button', async () => {
      render(<CourtsStep onNext={mockOnNext} onBack={mockOnBack} />);

      const backButton = screen.getByRole('button', { name: /terug/i });
      await userEvent.click(backButton);

      expect(mockOnBack).toHaveBeenCalled();
    });
  });

  describe('Priority score interaction', () => {
    test('should update priority score display when slider changes', async () => {
      render(<CourtsStep onNext={mockOnNext} onBack={mockOnBack} />);

      const priorityInput = screen.getByLabelText(/prioriteitsscore:/i, { selector: 'input[type="range"]' }) as HTMLInputElement;
      // Use fireEvent to change range input value
      fireEvent.change(priorityInput, { target: { value: '8' } });

      const priorityLabel = screen.getByText(/prioriteitsscore:/i);
      expect(priorityLabel).toHaveTextContent('8');
    });
  });
});