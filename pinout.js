'use strict';
var pinout = document.getElementById("pinout");
var main = document.querySelector("main");
var inputs = document.getElementsByTagName("input");
var advanced = document.querySelectorAll(".advanced");
document.getElementById("nav").classList.remove("nojs");


var URL_TOGGLES = [["advanced", "a"], ["spi", "s"], ["i2c", "i"],
                   ["uart", "u"], ["pwm", "p"], ["custom", "l"]];
var TOGGLE_STORE = "custom-toggles";
var url_ready = false;

function hash_param(name) {
    var match = new RegExp("(?:^|&)" + name + "=([^&]*)").exec(window.location.hash.replace(/^#/, ""));
    return match ? match[1] : null;
}

function encode_toggles() {
    return URL_TOGGLES.filter(function (entry) {
        var box = document.getElementById(entry[0]);
        return box && box.checked;
    }).map(function (entry) { return entry[1]; }).join("");
}

function apply_toggles(encoded) {
    URL_TOGGLES.forEach(function (entry) {
        var box = document.getElementById(entry[0]);
        if (box) box.checked = encoded.indexOf(entry[1]) !== -1;
    });
}

function restore_toggles() {
    var shared = hash_param("i");
    if (shared === null) {
        try {
            shared = window.localStorage.getItem(TOGGLE_STORE);
        } catch (error) {
            shared = null;
        }
    }
    if (shared !== null) apply_toggles(shared);
}

function store_toggles() {
    try {
        window.localStorage.setItem(TOGGLE_STORE, encode_toggles());
    } catch (error) {
    }
}

function compose_url(base) {
    var parts = [];
    var labels = encode_labels();
    var toggles = encode_toggles();
    if (labels) parts.push("l=" + labels);
    parts.push("i=" + toggles);
    return base + "#" + parts.join("&");
}

function update_url() {
    if (!url_ready) return;
    window.history.replaceState(null, "", compose_url(""));
}

var PALETTE = ["gpio", "ground", "power", "adc", "system", "i2c", "spi", "uart", "pwm"];
var PALETTE_KEYS = "abcdefghi";
var LABEL_MAX = 10;
var LABEL_STORE = "custom-labels";
var PEN = '<svg viewBox="0 0 16 16" width="10" height="10" aria-hidden="true">'
    + '<path d="M11.5 1.5l3 3-8 8-3.5.5.5-3.5z"/></svg>';
var TRASH = '<svg viewBox="0 0 16 16" width="11" height="11" aria-hidden="true">'
    + '<path d="M6.5 1.5h3l.5 1H13V4H3V2.5h3zM4 5.5h8l-.7 9H4.7z"/></svg>';

var custom_labels = {};

function label_pins() {
    return Array.prototype.slice.call(pinout.querySelectorAll("table.labels.left tbody tr, table.labels.right tbody tr"));
}

function pin_of(row) {
    return parseInt(row.cells[0].textContent, 10);
}

function encode_labels() {
    return encode_set(custom_labels);
}

function encode_set(set) {
    return Object.keys(set).map(Number).sort(function (a, b) { return a - b; })
        .map(function (pin) {
            var label = set[pin];
            return (pin < 10 ? "0" + pin : String(pin))
                + PALETTE_KEYS.charAt(label.colour)
                + encodeURIComponent(label.text);
        }).join(";");
}

function decode_labels(encoded) {
    var result = {};
    if (!encoded) return result;
    encoded.split(";").forEach(function (record) {
        var match = /^(\d{2})([a-i])(.*)$/.exec(record);
        if (!match) return;
        var pin = parseInt(match[1], 10);
        var text = decodeURIComponent(match[3]).slice(0, LABEL_MAX);
        if (!text) return;
        result[pin] = {text: text, colour: PALETTE_KEYS.indexOf(match[2])};
    });
    return result;
}

function labels_from_hash() {
    var encoded = hash_param("l");
    return encoded === null ? null : decode_labels(encoded);
}

function store_labels() {
    try {
        window.localStorage.setItem(LABEL_STORE, encode_labels());
    } catch (error) {
    }
}

function restore_labels() {
    try {
        return decode_labels(window.localStorage.getItem(LABEL_STORE) || "");
    } catch (error) {
        return {};
    }
}

function share_url() {
    return compose_url(window.location.href.split("#")[0]);
}

function render_label(cell) {
    var pin = pin_of(cell.parentElement);
    var label = custom_labels[pin];
    var button = cell.querySelector("button.pen");

    button.className = "pen" + (label ? " " + PALETTE[label.colour] : " empty");
    button.innerHTML = label ? "" : PEN;
    if (label) button.textContent = label.text;
    button.setAttribute("aria-label", label
        ? "Edit label on pin " + pin + ", currently " + label.text
        : "Add a label to pin " + pin);
}

function render_all_labels() {
    pinout.querySelectorAll("td.custom").forEach(render_label);
    var count = Object.keys(custom_labels).length;
    var status = document.getElementById("share_count");
    if (status) status.textContent = count ? count + " labelled" : "";
    if (typeof show_offer === "function") show_offer();
}

function close_editor() {
    var open = pinout.querySelector(".label-editor");
    if (open) open.parentElement.removeChild(open);
}

function commit_label(pin, text, colour) {
    text = text.trim().slice(0, LABEL_MAX);
    if (text) {
        custom_labels[pin] = {text: text, colour: colour};
    } else {
        delete custom_labels[pin];
    }
    store_labels();
    update_url();
    render_all_labels();
}

function place_editor(editor, cell) {
    var box = cell.getBoundingClientRect();
    if (box.left + editor.offsetWidth < window.innerWidth - 4) {
        editor.style.left = "0";
        editor.style.right = "auto";
    } else {
        editor.style.left = "auto";
        editor.style.right = "0";
    }
}

function open_editor(cell) {
    var pin = pin_of(cell.parentElement);
    var existing = custom_labels[pin] || {text: "", colour: 0};

    close_editor();

    var editor = document.createElement("div");
    editor.className = "label-editor";

    var row = document.createElement("div");
    row.className = "row";

    var field = document.createElement("input");
    field.type = "text";
    field.maxLength = LABEL_MAX;
    field.value = existing.text;
    field.setAttribute("aria-label", "Label for pin " + pin + ", up to " + LABEL_MAX + " characters");
    row.appendChild(field);

    var trash = document.createElement("button");
    trash.type = "button";
    trash.className = "trash";
    trash.tabIndex = 0;
    trash.innerHTML = TRASH;
    trash.title = "Remove this label";
    trash.setAttribute("aria-label", "Remove the label on pin " + pin);
    trash.hidden = existing.text === "";
    trash.onmousedown = function (event) { event.preventDefault(); };
    trash.onclick = function () {
        commit_label(pin, "", chosen);
        close_editor();
        cell.querySelector("button.pen").focus();
        share_message("Label removed");
    };
    row.appendChild(trash);

    editor.appendChild(row);

    var chosen = existing.colour;
    var swatches = document.createElement("div");
    swatches.className = "swatches";
    PALETTE.forEach(function (name, index) {
        var swatch = document.createElement("button");
        swatch.type = "button";
        swatch.className = "swatch " + name + (index === chosen ? " chosen" : "");
        swatch.setAttribute("aria-label", name);
        swatch.setAttribute("aria-pressed", index === chosen ? "true" : "false");
        swatch.tabIndex = 0;
        swatch.onmousedown = function (event) { event.preventDefault(); };
        swatch.onclick = function () {
            chosen = index;
            swatches.querySelectorAll(".swatch").forEach(function (other) {
                other.classList.toggle("chosen", other === swatch);
                other.setAttribute("aria-pressed", other === swatch ? "true" : "false");
            });
            commit_label(pin, field.value, chosen);
        };
        swatches.appendChild(swatch);
    });
    editor.appendChild(swatches);

    field.oninput = function () {
        trash.hidden = field.value.trim() === "";
        commit_label(pin, field.value, chosen);
    };
    field.onkeydown = function (event) {
        if (event.key === "Enter" || event.key === "Escape") {
            event.preventDefault();
            close_editor();
            cell.querySelector("button.pen").focus();
        }
    };

    editor.onfocusout = function () {
        window.setTimeout(function () {
            if (editor.parentElement && !editor.contains(document.activeElement)) close_editor();
        }, 0);
    };

    cell.appendChild(editor);
    place_editor(editor, cell);
    field.focus();
    field.select();
}

function is_shown(cell) {
    return !cell.classList.contains("hidden")
        && !cell.classList.contains("advanced")
        && !cell.classList.contains("collapsed");
}

function align_custom_column() {
    Array.prototype.forEach.call(pinout.querySelectorAll("td.spacer"), function (cell) {
        cell.parentElement.removeChild(cell);
    });
    Array.prototype.forEach.call(pinout.querySelectorAll("td.collapsed"), function (cell) {
        cell.classList.remove("collapsed");
    });

    var probe = pinout.querySelector("td.custom");
    if (probe && probe.classList.contains("hidden")) {
        Array.prototype.forEach.call(pinout.querySelectorAll("td.custom"), function (cell) {
            cell.parentElement.appendChild(cell);
        });
        return;
    }

    ["left", "right"].forEach(function (side) {
        var rows = Array.prototype.slice.call(
            pinout.querySelectorAll("table.labels." + side + " tbody tr"));

        var shown = rows.map(function (row) {
            return Array.prototype.filter.call(row.cells, function (cell) {
                return !cell.classList.contains("custom") && is_shown(cell);
            });
        });
        var target = Math.max.apply(null, shown.map(function (cells) { return cells.length; }));

        rows.forEach(function (row, index) {
            var label = row.querySelector("td.custom");
            if (!label) return;

            var last = shown[index][shown[index].length - 1];
            if (last && last.nextSibling !== label) row.insertBefore(label, last.nextSibling);

            for (var pad = shown[index].length; pad < target; pad++) {
                var spacer = document.createElement("td");
                spacer.className = "spacer";
                row.insertBefore(spacer, label);
            }

            var trailing = label.classList.contains("hidden") === false;
            var cell = label.nextSibling;
            while (cell) {
                if (cell.classList) cell.classList.toggle("collapsed", trailing);
                cell = cell.nextSibling;
            }
        });
    });
}


var pending_shared = null;
var previous_mine = null;

var share_timer = null;

function share_message(text) {
    var status = document.getElementById("share_status");
    if (!status) return;
    status.textContent = text;
    if (share_timer) window.clearTimeout(share_timer);
    share_timer = window.setTimeout(function () {
        status.textContent = "";
        share_timer = null;
    }, 4000);
}

function count_of(set) {
    return set ? Object.keys(set).length : 0;
}

function plural(count, word) {
    return count + " " + word + (count === 1 ? "" : "s");
}

function apply_shared() {
    var mine = custom_labels;
    custom_labels = pending_shared;
    pending_shared = null;
    previous_mine = mine;
    store_labels();
    update_url();
    render_all_labels();
    align_custom_column();
    share_message("Replaced with the shared set");
}

function restore_mine() {
    var shared = custom_labels;
    custom_labels = previous_mine;
    previous_mine = null;
    pending_shared = shared;
    store_labels();
    update_url();
    render_all_labels();
    align_custom_column();
    share_message("Your labels restored");
}

function show_offer() {
    var notice = document.getElementById("share_notice");
    if (!notice) return;

    var offer = null;
    if (pending_shared) {
        offer = {
            text: "This link carries " + plural(count_of(pending_shared), "label") + ". ",
            button: "Replace my " + plural(count_of(custom_labels), "label"),
            action: apply_shared
        };
    } else if (previous_mine) {
        offer = {text: "Showing the shared set. ", button: "Restore my "
            + plural(count_of(previous_mine), "label"), action: restore_mine};
    }

    var signature = offer ? offer.text + offer.button : "";
    if (notice.dataset.state === signature) return;
    notice.dataset.state = signature;
    notice.textContent = "";
    if (!offer) return;

    notice.appendChild(document.createTextNode(offer.text));
    var button = document.createElement("button");
    button.type = "button";
    button.tabIndex = 0;
    button.textContent = offer.button;
    button.onclick = offer.action;
    notice.appendChild(button);
}

function consider_shared(shared) {
    if (!shared || encode_set(shared) === encode_labels()) return;

    if (!count_of(custom_labels)) {
        custom_labels = shared;
        store_labels();
        render_all_labels();
        align_custom_column();
        return;
    }

    pending_shared = shared;
    show_offer();
}

function build_custom_labels() {
    custom_labels = restore_labels();

    label_pins().forEach(function (row) {
        var cell = document.createElement("td");
        cell.className = "custom";
        var button = document.createElement("button");
        button.type = "button";
        button.className = "pen";
        button.onclick = function () {
            if (cell.querySelector(".label-editor")) close_editor(); else open_editor(cell);
        };
        cell.appendChild(button);
        row.appendChild(cell);
    });

    render_all_labels();
    store_labels();

    var clear = document.getElementById("clear");
    if (clear) {
        clear.onclick = function () {
            if (!Object.keys(custom_labels).length) return;
            custom_labels = {};
            store_labels();
            update_url();
            render_all_labels();
            align_custom_column();
            share_message("Labels cleared");
        };
    }

    consider_shared(labels_from_hash());

    var share = document.getElementById("share");
    if (share) {
        share.onclick = function () {
            var url = share_url();
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(url).then(function () {
                    share_message("Link copied");
                }, function () {
                    share_message(url);
                });
            } else {
                share_message(url);
            }
        };
    }

    document.addEventListener("pointerdown", function (event) {
        var editor = pinout.querySelector(".label-editor");
        if (editor && !editor.contains(event.target)) close_editor();
    }, true);

    window.addEventListener("hashchange", function () {
        consider_shared(labels_from_hash());
        var toggles = hash_param("i");
        if (toggles !== null) {
            apply_toggles(toggles);
            apply_all_boxes();
            align_custom_column();
            center_board();
            store_toggles();
            update_url();
        }
    });
}

/* Deferred to the next frame so centring on load does not force layout. */
var centring = 0;

function center_board() {
    if (centring) window.cancelAnimationFrame(centring);
    centring = window.requestAnimationFrame(function () {
        centring = 0;
        var board = pinout.querySelector(pinout.classList.contains("underside-view")
            ? ".pico.underside" : ".pico:not(.underside)");
        if (!board) return;
        var box = board.getBoundingClientRect();
        var view = pinout.getBoundingClientRect();
        pinout.scrollLeft += (box.left + box.right - view.left - view.right) / 2;
    });
}

restore_toggles();
build_custom_labels();
for (var i = 0; i < inputs.length; i++) {
    if (inputs[i].type != "checkbox") continue;
    inputs[i].onchange = inputs[i].name === "reversed" || inputs[i].name === "australian"
        ? view_on_change : filter_on_change;
}
apply_all_boxes();
align_custom_column();
center_board();
store_toggles();

function apply_advanced(box) {
    for (var j = 0; j < advanced.length; j++) {
        advanced[j].classList.toggle("advanced", !box.checked);
    }
}
function apply_interface(box) {
    var checked = box.checked;
    Array.prototype.forEach.call(main.querySelectorAll("." + box.name), function (element) {
        var owner = element.closest("td.custom");
        if (owner && owner !== element) return;
        element.classList.toggle("hidden", !checked);
    });
}
function apply_box(box) {
    switch (box.name) {
        case "australian":
            pinout.classList.toggle("australian-view", box.checked);
            break;
        case "reversed":
            pinout.classList.toggle("underside-view", box.checked);
            break;
        case "advanced":
            apply_advanced(box);
            break;
        default:
            apply_interface(box);
    }
}
function apply_all_boxes() {
    for (var j = 0; j < inputs.length; j++) {
        if (inputs[j].type === "checkbox") apply_box(inputs[j]);
    }
}
function filter_on_change() {
    apply_box(this);
    align_custom_column();
    store_toggles();
    update_url();
}
function view_on_change() {
    apply_box(this);
}

url_ready = true;

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

    function locate(cell) {
        for (var row = 0; row < grid.length; row++) {
            var column = grid[row].indexOf(cell);
            if (column !== -1) return {row: row, column: column};
        }
        return null;
    }

    function nearest(row, column) {
        var visible = grid[row].filter(is_shown);
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
        var visible = grid[from.row].filter(is_shown);
        var at = visible.indexOf(grid[from.row][from.column]);
        var target = visible[Math.max(0, Math.min(visible.length - 1, at + delta))];
        if (!target) return;
        desired_column = grid[from.row].indexOf(target);
        focus_cell(from.row, desired_column);
    }

    table.addEventListener("keydown", function (event) {
        if (/^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)) return;
        var cell = event.target.closest ? event.target.closest("th, td") : null;
        var position = cell && locate(cell);
        if (!position) return;

        if ((event.key === "Enter" || event.key === " ") && event.target !== cell) return;

        if (grid[position.row].length === full_width) desired_column = position.column;

        switch (event.key) {
            case "ArrowRight": move_column(position, 1); break;
            case "ArrowLeft": move_column(position, -1); break;
            case "ArrowDown": move_row(position, 1); break;
            case "ArrowUp": move_row(position, -1); break;
            case "Home": move_column(position, -grid[position.row].length); break;
            case "End": move_column(position, grid[position.row].length); break;
            case "Enter":
            case " ":
                var button = cell.querySelector("button");
                if (!button) return;
                button.click();
                break;
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

    grid.forEach(function (row) { row.forEach(function (cell) { cell.tabIndex = -1; }); });
    var first = nearest(0, 0);
    if (first) first.tabIndex = 0;
});
