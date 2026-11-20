<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules

- Public shop data (products, site_settings) is read with the browser Supabase client inside TanStack Query `queryOptions` in `src/lib/catalog.ts`; route loaders call `ensureQueryData`. Why: RLS already limits anon reads and one query cache serves SSR and client.
- Product and banner photos live in the private `product-images` bucket and are shown through signed URLs (`withSignedImages`). Why: the workspace blocks public buckets.
- Anonymous visitor actions that need validation (placing orders, owner chat) go through SECURITY DEFINER SQL functions (`place_order`, `start_conversation`, `send_visitor_message`, `get_visitor_messages`), never direct table writes. Why: prices are recalculated server-side and visitors can only read their own chat via its access token.
- Admin pages under `src/routes/_authenticated/admin*` use the browser client with RLS gated by `has_role(auth.uid(), 'admin')`; the first account to sign up becomes admin via a trigger. Why: no service-role code is needed for store management.
- The AI assistant streams from `src/routes/api/chat.ts` → `src/lib/ai/chat.server.ts` (Responses API via Lovable AI Gateway) and injects the live catalog into its instructions; chat history is kept only in the visitor's localStorage. Why: recommendations stay in sync with admin product edits.
- Payments are manual mobile-wallet or cash: the checkout stores a transaction reference and the admin marks payment received. Why: no built-in card provider is available for this seller's country.
