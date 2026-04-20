# Templates — Save Sales Reps

`saveTemplateSalesRepsUseCase` — atomic diff over `FlooringTemplateSalesRep` rows for a template; `@@unique([templateId, contactId])` guards duplicates.
