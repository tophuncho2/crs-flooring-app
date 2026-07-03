"use client"

import { useQueryClient } from "@tanstack/react-query"
import {
  useSingleSectionCreateController,
  type RecordDetailClientScaffoldContext,
} from "@/engines/record-view"
import { createRecordSectionError } from "@/types/record/section-error"
import {
  validateInviteCreateForm,
  type InviteCreateForm,
  type UserRank,
} from "@builders/domain"
import { assignableRanks, RANK_LABELS } from "@/modules/users/rank-presentation"
import { createInviteRequest } from "@/modules/invites/data/mutations"
import { INVITES_LIST_QUERY_KEY } from "@/modules/invites/data/list-invites-request"

// Invite create flow. On success it stays on the page (`redirectTo: null`) and
// surfaces the login-URL hint as the section notice, so the admin can relay it —
// then invalidates the pending-invites list so the new row shows on return.
export function useInviteCreateSection({
  page,
  actorRank,
  loginUrl,
}: {
  page: RecordDetailClientScaffoldContext
  actorRank: UserRank
  loginUrl: string
}) {
  const queryClient = useQueryClient()
  const ranks = assignableRanks(actorRank)
  const initialRank = ranks[ranks.length - 1] ?? actorRank

  return useSingleSectionCreateController<InviteCreateForm>({
    page,
    createInitialValue: () => ({ email: "", rank: initialRank }),
    createRecord: async (form) => {
      const validationError = validateInviteCreateForm(form)
      if (validationError) {
        throw createRecordSectionError({
          kind: "validation",
          message: validationError,
          retryable: true,
        })
      }
      const { invite } = await createInviteRequest(form.email.trim(), form.rank)
      await queryClient.invalidateQueries({ queryKey: [...INVITES_LIST_QUERY_KEY] })
      return {
        redirectTo: null,
        noticeMessage: `Invited ${invite.email} as ${RANK_LABELS[invite.rank]}. Tell them to sign in with Google at ${loginUrl}.`,
      }
    },
  })
}
