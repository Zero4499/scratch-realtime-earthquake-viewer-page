/**
 * 地震查看器 - 观测点震度显示（简洁版）
 * 仅在震度>=1的观测点上显示数值，无控制面板
 */
(function() {
    'use strict';

    const canvas = document.createElement('canvas');
    canvas.id = 'quake-intensity-overlay';
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:100;';
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
            if (intVal < 1) continue;

            const px = (xv + 100) / 200 * stageW * scaleX;
            const py = (100 - yv) / 200 * stageH * scaleY;

            if (px < -20 || px > canvas.width + 20 || py < -20 || py > canvas.height + 20) continue;

            const color = getIntensityColor(intVal);
            if (!color) continue;

            // 震度値を表示
            ctx.fillStyle = color;
            ctx.strokeStyle = 'rgba(0,0,0,0.8)';
            ctx.lineWidth = 2;
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'center';
            const label = intVal >= 10 ? Math.floor(intVal / 10).toString() : intVal.toFixed(1);
            ctx.strokeText(label, px, py);
            ctx.fillText(label, px, py);
        }

        requestAnimationFrame(draw);
    }

    function start() {
        if (window.vm) {
            draw();
        } else {
            setTimeout(start, 500);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }

})();
