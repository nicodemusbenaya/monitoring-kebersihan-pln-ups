import ExcelJS from "exceljs";
import path from "path";

async function inspectPhotos() {
  const filePath = path.resolve("./Monitoring Kebersihan PLN UPS - Fallback Cache (3).xlsx");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const photoSheet = workbook.getWorksheet("INSPECTION_PHOTOS");
  if (photoSheet) {
    console.log("Headers PHOTOS:", photoSheet.getRow(1).values);
    console.log("Sample Row 2:", photoSheet.getRow(2).values);
  }
}

inspectPhotos().catch(console.error);
