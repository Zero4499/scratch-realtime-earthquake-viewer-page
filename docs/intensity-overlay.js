/**
 * 地震查看器 - 观测点震度实时显示
 * 直接集成到项目中，无需用户脚本
 */
(function() {
    'use strict';

    const CONFIG = {
        minIntensity: -10,
        showLabels: false,
        showIntensity: true,
        fontSize: 10,
        dotRadius: 4,
    };

    function getIntensityColor(val) {
        if (val >= 7) return '#ff0000';
        if (val >= 6) return '#ff6600';
        if (val >= 5) return '#ffcc00';
        if (val >= 4) return '#ffcc00';
        if (val >= 3) return '#ffff00';
        if (val >= 2) return '#00ff00';
        if (val >= 1) return '#00ffff';
        if (val >= 0) return '#6699ff';
        return 'rgba(100,150,200,0.7)';
    }

    // キャンバス作成
    const canvas = document.createElement('canvas');
    canvas.id = 'quake-intensity-overlay';
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:2147483647;';
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    // コントロールパネル
    const panel = document.createElement('div');
    panel.id = 'quake-intensity-panel';
    panel.style.cssText = 'position:fixed;top:10px;right:10px;background:rgba(20,20,30,0.92);color:white;padding:12px;border-radius:8px;font-family:sans-serif;font-size:12px;z-index:2147483647;pointer-events:auto;min-width:170px;box-shadow:0 2px 10px rgba(0,0,0,0.4);';
    panel.innerHTML = `
        <div style="font-weight:bold;margin-bottom:8px;font-size:13px;">📡 观测点震度</div>
        <label style="display:flex;align-items:center;gap:6px;margin:4px 0;cursor:pointer;">
            <input type="checkbox" id="qi-enabled" checked> 启用显示
        </label>
        <label style="display:flex;align-items:center;gap:6px;margin:4px 0;cursor:pointer;">
            <input type="checkbox" id="qi-show-int" checked> 显示震度值
        </label>
        <label style="display:flex;align-items:center;gap:6px;margin:4px 0;cursor:pointer;">
            <input type="checkbox" id="qi-show-names"> 显示观测点名
        </label>
        <div style="margin:6px 0;">
            <div style="margin-bottom:2px;">最小震度: <span id="qi-min-val">-10</span></div>
            <input type="range" id="qi-min-intensity" min="-10" max="7" step="0.5" value="-10" style="width:100%;">
        </div>
        <div style="margin-top:8px;padding-top:6px;border-top:1px solid #444;">
            <div>观测点数: <span id="qi-count">0</span></div>
        </div>
    `;
    document.body.appendChild(panel);

    document.getElementById('qi-enabled').addEventListener('change', function(e) {
        canvas.style.display = e.target.checked ? 'block' : 'none';
    });
    document.getElementById('qi-show-int').addEventListener('change', function(e) {
        CONFIG.showIntensity = e.target.checked;
    });
    document.getElementById('qi-show-names').addEventListener('change', function(e) {
        CONFIG.showLabels = e.target.checked;
    });
    document.getElementById('qi-min-intensity').addEventListener('input', function(e) {
        CONFIG.minIntensity = parseFloat(e.target.value);
        document.getElementById('qi-min-val').textContent = CONFIG.minIntensity;
    });

    function getScratchList(name) {
        try {
            const vm = window.vm;
            if (!vm) return null;
            const stage = vm.runtime.getTargetForStage();
            for (const [id, v] of Object.entries(stage.variables)) {
                if (v.type === 'list' && v.name === name) return v.value;
            }
        } catch(e) {}
        return null;
    }

    function draw() {
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
        const names = getScratchList('d ten:名前');

        if (!xs || !ys || !intensities) {
            requestAnimationFrame(draw);
            return;
        }

        const scaleX = canvas.width / stageW;
        const scaleY = canvas.height / stageH;
        let count = 0;

        for (let i = 0; i < xs.length; i++) {
            const xv = parseFloat(xs[i]);
            const yv = parseFloat(ys[i]);
            if (isNaN(xv) || isNaN(yv)) continue;

            let intVal = parseFloat(intensities[i]);
            if (isNaN(intVal)) intVal = parseFloat(intensities[i + 2]) || -3;
            if (intVal < CONFIG.minIntensity) continue;

            const stageX = (xv + 100) / 200 * stageW;
            const stageY = (100 - yv) / 200 * stageH;
            const px = stageX * scaleX;
            const py = stageY * scaleY;

            if (px < -20 || px > canvas.width + 20 || py < -20 || py > canvas.height + 20) continue;

            const color = getIntensityColor(intVal);
            ctx.beginPath();
            ctx.arc(px, py, CONFIG.dotRadius, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.5)';
            ctx.lineWidth = 1;
            ctx.stroke();

            if (CONFIG.showIntensity && intVal >= 1) {
                ctx.fillStyle = 'white';
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 2;
                ctx.font = 'bold ' + CONFIG.fontSize + 'px sans-serif';
                ctx.textAlign = 'center';
                const label = intVal >= 10 ? Math.floor(intVal / 10).toString() : intVal.toFixed(1);
                ctx.strokeText(label, px, py - CONFIG.dotRadius - 3);
                ctx.fillText(label, px, py - CONFIG.dotRadius - 3);
            }

            if (CONFIG.showLabels && names && names[i]) {
                ctx.fillStyle = 'rgba(255,255,255,0.8)';
                ctx.font = (CONFIG.fontSize - 1) + 'px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(names[i], px, py + CONFIG.dotRadius + 10);
            }

            count++;
        }

        document.getElementById('qi-count').textContent = count;
        requestAnimationFrame(draw);
    }

    function start() {
        if (window.vm) {
            console.log('[地震震度オーバーレイ] 開始');
            draw();
        } else {
            setTimeout(start, 500);
        }
    }

    // DOM準備完了後に開始
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }

})();
