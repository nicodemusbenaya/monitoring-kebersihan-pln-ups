import ExcelJS from "exceljs";
import path from "path";

async function inspect() {
  const filePath = path.resolve("./Monitoring Kebersihan PLN UPS - Fallback Cache (3).xlsx");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  console.log("Daftar sheet dalam workbook:");
  workbook.eachSheet((sheet) => {
    console.log(`- ${sheet.name} (baris: ${sheet.rowCount}, kolom: ${sheet.columnCount})`);
  });

  const roomsSheet = workbook.getWorksheet("ROOMS");
  if (roomsSheet) {
    console.log("\nSample baris di sheet ROOMS:");
    roomsSheet.eachRow((row, rowNumber) => {
      if (rowNumber <= 10) {
        console.log(`Baris ${rowNumber}:`, row.values);
      }
    });
  }
}

inspect().catch(console.error);
