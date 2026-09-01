import ExcelJS from "exceljs";
import path from "path";

async function inspectInspections() {
  const filePath = path.resolve("./Monitoring Kebersihan PLN UPS - Fallback Cache (3).xlsx");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const inspSheet = workbook.getWorksheet("INSPECTIONS");
  console.log("Headers INSPECTIONS:", inspSheet.getRow(1).values);
  console.log("Sample Row 2:", inspSheet.getRow(2).values);
  console.log("Sample Row 3:", inspSheet.getRow(3).values);
}

inspectInspections().catch(console.error);
