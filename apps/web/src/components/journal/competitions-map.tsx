'use client';

import 'leaflet/dist/leaflet.css';
import type { Competition } from '@tiralarc/api-client';
import type { Map as LeafletMap } from 'leaflet';
import { useFormatter, useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';
import { byPlace, distanceKm, type LatLng } from '@/lib/geo';
import classes from './journal.module.css';

/** France's mainland, shown while there is no point to fit. */
const FRANCE: [[number, number], [number, number]] = [
  [42.3, -4.8],
  [51.1, 8.2],
];
const POINT = '#c2410c';
const CHAMPIONSHIP = '#b08d00';
const HOME = '#1f4fa8';

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/**
 * The upcoming competitions on a map of France (Leaflet, OpenStreetMap's tiles): one point per
 * town (a championship's in gold), the archer's starting town (profile) as a blue point.
 * Hovering a point gives its competitions' names and the distance to travel (as the crow
 * flies, from the starting town); a click hands its first competition to `onPick` (the list
 * below scrolls to it). Towns not found (no coordinates) stay off the map, in the list.
 */
export function CompetitionsMap({
  competitions,
  home,
  onPick,
}: {
  competitions: Competition[];
  /** The starting town, with its name; null when none was given or found. */
  home: (LatLng & { name: string }) | null;
  onPick: (competition: Competition) => void;
}) {
  const t = useTranslations('archer.competitions.map');
  const format = useFormatter();
  const element = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  // The latest callback, without redrawing the map when it changes.
  const pick = useRef(onPick);
  useEffect(() => {
    pick.current = onPick;
  }, [onPick]);

  useEffect(() => {
    let cancelled = false;
    // Leaflet touches `window`: loaded in the browser only.
    void import('leaflet').then((L) => {
      if (cancelled || !element.current) return;
      map.current?.remove();
      const m = L.map(element.current, { scrollWheelZoom: false, attributionControl: true });
      map.current = m;
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(m);

      const bounds: [number, number][] = [];
      for (const place of byPlace(competitions)) {
        const championship = place.items.some((c) => c.championship);
        const km = home ? Math.round(distanceKm(home, place)) : null;
        // Each name once (a competition held on several days comes several times).
        const names = [...new Set(place.items.map((c) => c.title))]
          .map((title) => `<strong>${escapeHtml(title)}</strong>`)
          .join('<br>');
        const where = [place.items[0]?.city, km !== null && t('km', { km: format.number(km) })]
          .filter(Boolean)
          .join(' · ');
        L.circleMarker([place.latitude, place.longitude], {
          radius: 8,
          color: '#fff',
          weight: 2,
          fillColor: championship ? CHAMPIONSHIP : POINT,
          fillOpacity: 0.95,
        })
          .bindTooltip(`${names}<br>${escapeHtml(where)}`, { direction: 'top', offset: [0, -6] })
          .on('click', () => {
            const first = place.items[0];
            if (first) pick.current(first);
          })
          .addTo(m);
        bounds.push([place.latitude, place.longitude]);
      }
      if (home) {
        L.circleMarker([home.latitude, home.longitude], {
          radius: 7,
          color: '#fff',
          weight: 2,
          fillColor: HOME,
          fillOpacity: 1,
        })
          .bindTooltip(escapeHtml(t('home', { town: home.name })), { direction: 'top' })
          .addTo(m);
        bounds.push([home.latitude, home.longitude]);
      }
      if (bounds.length > 1) m.fitBounds(bounds, { padding: [28, 28], maxZoom: 10 });
      else if (bounds.length === 1) m.setView(bounds[0]!, 9);
      else m.fitBounds(FRANCE);
    });
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
  }, [competitions, home, t, format]);

  return (
    <div className={classes.competitionsMapFrame}>
      <div
        ref={element}
        className={classes.competitionsMap}
        role="region"
        aria-label={t('label')}
      />
      <div className={classes.competitionsMapLegend}>
        <span>
          <i style={{ background: POINT }} /> {t('legendCompetition')}
        </span>
        <span>
          <i style={{ background: CHAMPIONSHIP }} /> {t('legendChampionship')}
        </span>
        {home ? (
          <span>
            <i style={{ background: HOME }} /> {t('home', { town: home.name })}
          </span>
        ) : (
          <span className={classes.competitionsMapHint}>{t('noHome')}</span>
        )}
      </div>
    </div>
  );
}
