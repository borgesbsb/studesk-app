import Image from 'next/image'
import Link from 'next/link'
import {
  Brain,
  Calendar,
  BarChart3,
  BookOpen,
  Smartphone,
  Download,
  Users,
  GraduationCap,
  Target,
  Clock,
  TrendingUp,
  CheckCircle2,
  Sparkles,
  FileText,
  Trophy,
  ChevronRight
} from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium mb-8">
              <Sparkles className="w-4 h-4" />
              <span>Plataforma com IA para Concursos Públicos</span>
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
              Studesk
            </h1>

            <p className="text-xl sm:text-2xl lg:text-3xl font-light mb-4 max-w-4xl mx-auto">
              A Plataforma Completa de Estudos para Candidatos e Mentores de Concursos
            </p>

            <p className="text-lg sm:text-xl text-white/90 mb-12 max-w-3xl mx-auto">
              Organize seus estudos, acompanhe seu progresso e alcance a aprovação com tecnologia de ponta.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-2 bg-white text-indigo-600 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-all shadow-xl hover:shadow-2xl hover:scale-105"
              >
                Começar Agora
                <ChevronRight className="w-5 h-5" />
              </Link>

              <a
                href="#funcionalidades"
                className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-white/20 transition-all border-2 border-white/30"
              >
                Ver Recursos
              </a>
            </div>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-400/30 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-400/30 rounded-full blur-3xl"></div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="funcionalidades" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Recursos Completos para Sua Aprovação
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Tudo que você precisa em uma única plataforma inteligente
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature Cards */}
            <FeatureCard
              icon={<Brain className="w-8 h-8" />}
              title="IA Integrada"
              description="Formatação automática de PDFs com leitura otimizada e processamento inteligente"
              gradient="from-purple-500 to-indigo-500"
            />

            <FeatureCard
              icon={<Calendar className="w-8 h-8" />}
              title="Planos de Estudo"
              description="Crie cronogramas semanais personalizados com distribuição de disciplinas e metas"
              gradient="from-blue-500 to-cyan-500"
            />

            <FeatureCard
              icon={<BarChart3 className="w-8 h-8" />}
              title="Progresso Visual"
              description="Acompanhe seu desempenho com gráficos e estatísticas detalhadas em tempo real"
              gradient="from-emerald-500 to-green-500"
            />

            <FeatureCard
              icon={<BookOpen className="w-8 h-8" />}
              title="Leitor Inteligente"
              description="Leitor de PDF com formatação IA, marcações e histórico de leitura"
              gradient="from-orange-500 to-amber-500"
            />

            <FeatureCard
              icon={<Trophy className="w-8 h-8" />}
              title="Simulados"
              description="Crie simulados personalizados e receba correção automática com análise de desempenho"
              gradient="from-pink-500 to-rose-500"
            />

            <FeatureCard
              icon={<Smartphone className="w-8 h-8" />}
              title="App Mobile"
              description="Estude offline com nosso app Android completo e sincronização automática"
              gradient="from-violet-500 to-purple-500"
            />

            <FeatureCard
              icon={<Download className="w-8 h-8" />}
              title="Google Drive"
              description="Importe seus PDFs automaticamente da sua conta Google Drive"
              gradient="from-red-500 to-orange-500"
            />

            <FeatureCard
              icon={<Clock className="w-8 h-8" />}
              title="Timer Automático"
              description="Registro automático do tempo de leitura integrado ao visualizador de PDFs"
              gradient="from-teal-500 to-emerald-500"
            />

            <FeatureCard
              icon={<Users className="w-8 h-8" />}
              title="Painel Admin"
              description="Para mentores: gerencie alunos, veja estatísticas e acompanhe evolução"
              gradient="from-indigo-500 to-blue-500"
            />
          </div>
        </div>
      </section>

      {/* Screenshots Section - Desktop */}
      <section className="py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Interface Desktop Profissional
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Design moderno e intuitivo para máxima produtividade
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <DualScreenshotCard
              images={["/landing/img14.png", "/landing/img15.png"]}
              title="Dashboard Inteligente"
              description="Visualize seu progresso diário com métricas de tempo e questões por disciplina"
            />

            <ScreenshotCard
              image="/landing/img3.png"
              title="Agenda Visual"
              description="Calendário mensal com suas disciplinas distribuídas e coloridas"
            />

            <ScreenshotCard
              image="/landing/img5.png"
              title="Plano de Estudos"
              description="Gerencie semanas de estudo com distribuição de horas e questões"
            />

            <ScreenshotCard
              image="/landing/img7.png"
              title="Leitor de PDF com IA"
              description="Leia materiais com texto formatado por IA e controle de progresso"
            />

            <ScreenshotCard
              image="/landing/img9.png"
              title="Simulados Detalhados"
              description="Correção automática com gabarito oficial vs suas respostas"
            />

            <ScreenshotCard
              image="/landing/img11.png"
              title="Painel Administrativo"
              description="Para mentores: estatísticas completas de todos os alunos"
            />
          </div>
        </div>
      </section>

      {/* Screenshots Section - Mobile */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              App Mobile Completo
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Estude em qualquer lugar com nosso aplicativo Android
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-8">
            <MobileScreenshot
              image="/landing/img1.jpeg"
              title="Dashboard Mobile"
              description="Resumo de estudos do dia"
            />

            <MobileScreenshot
              image="/landing/img2.jpeg"
              title="Materiais Offline"
              description="Baixe PDFs e vídeos"
            />

            <MobileScreenshot
              image="/landing/img3.jpeg"
              title="Leitor Mobile"
              description="Timer e navegação fácil"
            />

            <MobileScreenshot
              image="/landing/img4.jpeg"
              title="Text-to-Speech"
              description="Ouça seus materiais"
            />
          </div>
        </div>
      </section>

      {/* Target Audience */}
      <section className="py-24 bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Para Quem é o Studesk?
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Candidatos */}
            <div className="bg-white rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-shadow">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mb-6">
                <GraduationCap className="w-8 h-8 text-white" />
              </div>

              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Para Candidatos
              </h3>

              <p className="text-gray-600 mb-6">
                Se você está se preparando para concursos públicos, o Studesk oferece tudo que você precisa:
              </p>

              <ul className="space-y-3">
                <BenefitItem text="Organize todos os seus materiais em um só lugar" />
                <BenefitItem text="Crie planos de estudo personalizados para seu ritmo" />
                <BenefitItem text="Acompanhe seu progresso com estatísticas detalhadas" />
                <BenefitItem text="Leia PDFs com formatação IA otimizada" />
                <BenefitItem text="Estude offline no celular com sincronização" />
                <BenefitItem text="Faça simulados e veja onde precisa melhorar" />
              </ul>
            </div>

            {/* Mentores */}
            <div className="bg-white rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-shadow">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center mb-6">
                <Users className="w-8 h-8 text-white" />
              </div>

              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Para Mentores
              </h3>

              <p className="text-gray-600 mb-6">
                Se você ensina e orienta candidatos, use o Studesk para potencializar seus resultados:
              </p>

              <ul className="space-y-3">
                <BenefitItem text="Gerencie todos os seus alunos em um painel único" />
                <BenefitItem text="Veja estatísticas detalhadas de cada aluno" />
                <BenefitItem text="Acompanhe o tempo de leitura registrado automaticamente" />
                <BenefitItem text="Monitore questões respondidas e desempenho em simulados" />
                <BenefitItem text="Identifique quem precisa de mais atenção" />
                <BenefitItem text="Compartilhe materiais e planos de estudo" />
                <BenefitItem text="Analise evolução ao longo do tempo com gráficos" />
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl sm:text-5xl font-bold mb-6">
            Pronto para Transformar Seus Estudos?
          </h2>

          <p className="text-xl sm:text-2xl mb-12 text-white/90">
            Junte-se aos candidatos que já estão usando IA e tecnologia para alcançar a aprovação
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Link
              href="/auth/login"
              className="inline-flex items-center justify-center gap-2 bg-white text-indigo-600 px-10 py-5 rounded-xl font-bold text-lg hover:bg-gray-100 transition-all shadow-2xl hover:scale-105"
            >
              <Target className="w-6 h-6" />
              Começar Gratuitamente
            </Link>

            <Link
              href="/auth/register"
              className="inline-flex items-center justify-center gap-2 bg-white/10 backdrop-blur-sm text-white px-10 py-5 rounded-xl font-bold text-lg hover:bg-white/20 transition-all border-2 border-white/30"
            >
              Criar Conta
              <ChevronRight className="w-6 h-6" />
            </Link>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-1/2 left-1/4 w-96 h-96 bg-purple-400/30 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-1/2 right-1/4 w-96 h-96 bg-pink-400/30 rounded-full blur-3xl"></div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-2xl font-bold mb-4">Studesk</h3>
              <p className="text-gray-400">
                A plataforma completa para candidatos e mentores de concursos públicos.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Recursos</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#funcionalidades" className="hover:text-white transition">Funcionalidades</a></li>
                <li><a href="#" className="hover:text-white transition">Planos</a></li>
                <li><a href="#" className="hover:text-white transition">Blog</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Contato</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition">Suporte</a></li>
                <li><a href="#" className="hover:text-white transition">Política de Privacidade</a></li>
                <li><a href="#" className="hover:text-white transition">Termos de Uso</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; {new Date().getFullYear()} Studesk. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

