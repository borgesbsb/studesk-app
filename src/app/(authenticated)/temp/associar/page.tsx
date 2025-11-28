import { associarMaterialADisciplina } from '@/interface/actions/temp/associar-material'

export default async function TempAssociarPage() {
  const resultado = await associarMaterialADisciplina()
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Resultado da Associação</h1>
      <div className="bg-gray-100 p-4 rounded-lg">
        <pre className="whitespace-pre-wrap">
          {JSON.stringify(resultado, null, 2)}
        </pre>
      </div>
    </div>
  )
}