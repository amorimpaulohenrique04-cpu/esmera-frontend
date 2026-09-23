import type { Handlers } from "$fresh/server.ts";
import { getPayloadBaseURL } from "../../lib/payload/client.ts";

const PHONE_PATTERN = /^\+[1-9]\d{7,14}$/;
const FAVORITE_ACTIONS = new Set(["add", "remove"]);

/**
 * Proxy same-origin para captura de leads.
 *
 * Mantém compatibilidade com o formulário do rodapé (somente phone) e também
 * encaminha o fluxo de favoritos (name + phone + productId + action) ao CMS.
 */
export const handler: Handlers = {
  async POST(req) {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return Response.json({
        error: { code: "invalid_request", message: "Corpo inválido." },
      }, {
        status: 400,
        headers: { "cache-control": "no-store" },
      });
    }

    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    if (!PHONE_PATTERN.test(phone)) {
      return Response.json({
        error: { code: "invalid_request", message: "Telefone inválido." },
      }, {
        status: 400,
        headers: { "cache-control": "no-store" },
      });
    }

    const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";
    const productId = typeof body.productId === "string" ||
        typeof body.productId === "number"
      ? body.productId
      : null;
    const action = typeof body.action === "string" ? body.action : "add";

    if (productId !== null && name.length < 2) {
      return Response.json({
        error: { code: "invalid_request", message: "Informe seu nome." },
      }, {
        status: 400,
        headers: { "cache-control": "no-store" },
      });
    }

    if (productId !== null && !FAVORITE_ACTIONS.has(action)) {
      return Response.json({
        error: { code: "invalid_request", message: "Ação inválida." },
      }, {
        status: 400,
        headers: { "cache-control": "no-store" },
      });
    }

    const payloadBody: Record<string, unknown> = { phone };
    if (name) payloadBody.name = name;
    if (productId !== null) {
      payloadBody.productId = productId;
      payloadBody.action = action;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    try {
      const upstream = await fetch(
        new URL("/api/storefront/leads", getPayloadBaseURL()),
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            accept: "application/json",
          },
          body: JSON.stringify(payloadBody),
          signal: controller.signal,
        },
      );
      const text = await upstream.text();
      return new Response(text, {
        status: upstream.status,
        headers: {
          "content-type": upstream.headers.get("content-type") ??
            "application/json; charset=utf-8",
          "cache-control": "no-store",
        },
      });
    } catch {
      return Response.json({
        error: {
          code: "lead_unavailable",
          message: "Não foi possível salvar agora.",
        },
      }, {
        status: 502,
        headers: { "cache-control": "no-store" },
      });
    } finally {
      clearTimeout(timeout);
    }
  },
};
