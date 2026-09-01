import ExcelJS from "exceljs";
import path from "path";

async function inspectEvals() {
  const filePath = path.resolve("./Monitoring Kebersihan PLN UPS - Fallback Cache (3).xlsx");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const evalSheet = workbook.getWorksheet("EVALUATIONS");
  if (evalSheet) {
    console.log("Headers EVALUATIONS:", evalSheet.getRow(1).values);
    console.log("Sample Row 2:", evalSheet.getRow(2).values);
  }
}

inspectEvals().catch(console.error);
