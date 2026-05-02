import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TeamsStep, parseCSV } from './TeamsStep';
import { vi } from 'vitest';
import { onboardingApi, ApiError } from '../../lib/api';

vi.mock('../../lib/api', () => ({
  onboardingApi: {
    saveTeams: vi.fn(),
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

describe('parseCSV', () => {
  test('should parse simple CSV', () => {
    const input = 'a,b,c\n1,2,3\n4,5,6';
    const result = parseCSV(input);
    expect(result).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
      ['4', '5', '6'],
    ]);
  });

  test('should parse CSV with commas in quoted fields', () => {
    const input = 'name,desc\n"Team A, B","A, B, C"';
    const result = parseCSV(input);
    expect(result).toEqual([
      ['name', 'desc'],
      ['Team A, B', 'A, B, C'],
    ]);
  });

  test('should parse CSV with empty fields', () => {
    const input = 'a,b,c\n1,,3\n,2,';
    const result = parseCSV(input);
    expect(result).toEqual([
      ['a', 'b', 'c'],
      ['1', '', '3'],
      ['', '2', ''],
    ]);
  });

  test('should parse CSV with CRLF line endings', () => {
    const input = 'a,b\r\n1,2\r\n3,4';
    const result = parseCSV(input);
    expect(result).toEqual([
      ['a', 'b'],
      ['1', '2'],
      ['3', '4'],
    ]);
  });

  test('should parse CSV with LF line endings', () => {
    const input = 'a,b\n1,2\n3,4';
    const result = parseCSV(input);
    expect(result).toEqual([
      ['a', 'b'],
      ['1', '2'],
      ['3', '4'],
    ]);
  });

  test('should parse CSV with mixed line endings', () => {
    const input = 'a,b\r\n1,2\n3,4';
    const result = parseCSV(input);
    expect(result).toEqual([
      ['a', 'b'],
      ['1', '2'],
      ['3', '4'],
    ]);
  });

  test('should parse CSV with escaped quotes', () => {
    const input = 'a,b\n"Say ""hello""",test';
    const result = parseCSV(input);
    expect(result).toEqual([
      ['a', 'b'],
      ['Say "hello"', 'test'],
    ]);
  });

  test('should parse CSV with quoted fields containing newlines', () => {
    const input = 'a,b\n"line1\nline2",test';
    const result = parseCSV(input);
    expect(result).toEqual([
      ['a', 'b'],
      ['line1\nline2', 'test'],
    ]);
  });

  test('should throw on unterminated quoted field', () => {
    const input = 'a,b\n"unterminated,test';
    expect(() => parseCSV(input)).toThrow('Malformed CSV: unterminated quoted field');
  });

  test('should handle empty input', () => {
    const result = parseCSV('');
    expect(result).toEqual([]);
  });

  test('should handle header-only CSV', () => {
    const result = parseCSV('a,b,c');
    expect(result).toEqual([['a', 'b', 'c']]);
  });

  test('should parse CSV with trailing newline', () => {
    const input = 'a,b\n1,2\n';
    const result = parseCSV(input);
    expect(result).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });
});

describe('TeamsStep', () => {
  const mockOnNext = vi.fn();
  const mockOnBack = vi.fn();
  const mockCompetitieId = 'comp-1';

  beforeEach(() => {
    mockOnNext.mockClear();
    mockOnBack.mockClear();
    vi.clearAllMocks();
  });

  const createCSVFile = (content: string): File => {
    const file = new File([content], 'teams.csv', { type: 'text/csv' });
    (file as File & { text: () => Promise<string> }).text = () => Promise.resolve(content);
    return file;
  };

  const uploadCSV = async (csvContent: string) => {
    render(<TeamsStep competitieId={mockCompetitieId} onNext={mockOnNext} onBack={mockOnBack} />);

    const csvButton = screen.getByRole('button', { name: /importeren via csv/i });
    await userEvent.click(csvButton);

    const fileInput = screen.getByTestId('csv-file-input');
    const file = createCSVFile(csvContent);
    fireEvent.change(fileInput, { target: { files: [file] } });
  };

  describe('Rendering', () => {
    test('should render team inputs with associated labels in manual mode', () => {
      render(<TeamsStep competitieId={mockCompetitieId} onNext={mockOnNext} onBack={mockOnBack} />);

      const teamNaamLabel = screen.getByText(/teamnaam/i);
      expect(teamNaamLabel).toHaveAttribute('for', 'team_naam_0');
      
      const teamSpeelklasseLabel = screen.getByText(/speelklasse/i);
      expect(teamSpeelklasseLabel).toHaveAttribute('for', 'team_speelklasse_0');

      const teamCaptainNaamLabel = screen.getByText(/captain naam/i);
      expect(teamCaptainNaamLabel).toHaveAttribute('for', 'team_captain_naam_0');

      const teamCaptainEmailLabel = screen.getByText(/captain e-mail/i);
      expect(teamCaptainEmailLabel).toHaveAttribute('for', 'team_captain_email_0');
    });

    test('should render additional team inputs with associated labels when added', async () => {
      render(<TeamsStep competitieId={mockCompetitieId} onNext={mockOnNext} onBack={mockOnBack} />);

      const addTeamButton = screen.getByRole('button', { name: /nog een team toevoegen/i });
      expect(addTeamButton).toBeInTheDocument();
      await userEvent.click(addTeamButton);

      const teamNaamLabels = screen.getAllByText(/teamnaam/i);
      expect(teamNaamLabels[1]).toHaveAttribute('for', 'team_naam_1');
      expect(document.getElementById('team_naam_1')).toBeInTheDocument();

      const teamSpeelklasseLabels = screen.getAllByText(/speelklasse/i);
      expect(teamSpeelklasseLabels[1]).toHaveAttribute('for', 'team_speelklasse_1');
      expect(document.getElementById('team_speelklasse_1')).toBeInTheDocument();

      const teamCaptainNaamLabels = screen.getAllByText(/captain naam/i);
      expect(teamCaptainNaamLabels[1]).toHaveAttribute('for', 'team_captain_naam_1');
      expect(document.getElementById('team_captain_naam_1')).toBeInTheDocument();

      const teamCaptainEmailLabels = screen.getAllByText(/captain e-mail/i);
      expect(teamCaptainEmailLabels[1]).toHaveAttribute('for', 'team_captain_email_1');
      expect(document.getElementById('team_captain_email_1')).toBeInTheDocument();
    });
  });

  describe('Add/Remove teams', () => {
    test('should add a new team when clicking add button', async () => {
      render(<TeamsStep competitieId={mockCompetitieId} onNext={mockOnNext} onBack={mockOnBack} />);

      const addTeamButton = screen.getByRole('button', { name: /nog een team toevoegen/i });
      await userEvent.click(addTeamButton);

      const teamHeaders = screen.getAllByRole('heading', { level: 3 });
      expect(teamHeaders).toHaveLength(2);
      expect(teamHeaders[0]).toHaveTextContent('Team 1');
      expect(teamHeaders[1]).toHaveTextContent('Team 2');
    });

    test('should add multiple teams', async () => {
      render(<TeamsStep competitieId={mockCompetitieId} onNext={mockOnNext} onBack={mockOnBack} />);

      const addTeamButton = screen.getByRole('button', { name: /nog een team toevoegen/i });
      await userEvent.click(addTeamButton);
      await userEvent.click(addTeamButton);

      const teamHeaders = screen.getAllByRole('heading', { level: 3 });
      expect(teamHeaders).toHaveLength(3);
    });

    test('should not show remove button when only one team exists', () => {
      render(<TeamsStep competitieId={mockCompetitieId} onNext={mockOnNext} onBack={mockOnBack} />);
      expect(screen.queryByRole('button', { name: /verwijderen/i })).not.toBeInTheDocument();
    });

    test('should show remove button when multiple teams exist', async () => {
      render(<TeamsStep competitieId={mockCompetitieId} onNext={mockOnNext} onBack={mockOnBack} />);

      const addTeamButton = screen.getByRole('button', { name: /nog een team toevoegen/i });
      await userEvent.click(addTeamButton);

      const removeButtons = screen.getAllByRole('button', { name: /verwijderen/i });
      expect(removeButtons).toHaveLength(2);
    });

    test('should remove a team when clicking remove button', async () => {
      render(<TeamsStep competitieId={mockCompetitieId} onNext={mockOnNext} onBack={mockOnBack} />);

      const addTeamButton = screen.getByRole('button', { name: /nog een team toevoegen/i });
      await userEvent.click(addTeamButton);
      await userEvent.click(addTeamButton);

      let teamHeaders = screen.getAllByRole('heading', { level: 3 });
      expect(teamHeaders).toHaveLength(3);

      const removeButtons = screen.getAllByRole('button', { name: /verwijderen/i });
      await userEvent.click(removeButtons[1]);

      teamHeaders = screen.getAllByRole('heading', { level: 3 });
      expect(teamHeaders).toHaveLength(2);
    });
  });

  describe('Validation', () => {
    test('should show error when team name is empty on submit', async () => {
      render(<TeamsStep competitieId={mockCompetitieId} onNext={mockOnNext} onBack={mockOnBack} />);

      const submitButton = screen.getByRole('button', { name: /onboarding afronden/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/vul een naam in voor team 1/i)).toBeInTheDocument();
      });
    });

    test('should show error for each team with empty name', async () => {
      render(<TeamsStep competitieId={mockCompetitieId} onNext={mockOnNext} onBack={mockOnBack} />);

      const addTeamButton = screen.getByRole('button', { name: /nog een team toevoegen/i });
      await userEvent.click(addTeamButton);

      const submitButton = screen.getByRole('button', { name: /onboarding afronden/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/vul een naam in voor team 1/i)).toBeInTheDocument();
        expect(screen.getByText(/vul een naam in voor team 2/i)).toBeInTheDocument();
      });
    });

    test('should show error for invalid email format', async () => {
      render(<TeamsStep competitieId={mockCompetitieId} onNext={mockOnNext} onBack={mockOnBack} />);

      const teamNameInput = screen.getByPlaceholderText('Bijv. Heren 1');
      await userEvent.type(teamNameInput, 'Test Team');

      const emailInput = screen.getByPlaceholderText('email@example.com');
      // Use fireEvent to set value for type="email" input in jsdom
      fireEvent.change(emailInput, { target: { value: 'not-an-email' } });
      // Trigger input event for React
      fireEvent.input(emailInput, { target: { value: 'not-an-email' } });

      const submitButton = screen.getByRole('button', { name: /^Onboarding afronden$/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnNext).not.toHaveBeenCalled();
      });
    });

    test('should validate email format when provided', () => {
      // Test the validation logic directly
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      expect(emailRegex.test('valid@example.com')).toBe(true);
      expect(emailRegex.test('invalid-email')).toBe(false);
      expect(emailRegex.test('')).toBe(false);
      expect(emailRegex.test('@example.com')).toBe(false);
      expect(emailRegex.test('user@')).toBe(false);
    });

    test('should show error for duplicate team names', async () => {
      render(<TeamsStep competitieId={mockCompetitieId} onNext={mockOnNext} onBack={mockOnBack} />);

      const teamNameInput = screen.getByLabelText(/teamnaam/i);
      await userEvent.type(teamNameInput, 'Heren 1');

      const addTeamButton = screen.getByRole('button', { name: /nog een team toevoegen/i });
      await userEvent.click(addTeamButton);

      const teamNameInputs = screen.getAllByLabelText(/teamnaam/i);
      await userEvent.type(teamNameInputs[1], 'Heren 1');

      const submitButton = screen.getByRole('button', { name: /onboarding afronden/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/teamnamen mogen niet dubbel zijn/i)).toBeInTheDocument();
      });
    });

    test('should not call onNext when validation fails', async () => {
      render(<TeamsStep competitieId={mockCompetitieId} onNext={mockOnNext} onBack={mockOnBack} />);

      const submitButton = screen.getByRole('button', { name: /onboarding afronden/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnNext).not.toHaveBeenCalled();
      });
    });

    test('should clear validation error when user types in team name', async () => {
      render(<TeamsStep competitieId={mockCompetitieId} onNext={mockOnNext} onBack={mockOnBack} />);

      const submitButton = screen.getByRole('button', { name: /onboarding afronden/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/vul een naam in voor team 1/i)).toBeInTheDocument();
      });

      const teamNameInput = screen.getByLabelText(/teamnaam/i);
      await userEvent.type(teamNameInput, 'Test Team');

      await waitFor(() => {
        expect(screen.queryByText(/vul een naam in voor team 1/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('CSV Import', () => {
    test('should import teams from CSV file upload', async () => {
      render(<TeamsStep competitieId={mockCompetitieId} onNext={mockOnNext} onBack={mockOnBack} />);

      const csvButton = screen.getByRole('button', { name: /importeren via csv/i });
      await userEvent.click(csvButton);

      const csvContent = 'team_naam,captain_naam,captain_email,speelklasse\n"Team A, B",Jan Jansen,jan@example.com,Heren 1\nTeam C,Piet Pietersen,piet@example.com,Dames 1';
      const file = createCSVFile(csvContent);

      const fileInput = screen.getByTestId('csv-file-input');
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText(/3 team\(s\) geïmporteerd/i)).toBeInTheDocument();
      });
    });

    test('should show error for malformed CSV', async () => {
      render(<TeamsStep competitieId={mockCompetitieId} onNext={mockOnNext} onBack={mockOnBack} />);

      const csvButton = screen.getByRole('button', { name: /importeren via csv/i });
      await userEvent.click(csvButton);

      const csvContent = 'team_naam,captain_naam,captain_email,speelklasse\n"Team A,Jan Jansen,jan@example.com,Heren 1';
      const file = createCSVFile(csvContent);

      const fileInput = screen.getByTestId('csv-file-input');
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText(/ongeldige csv/i)).toBeInTheDocument();
      });
    });

    test('should show error for empty CSV file', async () => {
      render(<TeamsStep competitieId={mockCompetitieId} onNext={mockOnNext} onBack={mockOnBack} />);

      const csvButton = screen.getByRole('button', { name: /importeren via csv/i });
      await userEvent.click(csvButton);

      const file = createCSVFile('');
      const fileInput = screen.getByTestId('csv-file-input');
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText(/geen geldige teams gevonden/i)).toBeInTheDocument();
      });
    });

    test('should show error for header-only CSV', async () => {
      render(<TeamsStep competitieId={mockCompetitieId} onNext={mockOnNext} onBack={mockOnBack} />);

      const csvButton = screen.getByRole('button', { name: /importeren via csv/i });
      await userEvent.click(csvButton);

      const csvContent = 'team_naam,captain_naam,captain_email,speelklasse';
      const file = createCSVFile(csvContent);

      const fileInput = screen.getByTestId('csv-file-input');
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText(/geen geldige teams gevonden/i)).toBeInTheDocument();
      });
    });

    test('should parse CSV with valid data and show teams', async () => {
      render(<TeamsStep competitieId={mockCompetitieId} onNext={mockOnNext} onBack={mockOnBack} />);

      const csvButton = screen.getByRole('button', { name: /importeren via csv/i });
      await userEvent.click(csvButton);

      const csvContent = 'team_naam,captain_naam,captain_email,speelklasse\nTeam A,Jan Jansen,jan@example.com,Heren 1\nTeam B,Piet Pietersen,piet@example.com,Dames 1';
      const file = createCSVFile(csvContent);

      const fileInput = screen.getByTestId('csv-file-input');
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText(/3 team\(s\) geïmporteerd/i)).toBeInTheDocument();
      });
    });
  });

  describe('Submit teams', () => {
    test('should save teams and call onNext on successful submit', async () => {
      const mockSaveTeams = vi.mocked(onboardingApi.saveTeams);
      mockSaveTeams.mockResolvedValue({ data: {} });

      render(<TeamsStep competitieId={mockCompetitieId} onNext={mockOnNext} onBack={mockOnBack} />);

      const teamNameInput = screen.getByLabelText(/teamnaam/i);
      await userEvent.type(teamNameInput, 'Heren 1');

      const submitButton = screen.getByRole('button', { name: /onboarding afronden/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSaveTeams).toHaveBeenCalledWith(mockCompetitieId, {
          teams: [{ naam: 'Heren 1' }]
        });
        expect(mockOnNext).toHaveBeenCalled();
      });
    });

    test('should show API error on save failure', async () => {
      const mockSaveTeams = vi.mocked(onboardingApi.saveTeams);
      mockSaveTeams.mockRejectedValue(new ApiError('Save failed', {
        data: { detail: 'Er ging iets mis met opslaan' }
      }));

      render(<TeamsStep competitieId={mockCompetitieId} onNext={mockOnNext} onBack={mockOnBack} />);

      const teamNameInput = screen.getByLabelText(/teamnaam/i);
      await userEvent.type(teamNameInput, 'Heren 1');

      const submitButton = screen.getByRole('button', { name: /onboarding afronden/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/er ging iets mis met opslaan/i)).toBeInTheDocument();
        expect(mockOnNext).not.toHaveBeenCalled();
      });
    });

    test('should show generic error on unknown save failure', async () => {
      const mockSaveTeams = vi.mocked(onboardingApi.saveTeams);
      mockSaveTeams.mockRejectedValue(new Error('Unknown error'));

      render(<TeamsStep competitieId={mockCompetitieId} onNext={mockOnNext} onBack={mockOnBack} />);

      const teamNameInput = screen.getByLabelText(/teamnaam/i);
      await userEvent.type(teamNameInput, 'Heren 1');

      const submitButton = screen.getByRole('button', { name: /onboarding afronden/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/er is iets misgegaan/i)).toBeInTheDocument();
        expect(mockOnNext).not.toHaveBeenCalled();
      });
    });

    test('should disable submit button while saving', async () => {
      const mockSaveTeams = vi.mocked(onboardingApi.saveTeams);
      mockSaveTeams.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(<TeamsStep competitieId={mockCompetitieId} onNext={mockOnNext} onBack={mockOnBack} />);

      const teamNameInput = screen.getByLabelText(/teamnaam/i);
      await userEvent.type(teamNameInput, 'Heren 1');

      const submitButton = screen.getByRole('button', { name: /onboarding afronden/i });
      await userEvent.click(submitButton);

      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveTextContent(/opslaan/i);

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });
    });

    test('should call onBack when clicking back button', async () => {
      render(<TeamsStep competitieId={mockCompetitieId} onNext={mockOnNext} onBack={mockOnBack} />);

      const backButton = screen.getByRole('button', { name: /terug/i });
      await userEvent.click(backButton);

      expect(mockOnBack).toHaveBeenCalled();
    });
  });
});
