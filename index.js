let content = document.getElementById("main-content");
let config_nav = document.getElementById("nav-to-configure");
let squat_nav = document.getElementById("nav-to-squat");
let bench_nav = document.getElementById("nav-to-bench");
let dead_nav = document.getElementById("nav-to-dead");
let calc_nav = document.getElementById("nav-to-calc");
let state_key = "PL-Weight-Helper-State"
function get_state() {
    let state = localStorage.getItem(state_key);
    return JSON.parse(state);
}

function set_state(state) {
    localStorage.setItem(state_key, JSON.stringify(state));
}

if (!get_state()) {
    localStorage.setItem(state_key, JSON.stringify({
        last_page: "configure",
        config: {
            last_saved: new Date().toISOString(),
            felt_heavy_increase: 2,
            felt_normal_increase: 4,
            felt_light_increase: 6,
            increase_increment: 2.5,
        },
        squat: {},
        bench: {},
        dead: {},
    }))
}

function navigate(where) {
    update_nav(where);
    switch (where) {
        case "configure": {
            return go_to_configure();
        }
        case "lb-to-kg": {
            return go_to_calc();
        }
        case "squat":
        case "bench":
        case "dead":
        {
            return go_to_lift(where);
        }
    }
}

function update_nav(which) {
    let cls = "current";
    let add;
    let navs = [
        config_nav,
        squat_nav,
        bench_nav,
        dead_nav,
        calc_nav,
    ];
    switch (which) {
        case "configure": {
            add = config_nav;
            break;
        }
        case "squat": {
            add = squat_nav;
            break;
        }
        case "bench": {
            add = bench_nav;
            break;
        }
        case "dead": {
            add = dead_nav;
            break;
        }
        case "lb-to-kg": {
            add = calc_nav;
        }
        default: console.log("unknown nav", which);
    }
    for (let ele of navs.filter(e => e !== add)) {
        ele.classList.remove(cls);
    }
    add.classList.add(cls);
}

function clear_main() {
    while (!!content.lastElementChild) {
        content.removeChild(content.lastElementChild);
    }
}

function go_to_configure() {
    let state = get_state();
    console.log("go_to_configure", state);
    let template = document.getElementById("configure-form");
    let clone = template.content.cloneNode(true).firstElementChild;
    let light_percent = clone.querySelector("#felt-light-increase");
    light_percent.value = state.config.felt_light_increase || 6;
    let norm_percent = clone.querySelector("#felt-normal-increase");
    norm_percent.value = state.config.felt_normal_increase || 4;
    let heavy_percent = clone.querySelector("#felt-heavy-increase");
    heavy_percent.value = state.config.felt_heavy_increase || 2;
    let increase_increment = clone.querySelector("#increase-increment");
    increase_increment.value = state.config.increase_increment || 2.5;
    clone.querySelector("#last-config-save").innerText = state.config.last_saved;
    clear_main();
    content.appendChild(clone);
    state.last_page = "configure";
    set_state(state);
}

function save_config() {
    let state = get_state();
    let form = document.getElementById("configuration")
    let data = new FormData(form);
    state.config.felt_light_increase = +data.get("felt-light-increase") || state.config.felt_light_increase || 6;
    state.config.felt_normal_increase = +data.get("felt-normal-increase") || state.config.felt_normal_increase || 4;
    state.config.felt_heavy_increase = +data.get("felt-heavy-increase") || state.config.felt_heavy_increase || 2;
    state.config.last_saved = new Date().toISOString();
    state.config.increase_increment = +data.get("increase-increment") || state.config.increase_increment || 2.5;
    form.querySelector("#last-config-save").innerText = state.config.last_saved;
    set_state(state);
}

function go_to_lift(which) {
    let state = get_state();
    let template = document.getElementById("lift-page");
    let clone = template.content.cloneNode(true).firstElementChild;
    update_lift_page(clone, which, state);
    clear_main();
    content.appendChild(clone);
    state.last_page = which;
    set_state(state);
}

function set_lb_value(page_element, selector, kg_value) {
    let span = page_element.querySelector(selector);
    kg_value = kg_value || 0;
    span.innerText = (kg_value * 2.2).toFixed(2) + "lbs";
}

