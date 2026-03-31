// Custom dark Mapbox style optimized for DriveSense driving aesthetics
// Use with mapbox://styles/mapbox/dark-v11 as base, with these overrides

export const MAPBOX_STYLE: mapboxgl.Style = {
  version: 8,
  name: 'DriveSense Dark',
  sources: {
    'mapbox-streets': {
      type: 'vector',
      url: 'mapbox://mapbox.mapbox-streets-v8',
    },
  },
  sprite: 'mapbox://sprites/mapbox/dark-v11',
  glyphs: 'mapbox://fonts/mapbox/{fontstack}/{range}.pbf',
  layers: [
    // Background
    {
      id: 'background',
      type: 'background',
      paint: {
        'background-color': '#0a0a12',
      },
    },
    // Water
    {
      id: 'water',
      type: 'fill',
      source: 'mapbox-streets',
      'source-layer': 'water',
      paint: {
        'fill-color': '#0d1117',
        'fill-opacity': 0.9,
      },
    },
    // Land use
    {
      id: 'landuse',
      type: 'fill',
      source: 'mapbox-streets',
      'source-layer': 'landuse',
      paint: {
        'fill-color': [
          'match',
          ['get', 'class'],
          'park', '#0a1a12',
          'hospital', '#1a0a0a',
          'school', '#0a0a1a',
          '#0e0e16',
        ],
        'fill-opacity': 0.5,
      },
    },
    // Buildings
    {
      id: 'building',
      type: 'fill',
      source: 'mapbox-streets',
      'source-layer': 'building',
      minzoom: 14,
      paint: {
        'fill-color': '#14141e',
        'fill-opacity': ['interpolate', ['linear'], ['zoom'], 14, 0, 16, 0.6],
      },
    },
    // 3D Buildings
    {
      id: 'building-3d',
      type: 'fill-extrusion',
      source: 'mapbox-streets',
      'source-layer': 'building',
      minzoom: 15,
      paint: {
        'fill-extrusion-color': '#16161f',
        'fill-extrusion-height': ['get', 'height'],
        'fill-extrusion-base': ['get', 'min_height'],
        'fill-extrusion-opacity': ['interpolate', ['linear'], ['zoom'], 15, 0, 16, 0.5],
      },
    },
    // Minor roads
    {
      id: 'road-minor',
      type: 'line',
      source: 'mapbox-streets',
      'source-layer': 'road',
      filter: ['all', ['==', '$type', 'LineString'], ['in', 'class', 'street', 'street_limited', 'service', 'track']],
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
      paint: {
        'line-color': '#1e1e2e',
        'line-width': ['interpolate', ['exponential', 1.5], ['zoom'], 12, 0.5, 18, 6],
        'line-opacity': ['interpolate', ['linear'], ['zoom'], 12, 0, 14, 0.8],
      },
    },
    // Major roads
    {
      id: 'road-major',
      type: 'line',
      source: 'mapbox-streets',
      'source-layer': 'road',
      filter: ['all', ['==', '$type', 'LineString'], ['in', 'class', 'primary', 'secondary', 'tertiary', 'trunk']],
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
      paint: {
        'line-color': '#252540',
        'line-width': ['interpolate', ['exponential', 1.5], ['zoom'], 8, 1, 18, 12],
      },
    },
    // Highways
    {
      id: 'road-highway',
      type: 'line',
      source: 'mapbox-streets',
      'source-layer': 'road',
      filter: ['all', ['==', '$type', 'LineString'], ['==', 'class', 'motorway']],
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
      paint: {
        'line-color': '#2a2a4a',
        'line-width': ['interpolate', ['exponential', 1.5], ['zoom'], 6, 1, 18, 16],
      },
    },
    // Road labels
    {
      id: 'road-label',
      type: 'symbol',
      source: 'mapbox-streets',
      'source-layer': 'road',
      filter: ['==', '$type', 'LineString'],
      minzoom: 13,
      layout: {
        'text-field': ['get', 'name'],
        'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 13, 9, 18, 13],
        'symbol-placement': 'line',
        'text-rotation-alignment': 'map',
        'text-pitch-alignment': 'viewport',
      },
      paint: {
        'text-color': '#4a4a6a',
        'text-halo-color': '#0a0a12',
        'text-halo-width': 1.5,
      },
    },
    // Place labels
    {
      id: 'place-label',
      type: 'symbol',
      source: 'mapbox-streets',
      'source-layer': 'place_label',
      layout: {
        'text-field': ['get', 'name'],
        'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 6, 10, 14, 16],
        'text-anchor': 'center',
      },
      paint: {
        'text-color': '#5e5e7a',
        'text-halo-color': '#0a0a12',
        'text-halo-width': 2,
      },
    },
  ],
};

// For use with Mapbox's built-in styles (simpler, more reliable)
export const MAPBOX_DARK_STYLE = 'mapbox://styles/mapbox/dark-v11';

// Route line paint config
export const routeLinePaint = {
  active: {
    'line-color': '#00f0ff',
    'line-width': 4,
    'line-opacity': 0.9,
    'line-blur': 1,
  },
  completed: {
    'line-gradient': [
      'interpolate',
      ['linear'],
      ['line-progress'],
      0, '#00f0ff',
      0.5, '#4488ff',
      1, '#aa77ff',
    ],
    'line-width': 4,
    'line-opacity': 0.8,
  },
  ghost: {
    'line-color': '#ffffff',
    'line-width': 2,
    'line-opacity': 0.15,
    'line-dasharray': [2, 4],
  },
} as const;
