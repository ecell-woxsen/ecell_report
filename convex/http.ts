import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();
    const eventType = body.type;

    if (eventType === "user.created" || eventType === "user.updated") {
      const user = body.data;
      const email = user.email_addresses?.[0]?.email_address || "";
      const name = `${user.first_name || ""} ${user.last_name || ""}`.trim() || email;

      await ctx.runMutation(api.users.upsertFromClerk, {
        clerkId: user.id,
        name,
        email,
        avatarUrl: user.image_url,
      });
    }

    return new Response("OK", { status: 200 });
  }),
});

export default http;
