import React, { useState, useEffect } from 'react';
import { MapPin, ShieldAlert, List, Plus, Search, Globe, Bot, Database, WifiOff, RefreshCw, Settings, CheckCircle2 } from 'lucide-react';
import ZoneMap from './components/ZoneMap';
import BackendDocs from './components/BackendDocs';
import { Zone, Coordinates, LocationCheckResult, Tab } from './types';
import { calculateDistanceMeters, DEFAULT_CENTER } from './constants';
import { getZoneSuggestions } from './services/geminiService';
import * as api from './services/api';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.MANAGE);
  
  // Backend Mode State
  const [useBackend, setUseBackend] = useState<boolean>(false);
  const [backendConnected, setBackendConnected] = useState<boolean>(false);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [backendUrl, setBackendUrl] = useState('http://localhost:3001');
  const [showBackendSettings, setShowBackendSettings] = useState(false);
  
  // State for Zones
  const [zones, setZones] = useState<Zone[]>([
    { id: '1', name: 'Addis Ababa HQ', center: DEFAULT_CENTER, radiusMeters: 500, description: 'Main Headquarters' }
  ]);
  
  // State for Forms
  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneLat, setNewZoneLat] = useState(DEFAULT_CENTER.lat.toString());
  const [newZoneLng, setNewZoneLng] = useState(DEFAULT_CENTER.lng.toString());
  const [newZoneRadius, setNewZoneRadius] = useState('500');
  
  // State for AI
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiReasoning, setAiReasoning] = useState<string | null>(null);

  // State for Check Location
  const [checkLat, setCheckLat] = useState('');
  const [checkLng, setCheckLng] = useState('');
  const [checkResult, setCheckResult] = useState<LocationCheckResult | null>(null);
  
  // Map Interaction State
  const [mapClickTarget, setMapClickTarget] = useState<'create' | 'check'>('create');
  const [userMapLocation, setUserMapLocation] = useState<Coordinates | null>(null);

  // Update API service when URL changes
  useEffect(() => {
    api.setBaseUrl(backendUrl);
    if (useBackend) {
      loadZonesFromBackend();
    }
  }, [backendUrl]);

  // Load zones when backend mode changes
  useEffect(() => {
    if (useBackend) {
      loadZonesFromBackend();
    } else {
      // Simulation Mode: Use local mock data if zones is empty or error occurred
      if (!backendConnected || zones.length === 0) {
          setZones([
            { id: '1', name: 'Addis Ababa HQ', center: DEFAULT_CENTER, radiusMeters: 500, description: 'Main Headquarters' }
          ]);
      }
      setBackendError(null);
      setBackendConnected(false);
      setShowBackendSettings(false);
    }
  }, [useBackend]);

  const loadZonesFromBackend = async () => {
    try {
      setBackendError(null);
      const isHealthy = await api.checkHealth();
      if (!isHealthy) {
        throw new Error("Health check failed. Server unreachable.");
      }
      const data = await api.fetchZones();
      setZones(data);
      setBackendConnected(true);
    } catch (err) {
      console.error(err);
      setBackendConnected(false);
      setBackendError("Connection failed.");
      setShowBackendSettings(true); // Auto-show settings on error
    }
  };

  // Handlers
  const handleMapClick = (coords: Coordinates) => {
    if (activeTab === Tab.MANAGE) {
      setNewZoneLat(coords.lat.toFixed(6));
      setNewZoneLng(coords.lng.toFixed(6));
    } else if (activeTab === Tab.CHECK) {
      setCheckLat(coords.lat.toFixed(6));
      setCheckLng(coords.lng.toFixed(6));
      setUserMapLocation(coords);
      // Auto check on click for better UX
      performLocationCheck(coords.lat, coords.lng);
    }
  };

  const handleCreateZone = async (e: React.FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(newZoneLat);
    const lng = parseFloat(newZoneLng);
    const radius = parseInt(newZoneRadius);

    if (isNaN(lat) || isNaN(lng) || isNaN(radius)) return;

    const newZoneBase = {
      name: newZoneName,
      center: { lat, lng },
      radiusMeters: radius,
      description: aiReasoning || undefined
    };

    if (useBackend) {
      try {
        const createdZone = await api.createZone(newZoneBase);
        setZones([createdZone, ...zones]);
        setNewZoneName('');
        setAiReasoning(null);
      } catch (err) {
        setBackendError("Failed to save zone to backend.");
      }
    } else {
      // Simulation Mode
      const newZone: Zone = {
        ...newZoneBase,
        id: Date.now().toString(),
      };
      setZones([...zones, newZone]);
      setNewZoneName('');
      setAiReasoning(null);
    }
  };

  const handleAskAi = async () => {
    if (!newZoneName) return;
    setIsAiLoading(true);
    setAiReasoning(null);
    
    const suggestion = await getZoneSuggestions(newZoneName);
    
    setIsAiLoading(false);
    if (suggestion) {
        setNewZoneRadius(suggestion.suggestedRadius.toString());
        setAiReasoning(suggestion.reasoning);
    }
  };

  const performLocationCheck = async (lat: number, lng: number) => {
    const userLoc = { lat, lng };
    
    if (useBackend) {
      try {
        const result = await api.checkLocation(userLoc);
        setCheckResult(result);
        setUserMapLocation(userLoc);
      } catch (err) {
        setBackendError("Failed to check location on backend.");
      }
    } else {
      // Simulation Mode logic
      const matched = zones.filter(zone => {
        const distance = calculateDistanceMeters(userLoc, zone.center);
        return distance <= zone.radiusMeters;
      });

      setCheckResult({
        inZone: matched.length > 0,
        matchedZones: matched,
        userLocation: userLoc
      });
      setUserMapLocation(userLoc);
    }
  };

  const handleCheckSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(checkLat);
    const lng = parseFloat(checkLng);
    if (!isNaN(lat) && !isNaN(lng)) {
      performLocationCheck(lat, lng);
    }
  };

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const { latitude, longitude } = position.coords;
        if (activeTab === Tab.MANAGE) {
           setNewZoneLat(latitude.toFixed(6));
           setNewZoneLng(longitude.toFixed(6));
        } else {
            setCheckLat(latitude.toFixed(6));
            setCheckLng(longitude.toFixed(6));
            setUserMapLocation({ lat: latitude, lng: longitude });
            performLocationCheck(latitude, longitude);
        }
      });
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-100 text-slate-900 font-sans overflow-hidden">
      
      {/* Sidebar */}
      <div className="w-full md:w-1/3 lg:w-1/4 bg-white border-r border-slate-200 flex flex-col shadow-lg z-20">
        <div className="p-6 bg-slate-900 text-white transition-all">
          <div className="flex items-center gap-2 mb-2">
            <Globe className="w-6 h-6 text-blue-400" />
            <h1 className="text-xl font-bold tracking-tight">GeoZone Sentinel</h1>
          </div>
          <p className="text-xs text-slate-400 mb-4">PostGIS-Powered Notification System</p>
          
          {/* Backend Toggle & Settings */}
          <div className="bg-slate-800 rounded-md border border-slate-700 overflow-hidden">
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2">
                  <Database className={`w-4 h-4 ${useBackend ? (backendConnected ? 'text-green-400' : 'text-red-400') : 'text-slate-400'}`} />
                  <div className="flex flex-col">
                      <span className="text-xs font-medium text-slate-200">Live Backend</span>
                      <span className="text-[10px] text-slate-400">{useBackend ? (backendConnected ? 'Connected' : 'Connecting...') : 'Simulation Mode'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                   {useBackend && (
                       <button onClick={() => setShowBackendSettings(!showBackendSettings)} className="text-slate-400 hover:text-white">
                           <Settings className="w-4 h-4" />
                       </button>
                   )}
                   <button 
                    onClick={() => setUseBackend(!useBackend)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${useBackend ? 'bg-blue-600' : 'bg-slate-600'}`}
                    >
                    <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition duration-200 ease-in-out ${useBackend ? 'translate-x-5' : 'translate-x-1'}`} />
                    </button>
                </div>
              </div>
              
              {/* Collapsible Settings */}
              {(showBackendSettings || (useBackend && !backendConnected && backendError)) && (
                  <div className="p-3 border-t border-slate-700 bg-slate-800/50">
                      <label className="block text-[10px] text-slate-400 mb-1">Backend API URL</label>
                      <div className="flex gap-2">
                          <input 
                             type="text" 
                             value={backendUrl} 
                             onChange={(e) => setBackendUrl(e.target.value)}
                             className="flex-1 bg-slate-900 border border-slate-600 text-white text-xs rounded px-2 py-1 focus:border-blue-500 outline-none"
                             placeholder="http://localhost:3001"
                          />
                          <button 
                             onClick={loadZonesFromBackend} 
                             className="bg-slate-700 hover:bg-slate-600 text-white p-1 rounded"
                             title="Retry Connection"
                          >
                              <RefreshCw className="w-3 h-3" />
                          </button>
                      </div>
                      {backendError && (
                        <div className="mt-2 text-[10px] text-red-300 bg-red-900/20 p-1.5 rounded flex items-start gap-1">
                            <WifiOff className="w-3 h-3 shrink-0 mt-0.5" /> 
                            <span>{backendError} Check "Docs" tab for startup help.</span>
                        </div>
                      )}
                  </div>
              )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => { setActiveTab(Tab.MANAGE); setMapClickTarget('create'); }}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === Tab.MANAGE ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            Manage Zones
          </button>
          <button
            onClick={() => { setActiveTab(Tab.CHECK); setMapClickTarget('check'); }}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === Tab.CHECK ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            Check Location
          </button>
          <button
            onClick={() => setActiveTab(Tab.BACKEND_DOCS)}
            className={`px-4 py-3 text-sm font-medium transition-colors ${activeTab === Tab.BACKEND_DOCS ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            Docs
          </button>
        </div>

        {/* Sidebar Content */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {/* MANAGE TAB */}
          {activeTab === Tab.MANAGE && (
            <div className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <h3 className="font-semibold text-blue-900 flex items-center gap-2 mb-3">
                  <Plus className="w-4 h-4" /> Create New Zone
                </h3>
                <form onSubmit={handleCreateZone} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Zone Name</label>
                    <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={newZoneName} 
                          onChange={(e) => setNewZoneName(e.target.value)} 
                          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g. Central Park"
                          required
                        />
                         <button 
                            type="button"
                            onClick={handleAskAi}
                            disabled={!newZoneName || isAiLoading}
                            className="bg-purple-100 hover:bg-purple-200 text-purple-700 p-2 rounded-md transition-colors disabled:opacity-50"
                            title="Ask AI for radius"
                        >
                            <Bot className={`w-4 h-4 ${isAiLoading ? 'animate-pulse' : ''}`} />
                        </button>
                    </div>
                    {aiReasoning && (
                        <div className="mt-2 text-xs bg-purple-50 text-purple-800 p-2 rounded border border-purple-100 italic">
                            AI: {aiReasoning}
                        </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Latitude</label>
                      <input 
                        type="number" 
                        step="any" 
                        value={newZoneLat} 
                        onChange={(e) => setNewZoneLat(e.target.value)} 
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Lat"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Longitude</label>
                      <input 
                        type="number" 
                        step="any" 
                        value={newZoneLng} 
                        onChange={(e) => setNewZoneLng(e.target.value)} 
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Lng"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Radius (Meters)</label>
                    <input 
                      type="number" 
                      value={newZoneRadius} 
                      onChange={(e) => setNewZoneRadius(e.target.value)} 
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="500"
                      required
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button type="button" onClick={handleUseCurrentLocation} className="flex-1 bg-white border border-slate-300 text-slate-600 py-2 rounded-md text-xs font-medium hover:bg-slate-50">
                        Get GPS
                    </button>
                    <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-md text-xs font-medium hover:bg-blue-700 shadow-sm">
                        {useBackend ? 'Save to DB' : 'Save Locally'}
                    </button>
                  </div>
                </form>
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                    <List className="w-4 h-4" /> {useBackend ? 'DB Zones' : 'Local Zones'} ({zones.length})
                    </h3>
                    {useBackend && backendConnected && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                </div>
                <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                  {zones.length === 0 && (
                      <div className="text-center py-4 text-slate-400 text-sm italic">No zones found.</div>
                  )}
                  {zones.map(zone => (
                    <div key={zone.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow group">
                      <div className="flex justify-between items-start">
                          <div className="font-medium text-slate-800">{zone.name}</div>
                          {zone.description && (
                              <span className="text-[10px] bg-slate-100 text-slate-500 px-1 rounded">{zone.description.substring(0, 15)}...</span>
                          )}
                      </div>
                      <div className="text-xs text-slate-500 mt-1 flex justify-between">
                        <span>{zone.center.lat.toFixed(4)}, {zone.center.lng.toFixed(4)}</span>
                        <span className="font-semibold text-slate-600">{zone.radiusMeters}m</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* CHECK TAB */}
          {activeTab === Tab.CHECK && (
            <div className="space-y-6">
               <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-3">
                  <MapPin className="w-4 h-4 text-red-500" /> Check Position
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                    Click on the map or enter coordinates to simulate a user device sending its location to the {useBackend ? 'PostGIS API' : 'simulation engine'}.
                </p>
                <form onSubmit={handleCheckSubmit} className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Latitude</label>
                      <input 
                        type="number" 
                        step="any" 
                        value={checkLat} 
                        onChange={(e) => setCheckLat(e.target.value)} 
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Longitude</label>
                      <input 
                        type="number" 
                        step="any" 
                        value={checkLng} 
                        onChange={(e) => setCheckLng(e.target.value)} 
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={handleUseCurrentLocation} className="flex-1 bg-white border border-slate-300 text-slate-600 py-2 rounded-md text-xs font-medium hover:bg-slate-50">
                        Get GPS
                    </button>
                    <button type="submit" className="flex-1 bg-red-600 text-white py-2 rounded-md text-xs font-medium hover:bg-red-700 shadow-sm">
                        {useBackend ? 'Check API' : 'Check Locally'}
                    </button>
                  </div>
                </form>
              </div>

              {checkResult && (
                <div className={`p-4 rounded-lg border ${checkResult.inZone ? 'bg-green-50 border-green-200' : 'bg-slate-100 border-slate-200'}`}>
                    <div className="flex items-start gap-3">
                        {checkResult.inZone ? (
                            <ShieldAlert className="w-6 h-6 text-green-600 shrink-0" />
                        ) : (
                            <Search className="w-6 h-6 text-slate-400 shrink-0" />
                        )}
                        <div>
                            <h4 className={`font-bold ${checkResult.inZone ? 'text-green-800' : 'text-slate-700'}`}>
                                {checkResult.inZone ? 'Inside Zone!' : 'Outside All Zones'}
                            </h4>
                            <p className="text-xs text-slate-600 mt-1">
                                Location: {checkResult.userLocation.lat.toFixed(5)}, {checkResult.userLocation.lng.toFixed(5)}
                            </p>
                            {checkResult.inZone && (
                                <div className="mt-3">
                                    <p className="text-xs font-semibold text-green-800 mb-1">Detected Zones:</p>
                                    <ul className="list-disc pl-4 text-xs text-green-700">
                                        {checkResult.matchedZones.map(z => (
                                            <li key={z.id}>{z.name} ({z.radiusMeters}m)</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Map Area */}
      <div className="flex-1 relative h-full bg-slate-200">
        {activeTab === Tab.BACKEND_DOCS ? (
            <BackendDocs />
        ) : (
            <>
                <div className="absolute top-4 right-4 z-[400] bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-md text-xs font-semibold text-slate-700 border border-slate-200 pointer-events-none">
                    Mode: {activeTab === Tab.MANAGE ? 'Create Zone (Click Map)' : 'Check Location (Click Map)'}
                </div>
                <ZoneMap 
                    zones={zones} 
                    onMapClick={handleMapClick}
                    userLocation={activeTab === Tab.CHECK ? userMapLocation : null}
                />
            </>
        )}
      </div>
    </div>
  );
};

export default App;
