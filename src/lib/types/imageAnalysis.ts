export type StockLevel  = "low" | "medium" | "high";
export type CrowdLevel  = "low" | "medium" | "high";

export type ImageAnalysisResult = {
  stockLevel:  StockLevel;
  crowdLevel:  CrowdLevel;
  categories:  string[];
  summary:     string;
};
