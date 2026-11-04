export default async function(request, context) {
  if (request.method !== "POST") return context.next();
  const headers = new Headers(request.headers);
  headers.delete("x-country");
  const country = context.geo?.country?.code;
  if (/^[A-Z]{2}$/.test(country || "")) headers.set("x-country", country);
  const upstream = new Request("https://frontier-crowns-v5.meshedfolio.chatgpt.site/api/presence", {
    method: request.method,
    headers,
    body: request.body,
    redirect: "manual"
  });
  const response = await fetch(upstream);
  const result = new Response(response.body, response);
  result.headers.set("Cache-Control", "no-store");
  return result;
}
export const config = { path: "/api/presence" };
