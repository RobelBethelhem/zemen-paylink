# Extra Caddy routing

Anything named `*.caddy` in this directory is imported into the site block,
just before the catch-all that serves the portal. An empty directory is the
normal case — the import glob matches nothing and Caddy is unaffected.

Files here are **not** in git. They describe one server's routing, and the
deployments differ.

---

## Keeping the bare internal URL working under a path prefix

When `PAYLINK_BASE_PATH` is set, Next serves the portal *only* beneath that
prefix. `https://10.1.2.136:2000/login` stops existing and answers 404, which
is correct but breaks every bookmark on the internal network.

This redirects the bare path to the prefixed one. Substitute your own host and
prefix:

```bash
cat > /opt/paylink/caddy-conf.d/base-path-redirect.caddy <<'EOF'
@bare_internal {
	host 10.1.2.136
	not path /paybylink /paybylink/*
	not path /api/v1/* /healthz
}
handle @bare_internal {
	redir * /paybylink{uri} 302
}
EOF
docker compose -f docker-compose.prod.yml restart caddy
```

`/login` then answers 302 to `/paybylink/login`, in one hop.

### Three details that are easy to get wrong

**`redir * …`, not `redir /paybylink{uri} …`.** `redir` takes an optional
inline matcher first, and an argument beginning with `/` is read as one. Drop
the `*` and Caddy takes `/paybylink{uri}` as the path to match and `302` as the
URL to send the browser to — it adapts without complaint and emits
`Location: 302`.

**`host` must name the internal address only.** Scoping this to the internal
host is what makes it safe. A proxy that strips the prefix would otherwise send
`/login`, get redirected to `/paybylink/login`, strip it again, and the two
would spin forever — the same loop that makes a stripping proxy unusable with
`basePath` in the first place.

**The `not path` lines are the loop guard on the internal side.** Without the
first, `/paybylink/login` is itself bare-looking and redirects to
`/paybylink/paybylink/login`. The second keeps API and health-check traffic out
of it, since neither moves under the prefix.

### Check it

```bash
curl -k -s -o /dev/null -w '%{http_code} %{redirect_url}\n' https://10.1.2.136:2000/login
curl -k -s -o /dev/null -w '%{http_code}\n' https://10.1.2.136:2000/paybylink/login
```

Expect `302 …/paybylink/login` then `200`. If the first returns `200` with no
location the matcher did not fire; if it returns `302` pointing at `302`, the
`*` is missing.
