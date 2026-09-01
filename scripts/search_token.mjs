import ExcelJS from "exceljs";
import path from "path";

async function searchToken() {
  const filePath = path.resolve("./Monitoring Kebersihan PLN UPS - Fallback Cache (3).xlsx");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const roomsSheet = workbook.getWorksheet("ROOMS");
  const targetToken = "_csTcaAIvTXinBhSfcOkBhpD8k04Hawlfyzvlovg5wU";

  let found = null;
  roomsSheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const values = row.values;
    const qrToken = String(values[5] || "").trim();
    if (qrToken === targetToken) {
      found = {
        rowNumber,
        roomId: values[1],
        code: values[2],
        name: values[3],
        roomTypeId: values[4],
        qrToken: values[5],
        active: values[6],
        sortOrder: values[7],
      };
    }
  });

  if (found) {
    console.log("DITEMUKAN!", found);
  } else {
    console.log("Token tidak ditemukan persis, daftar seluruh ruangan:");
    roomsSheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const v = row.values;
      console.log(`- ${v[3]} (${v[2]}): token=${v[5]}`);
    });
  }
}

searchToken().catch(console.error);
