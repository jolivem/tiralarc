# Configurer la connexion Google et Apple

Tant que ces identifiants ne sont pas renseignés, les boutons Google / Apple n'apparaissent pas
et l'API répond `PROVIDER_NOT_CONFIGURED` sur `/auth/google` et `/auth/apple`. L'inscription par
email fonctionne sans eux.

## Principe

Le client (site web, app iOS, app Android) obtient un **ID token** (JWT signé) auprès de Google ou
d'Apple, puis l'envoie à l'API (`POST /api/v1/auth/google` ou `/auth/apple`). L'API vérifie la
signature avec les clés publiques du fournisseur, l'émetteur, l'expiration et l'**audience** : le
token doit avoir été délivré à l'un de **nos** identifiants clients, listés dans
`GOOGLE_CLIENT_IDS` / `APPLE_CLIENT_IDS`. Aucun secret client n'est nécessaire côté API.

## Google

1. https://console.cloud.google.com → créer (ou choisir) un projet.
2. **APIs & Services → OAuth consent screen** (« Google Auth Platform ») : type _External_, nom de
   l'application, email de support, domaine. Scopes : `openid`, `email`, `profile`.
3. **Clients → Create client → Web application** :
   - _Authorized JavaScript origins_ : `http://localhost:3000` (dev) et l'URL de production
     (ex. `https://tiralarc.fr`).
   - Pas de _redirect URI_ nécessaire (le bouton Google renvoie le token en JavaScript).
4. Copier le **Client ID** (`xxxx.apps.googleusercontent.com`) :
   - `apps/web/.env.local` → `NEXT_PUBLIC_GOOGLE_CLIENT_ID=<client id>`
   - `apps/api/.env` → `GOOGLE_CLIENT_IDS=<client id>`
5. Plus tard, pour le mobile : créer un client **iOS** et un client **Android** dans le même
   projet et **ajouter leurs IDs** à `GOOGLE_CLIENT_IDS` (séparés par des virgules).

Tant que l'écran de consentement est en mode _Testing_, seuls les comptes ajoutés comme
« test users » peuvent se connecter ; le publier pour ouvrir à tous.

## Apple

Nécessite un compte **Apple Developer Program** (99 $/an) — https://developer.apple.com/account.

1. **Certificates, Identifiers & Profiles → Identifiers → App IDs** : créer un App ID
   (ex. `fr.tiralarc.app`) avec la capacité **Sign in with Apple**. C'est aussi le _bundle ID_ de
   la future app iOS.
2. **Identifiers → Services IDs** : créer un Services ID (ex. `fr.tiralarc.web`) — c'est le
   « client ID » du site web. Activer **Sign in with Apple → Configure** :
   - _Primary App ID_ : celui de l'étape 1 ;
   - _Domains_ : votre domaine (ex. `tiralarc.fr`) ;
   - _Return URLs_ : ex. `https://tiralarc.fr/fr/login`.
     Apple **refuse `localhost`** et exige HTTPS : pour tester en local, passer par un tunnel
     (ex. `cloudflared tunnel --url http://localhost:3000`) et déclarer cette URL.
3. Renseigner :
   - `apps/web/.env.local` → `NEXT_PUBLIC_APPLE_CLIENT_ID=fr.tiralarc.web` et
     `NEXT_PUBLIC_APPLE_REDIRECT_URI=<une des Return URLs>`
   - `apps/api/.env` → `APPLE_CLIENT_IDS=fr.tiralarc.web,fr.tiralarc.app` (Services ID pour le
     web, bundle ID pour l'app iOS).

Particularités d'Apple, déjà gérées :

- l'utilisateur peut masquer son email (adresse relais `@privaterelay.appleid.com`) ;
- le **nom** n'est transmis qu'au client, et seulement à la première connexion : le client doit le
  renvoyer à l'API (`displayName`).

Pour envoyer des emails aux adresses relais Apple, il faudra déclarer le domaine d'envoi dans
**Services → Sign in with Apple for Email Communication**.

## Applications mobiles (plus tard)

Les apps utiliseront les SDK natifs (Google Sign-In, `AuthenticationServices` sur iOS,
Credential Manager sur Android) qui renvoient le même type d'ID token : il suffit de l'envoyer aux
mêmes routes de l'API, en ajoutant les client IDs mobiles aux variables ci-dessus. Passer un
`nonce` (aléatoire, à usage unique) au SDK et le transmettre à l'API, qui le vérifie (valeur brute
ou son SHA-256).
