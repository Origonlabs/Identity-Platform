import { NextResponse } from 'next/server';

export async function GET() {
  const metrics = Array.from({ length: 60 }, (_, i) => ({
    time: new Date(Date.now() - (60 - i) * 60000).toISOString(),
    requests: Math.floor(Math.random() * 1000) + 500,
    errors: Math.floor(Math.random() * 50),
  }));

  const stats = {
    totalRequests: 125000,
    errorRate: 0.002,
    avgLatency: 45,
    activeUsers: 1250,
  };

  return NextResponse.json({ metrics, stats });
}
