'use strict';
var pinout = document.getElementById("pinout");
var inputs = document.getElementsByTagName("input");
var advanced = document.querySelectorAll(".advanced");
Array.prototype.remove = function(str) {
    var idx = this.indexOf(str);
    if (idx !== -1) {
        this.splice(idx, 1);
    }
}
Array.prototype.toggle = function(str, state) {
    this.remove(str);
    if (state) this.push(str);
}

var url = new URL(document.URL);
var qs = url.searchParams;
url.searchParams.getBool = function(name) {
    if (this.has(name)) {
        return this.get(name).toLowerCase() == "true";
    }
    return false;
}
url.searchParams.getList = function(name, def) {
    if (this.has(name)) {
        return this.get(name).split(',')
    }
    return def;
}

var state = {
    advanced: qs.getBool("advanced"),
    reversed: qs.getBool("reversed"),
    visible: qs.getList("visible", ["spi", "i2c", "pwm", "uart"])
};

console.log(state);

document.getElementById("nav").classList.remove("nojs");
for (var i = 0; i < inputs.length; i++) {
    if (inputs[i].type != "checkbox") continue;
    switch(inputs[i].name) {
        case "reversed":
            inputs[i].checked = state.reversed;
            inputs[i].onchange = reversed_on_change;
            break;
        case "advanced":
            inputs[i].checked = state.advanced;
            inputs[i].onchange = advanced_on_change;
            break;
        default:
            inputs[i].checked = state.visible.indexOf(inputs[i].name) !== -1;
            inputs[i].onchange = interface_on_change;
    }
    inputs[i].onchange();
}
function updateURL() {
    // This is crude, but we only really want non-default
    // values to appear in the URL
    var smolstate = {}
    if (state.advanced) smolstate.advanced = true;
    if (state.reversed) smolstate.reversed = true;
    if (state.visible.length > 0 && state.visible.join(",") != "spi,i2c,pwm,uart") {
        smolstate.visible = state.visible;
    }
    history.replaceState({}, "", "?" + new URLSearchParams(smolstate).toString());
}
function advanced_on_change() {
    for (var j = 0; j < advanced.length; j++) {
        advanced[j].classList.toggle("advanced", !this.checked);
    }
    state.advanced = this.checked;
    updateURL();
}
function interface_on_change() {
    var checked = this.checked;
    var labels = pinout.getElementsByClassName(this.name);
    state.visible.toggle(this.name, this.checked);
    for (var j = 0; j < labels.length; j++) {
        labels[j].classList.toggle("hidden", !checked);
    }
    updateURL();
}
function reversed_on_change() {
    pinout.classList.toggle("underside-view", this.checked);
    state.reversed = this.checked;
    updateURL();
}

// Boof to a sensible default window size
// only tested on Windows 10...
// RIP 1024x768
window.resizeTo(1050, 830);

// Janky hack for iOS at least
if (window.innerWidth < 400) {
    for (var i = 0; i < inputs.length; i++) {
        if (inputs[i].type != "checkbox") continue;
        inputs[i].checked = false;
        inputs[i].onchange();
    }
}