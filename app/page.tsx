"use client";
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-6 bg-gray-50">
      <div className="text-center">
        <h1 className="text-5xl font-extrabold text-gray-900">Magic Web - Portfolio</h1>
        <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
          A ferramenta definitiva para acompanhar seus investimentos, analisar a performance da sua carteira e tomar decisões baseadas em dados.
        </p>
      </div>
      <div className="mt-10">
        <Link href="/checklist" className="px-8 py-4 font-bold text-white bg-blue-600 rounded-lg shadow-lg hover:bg-blue-700 transition-transform transform hover:scale-105">
            Acessar meu Checklist de Ações
        </Link>
      </div>
      <footer className="absolute bottom-5 text-gray-500 text-sm">
        Desenvolvido com Next.js e Tailwind CSS.
      </footer>
    </main>
  );
}
