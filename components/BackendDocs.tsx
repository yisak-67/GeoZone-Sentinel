import React from 'react';
import { Copy, Database, Server, Code, Terminal, AlertTriangle } from 'lucide-react';

const BackendDocs: React.FC = () => {
  return (
    <div className="p-6 max-w-4xl mx-auto text-gray-800 overflow-y-auto h-full">
      <div className="mb-8 border-b pb-4 border-gray-200">
        <h1 className="text-3xl font-bold text-slate-800 mb-2 flex items-center gap-2">
          <Server className="w-8 h-8 text-blue-600" />
          Backend Implementation Guide
        </h1>
        <p className="text-gray-600">
          Follow these steps to run the Node.js + PostGIS backend. This requires PostgreSQL to be installed on your machine.
        </p>
      </div>

      {/* Quick Start Guide */}
      <div className="mb-10 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
         <h2 className="text-lg font-bold text-yellow-800 mb-3 flex items-center gap-2">
            <Terminal className="w-5 h-5" /> Quick Start Commands
         </h2>
         <p className="text-sm text-yellow-800 mb-3">Run these commands in your terminal:</p>
         <div className="bg-slate-900 text-slate-50 p-4 rounded-lg text-sm font-mono overflow-x-auto">
            <pre className="space-y-1">
{`# 1. Navigate to backend folder
cd backend

# 2. Install dependencies
npm install

# 3. Start the server
node server.js`}
            </pre>
         </div>
         <p className="text-xs text-yellow-700 mt-3 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> 
            If running in a cloud IDE (like Project IDX or Codespaces), copy the URL for port 3001 and paste it into the app sidebar under "Live Backend" settings.
         </p>
      </div>

      {/* Database Setup */}
      <div className="mb-10">
        <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Database className="w-5 h-5 text-green-600" />
          1. Database Setup (PostgreSQL + PostGIS)
        </h2>
        <p className="text-sm text-slate-600 mb-2">Run this SQL in your database tool (e.g. pgAdmin, psql):</p>
        <div className="bg-slate-900 text-slate-50 p-4 rounded-lg text-sm font-mono overflow-x-auto">
          <pre>{`-- 1. Enable PostGIS Extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Create Zones Table
CREATE TABLE zones (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    radius_meters INTEGER NOT NULL,
    description TEXT,
    -- Store center as a GEOGRAPHY type for accurate meter calculations
    center GEOGRAPHY(POINT, 4326) NOT NULL
);

-- 3. Create Spatial Index for Performance
CREATE INDEX zones_center_idx ON zones USING GIST (center);`}</pre>
        </div>
      </div>

      {/* Node.js Implementation */}
      <div className="mb-10">
        <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Code className="w-5 h-5 text-purple-600" />
          2. Key PostGIS Query Logic
        </h2>
        <p className="text-sm text-slate-600 mb-2">
            The backend uses <code>ST_DWithin</code> to efficiently check if a point is within a radius on the earth's sphere.
        </p>
        <div className="bg-slate-900 text-slate-50 p-4 rounded-lg text-sm font-mono overflow-x-auto">
          <pre>{`// Check Location Logic (server.js)
const query = \`
  SELECT id, name, radius_meters 
  FROM zones
  WHERE ST_DWithin(
    center, 
    ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, 
    radius_meters
  )
\`;
// Parameters: [userLng, userLat]
// Result: Returns all zones containing the user's location.`}</pre>
        </div>
      </div>
    </div>
  );
};

export default BackendDocs;
