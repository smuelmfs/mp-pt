import { auth } from "./firebase";

export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const user = auth.currentUser;
  let headers = new Headers(options.headers);

  if (user) {
    try {
      const idToken = await user.getIdToken();
      headers.set("Authorization", `Bearer ${idToken}`);
    } catch (error) {
      console.error("Erro ao obter token:", error);
    }
  }

  return fetch(url, {
    ...options,
    headers,
  });
}

