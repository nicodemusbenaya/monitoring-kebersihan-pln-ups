import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function audit() {
  const [users, rooms, inspections, details, photos, evals, slots, activities, scanEvents, auditLogs] = await Promise.all([
    prisma.user.count(),
    prisma.room.count(),
    prisma.inspection.count(),
    prisma.inspectionDetail.count(),
    prisma.inspectionPhoto.count(),
    prisma.evaluation.count(),
    prisma.slot.count(),
    prisma.activity.count(),
    prisma.scanEvent.count(),
    prisma.auditLog.count(),
  ]);
  
  console.log("=== DATABASE AUDIT ===");
  console.log("Users:", users);
  console.log("Rooms:", rooms);
  console.log("Slots:", slots);
  console.log("Activities:", activities);
  console.log("Inspections:", inspections);
  console.log("InspectionDetails:", details);
  console.log("Photos:", photos);
  console.log("Evaluations:", evals);
  console.log("ScanEvents:", scanEvents);
  console.log("AuditLogs:", auditLogs);
  console.log("====================");
  
  // Show users
  const userList = await prisma.user.findMany({ select: { username: true, fullName: true, role: true, active: true } });
  console.log("\nUsers list:", JSON.stringify(userList, null, 2));
  
  // Show recent inspections
  const recentInsp = await prisma.inspection.findMany({ 
    take: 5, 
    orderBy: { submittedAt: "desc" },
    include: { room: { select: { name: true } }, user: { select: { username: true } } }
  });
  console.log("\nRecent 5 inspections:", JSON.stringify(recentInsp.map(i => ({ 
    id: i.id, 
    room: i.room.name, 
    user: i.user.username,
    dateKey: i.dateKey,
    status: i.overallStatus
  })), null, 2));
}

audit().catch(console.error).finally(() => prisma.$disconnect());
