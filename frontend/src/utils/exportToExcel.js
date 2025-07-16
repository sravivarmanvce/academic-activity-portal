// src/utils/exportToExcel.js
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

export const exportToExcel = async (data, role, departmentName, principalRemark = "") => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Program Counts");

  worksheet.columns = [
    { header: "Activity Category", key: "category", width: 30 },
    { header: "Program Type", key: "program_type", width: 30 },
    { header: "Sub Type", key: "sub_type", width: 25 },
    { header: "Budget Mode", key: "budget_mode", width: 15 },
    { header: "Count", key: "count", width: 10 },
    { header: "Total Budget", key: "total_budget", width: 15 },
    { header: "Remarks", key: "remarks", width: 30 },
  ];

  let grandTotalCount = 0;
  let grandTotalBudget = 0;

  const grouped = {};

  data.forEach((item) => {
    const cat = item.activity_category;
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  });

  Object.entries(grouped).forEach(([category, items]) => {
    let subTotalCount = 0;
    let subTotalBudget = 0;

    worksheet.addRow([category]); // Category header row

    items.forEach((item) => {
      worksheet.addRow([
        "",
        item.program_type,
        item.sub_program_type || "-",
        item.budget_mode,
        item.count,
        item.total_budget,
        item.remarks || "",
      ]);
      subTotalCount += item.count;
      subTotalBudget += item.total_budget;
    });

    worksheet.addRow([
      "",
      "Subtotal",
      "",
      "",
      subTotalCount,
      subTotalBudget,
      "",
    ]);
    worksheet.addRow([]);

    grandTotalCount += subTotalCount;
    grandTotalBudget += subTotalBudget;
  });

  worksheet.addRow([
    "",
    "Grand Total",
    "",
    "",
    grandTotalCount,
    grandTotalBudget,
    "",
  ]);

  // Optional Principal Remark
  if (role === "principal" && principalRemark) {
    worksheet.addRow([]);
    worksheet.addRow(["Principal Remark:", principalRemark]);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), `ProgramCounts_${departmentName}.xlsx`);
};
