const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function main() {
  const data = JSON.parse(fs.readFileSync('/tmp/assuntos_with_urls.json', 'utf8'));

  // Busca plano e semanas com disciplinas
  const plano = await prisma.planoEstudo.findFirst({
    where: { nome: { contains: 'Receita' } },
    include: {
      semanas: {
        include: {
          disciplinas: {
            include: { disciplina: { select: { id: true, nome: true } } }
          }
        },
        orderBy: { numeroSemana: 'asc' }
      }
    }
  });

  const semanaMap = {};
  for (const s of plano.semanas) semanaMap[s.numeroSemana] = s;

  // Busca disciplinas admin pelo nome
  const disciplinasDb = await prisma.disciplina.findMany({
    where: { userId: null },
    select: { id: true, nome: true }
  });
  const discByName = {};
  for (const d of disciplinasDb) discByName[d.nome.toLowerCase()] = d;

  // Coleta todos os (url, disc, ciclo, text) únicos
  // url -> { nome, disciplinas: Set<discId>, disciplinaSemanas: Set<discSemanaId> }
  const urlMap = {}; // url -> { nome, discIds: Set, discSemanaIds: Set }

  for (const [cicloStr, discs] of Object.entries(data)) {
    const cicloNum = parseInt(cicloStr);
    const semana = semanaMap[cicloNum];
    if (!semana) continue;

    for (const [discName, items] of Object.entries(discs)) {
      const disc = discByName[discName.toLowerCase()];
      if (!disc) continue;

      const discSemana = semana.disciplinas.find(
        d => d.disciplina.nome.toLowerCase() === discName.toLowerCase()
      );
      if (!discSemana) continue;

      for (const item of items) {
        const url = item.url;
        if (!url) continue;

        if (!urlMap[url]) {
          urlMap[url] = { nome: item.text.slice(0, 200), discIds: new Set(), discSemanaIds: new Set() };
        }
        urlMap[url].discIds.add(disc.id);
        urlMap[url].discSemanaIds.add(discSemana.id);
      }
    }
  }

  console.log(`URLs únicas para inserir: ${Object.keys(urlMap).length}`);

  // Verifica materiais já existentes por URL
  const existentes = await prisma.materialEstudo.findMany({
    where: { arquivoVideoUrl: { in: Object.keys(urlMap) }, userId: null },
    select: { id: true, arquivoVideoUrl: true }
  });
  const existByUrl = {};
  for (const m of existentes) existByUrl[m.arquivoVideoUrl] = m.id;
  console.log(`Já existem: ${existentes.length}`);

  let criados = 0, assocDisc = 0, assocSemana = 0;

  for (const [url, info] of Object.entries(urlMap)) {
    // Cria ou recupera o MaterialEstudo
    let materialId = existByUrl[url];
    if (!materialId) {
      const mat = await prisma.materialEstudo.create({
        data: {
          nome: info.nome,
          tipo: 'VIDEO',
          arquivoVideoUrl: url,
          userId: null, totalPaginas: 0,
        }
      });
      materialId = mat.id;
      existByUrl[url] = materialId;
      criados++;
    }

    // Associa às disciplinas (DisciplinaMaterial) - skipDuplicates
    for (const discId of info.discIds) {
      try {
        await prisma.disciplinaMaterial.create({
          data: { disciplinaId: discId, materialId }
        });
        assocDisc++;
      } catch {} // unique constraint → já existe
    }

    // Associa às DisciplinaSemana (DisciplinaSemanaMateria) - skipDuplicates
    for (const dsId of info.discSemanaIds) {
      try {
        await prisma.disciplinaSemanaMateria.create({
          data: { disciplinaSemanaId: dsId, materialId }
        });
        assocSemana++;
      } catch {} // unique constraint → já existe
    }
  }

  console.log(`\nMateriais criados: ${criados}`);
  console.log(`Associações disciplina: ${assocDisc}`);
  console.log(`Associações ciclo-disciplina: ${assocSemana}`);
}

main()
  .catch(e => { console.error(e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
