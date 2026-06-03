// The engine's error/notice contract. Re-exports the shared record-section
// error model so panels normalize + render errors through one surface.
export {
  type RecordSectionError,
  type RecordSectionErrorKind,
  isRecordSectionError,
  createRecordSectionError,
  normalizeRecordSectionError,
} from "@/types/record/section-error"
