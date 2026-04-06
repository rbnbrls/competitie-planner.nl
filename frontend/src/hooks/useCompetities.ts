import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tenantApi } from "../lib/api";
import { showToast } from "../components/Toast";

export function useCompetities() {
  const queryClient = useQueryClient();

  // Queries
  const { data: competitiesData, isLoading } = useQuery({
    queryKey: ["competities"],
    queryFn: () => tenantApi.listCompetities(),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof tenantApi.createCompetition>[0]) => 
      tenantApi.createCompetition(data),
    onSuccess: () => {
      showToast.success("Competitie aangemaakt");
      queryClient.invalidateQueries({ queryKey: ["competities"] });
    },
    onError: (err: any) => {
      showToast.error(err.response?.data?.detail || "Fout bij aanmaken");
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (variables: { id: string; data: Parameters<typeof tenantApi.duplicateCompetitie>[1] }) =>
      tenantApi.duplicateCompetitie(variables.id, variables.data),
    onSuccess: () => {
      showToast.success("Competitie is met succes gekopieerd.");
      queryClient.invalidateQueries({ queryKey: ["competities"] });
    },
    onError: () => {
      showToast.error("Fout bij kopiëren van competitie.");
    },
  });

  const updateTijdslotConfigMutation = useMutation({
    mutationFn: (variables: { id: string; data: Parameters<typeof tenantApi.updateTijdslotConfig>[1] }) =>
      tenantApi.updateTijdslotConfig(variables.id, variables.data),
    onSuccess: () => {
      showToast.success("Tijdslotconfiguratie opgeslagen");
      queryClient.invalidateQueries({ queryKey: ["competities"] });
    },
    onError: (err: any) => {
      showToast.error(err.response?.data?.detail || "Fout bij opslaan");
    },
  });

  return {
    competities: competitiesData?.data?.competities || [],
    isLoading,
    createCompetitie: createMutation.mutateAsync,
    duplicateCompetitie: duplicateMutation.mutateAsync,
    updateTijdslotConfig: updateTijdslotConfigMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isDuplicating: duplicateMutation.isPending,
  };
}
