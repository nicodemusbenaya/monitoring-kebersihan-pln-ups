import ExcelJS from "exceljs";
import path from "path";

async function inspectDetails() {
  const filePath = path.resolve("./Monitoring Kebersihan PLN UPS - Fallback Cache (3).xlsx");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const detailSheet = workbook.getWorksheet("INSPECTION_DETAILS");
  if (detailSheet) {
    console.log("Headers DETAILS:", detailSheet.getRow(1).values);
    console.log("Sample Row 2:", detailSheet.getRow(2).values);
  }
}

inspectDetails().catch(console.error);
