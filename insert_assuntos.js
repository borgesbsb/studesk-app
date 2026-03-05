const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const registros = await prisma.disciplinaSemana.findMany({
    where: { assuntos: { not: null } },
    select: { id: true, assuntos: true }
  });

  let updated = 0;
  for (const r of registros) {
    let parsed;
    try { parsed = JSON.parse(r.assuntos); } catch { continue; }

    if (!Array.isArray(parsed)) continue;

    const texto = parsed.join('\n');

    await prisma.disciplinaSemana.update({
      where: { id: r.id },
      data: { assuntos: texto }
    });
    updated++;
  }

  console.log(`Convertido: ${updated} registros → texto puro`);
}

main()
  .catch(e => { console.error(e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
