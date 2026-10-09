# weby

Statické weby domácího serveru. Každý web je složka v `sites/`, seznam s porty je v `sites.txt`.
Na serveru je nasazuje `sudo ./update.sh`, ven je pouští Cloudflare Tunnel.

```
sites/robot/       web 6-DOS RoboArm (index.html musí ležet přímo ve složce)
extras/robot/      věci k projektu, které se nezveřejňují (Arduino kód, README)
sites.txt          název webu a port, např.  robot 8082
update.sh          git pull + kopie webů + konfigurace Nginx
```

## Nový web

1. Složku s webem dej do `sites/nazev/` (s `index.html` přímo uvnitř).
2. Do `sites.txt` přidej řádek `nazev 8083` (další volný port od 8081).
3. `git add -A && git commit -m "Nový web nazev" && git push`
4. Na serveru: `cd /opt/weby && git pull && sudo ./update.sh` (stačí `sudo ./update.sh`, pull dělá sám)
5. Jednorázově v Cloudflare (Zero Trust → Networks → Tunnels → tvůj tunel → Published application routes → Add):
   subdoména `nazev`, doména `mican.dpdns.org`, Service `HTTP`, URL `127.0.0.1:8083`.

## Úprava webu

Přepiš soubory v `sites/nazev/`, commit, push, na serveru `sudo ./update.sh`. Cloudflare může držet starou verzi v mezipaměti, v prohlížeči stiskni Ctrl+F5.

## Smazání webu

Smaž řádek v `sites.txt` a složku v `sites/`, push a `sudo ./update.sh`. Skript tě upozorní na složku v `/var/www`, kterou smažeš ručně. Route v Cloudflare smaž taky.

## Pozor

- Do repa nepatří hesla, klíče ani soubory, které nemají být veřejné. Co je v `sites/`, uvidí na webu každý.
- Web robota odkazuje na `zip-soubory/krabicka_displeje.zip`, který v repu chybí (odkaz vrací 404). Doplň ho do `sites/robot/zip-soubory/`, nebo odkaz z `index.html` smaž.
- Galerie (`galerie.html`) má prázdné obrázky (`src=""`).
