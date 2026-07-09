import {
  createPrismaPageLoadIssue,
  getCertificateById,
  isPrismaNotFoundError,
  type PrismaDetailPageResult,
} from "@builders/db"

export { getCertificateById }

export async function getCertificateDetailPageData(id: string): Promise<
  PrismaDetailPageResult<{
    certificate: Awaited<ReturnType<typeof getCertificateById>>
  }>
> {
  try {
    const certificate = await getCertificateById(id)

    return {
      ok: true,
      data: { certificate },
    }
  } catch (error) {
    if (isPrismaNotFoundError(error)) {
      return { ok: false, notFound: true }
    }

    return {
      ok: false,
      error: createPrismaPageLoadIssue(error, {
        code: "CERTIFICATE_DETAIL_LOAD_FAILED",
        title: "Certificate Unavailable",
        message: "The app could not load this certificate.",
        detail: "The certificate record could not be loaded.",
      }),
    }
  }
}
