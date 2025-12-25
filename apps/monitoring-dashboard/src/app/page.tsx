'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function MonitoringDashboard() {
  const [metrics, setMetrics] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalRequests: 0,
    errorRate: 0,
    avgLatency: 0,
    activeUsers: 0,
  });

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch('/api/metrics');
        const data = await response.json();
        setMetrics(data.metrics || []);
        setStats(data.stats || stats);
      } catch (error) {
        console.error('Failed to fetch metrics:', error);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Atlas Identity Platform - Monitoring Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Total Requests</h3>
            <p className="text-3xl font-bold mt-2">{stats.totalRequests.toLocaleString()}</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Error Rate</h3>
            <p className="text-3xl font-bold mt-2 text-red-600">{(stats.errorRate * 100).toFixed(2)}%</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Avg Latency</h3>
            <p className="text-3xl font-bold mt-2">{stats.avgLatency.toFixed(0)}ms</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Active Users</h3>
            <p className="text-3xl font-bold mt-2">{stats.activeUsers.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-xl font-semibold mb-4">Request Rate (Last Hour)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={metrics}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="requests" stroke="#8884d8" />
              <Line type="monotone" dataKey="errors" stroke="#ff0000" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
