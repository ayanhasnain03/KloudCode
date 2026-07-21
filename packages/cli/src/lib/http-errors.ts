type ErrorResponse = {
  json: () => Promise<unknown>;
  status: number;
  statusText: string;
}

export async function getErrorMessage(response: ErrorResponse) {

  try {
    // if the error payload is valid, return the error message
    const data = await response.json() as { error?: string };
    if (typeof data.error === "string" && data.error.length > 0) {
      return data.error;
    }
  } catch (error) {
    // ignore invalid error payloads and fall back to status text
  }
  // if the error payload is invalid or missing, fall back to status text
  return response.statusText || `Request faild with status ${response.status}`;
}
