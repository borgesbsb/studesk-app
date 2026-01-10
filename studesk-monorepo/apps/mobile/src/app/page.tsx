import { Button } from "@studesk/ui";
import Link from "next/link";

export default function Home() {
  return (
    <div className="h-screen overflow-hidden flex flex-col items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-md w-full space-y-4 sm:space-y-6">
        {/* Logo/Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/10 backdrop-blur-lg mb-2">
            <svg className="w-10 h-10 sm:w-12 sm:h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white">
            Studesk
          </h1>
          <p className="text-base sm:text-lg text-gray-300">
            Transforme seus estudos em resultados
          </p>
        </div>

        {/* Features Cards */}
        <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Features Grid */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl">
              <div className="text-2xl sm:text-3xl mb-1">📚</div>
              <div className="text-xs sm:text-sm font-medium text-gray-700">Materiais</div>
              <div className="text-[10px] sm:text-xs text-gray-500">Organizados</div>
            </div>

            <div className="text-center p-3 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl">
              <div className="text-2xl sm:text-3xl mb-1">📊</div>
              <div className="text-xs sm:text-sm font-medium text-gray-700">Progresso</div>
              <div className="text-[10px] sm:text-xs text-gray-500">Em tempo real</div>
            </div>

            <div className="text-center p-3 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl">
              <div className="text-2xl sm:text-3xl mb-1">🎯</div>
              <div className="text-xs sm:text-sm font-medium text-gray-700">Metas</div>
              <div className="text-[10px] sm:text-xs text-gray-500">Personalizadas</div>
            </div>

            <div className="text-center p-3 bg-gradient-to-br from-orange-50 to-yellow-50 rounded-xl">
              <div className="text-2xl sm:text-3xl mb-1">⚡</div>
              <div className="text-xs sm:text-sm font-medium text-gray-700">Questões</div>
              <div className="text-[10px] sm:text-xs text-gray-500">Inteligentes</div>
            </div>
          </div>

          {/* POC E-Reader Banner */}
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl p-3 sm:p-4">
            <Link href="/reader-poc" className="block group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <div className="text-white font-bold text-sm sm:text-base">POC E-Reader IA</div>
                    <div className="text-white/80 text-[10px] sm:text-xs">Leitura otimizada mobile</div>
                  </div>
                </div>
                <svg className="w-6 h-6 text-white group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          </div>

          {/* CTA Buttons */}
          <div className="space-y-2 sm:space-y-3">
            <Link href="/login" className="block group">
              <Button className="w-full !rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/50 hover:shadow-xl hover:shadow-blue-600/50 transition-all duration-300 hover:scale-[1.02] font-semibold h-11 sm:h-12 text-sm sm:text-base" size="lg">
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  Acessar minha conta
                </span>
              </Button>
            </Link>
            <Link href="/register" className="block group">
              <Button className="w-full !rounded-full border-2 border-gray-300 hover:border-indigo-500 bg-white hover:bg-gradient-to-r hover:from-indigo-50 hover:to-blue-50 text-gray-700 hover:text-indigo-700 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.02] font-semibold h-11 sm:h-12 text-sm sm:text-base" variant="outline" size="lg">
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  Criar conta grátis
                </span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs sm:text-sm text-gray-400">
          Estude de qualquer lugar, a qualquer momento
        </p>
      </div>
    </div>
  );
}
