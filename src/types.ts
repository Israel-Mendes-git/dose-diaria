export type CommemorativeType = "nacional" | "mundial" | "curiosidade";

export interface CommemorativeDate {
  title: string;
  type: CommemorativeType;
  description?: string;
}

export type DatesDataset = Record<string, CommemorativeDate[]>;
