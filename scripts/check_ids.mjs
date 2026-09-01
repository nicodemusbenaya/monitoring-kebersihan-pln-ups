import ExcelJS from "exceljs";
import path from "path";

async function checkIds() {
  const filePath = path.resolve("./Monitoring Kebersihan PLN UPS - Fallback Cache (3).xlsx");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const roomsSheet = workbook.getWorksheet("ROOMS");
  const inspSheet = workbook.getWorksheet("INSPECTIONS");
  const usersSheet = workbook.getWorksheet("USERS");
  const slotsSheet = workbook.getWorksheet("SLOTS");

  const roomIds = new Set();
  roomsSheet.eachRow((r, i) => { if (i > 1) roomIds.add(String(r.values[1])); });

  const userIds = new Set();
  usersSheet.eachRow((r, i) => { if (i > 1) userIds.add(String(r.values[1])); });

  const slotIds = new Set();
  slotsSheet.eachRow((r, i) => { if (i > 1) slotIds.add(String(r.values[1])); });

  console.log("Total RoomIds in ROOMS:", roomIds.size);
  console.log("Total UserIds in USERS:", userIds.size);
  console.log("Total SlotIds in SLOTS:", slotIds.size);

  let matchRoom = 0, matchUser = 0, matchSlot = 0;
  inspSheet.eachRow((r, i) => {
    if (i > 1) {
      const v = r.values;
      if (roomIds.has(String(v[5]))) matchRoom++;
      if (userIds.has(String(v[9]))) matchUser++;
      if (slotIds.has(String(v[7]))) matchSlot++;
    }
  });

  console.log(`Inspections matches: Rooms: ${matchRoom}, Users: ${matchUser}, Slots: ${matchSlot}`);
}

checkIds().catch(console.error);
