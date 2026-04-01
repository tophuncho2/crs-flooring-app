import { CenteredLoadingState } from "@/modules/shared/engines/common/feedback/feedback-states"

export default function DashboardLoading() {
  return <CenteredLoadingState label="Loading page..." className="min-h-screen pt-20" />
}
