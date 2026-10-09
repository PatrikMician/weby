#!/usr/bin/env bash
# Nasazení statických webů přes Nginx. Spouštět jako root z téhle složky:
#   sudo ./update.sh
# Co dělá: git pull, zkopíruje sites/<web> do /var/www/<web> a podle sites.txt
# vygeneruje konfiguraci Nginx (každý web na svém portu jen na 127.0.0.1).
# Ven ho pouští až Cloudflare Tunnel. Pouštět se dá opakovaně.
set -euo pipefail
cd "$(dirname "$(readlink -f "$0")")"

WWW="${WWW:-/var/www}"
CONF="${CONF:-/etc/nginx/conf.d/weby.conf}"
MARK=.weby-site

C_ACCENT=$'\033[38;5;203m'
C_OK=$'\033[38;5;114m'
C_WARN=$'\033[38;5;221m'
C_MUTED=$'\033[38;5;245m'
C_RESET=$'\033[0m'
Log()  { printf '%s→%s %s\n' "$C_ACCENT" "$C_RESET" "$*"; }
Ok()   { printf '%s✓%s %s\n' "$C_OK" "$C_RESET" "$*"; }
Warn() { printf '%s!%s %s\n' "$C_WARN" "$C_RESET" "$*"; }
Fail() { printf '%s✗ %s%s\n' $'\033[38;5;196m' "$*" "$C_RESET" >&2; exit 1; }

[[ $EUID -eq 0 ]] || Fail "Spusť jako root: sudo ./update.sh"
[[ -f sites.txt ]] || Fail "sites.txt chybí. Spusť update.sh z hlavní složky repa."

# git jako vlastník složky (jeho SSH klíč), ne jako root
OWNER="$(stat -c %U .)"
Git() { if [[ "$OWNER" == root ]]; then git "$@"; else sudo -u "$OWNER" git "$@"; fi; }

# ---- 1. git pull ------------------------------------------------------------
if [[ -d .git ]]; then
  BEFORE="$(Git rev-parse --short HEAD)"
  Log "Stahuji nejnovější verzi…"
  Git pull --ff-only --quiet || Fail "git pull se nepovedl. Lokální změny ve složce? Zkus: git status"
  AFTER="$(Git rev-parse --short HEAD)"
  [[ "$BEFORE" != "$AFTER" ]] && Git log --oneline --no-decorate "$BEFORE..$AFTER" | sed "s/^/  ${C_MUTED}/;s/$/${C_RESET}/"
else
  Warn "Složka není git repozitář, přeskakuji git pull."
fi

# ---- 2. Nginx a rsync -------------------------------------------------------
MISSING=()
command -v nginx >/dev/null || MISSING+=(nginx)
command -v rsync >/dev/null || MISSING+=(rsync)
if (( ${#MISSING[@]} )); then
  Log "Instaluji: ${MISSING[*]}"
  apt-get update -qq
  apt-get install -y -qq "${MISSING[@]}" >/dev/null
fi
# výchozí uvítací web Nginx (port 80 na celé síti) tu není k ničemu
if [[ -L /etc/nginx/sites-enabled/default ]]; then
  rm -f /etc/nginx/sites-enabled/default
  Log "Odstraněn výchozí web Nginx"
fi

# ---- 3. Načtení a kontrola sites.txt ----------------------------------------
declare -A PORT_OF=() NAME_OF_PORT=()
NAMES=()
while read -r name port _; do
  [[ -z "${name:-}" || "$name" == \#* ]] && continue
  [[ "$name" =~ ^[a-z0-9][a-z0-9-]*$ ]] || Fail "sites.txt: neplatný název „$name“ (jen malá písmena, čísla a pomlčka)."
  [[ "${port:-}" =~ ^[0-9]+$ ]] && (( port >= 8081 && port <= 8999 )) || Fail "sites.txt: „$name“ má neplatný port „${port:-}“ (povolené 8081–8999; 8080 je Cloud, 8000 Lumen)."
  [[ -z "${PORT_OF[$name]:-}" ]] || Fail "sites.txt: web „$name“ je v seznamu dvakrát."
  [[ -z "${NAME_OF_PORT[$port]:-}" ]] || Fail "sites.txt: port $port používají „${NAME_OF_PORT[$port]}“ i „$name“."
  [[ -f "sites/$name/index.html" ]] || Fail "sites/$name/index.html chybí. Složka webu musí mít index.html přímo uvnitř."
  PORT_OF[$name]=$port
  NAME_OF_PORT[$port]=$name
  NAMES+=("$name")
done < sites.txt
(( ${#NAMES[@]} )) || Fail "sites.txt je prázdný."

# ---- 4. Kopie webů ----------------------------------------------------------
for name in "${NAMES[@]}"; do
  Log "Kopíruji web $name…"
  install -d -m 755 "$WWW/$name"
  rsync -rlt --delete --no-owner --no-group --chmod=D755,F644 \
    --exclude="$MARK" --exclude='.git*' --exclude='.DS_Store' \
    "sites/$name/" "$WWW/$name/"
  touch "$WWW/$name/$MARK"
done

# ---- 5. Konfigurace Nginx (s návratem při chybě) ----------------------------------
TMP="$(mktemp)"
{
  echo "# Vygenerováno skriptem update.sh ze sites.txt. Ručně neupravuj."
  for name in "${NAMES[@]}"; do
    cat <<EOF

server {
    listen 127.0.0.1:${PORT_OF[$name]};
    server_name _;
    root $WWW/$name;
    index index.html;
    add_header X-Content-Type-Options nosniff always;
    location / { try_files \$uri \$uri/ =404; }
}
EOF
  done
} > "$TMP"

BACKUP=""
if [[ -f "$CONF" ]]; then BACKUP="$(mktemp)"; cp -a "$CONF" "$BACKUP"; fi
install -m 644 "$TMP" "$CONF"; rm -f "$TMP"
if ! nginx -t >/dev/null 2>&1; then
  if [[ -n "$BACKUP" ]]; then install -m 644 "$BACKUP" "$CONF"; else rm -f "$CONF"; fi
  nginx -t || true
  Fail "Konfigurace Nginx je chybná, vrácena původní. Zkontroluj sites.txt."
fi
[[ -n "$BACKUP" ]] && rm -f "$BACKUP"
systemctl enable nginx >/dev/null 2>&1 || true
if systemctl is-active --quiet nginx; then systemctl reload nginx; else systemctl start nginx; fi

# ---- 6. Kontrola a shrnutí --------------------------------------------------
echo
for name in "${NAMES[@]}"; do
  code="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${PORT_OF[$name]}/" || true)"
  if [[ "$code" == 200 ]]; then Ok "$name  →  127.0.0.1:${PORT_OF[$name]}  (HTTP $code)"
  else Warn "$name  →  127.0.0.1:${PORT_OF[$name]}  (HTTP ${code:-žádná odpověď})"; fi
done
# weby, které už nejsou v sites.txt, ale zůstaly na disku
for d in "$WWW"/*/; do
  n="$(basename "$d")"
  [[ -f "$d$MARK" && -z "${PORT_OF[$n]:-}" ]] && Warn "$n už není v sites.txt. Složka $d zůstala; smaž ji: sudo rm -rf $d"
done
printf '\n  Cloudflare Tunnel: u každého webu nastav Service na HTTP + 127.0.0.1:PORT (jen poprvé).\n'
