/*
 * File: frontend/src/hooks/useCompetities.ts
 * Last updated: 2026-05-01
 * API version: 0.1.0
 * Author: Ruben Barels <ruben@rabar.nl>
 * Changelog:
 *   - 2026-05-01: Initial metadata header added
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tenantApi } from "../lib/api";
import { showToast } from "../components/Toast";
import { getErrorMessage } from "../lib/utils";

const DEFAULT_PARAMS = { page: 1, size: 20, actiefOnly: true } as const;

export function useCompetities(params: { 
  page?: number; 
  size?: number; 
  actiefOnly?: boolean 
} = DEFAULT_PARAMS) {
  const queryClient = useQueryClient();

  // Queries
  const { data: competitiesData, isLoading, isError } = useQuery({
    queryKey: ["competities", params],
    queryFn: () => tenantApi.listCompetities({
      page: params.page,
      size: params.size,
      actief_only: params.actiefOnly
    }),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof tenantApi.createCompetition>[0]) => 
      tenantApi.createCompetition(data),
    onSuccess: () => {
      showToast.success("Competitie aangemaakt");
      queryClient.invalidateQueries({ queryKey: ["competities"] });
    },
    onError: (err: unknown) => {
      showToast.error(getErrorMessage(err, "Fout bij aanmaken"));
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (variables: { id: string; data: Parameters<typeof tenantApi.duplicateCompetitie>[1] }) =>
      tenantApi.duplicateCompetitie(variables.id, variables.data),
    onSuccess: () => {
      showToast.success("Competitie is met succes gekopieerd.");
      queryClient.invalidateQueries({ queryKey: ["competities"] });
    },
    onError: (err: unknown) => {
      showToast.error(getErrorMessage(err, "Fout bij kopiëren van competitie."));
    },
  });

  const updateTijdslotConfigMutation = useMutation({
    mutationFn: (variables: { id: string; data: Parameters<typeof tenantApi.updateTijdslotConfig>[1] }) =>
      tenantApi.updateTijdslotConfig(variables.id, variables.data),
    onSuccess: () => {
      showToast.success("Tijdslotconfiguratie opgeslagen");
      queryClient.invalidateQueries({ queryKey: ["competities"] });
    },
    onError: (err: unknown) => {
      showToast.error(getErrorMessage(err, "Fout bij opslaan"));
    },
  });

  return {
    competities: competitiesData?.data?.items || [],
    total: competitiesData?.data?.total || 0,
    totalPages: competitiesData?.data?.pages || 1,
    isLoading,
    isError,
    createCompetitie: createMutation.mutateAsync,
    duplicateCompetitie: duplicateMutation.mutateAsync,
    updateTijdslotConfig: updateTijdslotConfigMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isDuplicating: duplicateMutation.isPending,
  };
}
