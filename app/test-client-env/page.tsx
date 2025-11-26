"use client";

import { useEffect, useState } from "react";

export default function TestClientEnv() {
  const [envData, setEnvData] = useState<any>(null);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    setEnvData({
      hasUrl: !!url,
      hasKey: !!key,
      urlLength: url?.length || 0,
      keyLength: key?.length || 0,
      urlValue: url,
      keyPrefix: key?.substring(0, 20),
    });
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Client-Side Environment Test</h1>
      <pre className="bg-gray-100 p-4 rounded">
        {JSON.stringify(envData, null, 2)}
      </pre>
    </div>
  );
}
