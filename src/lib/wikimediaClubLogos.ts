/**
 * Wikimedia Commons crest fallback for clubs NOT in the five covered leagues
 * (English Premier League, Spain La Liga, Ligue 1, Bundesliga, Serie A).
 *
 * Clubs in those five leagues are served from the local SVG set in
 * `public/assets/team_logos` (see TeamLogo.tsx) and must never reach here.
 *
 * Every URL below was resolved via the Wikipedia/Commons API and verified with
 * a live request returning HTTP 200 + `image/svg+xml`. Wikimedia upload paths
 * are NOT uniform, so each entry is stored explicitly rather than derived from
 * a pattern. Add new competitions/clubs here as they appear in our data.
 *
 * Key = the club key used across the project (normalized name), matching how
 * odds-api / football-data names normalize via `normalizeName`.
 */

export const WIKIMEDIA_LOGO_BY_CLUB: Record<string, string> = {
  // UEFA Champions League — clubs outside the five covered leagues
  "sporting-cp": "https://upload.wikimedia.org/wikipedia/commons/3/33/Sporting_Clube_de_Portugal.svg",
  "sporting-lisbon": "https://upload.wikimedia.org/wikipedia/commons/3/33/Sporting_Clube_de_Portugal.svg",
  "sporting-clube-de-portugal": "https://upload.wikimedia.org/wikipedia/commons/3/33/Sporting_Clube_de_Portugal.svg",
  galatasaray: "https://upload.wikimedia.org/wikipedia/commons/2/20/Galatasaray_Sports_Club_Logo.svg",
  "galatasaray-sk": "https://upload.wikimedia.org/wikipedia/commons/2/20/Galatasaray_Sports_Club_Logo.svg",
  "viking-fk": "https://upload.wikimedia.org/wikipedia/en/1/13/Viking_FK_logo_2020.svg",
  "club-brugge": "https://upload.wikimedia.org/wikipedia/en/d/d0/Club_Brugge_KV_logo.svg",
  "club-brugge-kv": "https://upload.wikimedia.org/wikipedia/en/d/d0/Club_Brugge_KV_logo.svg",
  feyenoord: "https://upload.wikimedia.org/wikipedia/commons/f/f9/Feyenoord_logo_since_2024.svg",
  "feyenoord-rotterdam": "https://upload.wikimedia.org/wikipedia/commons/f/f9/Feyenoord_logo_since_2024.svg",
  lask: "https://upload.wikimedia.org/wikipedia/commons/a/a2/LASK-Logo_2023.svg",
  "lask-linz": "https://upload.wikimedia.org/wikipedia/commons/a/a2/LASK-Logo_2023.svg",
  "aek-athens": "https://upload.wikimedia.org/wikipedia/en/0/04/AEK_Athens_FC_logo.svg",
  "pae-aek": "https://upload.wikimedia.org/wikipedia/en/0/04/AEK_Athens_FC_logo.svg",
  porto: "https://upload.wikimedia.org/wikipedia/en/f/f1/FC_Porto.svg",
  "fc-porto": "https://upload.wikimedia.org/wikipedia/en/f/f1/FC_Porto.svg",
  "sk-slovan-bratislava": "https://upload.wikimedia.org/wikipedia/commons/0/01/SK_Slovan_Bratislava_logo.svg",
  "slovan-bratislava": "https://upload.wikimedia.org/wikipedia/commons/0/01/SK_Slovan_Bratislava_logo.svg",
  "fk-bodo-glimt": "https://upload.wikimedia.org/wikipedia/en/8/8d/FK_Bodo_Glimt_logo.svg",
  "bodo-glimt": "https://upload.wikimedia.org/wikipedia/en/8/8d/FK_Bodo_Glimt_logo.svg",
  fenerbahce: "https://upload.wikimedia.org/wikipedia/en/3/39/Fenerbah%C3%A7e.svg",
  "fenerbahce-sk": "https://upload.wikimedia.org/wikipedia/en/3/39/Fenerbah%C3%A7e.svg",
  psv: "https://upload.wikimedia.org/wikipedia/en/0/05/PSV_Eindhoven.svg",
  "psv-eindhoven": "https://upload.wikimedia.org/wikipedia/en/0/05/PSV_Eindhoven.svg",
  "sabah-fk": "https://upload.wikimedia.org/wikipedia/en/1/17/Sabah_FK_%28Azerbaijan%29_logo.svg",
  "fc-shakhtar-donetsk": "https://upload.wikimedia.org/wikipedia/en/a/a1/FC_Shakhtar_Donetsk.svg",
  "shakhtar-donetsk": "https://upload.wikimedia.org/wikipedia/en/a/a1/FC_Shakhtar_Donetsk.svg",
  "fk-shakhtar-donetsk": "https://upload.wikimedia.org/wikipedia/en/a/a1/FC_Shakhtar_Donetsk.svg",
  "sk-slavia-praha": "https://upload.wikimedia.org/wikipedia/commons/2/2b/SK_Slavia_Praha_full_logo.svg",
  "slavia-praha": "https://upload.wikimedia.org/wikipedia/commons/2/2b/SK_Slavia_Praha_full_logo.svg",
  "slavia-prague": "https://upload.wikimedia.org/wikipedia/commons/2/2b/SK_Slavia_Praha_full_logo.svg",
  // FA Cup / EFL Cup clubs without a local crest
  "bradford-city": "https://upload.wikimedia.org/wikipedia/en/0/04/Bradford_City_AFC_crest.svg",
  "bradford-city-afc": "https://upload.wikimedia.org/wikipedia/en/0/04/Bradford_City_AFC_crest.svg",
  "fleetwood-town": "https://upload.wikimedia.org/wikipedia/en/e/ed/Fleetwood_Town_F.C._logo.svg",
  "peterborough-united": "https://upload.wikimedia.org/wikipedia/en/9/9a/Peterborough_United_FC_crest.svg",
  "peterborough": "https://upload.wikimedia.org/wikipedia/en/9/9a/Peterborough_United_FC_crest.svg",
};

/** Generic fallback so the UI never breaks for an unknown club. */
export const GENERIC_CLUB_LOGO = "/assets/team_logos/generic-club.svg";