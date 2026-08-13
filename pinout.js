'use strict';
var pinout = document.getElementById("pinout");
var inputs = document.getElementsByTagName("input");
var advanced = document.querySelectorAll(".advanced");
document.getElementById("nav").classList.remove("nojs");
for (var i = 0; i < inputs.length; i++) {
    if (inputs[i].type != "checkbox") continue;
    switch(inputs[i].name) {
        case "australian":
            inputs[i].onchange = australian_on_change;
            break;
        case "reversed":
            inputs[i].onchange = reversed_on_change;
            break;
        case "advanced":
            inputs[i].onchange = advanced_on_change;
            break;
        default:
            inputs[i].onchange = interface_on_change;
    }
    inputs[i].onchange();
}
function advanced_on_change() {
    for (var j = 0; j < advanced.length; j++) {
        advanced[j].classList.toggle("advanced", !this.checked);
    }
}
function interface_on_change() {
    var checked = this.checked;
    var labels = pinout.getElementsByClassName(this.name);
    for (var j = 0; j < labels.length; j++) {
        labels[j].classList.toggle("hidden", !checked);
    }
}
function reversed_on_change() {
    pinout.classList.toggle("underside-view", this.checked);
}
function australian_on_change() {
    pinout.classList.toggle("australian-view", this.checked);
}


// Janky hack for iOS at least
if (window.innerWidth < 400) {
    for (var i = 0; i < inputs.length; i++) {
        if (inputs[i].type != "checkbox") continue;
        inputs[i].checked = false;
        inputs[i].onchange();
    }
}
/* Keyboard navigation: one tab stop per table, arrow keys move between pins.
   Cells hidden by an interface toggle are skipped, and the travelling column is
   remembered so short rows (Ground, power) do not lose your place. */
Array.prototype.forEach.call(pinout.querySelectorAll("table.labels.left, table.labels.right"), function (table) {
    var grid = Array.prototype.map.call(table.querySelectorAll("tbody tr"), function (row) {
        return Array.prototype.slice.call(row.cells);
    });
    if (!grid.length) return;

    var full_width = Math.max.apply(null, grid.map(function (row) { return row.length; }));
    var desired_column = 0;
    var moving_focus = false;

    function shown(cell) {
        return cell.offsetParent !== null && getComputedStyle(cell).visibility !== "hidden";
    }

    function locate(cell) {
        for (var row = 0; row < grid.length; row++) {
            var column = grid[row].indexOf(cell);
            if (column !== -1) return {row: row, column: column};
        }
        return null;
    }

    function nearest(row, column) {
        var visible = grid[row].filter(shown);
        if (!visible.length) return null;
        return visible.reduce(function (best, candidate) {
            var a = Math.abs(grid[row].indexOf(candidate) - column);
            var b = Math.abs(grid[row].indexOf(best) - column);
            return a < b ? candidate : best;
        });
    }

    function set_tab_stop(cell) {
        grid.forEach(function (row) {
            row.forEach(function (other) { other.tabIndex = other === cell ? 0 : -1; });
        });
    }

    function focus_cell(row, column) {
        var cell = nearest(row, column);
        if (!cell) return;
        set_tab_stop(cell);
        moving_focus = true;
        cell.focus();
        moving_focus = false;
    }

    function move_row(from, delta) {
        var next = from.row + delta;
        while (next >= 0 && next < grid.length && !nearest(next, desired_column)) next += delta;
        if (next < 0 || next >= grid.length) return;
        focus_cell(next, desired_column);
    }

    function move_column(from, delta) {
        var visible = grid[from.row].filter(shown);
        var at = visible.indexOf(grid[from.row][from.column]);
        var target = visible[Math.max(0, Math.min(visible.length - 1, at + delta))];
        if (!target) return;
        desired_column = grid[from.row].indexOf(target);
        focus_cell(from.row, desired_column);
    }

    table.addEventListener("keydown", function (event) {
        var cell = event.target.closest ? event.target.closest("th, td") : null;
        var position = cell && locate(cell);
        if (!position) return;

        if (grid[position.row].length === full_width) desired_column = position.column;

        switch (event.key) {
            case "ArrowRight": move_column(position, 1); break;
            case "ArrowLeft": move_column(position, -1); break;
            case "ArrowDown": move_row(position, 1); break;
            case "ArrowUp": move_row(position, -1); break;
            case "Home": move_column(position, -grid[position.row].length); break;
            case "End": move_column(position, grid[position.row].length); break;
            default: return;
        }
        event.preventDefault();
    });

    table.addEventListener("focusin", function (event) {
        var cell = event.target.closest ? event.target.closest("th, td") : null;
        if (!cell || moving_focus) return;
        var position = locate(cell);
        if (!position) return;
        desired_column = position.column;
        set_tab_stop(cell);
    });

    focus_cell(0, 0);
    grid.forEach(function (row) { row.forEach(function (cell) { cell.tabIndex = -1; }); });
    var first = nearest(0, 0);
    if (first) first.tabIndex = 0;
});