// Component: Feature Card
function FeatureCard({ icon, title, description, gradient }: {
  icon: React.ReactNode
  title: string
  description: string
  gradient: string
}) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
      <div className={`w-14 h-14 bg-gradient-to-br ${gradient} rounded-lg flex items-center justify-center text-white mb-4`}>
        {icon}
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  )
}

// Component: Dual Screenshot Card (two images side by side)
function DualScreenshotCard({ images, title, description }: {
  images: [string, string]
  title: string
  description: string
}) {
  return (
    <div className="bg-white rounded-xl shadow-xl overflow-hidden hover:shadow-2xl transition-all hover:-translate-y-1">
      <div className="relative h-64 bg-gray-100 flex gap-1">
        <div className="relative flex-1">
          <Image
            src={images[0]}
            alt={`${title} 1`}
            fill
            className="object-cover object-top"
          />
        </div>
        <div className="relative flex-1">
          <Image
            src={images[1]}
            alt={`${title} 2`}
            fill
            className="object-cover object-top"
          />
        </div>
      </div>
      <div className="p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600">{description}</p>
      </div>
    </div>
  )
}

// Component: Screenshot Card
function ScreenshotCard({ image, title, description }: {
  image: string
  title: string
  description: string
}) {
  return (
    <div className="bg-white rounded-xl shadow-xl overflow-hidden hover:shadow-2xl transition-all hover:-translate-y-1">
      <div className="relative h-64 bg-gray-100">
        <Image
          src={image}
          alt={title}
          fill
          className="object-cover object-top"
        />
      </div>
      <div className="p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600">{description}</p>
      </div>
    </div>
  )
}

// Component: Mobile Screenshot
function MobileScreenshot({ image, title, description }: {
  image: string
  title: string
  description: string
}) {
  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-all hover:-translate-y-1 w-64">
      <div className="relative h-96 bg-gray-100">
        <Image
          src={image}
          alt={title}
          fill
          className="object-cover object-top"
        />
      </div>
      <div className="p-4">
        <h4 className="font-bold text-gray-900 mb-1">{title}</h4>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
    </div>
  )
}

// Component: Benefit Item
function BenefitItem({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-3">
      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
      <span className="text-gray-700">{text}</span>
    </li>
  )
}
