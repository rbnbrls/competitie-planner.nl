import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tenantApi } from "../lib/api";
import { showToast } from "../components/Toast";

export function useRondeDetail(rondeId: string | undefined, competitieId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: rondeData, isLoading: isLoadingRonde } = useQuery({
    queryKey: ["ronde", rondeId],
    queryFn: () => tenantApi.getRondeDetail(rondeId!),
    enabled: !!rondeId,
  });

  const { data: teamsData, isLoading: isLoadingTeams } = useQuery({
    queryKey: ["teams", competitieId],
    queryFn: () => tenantApi.getTeamsForPlanning(competitieId!),
    enabled: !!competitieId,
  });

  const { data: banenData, isLoading: isLoadingBanen } = useQuery({
    queryKey: ["banen"],
    queryFn: () => tenantApi.getBanenForPlanning(),
  });

  const { data: wedstrijdenData, isLoading: isLoadingWedstrijden } = useQuery({
    queryKey: ["wedstrijden", rondeId],
    queryFn: () => tenantApi.getWedstrijden(rondeId!),
    enabled: !!rondeId,
  });

  const { data: snapshotsData, refetch: refetchSnapshots } = useQuery({
    queryKey: ["snapshots", rondeId],
    queryFn: () => tenantApi.getSnapshots(rondeId!),
    enabled: !!rondeId,
  });

  const updateToewijzingMutation = useMutation({
    mutationFn: (variables: { id: string; data: any }) => 
      tenantApi.updateToewijzing(variables.id, variables.data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ["ronde", rondeId] });
      const previousRonde = queryClient.getQueryData(["ronde", rondeId]);

      queryClient.setQueryData(["ronde", rondeId], (old: any) => {
        if (!old || !old.data) return old;
        return {
          ...old,
          data: {
            ...old.data,
            toewijzingen: old.data.toewijzingen.map((t: any) => 
              t.id === id ? { ...t, ...data } : t
            ),
          }
        };
      });

      return { previousRonde };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousRonde) {
        queryClient.setQueryData(["ronde", rondeId], context.previousRonde);
      }
      showToast.error("Fout bij bijwerken toewijzing");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["ronde", rondeId] });
    },
  });

  const swapToewijzingenMutation = useMutation({
    mutationFn: async (variables: { activeId: string; activeTeamId: string; overId: string; overTeamId: string; }) => {
      await Promise.all([
         tenantApi.updateToewijzing(variables.activeId, { team_id: variables.overTeamId }),
         tenantApi.updateToewijzing(variables.overId, { team_id: variables.activeTeamId }),
      ]);
    },
    onMutate: async ({ activeId, activeTeamId, overId, overTeamId }) => {
      await queryClient.cancelQueries({ queryKey: ["ronde", rondeId] });
      const previousRonde = queryClient.getQueryData(["ronde", rondeId]);

      queryClient.setQueryData(["ronde", rondeId], (old: any) => {
        if (!old || !old.data) return old;
        return {
          ...old,
          data: {
            ...old.data,
            toewijzingen: old.data.toewijzingen.map((t: any) => {
              if (t.id === activeId) return { ...t, team_id: overTeamId };
              if (t.id === overId) return { ...t, team_id: activeTeamId };
              return t;
            }),
          }
        };
      });

      return { previousRonde };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousRonde) {
        queryClient.setQueryData(["ronde", rondeId], context.previousRonde);
      }
      showToast.error("Fout bij wisselen teams");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["ronde", rondeId] });
    },
  });

  const generateIndelingMutation = useMutation({
    mutationFn: () => tenantApi.generateIndeling(rondeId!),
    onSuccess: (res) => {
      queryClient.setQueryData(["ronde", rondeId], (old: any) => {
         if (!old || !old.data) return { data: res.data };
         return {
           ...old,
           data: {
             ...old.data,
             toewijzingen: res.data.toewijzingen
           }
         };
      });
      showToast.success("Indeling gegenereerd");
    },
    onError: () => {
      showToast.error("Fout bij genereren");
    }
  });

  const publishMutation = useMutation({
    mutationFn: () => tenantApi.publishRonde(rondeId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ronde", rondeId] });
      showToast.success("Ronde gepubliceerd");
    },
    onError: () => {
      showToast.error("Fout bij publiceren");
    }
  });

  const depublishMutation = useMutation({
    mutationFn: () => tenantApi.depublishRonde(rondeId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ronde", rondeId] });
      showToast.success("Ronde gedepubliceerd");
    },
    onError: () => {
      showToast.error("Fout bij depubliceren");
    }
  });

  const herstellSnapshotMutation = useMutation({
    mutationFn: (snapshotId: string) => tenantApi.herstellSnapshot(rondeId!, snapshotId),
    onSuccess: (res) => {
      queryClient.setQueryData(["ronde", rondeId], (old: any) => {
        if (!old || !old.data) return { data: res.data };
        return { ...old, data: res.data };
      });
      refetchSnapshots();
      showToast.success("Vorige versie hersteld");
    },
    onError: () => {
      showToast.error("Fout bij herstellen versie");
    },
  });

  return {
    ronde: rondeData?.data,
    teams: teamsData?.data || [],
    banen: banenData?.data || [],
    wedstrijden: wedstrijdenData?.data?.wedstrijden || [],
    snapshots: (snapshotsData?.data || []) as Array<{ id: string; aanleiding: string; created_at: string; count: number }>,
    isLoading: isLoadingRonde || isLoadingTeams || isLoadingBanen || isLoadingWedstrijden,
    updateToewijzing: updateToewijzingMutation.mutateAsync,
    swapToewijzingen: swapToewijzingenMutation.mutateAsync,
    generateIndeling: generateIndelingMutation,
    publishRonde: publishMutation,
    depublishRonde: depublishMutation,
    herstellSnapshot: herstellSnapshotMutation,
  };
}
