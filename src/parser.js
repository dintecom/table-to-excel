import TableToExcel from "./tableToExcel";

const Parser = (function () {
  let methods = {};

  /**
   * Parse HTML table to excel worksheet
   * @param {object} ws The worksheet object
   * @param {HTML entity} table The table to be converted to excel sheet
   */
  methods.parseDomToTable = function (ws, htmlElement, opts) {
    let defaultOpts = TableToExcel.getOptions();
    opts = Object.assign({}, defaultOpts, opts);
    let _r, _c, cs, rs, r, c;
    let tableObject = htmlElement.tagName === "TABLE";
    if (tableObject) {
      let rows = [...htmlElement.getElementsByTagName("tr")];
      let widths = htmlElement.getAttribute("data-cols-width");
      if (widths) {
        widths = widths.split(",").map(function (item) {
          return parseInt(item);
        });
      }
      let merges = [];
      let wsRowCount = ws.rowCount;
      for (_r = 0; _r < rows.length; ++_r) {
        let row = rows[_r];
        r = wsRowCount + _r + 1; // Actual excel row number
        c = 1; // Actual excel col number
        if (row.getAttribute("data-exclude") === "true") {
          rows.splice(_r, 1);
          _r--;
          continue;
        }
        if (row.getAttribute("data-height")) {
          let exRow = ws.getRow(r);
          exRow.height = parseFloat(row.getAttribute("data-height"));
        }

        let tds = [...row.children];
        for (_c = 0; _c < tds.length; ++_c) {
          let td = tds[_c];
          if (td.getAttribute("data-exclude") === "true") {
            tds.splice(_c, 1);
            _c--;
            continue;
          }
          for (let _m = 0; _m < merges.length; ++_m) {
            var m = merges[_m];
            if (m.s.c == c && m.s.r <= r && r <= m.e.r) {
              c = m.e.c + 1;
              _m = -1;
            }
          }
          let exCell = ws.getCell(getColumnAddress(c, r));
          // calculate merges
          cs = parseInt(td.getAttribute("colspan")) || 1;
          rs = parseInt(td.getAttribute("rowspan")) || 1;
          if (cs > 1 || rs > 1) {
            merges.push({
              s: { c: c, r: r },
              e: { c: c + cs - 1, r: r + rs - 1 }
            });
          }
          c += cs;
          exCell.value = getValue(td, tableObject);
          if (!opts.autoStyle) {
            let styles = getStylesDataAttr(td, opts);
            exCell.font = styles.font || null;
            exCell.alignment = styles.alignment || null;
            exCell.border = styles.border || null;
            exCell.fill = styles.fill || null;
            exCell.numFmt = styles.numFmt || null;
            //Auto-detecting currency from options
            if (opts.autoDetecting.currency && exCell.numFmt == null && typeof exCell.value == "string") {
              let cellValueWithoutSpaces = exCell.value.replace(/ /g, '').replace(/\,/g, '');
              const regex = /^(\+|\-)?\$[0-9]+(\.[0-9]{1,2})?$/;
              if (regex.test(cellValueWithoutSpaces)) {
                exCell.value = exCell.value.replace(/[^0-9\+\-\.]/g, "")
                exCell.value = Number(exCell.value);
                exCell.numFmt = "$#,##0.00";
              }
            }
          }
        }
      }
      //Setting column width
      if (widths) {
        widths.forEach((width, _i) => {
          ws.columns[_i].width = width;
        });
      }
      applyMerges(ws, merges);
      return ws;
    }
    else {
      let widths = htmlElement.getAttribute("data-cols-width");
      if (widths) {
        widths = widths.split(",").map(function (item) {
          return parseInt(item);
        });
      }
      let merges = [];
      _r = 0;
      let row = htmlElement;
      r = ws.rowCount + _r + 1; // Actual excel row number
      c = 1; // Actual excel col number
      if (row.getAttribute("data-exclude") === "true") {
        return ws;
      }
      if (row.getAttribute("data-height")) {
        let exRow = ws.getRow(r);
        exRow.height = parseFloat(row.getAttribute("data-height"));
      }

      for (let _m = 0; _m < merges.length; ++_m) {
        var m = merges[_m];
        if (m.s.c == c && m.s.r <= r && r <= m.e.r) {
          c = m.e.c + 1;
          _m = -1;
        }
      }
      let exCell = ws.getCell(getColumnAddress(c, r));
      // calculate merges
      cs = parseInt(row.getAttribute("colspan")) || 1;
      rs = parseInt(row.getAttribute("rowspan")) || 1;
      if (cs > 1 || rs > 1) {
        merges.push({
          s: { c: c, r: r },
          e: { c: c + cs - 1, r: r + rs - 1 }
        });
      }
      c += cs;
      exCell.value = getValue(row, tableObject);
      if (!opts.autoStyle) {
        let styles = getStylesDataAttr(row, opts);
        exCell.font = styles.font || null;
        exCell.alignment = styles.alignment || null;
        exCell.border = styles.border || null;
        exCell.fill = styles.fill || null;
        exCell.numFmt = styles.numFmt || null;
        //Auto-detecting currency from options
        if (opts.autoDetecting.currency && exCell.numFmt == null && typeof exCell.value == "string") {
          let cellValueWithoutSpaces = exCell.value.replace(/ /g, '').replace(/\,/g, '');
          const regex = /^(\+|\-)?\$[0-9]+(\.[0-9]{1,2})?$/;
          if (regex.test(cellValueWithoutSpaces)) {
            exCell.value = exCell.value.replace(/[^0-9\+\-\.]/g, "")
            exCell.value = Number(exCell.value);
            exCell.numFmt = "$#,##0.00";
          }
        }
      }
      //Setting column width
      if (widths)
        widths.forEach((width, _i) => {
          ws.columns[_i].width = width;
        });
      applyMerges(ws, merges);
      return ws;
    }
  };

  /**
   * To apply merges on the sheet
   * @param {object} ws The worksheet object
   * @param {object[]} merges array of merges
   */
  let applyMerges = function (ws, merges) {
    merges.forEach(m => {
      ws.mergeCells(
        getExcelColumnName(m.s.c) +
        m.s.r +
        ":" +
        getExcelColumnName(m.e.c) +
        m.e.r
      );
    });
  };

  /**
   * Convert HTML to plain text
   */
  let htmldecode = (function () {
    let entities = [
      ["nbsp", " "],
      ["middot", "·"],
      ["quot", '"'],
      ["apos", "'"],
      ["gt", ">"],
      ["lt", "<"],
      ["amp", "&"]
    ].map(function (x) {
      return [new RegExp("&" + x[0] + ";", "g"), x[1]];
    });
    return function htmldecode(str) {
      let o = str
        .trim()
        .replace(/\s+/g, " ")
        .replace(/<\s*[bB][rR]\s*\/?>/g, "\n")
        .replace(/<[^>]*>/g, "");
      for (let i = 0; i < entities.length; ++i)
        o = o.replace(entities[i][0], entities[i][1]);
      return o;
    };
  })();

  /**
   * Takes a positive integer and returns the corresponding column name.
   * @param {number} num  The positive integer to convert to a column name.
   * @return {string}  The column name.
   */
  let getExcelColumnName = function (num) {
    for (var ret = "", a = 1, b = 26; (num -= a) >= 0; a = b, b *= 26) {
      ret = String.fromCharCode(parseInt((num % b) / a) + 65) + ret;
    }
    return ret;
  };

  let getColumnAddress = function (col, row) {
    return getExcelColumnName(col) + row;
  };

  /**
   * Checks the data type specified and converts the value to it.
   * @param {HTML entity} td
   */
  let getValue = function (td, tableObject) {
    let dataType = td.getAttribute("data-t");
    let rawVal = tableObject ? htmldecode(td.innerHTML) : td.innerText;
    if (dataType) {
      let val;
      switch (dataType) {
        case "n": //number
          rawVal = rawVal.replace(/[^0-9\+\-\.]/g, "")
          val = Number(rawVal);
          break;
        case "d": //date
          val = new Date(rawVal);
          break;
        case "b": //boolean
          val =
            rawVal.toLowerCase() === "true"
              ? true
              : rawVal.toLowerCase() === "false"
                ? false
                : Boolean(parseInt(rawVal));
          break;
        default:
          val = rawVal;
      }
      return val;
    } else if (td.getAttribute("data-hyperlink")) {
      return {
        text: rawVal,
        hyperlink: td.getAttribute("data-hyperlink")
      };
    } else if (td.getAttribute("data-error")) {
      return { error: td.getAttribute("data-error") };
    }
    return rawVal;
  };

  /**
   * Convert computed colors to hex ARGB
   * @param {string} computedColor Computed color string from getPropertyValue()
   */
  let getHexArgbColor = function (computedColor) {
    //if RGB then convert to RGBA
    let computedColorStr = computedColor;
    if (computedColorStr.indexOf('a') == -1) {
      computedColorStr = computedColorStr.replace(')', ', 1)').replace('rgb', 'rgba');
    }

    let rgbaValues = computedColorStr.split("(")[1].split(")")[0].split(",");

    let r = (+rgbaValues[0]).toString(16),
      g = (+rgbaValues[1]).toString(16),
      b = (+rgbaValues[2]).toString(16),
      a = Math.round(+rgbaValues[3] * 255).toString(16);

    if (a == 0) { return "" }

    if (r.length == 1)
      r = "0" + r;
    if (g.length == 1)
      g = "0" + g;
    if (b.length == 1)
      b = "0" + b;
    // if (a.length == 1)
    //   a = "0" + a;

    return "F" + r.toUpperCase() + g.toUpperCase() + b.toUpperCase();
  };

  /**
   * Prepares the style object for a cell using the data attributes
   * @param {HTML entity} td
   */
  let getStylesDataAttr = function (td, opts) {
    let cssComputedStyles = window.getComputedStyle(td, null);
    //Font attrs
    let font = {};
    if (td.getAttribute("data-f-name"))
      font.name = td.getAttribute("data-f-name");
    if (td.getAttribute("data-f-sz")) font.size = td.getAttribute("data-f-sz");
    if (td.getAttribute("data-f-color")) {
      if (td.getAttribute("data-f-color") != "none") {
        font.color = { argb: td.getAttribute("data-f-color") };
      }
    }
    else {
      //Set css font color from options
      if (opts.useCss.fontColor) {
        let computedColor = cssComputedStyles.getPropertyValue("color");
        let convertedColor = getHexArgbColor(computedColor)
        if (convertedColor != "") {
          font.color = { argb: convertedColor };
        }
      }
    }
    if (td.getAttribute("data-f-bold") === "true") font.bold = true;
    if (td.getAttribute("data-f-italic") === "true") font.italic = true;
    if (td.getAttribute("data-f-underline") === "true") font.underline = true;
    if (td.getAttribute("data-f-strike") === "true") font.strike = true;

    // Alignment attrs
    let alignment = {};
    if (td.getAttribute("data-a-h"))
      alignment.horizontal = td.getAttribute("data-a-h");
    if (td.getAttribute("data-a-v")) {
      alignment.vertical = td.getAttribute("data-a-v");
    }
    else {
      // Set vertical alignment from options
      if (opts.objectDefaults.alignment.vertical != "bottom") {
        alignment.vertical = opts.objectDefaults.alignment.vertical;
      }
    }
    if (td.getAttribute("data-a-wrap")) {
      alignment.wrapText = td.getAttribute("data-a-wrap");
    }
    else {
      // Set text wrapping from options
      if (opts.objectDefaults.alignment.wrapText != false) {
        alignment.wrapText = true;
      }
    }
    if (td.getAttribute("data-a-text-rotation"))
      alignment.textRotation = td.getAttribute("data-a-text-rotation");
    if (td.getAttribute("data-a-indent"))
      alignment.indent = td.getAttribute("data-a-indent");
    if (td.getAttribute("data-a-rtl") === "true")
      alignment.readingOrder = "rtl";

    // Border attrs
    let border = {
      top: {},
      left: {},
      bottom: {},
      right: {}
    };

    if (td.getAttribute("data-b-a-s")) {
      if (td.getAttribute("data-b-a-s") != "none") {
        let style = td.getAttribute("data-b-a-s");
        border.top.style = style;
        border.left.style = style;
        border.bottom.style = style;
        border.right.style = style;
      }
    }
    else {
      // Set borders style from options
      if (opts.objectDefaults.borders.style != 'undefined') {
        border.top.style = opts.objectDefaults.borders.style;
        border.left.style = opts.objectDefaults.borders.style;
        border.bottom.style = opts.objectDefaults.borders.style;
        border.right.style = opts.objectDefaults.borders.style;
      }
    }
    if (td.getAttribute("data-b-a-c")) {
      let color = { argb: td.getAttribute("data-b-a-c") };
      border.top.color = color;
      border.left.color = color;
      border.bottom.color = color;
      border.right.color = color;
    }
    if (td.getAttribute("data-b-t-s")) {
      border.top.style = td.getAttribute("data-b-t-s");
      if (td.getAttribute("data-b-t-c"))
        border.top.color = { argb: td.getAttribute("data-b-t-c") };
    }
    if (td.getAttribute("data-b-l-s")) {
      border.left.style = td.getAttribute("data-b-l-s");
      if (td.getAttribute("data-b-l-c"))
        border.left.color = { argb: td.getAttribute("data-b-t-c") };
    }
    if (td.getAttribute("data-b-b-s")) {
      border.bottom.style = td.getAttribute("data-b-b-s");
      if (td.getAttribute("data-b-b-c"))
        border.bottom.color = { argb: td.getAttribute("data-b-t-c") };
    }
    if (td.getAttribute("data-b-r-s")) {
      border.right.style = td.getAttribute("data-b-r-s");
      if (td.getAttribute("data-b-r-c"))
        border.right.color = { argb: td.getAttribute("data-b-t-c") };
    }

    //Fill
    let fill;
    if (td.getAttribute("data-fill-color")) {
      if (td.getAttribute("data-fill-color") != "none") {
        fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: td.getAttribute("data-fill-color") }
        };
      }
    }
    else {
      //Set css background color from options
      if (opts.useCss.backgroundColor) {
        let computedBackgroundColor = cssComputedStyles.getPropertyValue("background-color");
        let convertedBackgroundColor = getHexArgbColor(computedBackgroundColor)
        if (convertedBackgroundColor != "") {
          fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: convertedBackgroundColor }
          };
        }
      }
    }

    //number format
    let numFmt;
    if (td.getAttribute("data-num-fmt"))
      numFmt = td.getAttribute("data-num-fmt");

    return {
      font,
      alignment,
      border,
      fill,
      numFmt
    };
  };

  return methods;
})();

export default Parser;
