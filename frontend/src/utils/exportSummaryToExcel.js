// src/utils/exportSummaryToExcel.js
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export const exportSummaryToExcel = async (departments, statuses, selectedAcademicYear) => {
  // Prepare data for Excel
  const data = [];
  
  // Add title row
  data.push([`Program Entry Summary - Academic Year: ${selectedAcademicYear}`]);
  data.push([]); // Empty row
  
  // Add headers
  data.push(["Sl. No", "Department", "Grand Total Budget"]);
  
  // Add department data
  let totalBudget = 0;
  departments.forEach((dept, index) => {
    const budget = statuses[dept.id]?.grand_total_budget || 0;
    totalBudget += budget;
    
    data.push([
      index + 1,
      dept.full_name,
      budget
    ]);
  });
  
  // Add total row
  data.push(["", "TOTAL", totalBudget]);
  
  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(data);
  
  // Set column widths
  worksheet['!cols'] = [
    { wch: 10 }, // Sl. No
    { wch: 40 }, // Department
    { wch: 20 }  // Budget
  ];
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, "Summary");
  
  // Generate Excel file
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  saveAs(blob, `Program_Entry_Summary_${selectedAcademicYear.replace(/\s+/g, '_')}.xlsx`);
};
