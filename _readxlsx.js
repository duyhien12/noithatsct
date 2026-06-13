const XLSX = require('xlsx');
const wb = XLSX.readFile('e:/mãu.xlsx');
console.log('Sheets:', wb.SheetNames);
wb.SheetNames.forEach(name => {
  const ws = wb.Sheets[name];
  console.log('\n=== Sheet:', name, '| range:', ws['!ref'], '===');
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: '' });
  rows.slice(39, 69).forEach((r, i) => console.log(i + 39, JSON.stringify(r)));
  if (ws['!merges']) console.log('MERGES:', JSON.stringify(ws['!merges'].slice(0, 40)));
  if (ws['!cols']) console.log('COLS:', JSON.stringify(ws['!cols']));
});
