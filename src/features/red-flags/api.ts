import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { RedFlagCheck, RedFlagCheckStatus, RedFlagItem } from '@/types/database'

export function useRedFlagItems() {
  return useQuery({
    queryKey: ['red-flag-items'],
    staleTime: 60 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('red_flag_items')
        .select('*')
        .eq('is_active', true)
        .order('category')
        .order('sort_order')
        .returns<RedFlagItem[]>()
      if (error) throw error
      return data
    },
  })
}

export function useRedFlagChecks(consultationId: string) {
  return useQuery({
    queryKey: ['red-flag-checks', consultationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('consultation_red_flag_checks')
        .select('*')
        .eq('consultation_id', consultationId)
        .returns<RedFlagCheck[]>()
      if (error) throw error
      return data
    },
  })
}

export function useSetRedFlagCheck(consultationId: string, organizationId: string, userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ itemId, status }: { itemId: string; status: RedFlagCheckStatus }) => {
      const { error } = await supabase.from('consultation_red_flag_checks').upsert(
        {
          consultation_id: consultationId,
          organization_id: organizationId,
          item_id: itemId,
          status,
          checked_by: userId,
          checked_at: new Date().toISOString(),
        },
        { onConflict: 'consultation_id,item_id' },
      )
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['red-flag-checks', consultationId] }),
  })
}
