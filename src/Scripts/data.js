import {
    data,
    energyData
} from "/src/Scripts/config.js";

const SOURCENUM = 30; //29(包括)以下都是原料
const VERSION = "081"; //版本号，方便开发切换
let circleCount = 0;//循环表判断次数
let isDataLoaded = false; //游戏资源是否加载完毕
let hideSource = false; //是否隐藏原料
let selfAcc = true; //是否开启自增喷涂
let chemicalDouble = true; //科技升级化学工厂产量翻倍
let itemSetting = {}; //通过物品id保存增产信息及生产设备等物品信息
let formulaSetting = {}; //保存上次选择的默认配方
let config = {}; //保存页面参数
let projects = []; //保存方案
var ig_names = []; //排除的物品
var requireList = []; //需求列表
var icons = {}; //图标数据
var outTree = {}; //输出树
var inTree = {}; //输入树
var resultTree = []; //结果表
var circleList = {}; //循环表
var adjacencyList = {}; //邻接表
var decimalDigits = 1; //小数位数
var maxDeep = 0; //生产线最大深度

class progressBarControl {
    constructor(loadedContents = 0, totalContents = 6, str = "加载") {//默认需要加载6个
        this.loadedContents = loadedContents;
        this.totalContents = totalContents;
        this.loadingstr = "正在" + str + "中：";
        this.completestr = str + "完成";
        this.selfIncreaseCalled = false;
    }

    add() { this.contentLoaded(++this.loadedContents); }
    complete() { this.contentLoaded(this.loadedContents = this.totalContents); }
    reset() { this.contentLoaded(this.loadedContents = 0); }
    selfIncrease() {
        if (!this.selfIncreaseCalled) {
            $("#loadProgressBar").fadeIn();
            this.selfIncreaseCalled = true;

            let startProgress = 12;

            // 使用setInterval来逐渐增加进度
            let interval = setInterval(() => {
                if (this.loadedContents >= this.totalContents) {
                    clearInterval(interval);
                    this.complete();
                    return;
                }
                // 对数递增，使得进度在接近100%时增加得更慢
                startProgress += Math.log(100 - startProgress);
                this.loadedContents = (startProgress / 100) * this.totalContents;
                this.contentLoaded();
            }, 200); // 你可以根据需要调整时间间隔
        } else {
            this.complete();
        }
    }

    contentLoaded() {
        let progressBar = $('#loadProgressBar .progress-bar');
        let progress = (this.loadedContents / this.totalContents) * 100;
        if (progress < 12) progress = 12;
        progressBar.css("width", progress + "%").text(this.loadingstr + Math.round(progress) + "%");
        if (this.loadedContents === this.totalContents) {
            progressBar.css("width", progress + "%").text(this.completestr);
            setTimeout(() => { $("#loadProgressBar").fadeOut(); }, 1000);
        }
    }
};

$(function () {
    let progressBar = new progressBarControl();
    $.ajax({
        url: "src/assets/icon.json",
        dataType: "json",
        timeout: 100000,
        success: function (icon_data) {
            loadData("page_config");
            loadData("item_setting");
            loadData("formula_setting");
            loadData("projects_setting");
            progressBar.add();
            initData();
            progressBar.add();
            initIcons(icon_data);
            progressBar.add();
            projectsUpdate()
            progressBar.add();
            selorecalculator();
            updateDisplay();
            progressBar.add();
            isDataLoaded = true;
            window.ignoreThis = ignoreThis;
            window.changeAcc = changeAcc;
            window.changeMachine = changeMachine;
            window.changeFormula = changeFormula;
            window.showChangeFormula = showChangeFormula;
        },
        error: function () {
            alert("游戏资源加载失败，请刷新再试");
        },
    });
    initEventListener();
    progressBar.add();
});

