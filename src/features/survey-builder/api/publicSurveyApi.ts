const PUBLIC_API = `${import.meta.env.VITE_API_URL || "/rafiki"}/public/surveys`;

export async function loadPublicSurvey(id: string) {
  const res = await fetch(`${PUBLIC_API}/${id}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.message || "Failed to load survey");
  return json.data;
}

export async function submitPublicResponse(surveyId: string, answers: {
  questionId: number;
  valueText?: string;
  valueNumber?: number;
  selectedOptionId?: number;
}[]) {
  const res = await fetch(`${PUBLIC_API}/responses`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ surveyId, answers }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message || "Failed to submit response");
  return json.data;
}
