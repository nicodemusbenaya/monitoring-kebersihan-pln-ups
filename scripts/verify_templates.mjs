import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function verifyTemplates() {
  console.log("=== VERIFIKASI TEMPLATE & INDIKATOR SETIAP RUANGAN ===\n");

  const roomTypes = await prisma.roomType.findMany({
    include: {
      activities: { where: { active: true }, orderBy: { sortOrder: "asc" } },
      slots: { where: { active: true }, orderBy: { sortOrder: "asc" } },
      rooms: { where: { active: true }, orderBy: { sortOrder: "asc" } },
    },
    orderBy: { sortOrder: "asc" },
  });

  for (const rt of roomTypes) {
    console.log(`📦 TIPE RUANGAN: ${rt.name} (ID: ${rt.id})`);
    console.log(`   - Template Sheet: ${rt.templateSheet}`);
    console.log(`   - Jumlah Slot: ${rt.slots.length} (${rt.slots.map(s => `${s.name} [${s.role}]`).join(", ")})`);
    console.log(`   - Jumlah Indikator 5S: ${rt.activities.length} butir`);
    console.log(`   - Contoh Indikator:`);
    rt.activities.slice(0, 3).forEach((a, i) => {
      console.log(`     ${i + 1}. ${a.name} (Kualitas: ${a.qualityApplicable ? `${a.qualityPositive}/${a.qualityNegative}` : "N/A"} | Fungsi: ${a.functionApplicable ? `${a.functionPositive}/${a.functionNegative}` : "N/A"})`);
    });
    console.log(`   - Daftar Ruangan yang Menggunakan Template Ini (${rt.rooms.length} Ruangan):`);
    rt.rooms.forEach(r => {
      console.log(`     • [${r.code}] ${r.name}`);
    });
    console.log("--------------------------------------------------------------------------------\n");
  }
}

verifyTemplates().catch(console.error).finally(() => prisma.$disconnect());
