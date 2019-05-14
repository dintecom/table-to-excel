import Parser from "./parser";
import saveAs from "file-saver";
import ExcelJS from "exceljs/dist/es5/exceljs.browser";

const TableToExcel = (function(Parser) {
  let methods = {};

  methods.getOptions = function() {
    let opts = {
      name: "export.xlsx",
      autoStyle: false,
      sheet: {
        name: "Sheet 1"
      },
      useCss: {
          fontColor: false,
          backgroundColor: false
      },
      objectDefaults: {
          alignment: {
              vertical: 'bottom',
              wrapText: false
          },
          borders: {
            style: 'undefined'
          }
      },
      autoDetecting: {
          currency: false
      }
  };
    return opts;
  };

  methods.initWorkBook = function() {
    let wb = new ExcelJS.Workbook();
    return wb;
  };

  methods.initSheet = function(wb, sheetName) {
    let ws = wb.addWorksheet(sheetName);
    return ws;
  };

  methods.save = function(wb, fileName) {
    wb.xlsx.writeBuffer().then(function(buffer) {
      saveAs(
        new Blob([buffer], { type: "application/octet-stream" }),
        fileName
      );
    });
  };

  methods.tableToSheet = function(wb, table, opts) {
    let ws = this.initSheet(wb, opts.sheet.name);
    ws = Parser.parseDomToTable(ws, table, opts);
    return wb;
  };

  methods.tableToBook = function(table, opts) {
    let wb = this.initWorkBook();
    wb = this.tableToSheet(wb, table, opts);
    return wb;
  };

  methods.convert = function(table, opts = {}) {
    let defaultOpts = this.getOptions();
    opts = Object.assign({}, defaultOpts, opts);
    let wb = this.tableToBook(table, opts);
    this.save(wb, opts.name);
  };

  return methods;
})(Parser);

export default TableToExcel;
