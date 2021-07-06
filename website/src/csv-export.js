const EXPORT_DIV_ID = "uf_csv_export_div";
const EXPORT_DIV_BTN = "uf_csv_export_btn";
const EXPORT_BTN = $('<a>', {id: EXPORT_DIV_BTN, class: "button is-dark is-outlined is-small"})
                   .html("Export table as CSV").attr("href", "#");
const EXPORT_DIV = $('<div>', {id: EXPORT_DIV_ID, class: "mt-2"}).append(EXPORT_BTN);


function displayCsvExportBtn() {
  if (!UF_SETTINGS_CSV_DISPLAY) {
    return;
  }
  if (!tableIsEmpty()) {
    JQ_ID_HEADER.append(EXPORT_DIV);
    setClickEvent();
  }
}
function hideExportCsvBtn() {
  if (!UF_SETTINGS_CSV_DISPLAY) {
    return;
  }
  if (!tableIsEmpty()) {
    getJqId_$(EXPORT_DIV_ID).remove();
  }
}
function setClickEvent() {
  EXPORT_BTN.on('click', function (event) {
    downloadCsv.apply(this);
    const query = JQ_REPO_FIELD.val();
    ga_exportCSV(query);
  });
}


// credit: https://stackoverflow.com/a/33807762/9768291
function downloadCsv() {
  let $rows = getTableBody().find('tr:has(td),tr:has(th)');

  // Temporary delimiter characters unlikely to be typed by keyboard
  // This is to avoid accidentally splitting the actual contents
  const tmpColDelim = String.fromCharCode(11); // vertical tab character
  const tmpRowDelim = String.fromCharCode(0);  // null character

  // Actual delimiter characters for CSV format
  const colDelim = '","';
  const rowDelim = '"\r\n"';

  // Manually adding headers
  let headers = ["Repo", "URL", "Stars", "Forks", "Ahead", "Behind", "Last Push"];
  let csv = '"' + headers.join(colDelim);
  csv += rowDelim;

  // Grab text from table into CSV formatted string
  csv += $rows.map(function (i, row) {
    const $row = $(row);
    const $cols = $row.find('td');

    return $cols.map(function (j, col) {
      const $col = $(col);
      let text = $col.attr('value');

      // special cases specific to useful-forks
      if (text === undefined) {
        return;
      }
      if (j === 0) {
        const url = $col.find("a").attr("href");
        text += colDelim + url; // adding the repo URL
        return text;
      }

      return text.replace(/"/g, '""'); // escape double quotes
    }).get().join(tmpColDelim);

  }).get().join(tmpRowDelim)
  .split(tmpRowDelim).join(rowDelim)
  .split(tmpColDelim).join(colDelim) + '"';

  // Data URI
  let csvData = 'data:application/csv;charset=utf-8,' + encodeURIComponent(csv);

  // Download
  const query = JQ_REPO_FIELD.val();
  let filename = "useful-forks-" + query + ".csv";
  filename = filename.replace("/","_"); // replace illegal char
  if (window.navigator.msSaveBlob) { // IE 10+
    window.navigator.msSaveOrOpenBlob(
        new Blob([csv], {type: "text/plain;charset=utf-8;"}), filename)
  } else {
    $(this).attr({'download': filename, 'href': csvData, 'target': '_blank'});
  }
}