import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  methodOrUrl: string,
  urlOrOptions?: string | (RequestInit & { body?: any }) | undefined,
  data?: unknown | undefined,
): Promise<Response> {
  let fetchUrl: string;
  let fetchOptions: RequestInit = { credentials: "include" };

  // Signature A: apiRequest(method, url, data)
  if (typeof urlOrOptions === "string" || data !== undefined) {
    const method = methodOrUrl;
    fetchUrl = urlOrOptions as string;
    fetchOptions.method = method;
    if (data !== undefined) {
      fetchOptions.headers = { ...(fetchOptions.headers as any), "Content-Type": "application/json" };
      fetchOptions.body = JSON.stringify(data);
    }
  } else {
    // Signature B: apiRequest(url, options)
    fetchUrl = methodOrUrl;
    const options = (urlOrOptions || {}) as RequestInit & { body?: any };
    fetchOptions = { ...fetchOptions, ...options };
    if (options.body !== undefined && typeof options.body !== "string") {
      fetchOptions.headers = { ...(fetchOptions.headers as any), "Content-Type": "application/json" };
      fetchOptions.body = JSON.stringify(options.body);
    }
  }

  const res = await fetch(fetchUrl, fetchOptions);

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
