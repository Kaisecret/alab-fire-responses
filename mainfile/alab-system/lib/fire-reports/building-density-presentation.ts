export function densityRiskClass(status: string | null | undefined, confidence: string | null | undefined) {
  if (status === "DENSE_CLUSTER_DETECTED") return confidence === "HIGH" ? "density-critical" : "density-warning";
  if (status === "NO_DENSE_CLUSTER_DETECTED") return "density-clear";
  return "density-unknown";
}

export function densityAssessmentCopy(status: string | null | undefined) {
  if (status === "DENSE_CLUSTER_DETECTED") return "Dense building cluster detected";
  if (status === "NO_DENSE_CLUSTER_DETECTED") return "No dense building cluster detected";
  return "Insufficient mapped-building data";
}
