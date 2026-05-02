/*
 * File: frontend/src/pages/Onboarding.tsx
 * Last updated: 2026-05-01
 * API version: 0.1.0
 * Author: Ruben Barels <ruben@rabar.nl>
 * Changelog:
 *   - 2026-05-01: Initial metadata header added
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { onboardingApi } from "../lib/api";
import { ProgressBar } from "../components/onboarding/ProgressBar";
import { ClubStep } from "../components/onboarding/ClubStep";
import { CourtsStep } from "../components/onboarding/CourtsStep";
import { CompetitionStep } from "../components/onboarding/CompetitionStep";
import { TeamsStep } from "../components/onboarding/TeamsStep";

interface OnboardingStatus {
  onboarding_completed: boolean;
  step1_completed: boolean;
  step2_completed: boolean;
  step3_completed: boolean;
  step4_completed: boolean;
  has_club: boolean;
  has_courts: boolean;
  has_competition: boolean;
  has_teams: boolean;
  competitie_id?: string | null;
}

const STEP_LABELS = ["Club", "Banen", "Competitie", "Teams"];

export default function Onboarding() {
  const { club } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [competitieId, setCompetitieId] = useState<string>("");

  const completeOnboarding = useCallback(async () => {
    try {
      await onboardingApi.complete();
      navigate("/dashboard");
    } catch (error) {
      console.error("Failed to complete onboarding:", error);
      navigate("/dashboard");
    }
  }, [navigate]);

  const loadStatus = useCallback(async () => {
    try {
      const response = await onboardingApi.getStatus();
      setStatus(response.data);
      
      if (response.data.onboarding_completed) {
        navigate("/dashboard");
        return;
      }

      if (response.data.step1_completed) setCurrentStep(2);
      if (response.data.step2_completed) setCurrentStep(3);
      if (response.data.step3_completed) {
        if (response.data.competitie_id) {
          setCompetitieId(response.data.competitie_id);
        }
        setCurrentStep(4);
      }
      if (response.data.step4_completed) {
        completeOnboarding();
      }
    } catch (error) {
      console.error("Failed to load onboarding status:", error);
    } finally {
      setIsLoading(false);
    }
  }, [navigate, completeOnboarding]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleStep1Complete = () => {
    setCurrentStep(2);
  };

  const handleStep2Complete = () => {
    setCurrentStep(3);
  };

  const handleStep3Complete = (compId: string) => {
    setCompetitieId(compId);
    setCurrentStep(4);
  };

  const handleStep4Complete = async () => {
    await completeOnboarding();
  };

  const handleStepClick = (step: number) => {
    if (status) {
      const completedSteps = [
        status.step1_completed,
        status.step2_completed,
        status.step3_completed,
        status.step4_completed,
      ];
      const canGoBack = completedSteps.slice(0, step - 1).some(s => s);
      if (canGoBack) {
        setCurrentStep(step);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600">Laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welkom bij Competitie-Planner
          </h1>
          <p className="text-xl text-gray-600">
            Laten we jouw club instellen in enkele eenvoudige stappen
          </p>
          {club && (
            <p className="mt-2 text-lg text-gray-500">
              Club: <span className="font-semibold text-blue-600">{club.naam}</span>
            </p>
          )}
        </div>

        <ProgressBar
          currentStep={currentStep}
          totalSteps={4}
          stepLabels={STEP_LABELS}
          onStepClick={handleStepClick}
        />

        <div className="mt-8">
          {currentStep === 1 && (
            <ClubStep onNext={handleStep1Complete} />
          )}
          {currentStep === 2 && (
            <CourtsStep onNext={handleStep2Complete} onBack={() => setCurrentStep(1)} />
          )}
          {currentStep === 3 && (
            <CompetitionStep onNext={handleStep3Complete} onBack={() => setCurrentStep(2)} />
          )}
          {currentStep === 4 && competitieId && (
            <TeamsStep
              competitieId={competitieId}
              onNext={handleStep4Complete}
              onBack={() => setCurrentStep(3)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
