import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { apiService, type ReefSite } from '@/lib/api';

const DEFAULT_CENTER: [number, number] = [-20.0, 140.0];
const DEFAULT_ZOOM = 4;

// Create a custom icon for the markers
const createCustomIcon = (health: string) => {
  const colors = {
    healthy: '#10B981', // green-500
    stressed: '#EF4444', // red-500
    ambient: '#3B82F6', // blue-500
  };

  return L.divIcon({
    html: `
      <div style="
        background-color: ${colors[health as keyof typeof colors] || '#6B7280'};
        width: 20px;
        height: 20px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 10px;
      ">
        <div style="transform: translateY(-1px)">
          ${health.charAt(0).toUpperCase()}
        </div>
      </div>
    `,
    className: '',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
};

interface SiteMapProps {
  className?: string;
  onSiteSelect?: (site: ReefSite) => void;
}

export function SiteMap({ className = '', onSiteSelect }: SiteMapProps) {
  const { data: sites = [], isLoading } = useQuery({
    queryKey: ['sites'],
    queryFn: () => apiService.getSites(),
    refetchInterval: 60000, // Refresh every minute
  });
  
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Create map
    mapRef.current = L.map(mapContainerRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: false,
    });

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(mapRef.current);

    // Add zoom control
    L.control.zoom({
      position: 'bottomright'
    }).addTo(mapRef.current);

    // Cleanup on unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update markers when sites change
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => {
      if (marker) {
        mapRef.current?.removeLayer(marker);
      }
    });
    markersRef.current = [];

    // Add new markers
    sites.forEach((site: ReefSite) => {
      if (!site.lat || !site.lng) return;

      const marker = L.marker(
        [site.lat, site.lng],
        { 
          icon: createCustomIcon(site.lastHealth || 'ambient'),
          title: site.name,
        }
      );

      // Add popup
      marker.bindPopup(`
        <div class="space-y-1">
          <h4 class="font-semibold text-sm">${site.name}</h4>
          <div class="text-xs">
            <div>Status: <span class="font-medium">${site.lastHealth || 'ambient'}</span></div>
            <div>Confidence: <span class="font-medium">${(site.lastConfidence || 75).toFixed(1)}%</span></div>
            <div class="text-muted-foreground text-xs mt-1">
              Updated: ${new Date(site.lastUpdated || site.createdAt).toLocaleString()}
            </div>
          </div>
        </div>
      `);

      // Add click handler
      if (onSiteSelect) {
        marker.on('click', () => {
          onSiteSelect(site);
        });
      }

      marker.addTo(mapRef.current!);
      markersRef.current.push(marker);
    });

    // Fit bounds if we have markers
    if (sites.length > 0) {
      const validSites = sites.filter((site: ReefSite) => site.lat && site.lng);
      if (validSites.length > 0) {
        const bounds = L.latLngBounds(
          validSites.map((site: ReefSite) => [site.lat!, site.lng!] as [number, number])
        );
        mapRef.current.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [sites, onSiteSelect]);

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">
          Reef Health Map
          {isLoading && <span className="text-sm font-normal text-muted-foreground ml-2">Loading sites...</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div 
          ref={mapContainerRef} 
          className="w-full h-[500px] rounded-b-lg"
          style={{ minHeight: '400px' }}
        />
      </CardContent>
    </Card>
  );
}

export default SiteMap;