function initData() { //初始化配方数据
    $(data).each(function (i, item) {
        let m_tmp = [];
        if (item.m == "科研设备") {
            m_tmp = [{ name: "矩阵研究站", speed: 1 }];
        } else if (item.m == "制造台") {
            m_tmp = [
                { name: "制造台", speed: 2 },
                { name: "天穹装配厂", speed: 40 },
            ];
        } else if (item.m == "电路蚀刻机") {
            m_tmp = [
                { name: "电路蚀刻机", speed: 2 },
                { name: "精密结构组装厂", speed: 40 },
            ];
        } else if (item.m == "高精度装配线") {
            m_tmp = [
                { name: "高精度装配线", speed: 2 },
                { name: "精密结构组装厂", speed: 40 },
            ];
        } else if (item.m == "精密制造厂") {
            m_tmp = [{ name: "精密制造厂", speed: 0.05 }];
        } else if (item.m == "冶炼设备") {
            m_tmp = [
                { name: "电弧熔炉", speed: 2 },
                { name: "位面熔炉", speed: 4 },
                { name: "物质裂解塔", speed: 40 },
            ];
        } else if (item.m == "矿物处理厂") {
            m_tmp = [
                { name: "矿物处理厂", speed: 2 },
                { name: "物质裂解塔", speed: 40 },
            ];
        } else if (item.m == "采矿机") {
            m_tmp = [
                { name: "采矿机", speed: 6 },
                { name: "大型采矿机", speed: 2 * 20 },
                { name: "矿脉", speed: 1 },
            ];
        } else if (item.m == "能量枢纽") {
            m_tmp = [{ name: "能量枢纽", speed: 1 }];
        } else if (item.m == "原油萃取站") {
            m_tmp = [{ name: "原油萃取站", speed: 2 }];
        } else if (item.m == "抽水设施") {
            m_tmp = [
                { name: "抽水机", speed: 1 },
                { name: "聚束液体汲取设施", speed: 5 },
            ];
        } else if (item.m == "精炼设备") {
            m_tmp = [
                { name: "精炼厂", speed: 2 + 2 * chemicalDouble },
                { name: "巨型化学反应釜", speed: 40 },
            ];
        } else if (item.m == "化工设备") {
            m_tmp = [
                { name: "化工厂", speed: 2 + 2 * chemicalDouble },
                { name: "巨型化学反应釜", speed: 40 },
            ];
        } else if (item.m == "先进化学反应釜") {
            m_tmp = [
                { name: "先进化学反应釜", speed: 2 + 2 * chemicalDouble },
                { name: "巨型化学反应釜", speed: 40 },
            ];
        } else if (item.m == "粒子对撞机") {
            m_tmp = [
                { name: "微型粒子对撞机", speed: 4 },
                { name: "巨型粒子对撞机", speed: 40 }
            ];
        } else if (item.m == "紧凑式回旋加速器") {
            m_tmp = [{ name: "紧凑式回旋加速器", speed: 0.1 }];
        } else if (item.m == "轨道采集器") {
            m_tmp = [{ name: "轨道采集器(巨冰)", speed: 1 }];
        } else if (item.m == "轨道采集器2") {
            m_tmp = [{ name: "轨道采集器(气态)", speed: 1 }];
        } else if (item.m == "轨道采集器3") {
            m_tmp = [{ name: "大气采集站", speed: 9 }];
        } else if (item.m == "射线接收站") {
            m_tmp = [{ name: "射线接收站", speed: 1 }];
        }
        item.machine = m_tmp;
        item.machineType = item.m;
        item.out = item.s;
        item.in = item.q;
        item.id = i;
        item.formula = {
            out: item.out,
            in: item.in,
            t: item.t
        };
        delete item.m;
        delete item.s;
        delete item.q;
        delete item.t;
        for (let j = 0; j < item.out.length; j++) {
            for (let k = 0; k < item.in.length; k++) {
                if (item.out[j].name == item.in[k].name) {
                    if (item.out[j].num > item.in[k].num) {
                        item.out[j].num -= item.in[k].num;
                        delete item.in[k];
                    } else {
                        item.in[k].num -= item.out[j].num;
                        delete item.out[j];
                    }
                }
            }
        }
    });
}
function initEventListener() { //初始化事件监听器
    $("#productionShow").on("click", () => {
        if (!isDataLoaded) {
            toastr.warning("游戏资源尚未加载完毕");
            return;
        }
        $("#UIselector").toggle();
    });

    $("#decimalDigits").on("change", () => {
        decimalDigits = $("#decimalDigits").val();
        config["decimalDigits"] = decimalDigits;
        saveData("page_config", config);
        if (reCountProductionNum()) reRequire();
        else updateDisplay();
    });

    $("#chemicalDoubl").on("change", () => {
        chemicalDouble = !chemicalDouble;
        $(data).each(function () {
            if (this.machine) {
                for (var i = 0; i < this.machine.length; i++) {
                    if (["精炼厂", "化工厂", "先进化学反应釜"].includes(this.machine[i].name)) {
                        this.machine[i].speed = 2 + 2 * chemicalDouble;
                    }
                }
            }
        });
        config["chemicalDoubl"] = chemicalDouble;
        saveData("page_config", config);
        if (reCountProductionNum()) reRequire();
        else {
            updateMachineNum();
            updateDisplay();
        }
    });

    $("#selfAcc").on("change", () => {
        selfAcc = !selfAcc;
        config["selfAcc"] = selfAcc;
        saveData("page_config", config);
        reRequire();
    });

    $("#speed1_7").on("change", () => { //大型采矿机开采速度
        $(data).each(function () {
            if (this.machine) {
                for (var i = 0; i < this.machine.length; i++) {
                    if (this.machine[i].name == "大型采矿机") {
                        this.machine[i].speed =
                            2 *
                            20 *
                            0.01 *
                            parseFloat($("#selore").val()) *
                            0.01 *
                            parseFloat($("#speed1_7").val());
                    }
                }
            }
        });
        config["speed1_7"] = $("#speed1_7").val();
        saveData("page_config", config);
        if (reCountProductionNum()) reRequire();
        else {
            updateMachineNum();
            updateDisplay();
        }
    });

    $("#selore").on("change", () => { //矿脉开采速度
        config["selore"] = $("#selore").val();
        selorecalculator();
        if (reCountProductionNum()) reRequire();
        else {
            updateMachineNum();
            updateDisplay();
        }
    });

    $("#btnSetting").on("click", () => {
        $("#btndefaultDevice").text("更改默认设备");
        $("#defaultDevice").hide();
        if ($("#MoreSetting").is(":visible")) {
            $("#btnSetting").text("参数设置");
            $("#MoreSetting").hide();
        } else {
            $("#btnSetting").text("收起设置");
            $("#MoreSetting").show();
        }

    });

    $("#btndefaultDevice").on("click", () => {
        $("#btnSetting").text("参数设置");
        $("#MoreSetting").hide();
        if ($("#defaultDevice").is(":visible")) {
            $("#btndefaultDevice").text("更改默认设备");
            $("#defaultDevice").hide();
        } else {
            $("#btndefaultDevice").text("收起设备设置");
            $("#defaultDevice").show();
        }
    });

    $("#oilSpeed").on("change", () => {
        $(data).each(function () {
            if (this.machine) {
                for (var i = 0; i < this.machine.length; i++) {
                    if (this.machine[i].name == "原油萃取站") {
                        this.machine[i].speed = Math.min(
                            2 * 0.01 * (parseFloat($("#oilSpeed").val()) * parseFloat($("#selore").val())),
                            240
                        );
                    }
                }
            }
        });
        config["oilSpeed"] = $("#oilSpeed").val();
        saveData("page_config", config);
        if (reCountProductionNum()) reRequire();
        else {
            updateMachineNum();
            updateDisplay();
        }
    });

    $(".speed1").on("change", () => {
        gascalculator();
        reRequire();
    });

    $("#btnReset1").on("click", () => { //重置默认参数
        let defaultconfig = {
            "speed1_1": "1",
            "speed1_2": "0.02",
            "speed1_3": "0.02",
            "speed2_1": "0.5",
            "speed2_2": "0.5",
            "speed2_3": "0.15",
            "speed3_1": "0.5",
            "speed3_2": "0.5",
            "speed3_3": "0.5",
            "speed3_4": "0.5",
            "selore": "100",
            "speed1_7": "100",
            "oilSpeed": "4",
            "decimalDigits": "1",
            "hideSource": false,
            "chemicalDoubl": true,
            "selfAcc": true,
        };
        for (let key in defaultconfig) {
            if (config.hasOwnProperty(key)) {
                let value = defaultconfig[key];
                let id = $("#" + key);

                if (key == "hideSource") {
                    $("#hideSource").prop("checked", value);
                    hideSource = value;
                } else if (key == "chemicalDoubl") {
                    $("#chemicalDoubl").prop("checked", value);
                    chemicalDouble = value;
                } else if (key == "selfAcc") {
                    $("#selfAcc").prop("checked", value);
                    selfAcc = value;
                } else if (key == "decimalDigits") {
                    id.val(value);
                    decimalDigits = value;
                } else {
                    id.val(value);
                }
                config[key] = defaultconfig[key];
            }
        }
        saveData("page_config", config);
        selorecalculator();
        reRequire();
    });

    $("#btnReset2").on("click", () => { //重置默认设备
        let defaultconfig = {
            "selmodein": "制造台",
            "circuitEtching": "电路蚀刻机",
            "highPrecision": "高精度装配线",
            "furnace": "电弧熔炉",
            "mineralProcess": "矿物处理厂",
            "pump": "抽水机",
            "refin": "精炼厂",
            "chemical": "化工厂",
            "advancchemical": "先进化学反应釜",
            "accelerator": "微型粒子对撞机",
            "accType": "增产剂",
            "accValue": "无",
        };
        for (let key in defaultconfig) {
            if (defaultconfig.hasOwnProperty(key)) {
                let value = defaultconfig[key];
                let id = $("#" + key);
                id.val(value);
                config[key] = defaultconfig[key];
            }
        }
        itemSetting = {};
        saveData("page_config", config);
        saveData("item_setting", itemSetting);
        reRequire();
    });

    $("#btnReset3").on("click", () => { //重置默认配方
        formulaSetting = {};
        saveData("formula_setting", formulaSetting);
        reRequire();
    });

    $("#btnReset4").on("click", () => { //删除某一方案
        var value = $("#selprojects").val();
        if (!value) {
            toastr.error("未选择方案");
            return;
        } else {
            if (value == "未保存任何方案") {
                toastr.error("没有方案可供删除");
                return;
            }
            for (var i = 0; i < projects.length; i++) {
                if (projects[i].name == value) {
                    projects.splice(i, 1);
                    saveData("projects_setting", projects);
                    projectsUpdate();
                    toastr.success(`方案${value}已删除`);
                    return;
                }
            }
        }
    });

    $("#btnReset5").on("click", () => { //删除所有方案
        if (projects.length) {
            $('#confirmModal').modal('show');
        } else {
            toastr.error("没有方案可供删除");
        }
    });

    $('#confirmDelete').on('click', () => { //确认删除所有方案
        $('#confirmModal').modal('hide');
        for (var i = 0; i < projects.length; i++) {
            toastr.success(`方案${projects[i].name}已删除`);
        }
        projects = [];
        saveData("projects_setting", projects);
        projectsUpdate();
    });

    $("#btnLoadProject").on("click", () => { //加载方案
        var value = $("#selprojects").val();
        if (!value) {
            toastr.error("未选择方案");
            return;
        } else {
            if (value == "未保存任何方案") {
                toastr.error("没有方案可供加载");
                return;
            }
            for (var i = 0; i < projects.length; i++) {
                if (projects[i].name == value) {
                    itemSetting = projects[i].itemSetting || {};
                    formulaSetting = projects[i].formulaSetting || {};
                    config = projects[i].config || {};
                    ig_names = projects[i].ig_names || [];
                    requireList = projects[i].requireList || [];
                    outTree = projects[i].outTree || {};
                    inTree = projects[i].inTree || {};
                    resultTree = projects[i].resultTree || [];
                    circleList = projects[i].circleList || {};
                    adjacencyList = projects[i].adjacencyList || {};
                    saveData("page_config", config);
                    saveData("item_setting", itemSetting);
                    saveData("formula_setting", formulaSetting);
                    for (let page_key in config) {
                        if (config.hasOwnProperty(page_key)) {
                            let value = config[page_key];
                            let id = $("#" + page_key);
                            if (page_key == "hideSource") {
                                $("#hideSource").prop("checked", value);
                                hideSource = value;;
                            }
                            else if (page_key == "chemicalDoubl") $("#chemicalDoubl").prop("checked", value);
                            else if (page_key == "selfAcc") $("#selfAcc").prop("checked", value);
                            else {
                                id.val(value);
                            }
                        }
                    }
                    reRequire();
                    updateDisplay();
                    return;
                }
            }
        }
    });

    $("#showInputProjectName").on("click", () => { //保存方案确认面板
        if (requireList.length) {
            $('#inputProjectName').modal('show');
        } else {
            toastr.error("需求列表为空，无法保存方案");
        }
    });

    $("#btnSaveProject").on("click", () => { //保存方案
        let projectNew = {};
        projectNew.name = $("#projectName").val();
        if (!projectNew.name) {
            toastr.error("方案名不能为空");
            return;
        }
        projectNew.itemSetting = itemSetting || {};
        projectNew.formulaSetting = formulaSetting || {};
        projectNew.config = config || {};
        projectNew.ig_names = ig_names || [];
        projectNew.requireList = requireList || [];
        projectNew.outTree = outTree || {};
        projectNew.inTree = inTree || {};
        projectNew.resultTree = resultTree || [];
        projectNew.circleList = circleList || {};
        projectNew.adjacencyList = adjacencyList || {};
        projectNew = $.extend(true, {}, projectNew);
        projects.push(projectNew);
        saveData("projects_setting", projects);
        projectsUpdate();//发现还是直接算方便，前面的懒得改了
        $('#inputProjectName').modal('hide');
        toastr.success(`方案${projectNew.name}已保存`);
    });

    $(".changedefultmachine").on("change", function (event) { //更改默认设备
        $(resultTree).each(function () {
            if (!(itemSetting[this.id] && itemSetting[this.id].defaultMachine)) {
                if (this.machineType == "制造台") {
                    this.defaultMachine = $("#selmodein").val();
                } else if (this.machineType == "电路蚀刻机") {
                    this.defaultMachine = $("#circuitEtching").val();
                } else if (this.machineType == "高精度装配线") {
                    this.defaultMachine = $("#highPrecision").val();
                } else if (this.machineType == "冶炼设备") {
                    this.defaultMachine = $("#furnace").val();
                } else if (this.machineType == "矿物处理厂") {
                    this.defaultMachine = $("#mineralProcess").val();
                } else if (this.machineType == "抽水设施") {
                    this.defaultMachine = $("#pump").val();
                } else if (this.machineType == "精炼设备") {
                    this.defaultMachine = $("#refin").val();
                } else if (this.machineType == "化工设备") {
                    this.defaultMachine = $("#chemical").val();
                } else if (this.machineType == "先进化学反应釜") {
                    this.defaultMachine = $("#advancchemical").val();
                } else if (this.machineType == "粒子对撞机") {
                    this.defaultMachine = $("#accelerator").val();
                }
            }
        });
        let changedElementId = event.target.id;
        if (config.hasOwnProperty(changedElementId)) {
            config[changedElementId] = $(`#${changedElementId}`).val();;
        }
        saveData("page_config", config);
        if (reCountProductionNum()) reRequire();
        else {
            updateMachineNum();
            updateDisplay();
        }
    });

    $("#accType").on("change", () => {
        config["accType"] = $("#accType").val() || "增产剂";
        saveData("page_config", config);
        reRequire();
    });

    $("#accValue").on("change", () => {
        config["accValue"] = $("#accValue").val() || "无";
        saveData("page_config", config);
        reRequire();
    });

    $("#hideSource").on("change", () => {
        hideSource = !hideSource;
        config["hideSource"] = hideSource;
        //config["hideSource"] = $("#hideSource").prop("checked");
        saveData("page_config", config);
        reRequire();
    });

    $(document).on("contextmenu", function (e) {
        if ($(e.target).closest("#require").length) {
            e.preventDefault();
            toastr.success($(e.target).closest('[title]').attr('title') + "已从需求列表移除");
            var itemKeyValue = $(e.target).closest('[title]').attr('itemkey');
            requireList.splice(itemKeyValue, 1);
            reRequire();
            return;
        }
        if ($(e.target).closest("#ignore").length) {
            e.preventDefault();
            toastr.success($(e.target).closest('[title]').attr('title') + "已从排除列表移除");
            var itemKeyValue = $(e.target).closest('[title]').attr('itemkey');
            ig_names.splice(itemKeyValue, 1);
            reRequire();
            return;
        }
    });
}
function initIcons(icon_data) { //初始化图标
    function toggleSelected(imgIndex) {
        jicons.forEach((jicon, index) => {
            jicon.toggleClass("icons-selected", index === imgIndex);
        });
        jimgs.forEach((jimg, index) => {
            jimg.toggleClass("selected", index === imgIndex);
        });
    }

    function addIcons(jicons, icons) {
        jicons.width(w).height(h);
        for (var i = 0; i < 7; i++) {
            var jrow = $("<div class='iconrow'></div>").appendTo(jicons);
            for (var j = 0; j < 17; j++) {
                var jicon = $("<div class='icon'><div class='s'></div></div>").appendTo(
                    jrow
                );
                jicon.on("click", function () {
                    var name = $(this).attr("data-name");
                    if (!name) return;
                    $("#UIselector").hide();
                    addRequire(name);
                });
            }
        }
        for (var i = 0; i < icons.length; i++) {
            var icon = icons[i];
            var reg = /^(\d)-(\d{1,2})-(.*)+/;
            var x = null;
            if (reg.test(icon.name)) {
                x = icon.name.match(reg);
            }
            if (x) {
                jicons
                    .find(">.iconrow:eq(" + (parseInt(x[1]) - 1) + ")")
                    .find(">.icon:eq(" + (parseInt(x[2]) - 1) + ")")
                    .html("")
                    .append("<img src='data:image/png;base64," + icon.value + "' />")
                    .attr("data-name", x[3])
                    .attr("title", x[3]);
            }
        }
    }

    let reg = /^(\d)-(\d{1,2})-(.*)+/;
    let i = 1; //从icons1开始
    while (icon_data[`icons${i}`]) {
        let currentIcons = icon_data[`icons${i}`];
        for (let j = 0; j < currentIcons.length; j++) {
            let icon = currentIcons[j];
            if (reg.test(icon.name)) {
                var x = icon.name.match(reg);
                icons[x[3]] = icon.value;
            } else {
                icons[icon.name] = icon.value;
            }
        }
        i++;
    }

    $("#UIselector").html(
        '<div id="selector" class="selector" style="width: ' +
        w +
        "px; height: " +
        h +
        'px"><div id="tabs"></div></div>'
    ).hide();

    var w = 680;
    var h = 300;
    let jimg1 = $("<div class='tab selected'><img src='src/assets/img/component-icon.png'/></div>").appendTo("#tabs");
    let jimg2 = $("<div class='tab'><img src='src/assets/img/factory-icon.png'/></div>").appendTo("#tabs");
    let jimg3 = $("<div class='tab'><img src='src/assets/img/refin-icon.png'/></div>").appendTo("#tabs");
    let jimg4 = $("<div class='tab'><img src='src/assets/img/chemical-icon.png'/></div>").appendTo("#tabs");
    let jimg5 = $("<div class='tab'><img src='src/assets/img/computer-icon.png'/></div>").appendTo("#tabs");
    let jicons1 = $('<div class="icons icons-selected"></div>').appendTo("#selector");
    let jicons2 = $('<div class="icons"></div>').appendTo("#selector");
    let jicons3 = $('<div class="icons"></div>').appendTo("#selector");
    let jicons4 = $('<div class="icons"></div>').appendTo("#selector");
    let jicons5 = $('<div class="icons"></div>').appendTo("#selector");
    addIcons(jicons1, icon_data.icons1);
    addIcons(jicons2, icon_data.icons2);
    addIcons(jicons3, icon_data.icons3);
    addIcons(jicons4, icon_data.icons4);
    addIcons(jicons5, icon_data.icons5);
    const jicons = [jicons1, jicons2, jicons3, jicons4, jicons5];
    const jimgs = [jimg1, jimg2, jimg3, jimg4, jimg5];
    jimgs.forEach((jimg, index) => {
        jimg.on("click", () => {
            toggleSelected(index);
        });
    });

    $(document).on("click", function (e) {
        if ((!$(e.target).closest("#UIselector").length) && (e.target.id != "productionShow")) {
            $("#UIselector").hide();
        }
    });
}
function saveData(key, value) { //保存数据到浏览器
    key += VERSION;
    value = JSON.stringify(value);
    if (window.localStorage) {
        localStorage.setItem(key, value);
    } else {
        $.cookie(key, value);
    }
}
function loadData(key) { //读取数据
    //debugger;
    let json = window.localStorage ? localStorage.getItem(key + VERSION) : $.cookie(key + VERSION);
    if (json) {
        if (key == "item_setting") itemSetting = JSON.parse(json);
        if (key == "formula_setting") formulaSetting = JSON.parse(json);
        if (key == "projects_setting") projects = JSON.parse(json);
        if (key == "page_config") {
            config = JSON.parse(json);
            let defaultconfig = {
                "speed1_1": "1",
                "speed1_2": "0.02",
                "speed1_3": "0.02",
                "speed2_1": "0.5",
                "speed2_2": "0.5",
                "speed2_3": "0.15",
                "speed3_1": "0.5",
                "speed3_2": "0.5",
                "speed3_3": "0.5",
                "speed3_4": "0.5",
                "selore": "100",
                "speed1_7": "100",
                "oilSpeed": "4",
                "decimalDigits": "1",
                "hideSource": false,
                "chemicalDoubl": true,
                "selfAcc": true,
                "selmodein": "制造台",
                "circuitEtching": "电路蚀刻机",
                "highPrecision": "高精度装配线",
                "furnace": "电弧熔炉",
                "mineralProcess": "矿物处理厂",
                "pump": "抽水机",
                "refin": "精炼厂",
                "chemical": "化工厂",
                "advancchemical": "先进化学反应釜",
                "accelerator": "微型粒子对撞机",
                "accType": "增产剂",
                "accValue": "无",
            }
            for (let key in defaultconfig) {
                if (!config.hasOwnProperty(key)) {
                    config[key] = defaultconfig[key];
                }
            }
            for (let page_key in config) {
                if (config.hasOwnProperty(page_key)) {
                    let value = config[page_key];
                    let id = $("#" + page_key);
                    if (page_key == "hideSource") {
                        $("#hideSource").prop("checked", value);
                        hideSource = value;
                    } else if (page_key == "chemicalDoubl") {
                        $("#chemicalDoubl").prop("checked", value);
                        chemicalDouble = value;
                    } else if (page_key == "selfAcc") {
                        $("#selfAcc").prop("checked", value);
                        selfAcc = value;
                    } else if (page_key == "decimalDigits") {
                        id.val(value)
                        decimalDigits = value;
                    } else {
                        id.val(value);
                    }
                }
            }
        }
    }
}
function findFormula(name) { //根据名字读取默认配方，并返回处理后的数据
    function get(item) { //把需求数量和名字拷贝到外层
        for (let j = 0; j < item.out.length; j++) {
            if (item.out[j].name == name) {
                let o = $.extend(true, {}, item);
                $.extend(o, item.formula.out[j]);
                return o;
            }
        }
    }
    let itemtmp = {};
    let formula = formulaSetting[name];
    if (formula) {
        itemtmp = get(data[parseInt(formula)]);
    } else {
        for (let i = 0; i < data.length; i++) {
            let item = data[i];
            let isfind = false;
            for (let j = 0; j < item.formula.out.length; j++) {
                if (item.formula.out[j].name == name) {
                    itemtmp = get(item);
                    isfind = true;
                    break;
                }
            }
            if (isfind) break;
        }
    }
    itemtmp.itemCycle = itemtmp.formula.t / itemtmp.n; //单个物品生产周期(秒)
    itemtmp.n = 0;
    itemtmp.parentNode = [];
    itemtmp.childNode = [];
    itemtmp.accType = "增产剂";
    if ($("#accType").val()) itemtmp.accType = $("#accType").val();
    if (itemSetting[itemtmp.id] && itemSetting[itemtmp.id].accType) itemtmp.accType = itemSetting[itemtmp.id].accType;
    itemtmp.accValue = "无";
    if ($("#accValue").val()) itemtmp.accValue = $("#accValue").val();
    if (itemSetting[itemtmp.id] && itemSetting[itemtmp.id].accValue) itemtmp.accValue = itemSetting[itemtmp.id].accValue;
    if (itemtmp.id < SOURCENUM) itemtmp.accValue = "无";
    if (itemtmp.accValue == "增产" && (itemtmp.noExtra || false)) itemtmp.accValue = "无";
    if (itemSetting[itemtmp.id] && itemSetting[itemtmp.id].defaultMachine) {
        itemtmp.defaultMachine = itemSetting[itemtmp.id].defaultMachine;
    } else if (itemtmp.machineType == "制造台") {
        itemtmp.defaultMachine = $("#selmodein").val();
    } else if (itemtmp.machineType == "电路蚀刻机") {
        itemtmp.defaultMachine = $("#circuitEtching").val();
    } else if (itemtmp.machineType == "高精度装配线") {
        itemtmp.defaultMachine = $("#highPrecision").val();
    } else if (itemtmp.machineType == "冶炼设备") {
        itemtmp.defaultMachine = $("#furnace").val();
    } else if (itemtmp.machineType == "矿物处理厂") {
        itemtmp.defaultMachine = $("#mineralProcess").val();
    } else if (itemtmp.machineType == "抽水设施") {
        itemtmp.defaultMachine = $("#pump").val();
    } else if (itemtmp.machineType == "精炼设备") {
        itemtmp.defaultMachine = $("#refin").val();
    } else if (itemtmp.machineType == "化工设备") {
        itemtmp.defaultMachine = $("#chemical").val();
    } else if (itemtmp.machineType == "先进化学反应釜") {
        itemtmp.defaultMachine = $("#advancchemical").val();
    } else if (itemtmp.machineType == "粒子对撞机") {
        itemtmp.defaultMachine = $("#accelerator").val();
    } else {
        itemtmp.defaultMachine = itemtmp.machine[0].name;
    }
    delete itemtmp.t;
    return itemtmp;
}
function findAllFormula(name) { //根据名字读取所有配方
    let itemtmp = [];
    for (let i = 0; i < data.length; i++) {
        let item = data[i];
        for (let j = 0; j < item.formula.out.length; j++) {
            if (item.formula.out[j].name == name) {
                let o = $.extend(true, {}, item);
                $.extend(o, item.formula.out[j]);
                o.n = 0
                itemtmp.push(o);

            }
        }
    }
    return itemtmp;
}
function projectsUpdate() { //更新方案
    $("#selprojects").empty();
    if (projects.length == 0) {
        $("#selprojects").append(
            "<option>未保存任何方案</option>"
        );
    } else {
        $(projects).each(function () {
            $("#selprojects").append(
                "<option value='" + this.name + "'>" + this.name + "</option>"
            );
        });
    }
}
function selorecalculator() { //矿脉开采速度更新
    $(data).each(function () {
        if (this.machine) {
            for (var i = 0; i < this.machine.length; i++) {
                if (this.machine[i].name == "矿脉") {
                    this.machine[i].speed = Math.min(
                        1 * 0.01 * parseFloat($("#selore").val()),
                        240
                    );
                }
                if (this.machine[i].name == "采矿机") {
                    this.machine[i].speed = Math.min(
                        6 * 0.01 * parseFloat($("#selore").val()),
                        240
                    );
                }
                if (this.machine[i].name == "大型采矿机") {
                    this.machine[i].speed =
                        2 *
                        20 *
                        0.01 *
                        parseFloat($("#selore").val()) *
                        0.01 *
                        parseFloat($("#speed1_7").val());
                }
                if (this.machine[i].name == "抽水机") {
                    this.machine[i].speed = Math.min(
                        0.01 * parseFloat($("#selore").val()),
                        144
                    );
                }
                if (this.machine[i].name == "聚束液体汲取设施") {
                    this.machine[i].speed = Math.min(
                        5 * 0.01 * parseFloat($("#selore").val()),
                        144
                    );
                }
                if (this.machine[i].name == "原油萃取站") {
                    this.machine[i].speed = Math.min(
                        2 * 0.01 * (parseFloat($("#oilSpeed").val()) * parseFloat($("#selore").val())),
                        240
                    );
                }
            }
        }
    });
    config["selore"] = $("#selore").val();
    saveData("page_config", config);
    gascalculator();
}
function gascalculator() { //气态资源开采速度更新
    let speed1_1 = parseFloat($("#speed1_1").val()); //氢(气态)
    let speed1_2 = parseFloat($("#speed1_2").val()); //重氢
    let speed1_3 = parseFloat($("#speed1_3").val()); //氦
    let speed2_1 = parseFloat($("#speed2_1").val()); //氢(巨冰)
    let speed2_2 = parseFloat($("#speed2_2").val()); //可燃冰
    let speed2_3 = parseFloat($("#speed2_3").val()); //氨
    let speed3_1 = parseFloat($("#speed3_1").val()); //氮
    let speed3_2 = parseFloat($("#speed3_2").val()); //氧
    let speed3_3 = parseFloat($("#speed3_3").val()); //一氧化碳
    let speed3_4 = parseFloat($("#speed3_4").val()); //二氧化碳
    let selore = parseFloat($("#selore").val());
    config["speed1_1"] = $("#speed1_1").val();
    config["speed1_2"] = $("#speed1_2").val();
    config["speed1_3"] = $("#speed1_3").val();
    config["speed2_1"] = $("#speed2_1").val();
    config["speed2_2"] = $("#speed2_2").val();
    config["speed2_3"] = $("#speed2_3").val();
    config["speed3_1"] = $("#speed3_1").val();
    config["speed3_2"] = $("#speed3_2").val();
    config["speed3_3"] = $("#speed3_3").val();
    config["speed3_4"] = $("#speed3_4").val();
    saveData("page_config", config);
    function getRealSpeed(value1, value2, value3, p1, p2, p3) { //计算实际的产出速率(s)
        var sum = 0;
        sum = value1 * 0.01 * selore * 8;
        var per = (value1) / (value1 * p1 + value2 * p2 + value3 * p3);
        sum -= (30 * per);
        return sum;
    }
    $(data).each(function () {
        if (this.id >= SOURCENUM) return false;
        if (
            this.out && [
                "氢", "重氢", "氦", "可燃冰",
                "氨", "氮", "氧", "一氧化碳", "二氧化碳"
            ].includes(this.out[0].name)
        ) {
            if (this.machine) {
                for (var i = 0; i < this.machine.length; i++) {
                    if (this.machine[i].name == "轨道采集器(气态)") {
                        if (this.out[0].name == "氢") {
                            this.machine[i].speed = getRealSpeed(speed1_1, speed1_2, speed1_3, 9, 400, 0);
                        } else if (this.out[0].name == "重氢") {
                            this.machine[i].speed = getRealSpeed(speed1_2, speed1_1, speed1_3, 400, 9, 0);
                        } else if (this.out[0].name == "氦") {
                            this.machine[i].speed = (speed1_3 * 0.01 * selore * 8);
                        }
                    }
                    if (this.machine[i].name == "轨道采集器(巨冰)") {
                        if (this.out[0].name == "氢") {
                            this.machine[i].speed = getRealSpeed(speed2_1, speed2_2, speed2_3, 9, 4.8, 6);
                        } else if (this.out[0].name == "可燃冰") {
                            this.machine[i].speed = getRealSpeed(speed2_2, speed2_1, speed2_3, 4.8, 9, 6);
                        } else if (this.out[0].name == "氨") {
                            this.machine[i].speed = getRealSpeed(speed2_3, speed2_1, speed2_2, 6, 9, 4.8);
                        }
                    }
                    if (this.machine[i].name == "大气采集站") {
                        if (this.out[0].name == "氮") {
                            this.machine[i].speed = speed3_1 * 9;
                        } else if (this.out[0].name == "氧") {
                            this.machine[i].speed = speed3_2 * 9;
                        } else if (this.out[0].name == "一氧化碳") {
                            this.machine[i].speed = speed3_3 * 9;
                        } else if (this.out[0].name == "二氧化碳") {
                            this.machine[i].speed = speed3_4 * 9;
                        }
                    }
                }
            }
        }
    });
}
function reCountProductionNum() { //重新计算产出数量
    let flag = 0;
    for (let i = 0; i < requireList.length; i++) {
        if (requireList[i].machineNum) {
            requireList[i].num = 0;
            flag = 1;
        }
    }
    if (flag) return true;
    return false;
}
function addRequire(requireName) { //添加需求
    let requireNum = $("#machineNum")[0].valueAsNumber
    if (requireNum) {
        if ($("#requireNum")[0].valueAsNumber) {
            toastr.error("请勿同时输入需求数量和设备数量");
            return;
        }
        if (requireNum < 0) {
            toastr.error("设备数量不能为负数");
            return;
        }
        updateDisplay();
        requireList.push({
            name: requireName,
            num: 0,
            machineNum: requireNum,
        });

    } else {
        requireNum = $("#requireNum")[0].valueAsNumber
        if (!requireNum) {
            toastr.error("请输入需求数量或设备数量");
            return;
        }
        if (requireNum < 0) {
            toastr.error("需求数量不能为负数");
            return;
        }
        updateDisplay();
        requireList.push({
            name: requireName,
            num: requireNum,
            machineNum: 0,
        });
    }
    reRequire();
}
function reRequire(outTree_again = {}) { //重新计算
    let progressBar = new progressBarControl(0, 5, "计算");
    progressBar.selfIncrease();
    maxDeep = 0;
    outTree = outTree_again;
    inTree = {};
    resultTree = [];
    circleList = {};
    adjacencyList = {};
    updateDisplay();
    if (!requireList.length) {
        progressBar.selfIncrease();
        return;
    }
    let AccRequireList = [];
    for (let i = 0; i < requireList.length; i++) {
        let item = findFormula(requireList[i].name);
        if (requireList[i].machineNum) {
            requireList[i].num = 0;
            let speed = 0;
            for (let j = 0; j < item.machine.length; j++) {
                if (item.machine[j].name == item.defaultMachine) {
                    speed = item.machine[j].speed;
                }
            }
            let accSpeed = item.accValue == "无" ? 1 : item.accValue == "增产" ? 1.25 : 2;
            requireList[i].num = requireList[i].machineNum * speed * accSpeed * 60 / item.itemCycle;
            item.n = requireList[i].num;
        } else {
            item.n = requireList[i].num;
        }
        if (["增产剂", "增产剂Mk.Ⅰ", "增产剂Mk.Ⅱ", "增产剂Mk.Ⅲ"].includes(requireList[i].name)) {
            AccRequireList.push(i);
            continue;
        }
        inTree[item.name] = item;
        coreCalculator(item);
    }
    processCircleTree();
    circleCount = 0;
    accCalculator();
    for (let i = 0; i < AccRequireList.length; i++) {
        if (requireList[AccRequireList[i]].machineNum) {
            accCalculator(requireList[AccRequireList[i]].num, true, requireList[AccRequireList[i]].machineNum);
        } else {
            accCalculator(requireList[AccRequireList[i]].num, false);
        }
    }
    //结果排序
    resultTreeSort();
    //处理输出结构
    processOutTree();
    for (let key of Object.keys(outTree)) {
        if (outTree[key].n < 0.01) delete outTree[key];
    }
    updateMachineNum();
    updateDisplay();
    progressBar.selfIncrease();
}
function coreCalculator(item) { //需求计算器
    if (ig_names.includes(item.name)) return;
    if (item.n <= 0) return;
    if (inTree[item.name]) {
        item.n = inTree[item.name].n;
        delete inTree[item.name];
    } else {
        return;
    }
    if (hideSource && item.id < SOURCENUM) return;
    if (outTree[item.name]) {
        if (outTree[item.name].n <= item.n) {
            item.n -= outTree[item.name].n;
            delete outTree[item.name];
        } else {
            outTree[item.name].n -= item.n;
            item.n = 0;
            return;
        }
    }
    for (let i = 0; i < item.out.length; i++) { //计算所有需求及产出数量
        if (item.out[i].name == item.name) {
            let mol = item.n / item.out[i].n;
            for (let j = 0; j < item.out.length; j++) {
                item.out[j].n *= mol;
            }
            let accSpeed = item.accValue == "增产" ? 0.8 : 1;
            mol *= accSpeed;
            for (let j = 0; j < item.in.length; j++) {
                item.in[j].n *= mol;
            }
        }
    }

    item.parentNode.push(item.in);
    item.childNode.push(item.out);

    function mergecircleList(item, isout) { //合并入循环表
        let itemtmp = $.extend(true, {}, item);
        if (circleList.hasOwnProperty(itemtmp.name)) {
            if (isout) itemtmp.n = -itemtmp.n;
            if (inTree.hasOwnProperty(itemtmp.name)) {
                itemtmp.n += inTree[itemtmp.name].n;
                delete inTree[itemtmp.name];
            }
            if (outTree.hasOwnProperty(itemtmp.name)) {
                itemtmp.n -= outTree[itemtmp.name].n;
                delete outTree[itemtmp.name];
            }
            circleList[itemtmp.name] += itemtmp.n;
            return true;
        }
        return false;
    }
    for (let i = 0; i < item.out.length; i++) {
        if (mergecircleList(item.out[i], true)) item.out.splice(i, 1);
    }
    for (let i = 0; i < item.in.length; i++) {
        if (mergecircleList(item.in[i], false)) item.in.splice(i, 1);
    }
    for (let i = 0; i < item.out.length; i++) {
        if (item.out[i].name == item.name) {
            for (let j = 0; j < item.in.length; j++) {
                if (findCircle(item.in[j].name, item.out[i].name, false)) {
                    circleList[item.in[j].name] = 0;
                    mergecircleList(item.in[j], false)
                    item.in.splice(j, 1);
                    j--;
                }
            }
        } else {
            for (let j = 0; j < item.in.length; j++) {
                if (findCircle(item.in[j].name, item.out[i].name, false)) {
                    circleList[item.out[i].name] = 0;
                    mergecircleList(item.out[i], true)
                    item.out.splice(i, 1);
                    i--;
                }
            }
        }
    }
    for (let i = 0; i < item.out.length; i++) { //加入输出树、邻接表
        if (item.out[i].name != item.name) {
            if ((!outTree[item.out[i].name])) {
                outTree[item.out[i].name] = findFormula(item.out[i].name);
            }
            outTree[item.out[i].name].n += item.out[i].n;
        }
        findCircle(item.id, item.out[i].name, true);
    }
    for (let i = 0; i < item.in.length; i++) { //加入输入树、邻接表
        if ((!inTree[item.in[i].name])) {
            inTree[item.in[i].name] = findFormula(item.in[i].name);
        }
        inTree[item.in[i].name].n += item.in[i].n;
        let tmp = true;
        for (let j = 0; j < inTree[item.in[i].name].childNode.length; j++) {
            if (inTree[item.in[i].name].childNode[j].name == item.in[i].name) {
                inTree[item.in[i].name].childNode[j].n += item.in[i].n;
                tmp = false;
            }
        }
        if (tmp) inTree[item.in[i].name].childNode.push(item.in[i]);
        findCircle(item.in[i].name, item.id, true);
    }
    item.machineNum = 0;
    resultTree.push(item);







    for (let i = 0; i < item.in.length; i++) { //递归
        let tmp = findFormula(item.in[i].name);
        tmp.n = item.in[i].n;
        coreCalculator(tmp);
    }
}
function findCircle(Node1, Node2, isStore) { //寻找循环、添加边
    let adjacencyList_bak = $.extend(true, {}, adjacencyList);
    if (!adjacencyList[Node1]) {
        adjacencyList[Node1] = [];
    }
    if (!adjacencyList[Node2]) {
        adjacencyList[Node2] = [];
    }
    if (adjacencyList[Node1].includes(Node2)) return false;
    adjacencyList[Node1].push(Node2);
    var result = topologicalSort();
    if (!isStore) adjacencyList = $.extend(true, {}, adjacencyList_bak);
    return !result;
}
function topologicalSort() { //拓扑排序
    let nodesWithZeroInDegree = []; //队列queue
    let inDegree = {};
    let result = [];
    let nodes = Object.keys(adjacencyList);
    for (let node of nodes) {
        if (!inDegree[node]) {
            inDegree[node] = 0;
        }
        for (let neighbor of adjacencyList[node]) {
            if (!inDegree[neighbor]) {
                inDegree[neighbor] = 0;
            }
            inDegree[neighbor]++;
        }
    }
    for (let node of nodes) {
        if (inDegree[node] === 0) {
            nodesWithZeroInDegree.push(node);
        }
    }
    while (nodesWithZeroInDegree.length) {
        let node = nodesWithZeroInDegree.shift();
        result.push(node);
        for (let neighbor of adjacencyList[node]) {
            inDegree[neighbor]--;
            if (inDegree[neighbor] === 0) {
                nodesWithZeroInDegree.push(neighbor);
            }
        }
    }
    if (result.length != nodes.length) {
        return false;
    }
    return true
}
function createElement(tag, attributes, ...children) { //创建元素
    const element = $('<' + tag + '>', attributes);
    element.append(...children);
    return element;
}
function requireListShow() { //显示需求列表
    const $requireListShowArea = $("#requireListShowArea");
    $requireListShowArea.empty();
    const closeButton = `<button type="button" class="btn btn-sm btn-my-close position-absolute top-0 end-0">×</button>`;
    $.each(requireList, function (index, item) {
        const imgCell = createElement('td', { colspan: '2', align: 'center' },
            createElement('img', { src: `data:image/png;base64,${icons[item.name]}`, style: 'width: auto; height: 30px;' })
        );
        const nameSpan = createElement('span', { class: 'text-center flex-column', text: item.name });
        const detailSpanText = !item.machineNum ? 'x' + item.num : item.machineNum + '台设备';
        const realNumText = (item.realNum) ? '实际输出' + item.realNum.toFixed(decimalDigits) : '';
        const detailSpan = createElement('span', {}, detailSpanText);
        const realNumSpan = createElement('td', { colspan: '2', align: 'center', class: 'p-0' }, realNumText);

        const table = createElement('table', { class: 'table-borderless table-sm' },
            createElement('tbody', {},
                createElement('tr', {}, imgCell),
                createElement('tr', {},
                    createElement('th', {}, nameSpan),
                    createElement('th', {}, detailSpan),
                ),
                createElement('tr', { class: 'p-0' }, realNumSpan)
            )
        );

        const card = createElement('div',
            { class: 'card position-relative m-2 p-1 d-inline-flex', id: 'require', itemkey: index, title: item.name },
            closeButton,
            table,
        );
        $requireListShowArea.append(card);
    });
    $('.btn-my-close').on('click', function (e) {
        if ($(e.target).closest("#require").length) {
            e.preventDefault();
            toastr.success($(e.target).closest('[title]').attr('title') + "已从需求列表移除");
            var itemKeyValue = $(e.target).closest('[title]').attr('itemkey');
            requireList.splice(itemKeyValue, 1);
            reRequire();
            return;
        }
    })
}
function igNamesShow() { //显示忽略列表
    $("#ignoreListShowArea").empty().append(
        ...ig_names.map((item, index) => {
            return `
                <div class="card position-relative m-2 p-1 d-inline-flex" title="${item}" id="ignore" itemkey="${index}">
                    <button type="button" class="btn btn-sm btn-my-close position-absolute top-0 end-0">×</button>
                    <div class="card-body text-center p-0">
                        <img src="data:image/png;base64,${icons[item]}" class="card-img-top" style="width: auto; height: 30px;">
                    </div>
                    <div class="card-footer text-center p-0">
                        ${item}
                    </div>
                </div>
            `;
        })
    );
    $('.btn-my-close').on('click', function (e) {
        if ($(e.target).closest("#ignore").length) {
            e.preventDefault();
            toastr.success($(e.target).closest('[title]').attr('title') + "已从排除列表移除");
            var itemKeyValue = $(e.target).closest('[title]').attr('itemkey');
            ig_names.splice(itemKeyValue, 1);
            reRequire();
            return;
        }
    })
}
function ignoreThis(e) { //Api：忽略此项
    let name = $(e).attr('ignorename');
    if (ig_names.includes(name)) {
        toastr.error("已在排除列表中");
        return;
    }
    ig_names.push(name);
    reRequire();
    toastr.success(name + "已加入排除列表");
}
function changeAcc(e) { //Api：改变加速
    let thisid = $(e).attr('thisid');
    if (itemSetting[resultTree[thisid].id] && itemSetting[resultTree[thisid].id].accValue) {
        itemSetting[resultTree[thisid].id].accValue = $(e).text().trim();
    } else {
        if (!itemSetting[resultTree[thisid].id]) itemSetting[resultTree[thisid].id] = {};
        itemSetting[resultTree[thisid].id].accValue = $(e).text().trim();
    }
    saveData("item_setting", itemSetting);
    reRequire();
}
function changeMachine(e) { //Api：改变设备
    var bsPopover = bootstrap.Popover.getInstance(e);
    if (bsPopover) {
        bsPopover.disable();
        bsPopover.dispose();
    }
    let thisid = $(e).attr('thisid');
    if (itemSetting[resultTree[thisid].id] && itemSetting[resultTree[thisid].id].defaultMachine) {
        itemSetting[resultTree[thisid].id].defaultMachine = $(e).text().trim();
    } else {
        if (!itemSetting[resultTree[thisid].id]) itemSetting[resultTree[thisid].id] = {};
        itemSetting[resultTree[thisid].id].defaultMachine = $(e).text().trim();
    }
    saveData("item_setting", itemSetting);
    reRequire();
}
function showChangeFormula(e) { //Api：显示配方窗口
    const formulaPopUp = new bootstrap.Modal(document.getElementById('changeformula'), {
        focus: true
    });
    $('#allformula').empty();
    const thisname = $(e).attr('thisname');
    const thisid = $(e).attr('thisid');
    let tagsToBeAdd = '';
    findAllFormula(thisname).forEach((item) => {
        tagsToBeAdd += formulaShow(item, thisid);
    });
    $('#allformula').append(tagsToBeAdd);
    [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]')).forEach(function (popoverTriggerEl) {
        if (!bootstrap.Popover.getInstance(popoverTriggerEl)) {
            new bootstrap.Popover(popoverTriggerEl);
        }
    });
    formulaPopUp.show();
}
function changeFormula(e) { //Api：改变配方
    const thisname = $(e).attr('thisname');
    const thisid = $(e).attr('thisid');
    formulaSetting[thisname] = thisid;
    saveData("formula_setting", formulaSetting);
    reRequire();
}
function updateMachineNum() { //更新设备数量
    for (let i = 0; i < resultTree.length; i++) {
        let item = resultTree[i];
        let machineSpeed = 0;
        item.machine = data[item.id].machine;
        for (let j = 0; j < item.machine.length; j++) {
            if (item.machine[j].name == item.defaultMachine) {
                machineSpeed = item.machine[j].speed;
            }
        }
        let accSpeed = item.accValue == "增产" ? 0.8 : item.accValue == "无" ? 1 : 0.5;
        item.machineNum = item.n * accSpeed * item.itemCycle / (machineSpeed * 60);
    }
}
function updateDisplay() { //更新显示
    for (let page_key in config) {
        if (config.hasOwnProperty(page_key)) {
            let value = config[page_key];
            let id = $("#" + page_key);
            if (page_key == "hideSource") {
                $("#hideSource").prop("checked", value);
                hideSource = value;
            } else if (page_key == "chemicalDoubl") {
                $("#chemicalDoubl").prop("checked", value);
                chemicalDouble = value;
            } else if (page_key == "selfAcc") {
                $("#selfAcc").prop("checked", value);
                selfAcc = value;
            } else {
                id.val(value);
            }
        }
    }
    if (requireList.length == 0) {
        $("#requireListShowArea").empty();
        $("#requireListArea").hide();
    } else {
        requireListShow();
        $("#requireListArea").show();
    }
    if (ig_names.length == 0) {
        $("#ignoreListShowArea").empty()
        $("#ignoreListArea").hide();
    } else {
        igNamesShow()
        $("#ignoreListArea").show();
    }
    if (resultTree.length == 0) {
        $('#resultTreeArea').empty().hide();
    } else {
        $("#showDeepArea").empty();
        //初始化滑动条
        $.fn.RangeSlider = function (cfg) {
            this.sliderCfg = {
                min: cfg && !isNaN(parseFloat(cfg.min)) ? Number(cfg.min) : null,
                max: cfg && !isNaN(parseFloat(cfg.max)) ? Number(cfg.max) : null,
                step: cfg && Number(cfg.step) ? cfg.step : 1,
                callback: cfg && cfg.callback ? cfg.callback : null
            };

            var $input = $(this);
            var min = this.sliderCfg.min;
            var max = this.sliderCfg.max;
            var step = this.sliderCfg.step;
            var callback = this.sliderCfg.callback;

            $input.attr('min', min)
                .attr('max', max)
                .attr('step', step)
                .attr('value', max);

            $input.bind("input", function () {
                $input.attr('value', this.value);
                var styleId = 'style-' + this.id;
                var styleElement = $("#" + styleId);
                if (styleElement.length === 0) {
                    styleElement = $("<style></style>").attr("id", styleId);
                    $("head").append(styleElement);
                }
                var gradient = `linear-gradient(to right, #0d6efd ${100 * this.value / this.max}%, white ${100 * this.value / this.max}%)`;
                var webkitStyle = `input[type='range']#${this.id}::-webkit-slider-runnable-track {background: ${gradient};}`;
                var mozillaStyle = `input[type='range']#${this.id}::-moz-range-track {background: ${gradient};}`;
                styleElement.text(webkitStyle + mozillaStyle);

                let position = (this.value - this.min) / (this.max - this.min) * 100;
                $('#showDeepTip').text(this.value).css('left', `calc(${position}%)`);

                if ($.isFunction(callback)) {
                    callback(this);
                }
            });
            $input.trigger('input');
        };
        $("#showDeepArea").append(`<label for="showDeep" class="form-label mx-2">拖动以调整产线的显示深度：</label>
            <div class="showDeepPosition"><input type="range" class="form-range mx-2" id="showDeep">
            <div id="showDeepTip">${maxDeep}</div></div>`);
        $('#showDeep').RangeSlider({ min: 0, max: maxDeep, step: 1, callback: resultsTreeShow });

        resultsTreeShow();
        $('#resultTreeArea').show();
    }
    if (requireList.length == 0 && ig_names.length == 0 && resultTree.length == 0) {
        $("#resultArea").hide();
    } else {
        $("#resultArea").show();
    }
    outTreeShow();
    showMachineStatistics();
    [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]')).forEach(function (popoverTriggerEl) {
        if (!bootstrap.Popover.getInstance(popoverTriggerEl)) {
            new bootstrap.Popover(popoverTriggerEl);
        }
    });




    // let outN = [];
    // for (let key of Object.keys(outTree)) {
    //     outN.push(key, outTree[key].n);
    // }
    // console.log("outN");
    // console.log(outN);
    // console.log("requireList");
    // console.log(requireList);
    // console.log("inTree");
    // console.log(inTree);
    console.log("outTree");
    console.log(outTree);
    // console.log("circleList");
    // console.log(circleList);
    // console.log("adjacencyList");
    // console.log(adjacencyList);
    // console.log("resultTree");
    // console.log(resultTree);
    // console.log("ig_names");
    // console.log(ig_names);
}
function resultsTreeShow() { //显示结果树
    function getIconSrc(name) {
        return `data:image/png;base64,${icons[name]}`;
    };

    $('#resultTreeArea').empty();

    let requireShowDeep = parseInt($("#showDeep").val()) + 1;
    let tagsToBeAdd = `<div class="card"><table class="table table-result table-bordered table-hover">
    <thead><tr><th>操作</th><th>物品</th><th>需求(/min)</th><th>设备数量</th>
    <th>配方（点击更换配方）</th><th>增产剂效果</th><th>使用设备</th></tr></thead>`;

    resultTree.forEach((item, index) => {
        if (item.deep < requireShowDeep) {
            tagsToBeAdd += `<tbody><tr>`;
            //第一列：排除
            tagsToBeAdd += `<td><a class="text-nowrap" href="javascript:void(0)" ignorename="${item.name}" onclick="ignoreThis(this)">排除</a></td>`;
            //第二列：物品
            tagsToBeAdd += `<td class="p-1"><div class="flex-column justify-content-center"><img src="${getIconSrc(item.name)}" style="width: auto; height: 30px;"/>
                <p class="text-nowrap">${item.name}</p></div></td>
            `;
            //第三列：需求
            tagsToBeAdd += `<td>${item.n.toFixed(decimalDigits)}</td>`;
            //第四列：设备数量
            {
                let iconName = item.defaultMachine === '矿脉' ? item.name : item.defaultMachine;
                if (iconName == '轨道采集器(气态)' || iconName == '轨道采集器(巨冰)') iconName = '轨道采集器';
                tagsToBeAdd += `<td>${item.machineNum.toFixed(decimalDigits)}<img src="${getIconSrc(iconName)}" style="width: auto; height: 17px;"></td>`;
            }
            //第五列：配方
            tagsToBeAdd += `<td>${formulaShow(item, -1)}</td>`;
            //第六列：增产剂效果
            tagsToBeAdd += `<td style="text-align: left;"><div class="d-inline-flex align-items-center">`;
            let accValueArray = [];
            if (item.id < SOURCENUM) {
                accValueArray = ['无'];
            } else if (item.noExtra) {
                accValueArray = ['无', '加速'];
            } else {
                accValueArray = ['无', '增产', '加速'];
            }
            accValueArray.forEach(thisAccValue => {
                const cardClass = item.accValue === thisAccValue ? 'bg-select text-light' : 'bg-secondary text-white-50';

                tagsToBeAdd += `<div>
                    <div class="card me-2 px-2 ${cardClass}" style="white-space: nowrap;" thisid="${index}" onclick="changeAcc(this)">
                    ${thisAccValue}</div></div>`;
            });
            tagsToBeAdd += `</div></td>`;
            //第七列：使用设备
            tagsToBeAdd += `<td style="text-align: left;"><div class="d-inline-flex align-items-center">`;
            item.machine.forEach(itemMachine => {
                const cardClass = item.defaultMachine === itemMachine.name ? 'bg-select text-light' : 'bg-secondary text-white-50';
                let iconName = itemMachine.name === '矿脉' ? item.name : itemMachine.name;
                if (iconName == '轨道采集器(气态)' || iconName == '轨道采集器(巨冰)') iconName = '轨道采集器';

                tagsToBeAdd += `<div class="card me-2 px-2 ${cardClass}">
                    <div style="white-space: nowrap;" title="速度：x${itemMachine.speed}" data-bs-toggle="popover" 
                    data-bs-placement="bottom" data-bs-trigger="hover" thisid="${index}" onclick="changeMachine(this)">
                    <img src="${getIconSrc(iconName)}" style="width: auto; height: 17px;"> ${itemMachine.name}</div></div>`;
            });
            tagsToBeAdd += `</div></td>`;
            //结束
            tagsToBeAdd += `</tr></tbody>`;
        }
    })
    tagsToBeAdd += `</table></div>`;
    $('#resultTreeArea').append(tagsToBeAdd);
    [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]')).forEach(function (popoverTriggerEl) {
        if (!bootstrap.Popover.getInstance(popoverTriggerEl)) {
            new bootstrap.Popover(popoverTriggerEl);
        }
    });
}
function formulaShow(item, itemid) { //显示配方
    function getIconSrc(name) {
        return `data:image/png;base64,${icons[name]}`;
    };
    let formulaInHTML = '';
    item.formula.in.forEach(formulain => {
        formulaInHTML += `
            <img src="${getIconSrc(formulain.name)}" style="width: 25px; height: auto;" title="${formulain.name}"
            data-bs-toggle="popover" data-bs-placement="bottom" data-bs-trigger="hover">
            <sub style="color: white;">${formulain.n}</sub>
        `;
    });
    let formulaOutHTML = '';
    item.formula.out.forEach(formulaout => {
        formulaOutHTML += `
            <img src="${getIconSrc(formulaout.name)}" style="width: 25px; height: auto;" title="${formulaout.name}"
            data-bs-toggle="popover" data-bs-placement="bottom" data-bs-trigger="hover">
            <sub style="color: white;">${formulaout.n}</sub>
        `;
    });
    const itemClass = (itemid == item.id) || (itemid == -1) ? 'bg-select' : 'bg-secondary';
    let itemClick = itemid > -1 ? 'onclick="changeFormula(this)" data-bs-dismiss="modal"' : 'onclick="showChangeFormula(this)"';
    const formulaNum = itemid > -1 ? 1 : findAllFormula(item.name).length;
    const formulaNumInp = formulaNum > 1 ? `<p class="text-secondary">共${findAllFormula(item.name).length}条配方</p>` : ``;
    return `
        <div class="flex-column" thisid="${item.id}" thisname="${item.name}" ${itemClick} style="display: flex;">
            <div class="card d-inline-flex flex-row flex-grow-1 ${itemClass} justify-content-start px-2 align-items-center" style="white-space: nowrap; min-height: 30px">
                ${formulaInHTML}
                ${item.formula.in.length ? '<span class="p-2"><img src="/src/assets/img/to.png"></span>' : ''}
                ${formulaOutHTML}
                <span class="px-2 align-self-end" style="color: white;">(${item.formula.t}s)</span>
            </div>
            ${formulaNumInp}
        </div>
    `;
}
function outTreeShow() { //显示输出树
    $("#outTreeShowArea").empty().append(
        Object.values(outTree).map(value => {
            return `
                <div class="card position-relative m-2 p-1 d-inline-flex"">
                    <div class="card-body text-center p-0">
                        <img src="data:image/png;base64,${icons[value.name]}" class="card-img-top" style="width: auto; height: 30px;">
                    </div>
                    <div class="card-footer text-center p-0">
                        ${value.name} x${value.n.toFixed(decimalDigits)}
                    </div>
                </div>
            `;
        })
    );
}
function processCircleTree() { //处理循环表
    circleCount++;
    //复制参数
    let resultTree_bak = resultTree;
    let circleList_bak = circleList;
    let circleList_jump_out_loop = $.extend(true, {}, circleList);
    let adjacencyList_bak = adjacencyList;
    let resultTree_tmp = [];
    let circleList_tmp = {};
    let adjacencyList_tmp = {};
    resultTree = [];
    circleList = {};
    adjacencyList = {};
    //处理循环表
    for (let key of Object.keys(circleList_bak)) {
        if (Math.abs(circleList_bak[key]) < 0.1) {
            delete circleList_bak[key];
            continue;
        }
        if (circleList_bak[key] < 0) {
            outTree[key] = findFormula(key);
            outTree[key].n = -circleList_bak[key];
            delete circleList_bak[key];
            continue;
        }
        if (circleList_bak[key] > 0) {
            let item = findFormula(key);
            item.n = circleList_bak[key];
            inTree[key] = item;
            delete circleList_bak[key];
            coreCalculator(item);
            resultTree_tmp = mergeArr(resultTree_tmp, resultTree);
            circleList_tmp = mergeCircleList(circleList_tmp, circleList);
            adjacencyList_tmp = mergeAdjacencyLists(adjacencyList_tmp, adjacencyList);
            resultTree = [];
            circleList = {};
            adjacencyList = {};
        }
    }
    resultTree = mergeArr(resultTree_tmp, resultTree_bak);
    circleList = mergeCircleList(circleList_tmp, {});
    adjacencyList = mergeAdjacencyLists(adjacencyList_bak, adjacencyList_tmp);
    //如果算完一遍所有缺口反而增加了，一定是有缺口循环，停止运算
    if (!compareCircleList(circleList_jump_out_loop, circleList_tmp)) {
        processCircleTree();
    }
}
function mergeArr(arg1, arg2) { //合并数组
    if (arg1 instanceof Array && arg2 instanceof Array) {
        //合并数组
        let arg1_bak = $.extend(true, [], arg1);
        let arg2_bak = $.extend(true, [], arg2);
        let arr1 = [];
        let arr2 = [];
        while (arg1.length) {
            let tmp = arg1.shift();
            for (let i = 0; i < arg1.length; i++) {
                if (arg1[i].name === tmp.name) {
                    if (arg1[i].id === tmp.id) {
                        tmp.n += arg1[i].n;
                        arg1.splice(i, 1);
                        i--;
                    } else {
                        let item = arg1.splice(i, 1)[0];
                        arg1.unshift(item);
                    }
                }
            }
            arr1.push(tmp);
        }
        while (arg2.length) {
            let tmp = arg2.shift();
            for (let i = 0; i < arg2.length; i++) {
                if (arg2[i].name === tmp.name) {
                    if (arg2[i].id === tmp.id) {
                        tmp.n += arg2[i].n;
                        arg2.splice(i, 1);
                        i--;
                    } else {
                        let item = arg2.splice(i, 1)[0];
                        arg2.unshift(item);
                    }
                }
            }
            arr2.push(tmp);
        }
        while (arr2.length) {
            let tmp = arr2.shift();
            let found = false;
            let equalNum = -1;
            for (let i = 0; i < arr1.length; i++) {
                if (arr1[i].name === tmp.name) {
                    if (arr1[i].id === tmp.id) {
                        arr1[i].n += tmp.n;
                        found = true;
                        break;
                    } else {
                        equalNum = i;
                    }
                }
            }
            if (!found) {
                if (equalNum !== -1) {
                    arr1.splice(equalNum + 1, 0, tmp);
                } else {
                    arr1.push(tmp);
                }
            }
        }
        arg1 = arg1_bak;
        arg2 = arg2_bak;
        return arr1;
    } else {
        throw new Error("两个参数都应该是数组。");
    }
}
function mergeAdjacencyLists(arg1, arg2) { //合并邻接表
    if (arg1 instanceof Object && arg2 instanceof Object) {
        let list1 = JSON.parse(JSON.stringify(arg1));
        let list2 = JSON.parse(JSON.stringify(arg2));
        for (let key in list2) {
            if (list1.hasOwnProperty(key)) {
                let mergedSet = new Set([...list1[key], ...list2[key]]);
                list1[key] = [...mergedSet];
            } else {
                list1[key] = list2[key];
            }
        }
        return list1;
    } else {
        throw new Error("两个参数都应该是对象。");
    }
}
function mergeCircleList(arg1, arg2) { //合并循环表
    const result = { ...arg1 };
    for (const key in arg2) {
        if (arg2.hasOwnProperty(key)) {
            if (result.hasOwnProperty(key)) {
                result[key] += arg2[key];
            } else {
                result[key] = arg2[key];
            }
        }
    }
    return result;
}
function compareCircleList(arg1, arg2) { //比较前后循环表
    let a = 0; //循环表中有多少个物品有缺口
    let b = 0; //循环表中有多少个物品的缺口增加了
    let keyArr = []; //循环表中有缺口增加的物品
    for (const key in arg2) {
        if (arg2.hasOwnProperty(key) && arg1.hasOwnProperty(key)) {
            if (arg2[key] > 0) {
                a++;
                if (arg2[key] >= arg1[key]) {
                    keyArr.push(key);
                    b++;
                }
            }
        }
    }
    if (a == b) {
        if (a != 0) toastr.error("计算出错！");
        keyArr.forEach(key => {
            toastr.error(`${key}经过${circleCount}轮生产后缺口增加了${Math.abs(arg2[key]) - Math.abs(arg1[key])}，其配方设置有误，请仔细检查是否有循环。`);
        });
        return true;
    }
    else return false;
}
function accCalculator(num = 0, isMachineNum = false, machineNum_tmp = 0) { //计算需求增产剂数量
    //计数增产剂
    let totalAccDemand = 0;
    if (num) {
        totalAccDemand = num;
    } else {
        for (let i = 0; i < resultTree.length; i++) {
            if (resultTree[i].accValue != "无") {
                for (let j = 0; j < resultTree[i].in.length; j++) {
                    totalAccDemand += resultTree[i].in[j].n;
                }
            }
        }
        if (selfAcc) totalAccDemand /= 75;
        else totalAccDemand = (totalAccDemand - requireList[0].num) / 60;
    }
    //复制所有的参数
    let requireList_bak = requireList;
    let resultTree_bak = resultTree;
    let adjacencyList_bak = adjacencyList;
    requireList = [];
    resultTree = [];
    circleList = {};
    adjacencyList = {};
    //计算增产剂数量
    requireList.push({ name: config["accType"], num: totalAccDemand, machineNum: machineNum_tmp });
    //计算
    let item = findFormula(requireList[0].name);
    item.n = requireList[0].num;
    inTree[item.name] = item;
    coreCalculator(item);
    //处理循环
    processCircleTree();
    circleCount = 0;
    //计数原料
    for (let i = 0; i < resultTree.length; i++) {
        if (resultTree[i].accValue != "无") {
            for (let j = 0; j < resultTree[i].in.length; j++) {
                totalAccDemand += resultTree[i].in[j].n;
            }
        }
    }
    if (selfAcc) totalAccDemand /= 75;
    else totalAccDemand = (totalAccDemand - requireList[0].num) / 60;
    //修正数量
    if (num && isMachineNum) {
        requireList[0].realNum = requireList[0].num - totalAccDemand;
        return;
    } else {
        let multiple = requireList[0].num / (requireList[0].num - totalAccDemand);
        for (let i = 0; i < resultTree.length; i++) {
            if (resultTree[i].accValue != "无") resultTree[i].n *= multiple;
        }
    }
    //并总表
    requireList = $.extend(true, [], requireList_bak);
    resultTree = mergeArr(resultTree_bak, resultTree);
    adjacencyList = mergeAdjacencyLists(adjacencyList_bak, adjacencyList);
}
function resultTreeSort() { //结果树排序
    let serialNumber = 0;
    for (let i = 0; i < requireList.length; i++) {
        let item = requireList[i];
        for (let j = 0; j < resultTree.length; j++) {
            if (resultTree[j].name == item.name) {
                if (!resultTree[j].hasOwnProperty('deep')) {
                    resultTree[j].deep = 0;
                    deepSort(j);
                    break;
                }
            }
        }
    }
    if (serialNumber != resultTree.length) {
        for (let i = serialNumber; i < resultTree.length; i++) {
            if (resultTree[i].name == "增产剂") {
                resultTree[i].deep = 0;
                deepSort(i);
                break;
            }
        }
    }
    for (let i = 0; i < resultTree.length; i++) {
        if (resultTree[i].n < 0.01) {
            resultTree.splice(i, 1);
            i--;
        }
    }
    function deepSort(index) {
        [resultTree[index], resultTree[serialNumber]] = [resultTree[serialNumber], resultTree[index]];
        let item = resultTree[serialNumber];
        serialNumber++;
        if (item.hasOwnProperty('in')) {
            for (let i = 0; i < item.formula.in.length; i++) {
                for (let j = serialNumber; j < resultTree.length; j++) {
                    if (resultTree[j].name == item.formula.in[i].name) {
                        if (!resultTree[j].hasOwnProperty('deep')) {
                            resultTree[j].deep = item.deep + 1;
                            maxDeep = Math.max(maxDeep, resultTree[j].deep);
                            deepSort(j);
                            break;
                        }
                    }
                }
            }
        }
    }
}
function processOutTree() { //处理输出结构
    let outTree_again = {};
    let outTreeKeys = Object.keys(outTree);
    for (let i = 0; i < outTreeKeys.length; i++) {
        for (let j = 0; j < resultTree.length; j++) {
            if (resultTree[j].name == outTreeKeys[i]) {
                if(resultTree[j].id < SOURCENUM) {
                    if(resultTree[j].n < outTree[outTreeKeys[i]].n) {
                        outTree[outTreeKeys[i]].n -= resultTree[j].n;
                        resultTree.splice(j, 1);
                        j--;
                        break;
                    }else{
                        resultTree[j].n -= outTree[outTreeKeys[i]].n;
                        delete outTree[outTreeKeys[i]];
                        break;
                    }
                }
                outTree_again[outTreeKeys[i]] = outTree[outTreeKeys[i]];
                break;
            }
        }
    }
    if (Object.keys(outTree_again).length == 0) return;
    else {
        reRequire(outTree_again);
    }
}
function showMachineStatistics() { //显示设备统计
    let machineStatistics = {};
    let totalEnergy = 0;
    for (let i = 0; i < resultTree.length; i++) {
        let item = resultTree[i];
        let machineName = item.defaultMachine;
        if (machineName == '矿脉') continue;
        if(machineName == '轨道采集器(气态)' || machineName == '轨道采集器(巨冰)') machineName = '轨道采集器';
        if (machineStatistics.hasOwnProperty(machineName)) {
            machineStatistics[machineName].n += Math.ceil(item.machineNum);
        } else {
            machineStatistics[machineName] = {n: Math.ceil(item.machineNum)};
        }
        totalEnergy += item.machineNum * (energyData[machineName] || 0);
    }
    let tagsToBeAdd = `<div class="d-inline-flex text-nowrap">设备统计：`;
    for (let key in machineStatistics) {
        console.log(key);
        tagsToBeAdd += `<img src="data:image/png;base64,${icons[key]}" style="width: auto; height: 17px;">${Math.ceil(machineStatistics[key].n)}`;
    }
    tagsToBeAdd += `<span class="mx-2">总计耗能：${totalEnergy}M</span></div>`;
    $('#machineStatisticsArea').empty().append(tagsToBeAdd);
}