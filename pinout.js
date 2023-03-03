'use strict';
var pinout = document.getElementById("pinout");
var inputs = document.getElementsByTagName("input");
var advanced = document.querySelectorAll(".advanced");
document.getElementById("nav").classList.remove("nojs");
for (var i = 0; i < inputs.length; i++) {
    if (inputs[i].type != "checkbox") continue;
    switch(inputs[i].name) {
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