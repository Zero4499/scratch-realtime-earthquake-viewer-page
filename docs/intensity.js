/**
 * 地震查看器 - 观测点震度显示
 * 由项目内部 ☁ eval 加载，非用户脚本
 * 与原项目设置联动：设置 -> 地震情报タブ -> 地図に表示する情報 -> 観測点の震度
 */
(function() {
    'use strict';

    const CONFIG_KEY = 'quake_intensity_config';
    let config = { enabled: true, minIntensity: 1 };
    try {
        const saved = localStorage.getItem(CONFIG_KEY);
        if (saved) config = Object.assign(config, JSON.parse(saved));
    } catch(e) {}

    function saveConfig() {
        try { localStorage.setItem(CONFIG_KEY, JSON.stringify(config)); } catch(e) {}
    }

    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:50;';
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    function getIntensityColor(val) {
        if (val >= 7) return '#ff0000';
        if (val >= 6) return '#ff6600';
        if (val >= 5) return '#ffcc00';
        if (val >= 4) return '#ffcc00';
        if (val >= 3) return '#ffff00';
        if (val >= 2) return '#00ff00';
        if (val >= 1) return '#00ffff';
        return null;
    }

    // Scratch变量格式是数组: [name, value] 或 [name, value, isCloud]
    function getScratchList(name) {
        try {
            const vm = window.vm;
            if (!vm) return null;
            const stage = vm.runtime.getTargetForStage();
            for (const [id, v] of Object.entries(stage.variables)) {
                if (Array.isArray(v) && v[0] === name && Array.isArray(v[1])) {
                    return v[1];
                }
            }
        } catch(e) {}
        return null;
    }

    // 检查原项目设置里是否选择了"観測点の震度"
    function checkSystemSetting() {
        try {
            const settings = getScratchList('7システム設定');
            if (!settings) return true; // 读不到就默认开启
            // 遍历设置，找包含"観測点"或"震度"的项
            for (let i = 0; i < settings.length; i++) {
                const s = String(settings[i]);
                if (s.includes('観測点') || s.includes('震度')) {
                    // 如果值是"観測点の震度"或包含震度相关，就开启
                    return true;
                }
            }
            // 如果设置里有"地図に表示"相关的项，检查它的值
            for (let i = 0; i < settings.length; i++) {
                const s = String(settings[i]);
                if (s.includes('地図に表示') || s.includes('表示する情報')) {
                    const next = settings[i + 1];
                    if (next && String(next).includes('観測点')) return true;
                }
            }
        } catch(e) {}
        return true; // 默认开启
    }

    let systemEnabled = true;
    let lastSettingCheck = 0;

    function draw() {
        const now = Date.now();
        if (now - lastSettingCheck > 2000) {
            systemEnabled = checkSystemSetting();
            lastSettingCheck = now;
        }

        if (!config.enabled || !systemEnabled) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            requestAnimationFrame(draw);
            return;
        }

        const vm = window.vm;
        if (!vm || !vm.runtime) {
            requestAnimationFrame(draw);
            return;
        }

        const stageW = vm.runtime.stageWidth;
        const stageH = vm.runtime.stageHeight;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const xs = getScratchList('dtc:Xpix');
        const ys = getScratchList('dtc:Ypix');
        const intensities = getScratchList('ten:震度100');

        if (!xs || !ys || !intensities) {
            requestAnimationFrame(draw);
            return;
        }

        const scaleX = canvas.width / stageW;
        const scaleY = canvas.height / stageH;

        for (let i = 0; i < xs.length; i++) {
            const xv = parseFloat(xs[i]);
            const yv = parseFloat(ys[i]);
            if (isNaN(xv) || isNaN(yv)) continue;

            let intVal = parseFloat(intensities[i]);
            if (isNaN(intVal)) intVal = parseFloat(intensities[i + 2]) || -3;
            if (intVal < config.minIntensity) continue;

            const px = (xv + 100) / 200 * stageW * scaleX;
            const py = (100 - yv) / 200 * stageH * scaleY;

            if (px < -20 || px > canvas.width + 20 || py < -20 || py > canvas.height + 20) continue;

            const color = getIntensityColor(intVal);
            if (!color) continue;

            ctx.fillStyle = color;
            ctx.strokeStyle = 'rgba(0,0,0,0.85)';
            ctx.lineWidth = 2.5;
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const label = intVal >= 10 ? Math.floor(intVal / 10).toString() : intVal.toFixed(1);
            ctx.strokeText(label, px, py);
            ctx.fillText(label, px, py);
        }

        requestAnimationFrame(draw);
    }

    // 快捷键：按 I 键开关
    document.addEventListener('keydown', function(e) {
        if (e.key === 'i' || e.key === 'I') {
            config.enabled = !config.enabled;
            saveConfig();
        }
    });

    window.QuakeIntensity = {
        setEnabled: function(v) { config.enabled = v; saveConfig(); },
        isEnabled: function() { return config.enabled; },
        setMinIntensity: function(v) { config.minIntensity = v; saveConfig(); }
    };

    function start() {
        if (window.vm) {
            draw();
        } else {
            setTimeout(start, 300);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }

})();
