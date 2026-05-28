import { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Coins, Calendar } from 'lucide-react';
import { resolveMissionCoords, GUINEA_COORDS } from '@/data/guineaCoords';

// react-leaflet doesn't bundle marker assets by default — point them to a CDN
const ICON_RETINA = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png';
const ICON_DEFAULT = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
const SHADOW = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: ICON_RETINA,
  iconUrl: ICON_DEFAULT,
  shadowUrl: SHADOW,
});

// Custom emerald marker icon (matches site branding)
const missionIcon = new L.DivIcon({
  className: 'mission-marker',
  html: `
    <div style="background:#059669;width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;">
      <div style="transform:rotate(45deg);color:#fff;font-weight:bold;font-size:14px;">M</div>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -28],
});

const fmt = (n) => new Intl.NumberFormat('fr-FR').format(n || 0);

/**
 * Interactive map of interim missions, plotted using approximate Guinea coords.
 * Props:
 *  - missions: array of mission objects
 *  - onSelect(mission): optional callback when user clicks a popup CTA
 */
export default function MissionsMap({ missions = [], onSelect }) {
  const points = useMemo(
    () => missions.map((m) => ({ mission: m, coords: resolveMissionCoords(m) })),
    [missions]
  );

  // Center on Conakry by default
  const center = [GUINEA_COORDS.cities.Conakry.lat, GUINEA_COORDS.cities.Conakry.lng];

  return (
    <div className="rounded-lg overflow-hidden border border-slate-200 shadow-sm" data-testid="missions-map">
      <MapContainer
        center={center}
        zoom={9}
        style={{ height: '520px', width: '100%' }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {points.map(({ mission, coords }) => (
          <Marker key={mission.id} position={[coords.lat, coords.lng]} icon={missionIcon}>
            <Popup>
              <div className="min-w-[220px] space-y-1.5">
                <h4 className="font-bold text-slate-900 text-sm m-0">{mission.title}</h4>
                <p className="text-xs text-emerald-700 font-semibold m-0">{mission.company_name}</p>
                <div className="flex gap-1 flex-wrap">
                  {mission.owner_type === 'customer' ? (
                    <Badge className="bg-blue-100 text-blue-700 text-[10px] py-0">Particulier</Badge>
                  ) : (
                    <Badge className="bg-gray-100 text-gray-700 text-[10px] py-0">Entreprise</Badge>
                  )}
                  <Badge variant="outline" className="text-[10px] py-0">{mission.job_type}</Badge>
                </div>
                {mission.location_city && (
                  <div className="flex items-center gap-1 text-xs text-slate-600">
                    <MapPin className="h-3 w-3" />
                    {[mission.location_quartier, mission.location_commune, mission.location_city]
                      .filter(Boolean)
                      .join(', ')}
                  </div>
                )}
                {mission.start_date && (
                  <div className="flex items-center gap-1 text-xs text-slate-600">
                    <Calendar className="h-3 w-3" />
                    {mission.start_date}{mission.end_date ? ` → ${mission.end_date}` : ''}
                  </div>
                )}
                <div className="flex items-center gap-1 text-xs text-emerald-700 font-semibold">
                  <Coins className="h-3 w-3" />
                  {mission.rate_negotiable ? 'À négocier' : `${fmt(mission.daily_rate)} GNF/jour`}
                </div>
                {onSelect && (
                  <Button
                    size="sm"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 mt-1.5 h-7 text-xs"
                    onClick={() => onSelect(mission)}
                    data-testid={`map-popup-cta-${mission.id}`}
                  >
                    Voir / Postuler
                  </Button>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      <div className="px-3 py-2 bg-slate-50 text-[11px] text-slate-500 border-t border-slate-200">
        Positions approximatives basées sur la ville/commune. Cliquez un repère pour plus de détails.
      </div>
    </div>
  );
}
