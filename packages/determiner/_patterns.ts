export const lowercaseAlphabet = "abcdefghijklmnopqrstuvwxyz" as const;
export const uppercaseAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ" as const;
export const alphabet = [lowercaseAlphabet, uppercaseAlphabet] as const;
export const number = "0123456789" as const;
export const lowercaseAlphabetNumber = [lowercaseAlphabet, number] as const;
export const uppercaseAlphabetNumber = [uppercaseAlphabet, number] as const;
export const alphabetNumber = [...alphabet, number] as const;

export const nonSimilarLowercaseAlphabet = "abcdefghjkmnpqrstuvwxyz" as const;
export const nonSimilarUppercaseAlphabet = "ABCDEFGHJKMNPQRSTUVWXYZ" as const;
export const nonSimilarAlphabet = [
  nonSimilarLowercaseAlphabet,
  nonSimilarUppercaseAlphabet,
] as const;
export const nonSimilarNumber = "23456789" as const;
export const nonSimilarLowercaseAlphabetNumber = [
  nonSimilarLowercaseAlphabet,
  nonSimilarNumber,
] as const;
export const nonSimilarUppercaseAlphabetNumber = [
  nonSimilarUppercaseAlphabet,
  nonSimilarNumber,
] as const;
export const nonSimilarAlphabetNumber = [
  ...nonSimilarAlphabet,
  nonSimilarNumber,
] as const;

export const symbol = "!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~ " as const;
export const programmerSymbol = "!%^*-_=+;:~|." as const;
