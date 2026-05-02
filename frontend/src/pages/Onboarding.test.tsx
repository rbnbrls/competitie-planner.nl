import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Onboarding from './Onboarding'
import { onboardingApi } from '../lib/api'

const mockNavigate = vi.fn()
const mockUseAuth = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

vi.mock('../lib/api', () => ({
  onboardingApi: {
    getStatus: vi.fn(),
    complete: vi.fn(),
  },
}))

vi.mock('../components/onboarding/ProgressBar', () => ({
  ProgressBar: ({ currentStep }: { currentStep: number }) => (
    <div data-testid="progress-bar">step-{currentStep}</div>
  ),
}))

vi.mock('../components/onboarding/ClubStep', () => ({
  ClubStep: () => <div>club-step</div>,
}))

vi.mock('../components/onboarding/CourtsStep', () => ({
  CourtsStep: () => <div>courts-step</div>,
}))

vi.mock('../components/onboarding/CompetitionStep', () => ({
  CompetitionStep: () => <div>competition-step</div>,
}))

vi.mock('../components/onboarding/TeamsStep', () => ({
  TeamsStep: ({ competitieId }: { competitieId: string }) => (
    <div data-testid="teams-step">teams-step:{competitieId}</div>
  ),
}))

describe('Onboarding', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    mockUseAuth.mockReset()
    mockUseAuth.mockReturnValue({
      club: { naam: 'Test Club' },
    })
    vi.clearAllMocks()
  })

  it('resumes step 4 with the competitie id from onboarding status', async () => {
    vi.mocked(onboardingApi.getStatus).mockResolvedValue({
      data: {
        onboarding_completed: false,
        step1_completed: true,
        step2_completed: true,
        step3_completed: true,
        step4_completed: false,
        has_club: true,
        has_courts: true,
        has_competition: true,
        has_teams: false,
        competitie_id: 'competition-123',
      },
    } as Awaited<ReturnType<typeof onboardingApi.getStatus>>)

    render(
      <MemoryRouter>
        <Onboarding />
      </MemoryRouter>
    )

    expect(await screen.findByTestId('teams-step')).toHaveTextContent('teams-step:competition-123')
    expect(screen.getByTestId('progress-bar')).toHaveTextContent('step-4')
  })

  it('loads onboarding status once on mount', async () => {
    vi.mocked(onboardingApi.getStatus).mockResolvedValue({
      data: {
        onboarding_completed: false,
        step1_completed: false,
        step2_completed: false,
        step3_completed: false,
        step4_completed: false,
        has_club: false,
        has_courts: false,
        has_competition: false,
        has_teams: false,
        competitie_id: null,
      },
    } as Awaited<ReturnType<typeof onboardingApi.getStatus>>)

    render(
      <MemoryRouter>
        <Onboarding />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByTestId('progress-bar')).toHaveTextContent('step-1')
    })
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(onboardingApi.getStatus).toHaveBeenCalledTimes(1)
  })
})