function update_lift_page(page_element, which, state) {
    let sub_state = state[which];
    page_element.querySelector("#lift-name").innerText = which.substr(0,1).toUpperCase() + which.substr(1);
    handle_radios(page_element, "first", sub_state.first_felt || "normal");
    handle_radios(page_element, "second", sub_state.second_felt || "normal");
    let lifts = calculate_lifts(state.config, sub_state);
    let first_lift_input = page_element.querySelector("#first-lift-value")
    first_lift_input.value = lifts.first;
    set_lb_value(page_element, "#first-lbs", lifts.first);
    first_lift_input.setAttribute("step", state.config.increase_increment || 2.5);
    page_element.querySelector("#second-lift-value").value = lifts.second;
    set_lb_value(page_element, "#second-lbs", lifts.second);
    page_element.querySelector("#third-lift-value").value = lifts.third;
    set_lb_value(page_element, "#third-lbs", lifts.third);
}

function calculate_lifts(config, sub_state) {
    let first = increase_and_round(sub_state.first_lift_weight, 0, config.increase_increment);
    let second_increase = get_increase_percent(sub_state.first_felt, config);
    let second = increase_and_round(first, second_increase, config.increase_increment);
    let third_increase = get_increase_percent(sub_state.second_felt, config);
    let third = increase_and_round(second, third_increase, config.increase_increment);
    return {
        first,
        second,
        third,
    }
}

function update_lifts() {
    console.log("update_lifts");
    let first_form = new FormData(content.querySelector("#first-lift"))
    let first_value = +first_form.get("first-lift-value") || 0;
    let first_felt = first_form.get("first-felt");
    let second_form = new FormData(content.querySelector("#second-lift"));
    let second_felt = second_form.get("second-felt");
    console.log(second_felt);
    let state = get_state();
    let sub_state = state[state.last_page];
    sub_state.first_lift_weight = first_value;
    sub_state.first_felt = first_felt;
    sub_state.second_felt = second_felt;
    let page = content.querySelector("#lift");
    update_lift_page(page, state.last_page, state);
    set_state(state);
}

function get_increase_percent(felt, config) {
    switch (felt) {
        case "light": {
            return +(config.felt_light_increase / 100).toFixed(2);
        }
        case "heavy": {
            return +(config.felt_heavy_increase / 100).toFixed(2);
        }
        default: {
            return +(config.felt_normal_increase / 100).toFixed(2);
        }
    }
}

function increase_and_round(value, percent, nearest_increment) {
    let next = value * (1 + percent);
    let mod = next % nearest_increment
  	let round_point = nearest_increment / 2;
    let rounder
    if (mod >= round_point) {
        rounder = nearest_increment - mod
    } else {
        rounder = -mod
    }
    return next + rounder
}

function go_to_calc() {
    clear_main();
    let template = document.getElementById("calc-page");
    let clone = template.content.cloneNode(true).firstElementChild;
    content.appendChild(clone);
    update_calc(clone);
}

function update_calc(element) {
    element = element || content.querySelector("#calc-form");
    if (!element) {
        return console.error("no calc-form found");
    }
    let state = get_state();
    let input = element.querySelector("#calc-input");
    let lbs = +(input.value || "0") || 0; 
    let output = element.querySelector("#calc-output");
    output.value = increase_and_round(lbs / 2.2, 0, state.config.increase_increment)
}


/**
 * 
 * @param {HTMLDivElement} container 
 * @param {string} ele_prefix 
 * @param {string} selected 
 */
function handle_radios(container, ele_prefix, selected) {
    let attr = "checked";
    let light = container.querySelector(`#${ele_prefix}-felt-light`);
    let normal = container.querySelector(`#${ele_prefix}-felt-normal`);
    let heavy = container.querySelector(`#${ele_prefix}-felt-heavy`)
    switch (selected) {
        case "light": {
            light.setAttribute(attr, "");
            normal.removeAttribute(attr);
            heavy.removeAttribute(attr);
            return;
        }
        case "heavy": {
            light.removeAttribute(attr);
            normal.removeAttribute(attr);
            heavy.setAttribute(attr, "");
            return;
        }
        default: {
            light.removeAttribute(attr);
            normal.setAttribute(attr, "");
            heavy.removeAttribute(attr);
            return;
        }
    }
}

window.addEventListener("DOMContentLoaded", () => {
    navigate((get_state() || {}).last_page || "configure");
});
