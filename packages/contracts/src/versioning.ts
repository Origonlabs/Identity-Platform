export type SemanticVersion = `${number}.${number}.${number}`;

export type Versioned<TPayload> = {
  version: SemanticVersion;
  payload: TPayload;
};
