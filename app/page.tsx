"use client";
import { useEffect, useState } from "react";
type ApiResp<T> = {
  ok: boolean;
  page?: number;
  pageSize?: number;
  total?: number;
  rows: T[];
  error?: string; // <-- ADICIONE ESTA LINHA
};
export default function Home() {
  const [data, setData] = useState<ApiResp<unknown> | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/db-test")
      .then((r) => r.json())
      .then((j) => setData(j))
      .catch((e) => setErr(String(e)));
  }, []);

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold">Magic Web</h1>
      <p className="mt-2 text-sm text-gray-600">
        Teste de conexão com o banco ao iniciar o dev.
      </p>

      {err && <pre className="mt-4 text-red-600">Erro: {err}</pre>}

      {data && (
        <pre className="mt-4 bg-gray-100 p-3 rounded">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </main>
  );
}
