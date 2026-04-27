import { parseAsInteger, parseAsString, parseAsStringEnum } from "nuqs"

export const listSearchParser = parseAsString.withDefault("")
export const listSortFieldParser = parseAsString.withDefault("")
export const listSortDirectionParser = parseAsStringEnum<"asc" | "desc">(["asc", "desc"]).withDefault("asc")
export const listGroupFieldParser = parseAsString.withDefault("")
export const listPageParser = parseAsInteger.withDefault(1)
