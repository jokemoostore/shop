const STORAGE_KEY = 'wheel_codes';
        const CODE_HISTORY_KEY = 'wheel_code_history';
        const SPIN_HISTORY_KEY = 'wheel_spin_history';

        let isSpinning = false;
        let currentRotation = 0;
        let currentCode = null;
        
        const canvas = document.getElementById('wheel');
        const ctx = canvas.getContext('2d');
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = canvas.width / 2 - 5;

        const wheelColorPalette = ['#4CAF50','#8BC34A','#FFC107','#FF9800','#2196F3','#00BCD4','#f44336','#9C27B0','#3F51B5','#009688'];

        function normalizeExternalWheelRates(payload) {
            const source = Array.isArray(payload) ? payload : (payload && Array.isArray(payload.wheelRates) ? payload.wheelRates : []);
            return source.map(function(item, index) {
                const label = String((item && (item.label || item.name)) || ('รางวัล ' + (index + 1))).trim();
                return {
                    name: label || ('รางวัล ' + (index + 1)),
                    rate: Math.max(0, Number(item && item.rate) || 0),
                    color: String((item && item.color) || wheelColorPalette[index % wheelColorPalette.length])
                };
            }).filter(function(item) { return item.name; });
        }

        function applyExternalWheelSettings(payload) {
            const nextItems = normalizeExternalWheelRates(payload);
            if (!nextItems.length || isSpinning) return false;
            items.splice(0, items.length);
            nextItems.forEach(function(item) { items.push(item); });
            if (typeof drawWheel === 'function') drawWheel();
            if (typeof renderPrizesGrid === 'function') renderPrizesGrid();
            return true;
        }

        function applyWheelSettingsFromUrl() {
            try {
                const params = new URLSearchParams(window.location.search);
                const raw = params.get('jmWheelRates');
                if (!raw) return;
                applyExternalWheelSettings(JSON.parse(raw));
            } catch (error) {
                console.warn('wheel settings query ignored', error);
            }
        }

        window.addEventListener('message', function(event) {
            const data = event && event.data;
            if (!data || data.type !== 'JOKEMOO_WHEEL_SETTINGS') return;
            applyExternalWheelSettings(data.payload || data.settings || data.wheelRates || data);
        });

        function apiBase() {
            return (typeof window.WHEEL_API_BASE === 'string' && window.WHEEL_API_BASE.trim()) ? window.WHEEL_API_BASE.trim() : '';
        }

        function getCodes() {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        }

        function saveCodes(codes) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(codes));
        }

        function getCodeHistory() {
            const data = localStorage.getItem(CODE_HISTORY_KEY);
            return data ? JSON.parse(data) : [];
        }

        function saveCodeHistory(history) {
            localStorage.setItem(CODE_HISTORY_KEY, JSON.stringify(history));
        }

        function getSpinHistory() {
            const data = localStorage.getItem(SPIN_HISTORY_KEY);
            return data ? JSON.parse(data) : [];
        }

        function saveSpinHistory(history) {
            localStorage.setItem(SPIN_HISTORY_KEY, JSON.stringify(history));
        }

        function addCodeHistory(code, isValid, message) {
            const history = getCodeHistory();
            history.push({
                code: code,
                isValid: isValid,
                message: message,
                time: new Date().toISOString()
            });
            if (history.length > 50) history.shift();
            saveCodeHistory(history);
            renderCodeHistory();
        }

        function addSpinHistory(code, prize) {
            const history = getSpinHistory();
            history.push({
                code: code,
                prize: prize,
                time: new Date().toISOString()
            });
            if (history.length > 50) history.shift();
            saveSpinHistory(history);
            renderSpinHistory();
        }

        function renderCodeHistory() {
            const history = getCodeHistory();
            const container = document.getElementById('codeHistoryList');

            if (history.length === 0) {
                container.innerHTML = '<div class="empty-history">ยังไม่มีประวัติ</div>';
                return;
            }

            container.innerHTML = [...history].reverse().map(item => {
                const time = new Date(item.time).toLocaleString('th-TH', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                return `
                    <div class="code-history-item ${item.isValid ? '' : 'invalid'}">
                        <div>
                            <div class="code-text">${item.code}</div>
                            <div class="code-time">${time}</div>
                        </div>
                        <span class="code-status-badge">${item.isValid ? '✓ ใช้ได้' : '✗ ไม่ถูกต้อง'}</span>
                    </div>
                `;
            }).join('');
        }

        function renderSpinHistory() {
            const history = getSpinHistory();
            const container = document.getElementById('spinHistoryList');

            if (history.length === 0) {
                container.innerHTML = '<div class="empty-history">ยังไม่มีประวัติ</div>';
                return;
            }

            container.innerHTML = [...history].reverse().map(item => {
                const time = new Date(item.time).toLocaleString('th-TH', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                const isMiss = item.prize.toLowerCase().includes('miss');
                return `
                    <div class="history-item ${isMiss ? 'miss' : ''}">
                        <div>
                            <div class="prize-name">${item.prize}</div>
                            <div class="prize-time">${time} • ${item.code}</div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        function clearCodeHistory() {
            localStorage.removeItem(CODE_HISTORY_KEY);
            renderCodeHistory();
        }

        function clearSpinHistory() {
            localStorage.removeItem(SPIN_HISTORY_KEY);
            renderSpinHistory();
        }

        function verifyCode() {
            const input = document.getElementById('codeInput').value.trim().toUpperCase();
            const status = document.getElementById('codeStatus');
            const spinBtn = document.getElementById('spinBtn');
            const spinsInfo = document.getElementById('spinsInfo');
            const spinsValue = document.getElementById('spinsValue');

            if (!input) {
                status.textContent = '❌ กรุณากรอกโค้ด';
                status.className = 'code-status invalid';
                spinBtn.disabled = true;
                spinBtn.textContent = 'กรุณาใส่โค้ด';
                spinsInfo.classList.remove('show');
                currentCode = null;
                return;
            }

            if (apiBase()) {
                status.textContent = 'กำลังตรวจสอบ...';
                status.className = 'code-status valid';
                spinBtn.disabled = true;
                fetch(apiBase() + '?action=validate&code=' + encodeURIComponent(input))
                    .then(function(r) { return r.json(); })
                    .then(function(res) {
                        if (res.valid === true) {
                            status.textContent = '✅ โค้ดถูกต้อง! พร้อมหมุนวงล้อ';
                            status.className = 'code-status valid';
                            spinBtn.disabled = false;
                            spinBtn.textContent = 'หมุนเลย!';
                            spinsInfo.classList.add('show');
                            spinsValue.textContent = (res.spins || 0) + ' ครั้ง';
                            currentCode = input;
                            addCodeHistory(input, true, 'สิทธิ์ ' + (res.spins || 0) + ' ครั้ง');
                        } else {
                            var msg = res.error === 'not_found' ? 'ไม่พบโค้ดนี้ในระบบ' : res.error === 'expired' ? 'โค้ดหมดอายุแล้ว' : res.error === 'no_spins' ? 'โค้ดนี้ใช้สิทธิ์หมดแล้ว' : 'โค้ดไม่ถูกต้อง';
                            status.textContent = '❌ ' + msg;
                            status.className = 'code-status invalid';
                            spinBtn.disabled = true;
                            spinBtn.textContent = msg.indexOf('หมด') !== -1 ? 'หมดสิทธิ์แล้ว' : 'โค้ดไม่ถูกต้อง';
                            spinsInfo.classList.remove('show');
                            currentCode = null;
                            addCodeHistory(input, false, msg);
                        }
                    })
                    .catch(function() {
                        status.textContent = '❌ เชื่อมต่อ API ไม่ได้: เปิดจาก https:// (ไม่ใช่ file://) และตรวจสอบ Deploy Web App = Anyone';
                        status.className = 'code-status invalid';
                        spinBtn.disabled = true;
                        spinBtn.textContent = 'กรุณาใส่โค้ด';
                        spinsInfo.classList.remove('show');
                        currentCode = null;
                        addCodeHistory(input, false, 'เชื่อมต่อล้มเหลว');
                    });
                return;
            }

            const codes = getCodes();
            const codeData = codes.find(c => c.code === input);

            if (!codeData) {
                status.textContent = '❌ ไม่พบโค้ดนี้ในระบบ';
                status.className = 'code-status invalid';
                spinBtn.disabled = true;
                spinBtn.textContent = 'โค้ดไม่ถูกต้อง';
                spinsInfo.classList.remove('show');
                currentCode = null;
                addCodeHistory(input, false, 'ไม่พบโค้ด');
                return;
            }

            if (codeData.spins <= 0) {
                status.textContent = '❌ โค้ดนี้ใช้สิทธิ์หมดแล้ว';
                status.className = 'code-status invalid';
                spinBtn.disabled = true;
                spinBtn.textContent = 'หมดสิทธิ์แล้ว';
                spinsInfo.classList.remove('show');
                currentCode = null;
                addCodeHistory(input, false, 'หมดสิทธิ์');
                return;
            }

            status.textContent = '✅ โค้ดถูกต้อง! พร้อมหมุนวงล้อ';
            status.className = 'code-status valid';
            spinBtn.disabled = false;
            spinBtn.textContent = 'หมุนเลย!';
            spinsInfo.classList.add('show');
            spinsValue.textContent = codeData.spins + ' ครั้ง';
            currentCode = input;
            addCodeHistory(input, true, 'สิทธิ์ ' + codeData.spins + ' ครั้ง');
        }

        function useSpinCredit() {
            if (apiBase()) {
                return fetch(apiBase() + '?action=use&code=' + encodeURIComponent(currentCode))
                    .then(function(r) { return r.json(); })
                    .then(function(res) {
                        if (res.ok === true) {
                            var left = res.spinsLeft || 0;
                            document.getElementById('spinsValue').textContent = left + ' ครั้ง';
                            if (left <= 0) {
                                document.getElementById('spinBtn').disabled = true;
                                document.getElementById('spinBtn').textContent = 'หมดสิทธิ์แล้ว';
                                document.getElementById('codeStatus').textContent = '❌ โค้ดนี้ใช้สิทธิ์หมดแล้ว';
                                document.getElementById('codeStatus').className = 'code-status invalid';
                            }
                            return true;
                        }
                        return false;
                    })
                    .catch(function() { return false; });
            }
            const codes = getCodes();
            const codeIndex = codes.findIndex(c => c.code === currentCode);
            if (codeIndex === -1) return Promise.resolve(false);
            if (codes[codeIndex].spins <= 0) return Promise.resolve(false);

            codes[codeIndex].spins--;
            saveCodes(codes);
            document.getElementById('spinsValue').textContent = codes[codeIndex].spins + ' ครั้ง';
            if (codes[codeIndex].spins <= 0) {
                document.getElementById('spinBtn').disabled = true;
                document.getElementById('spinBtn').textContent = 'หมดสิทธิ์แล้ว';
                document.getElementById('codeStatus').textContent = '❌ โค้ดนี้ใช้สิทธิ์หมดแล้ว';
                document.getElementById('codeStatus').className = 'code-status invalid';
            }
            return Promise.resolve(true);
        }

        function recordSpinResult(prize) {
            if (apiBase()) {
                fetch(apiBase() + '?action=record&code=' + encodeURIComponent(currentCode) + '&prize=' + encodeURIComponent(prize || ''))
                    .then(function(r) { return r.json(); })
                    .catch(function() {});
            } else {
                const codes = getCodes();
                const codeIndex = codes.findIndex(c => c.code === currentCode);
                if (codeIndex === -1) return;
                if (!codes[codeIndex].history) codes[codeIndex].history = [];
                codes[codeIndex].history.push({ prize: prize, time: new Date().toISOString() });
                saveCodes(codes);
            }
            addSpinHistory(currentCode, prize);
        }

        function drawWheel() {
            if (!items.length) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const sliceAngle = (2 * Math.PI) / items.length;
            let startAngle = -Math.PI / 2;

            items.forEach((item, index) => {
                const endAngle = startAngle + sliceAngle;

                ctx.beginPath();
                ctx.moveTo(centerX, centerY);
                ctx.arc(centerX, centerY, radius, startAngle, endAngle);
                ctx.closePath();
                ctx.fillStyle = item.color;
                ctx.fill();

                ctx.strokeStyle = 'rgba(0,0,0,0.1)';
                ctx.lineWidth = 2;
                ctx.stroke();

                const textAngle = startAngle + sliceAngle / 2;
                const textRadius = radius * 0.65;
                const textX = centerX + Math.cos(textAngle) * textRadius;
                const textY = centerY + Math.sin(textAngle) * textRadius;

                ctx.save();
                ctx.translate(textX, textY);
                ctx.rotate(textAngle + Math.PI / 2);
                ctx.fillStyle = 'white';
                ctx.font = 'bold 13px "Segoe UI", sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.shadowColor = 'rgba(0,0,0,0.5)';
                ctx.shadowBlur = 3;
                ctx.fillText(item.name, 0, 0);
                ctx.restore();

                startAngle = endAngle;
            });
        }


        let isResultShowing = false;

        function spin() {
            if (isSpinning || isResultShowing || !currentCode) return;

            var spinBtn = document.getElementById('spinBtn');
            
            // Disable ปุ่มทันทีที่กดครั้งแรก
            isSpinning = true;
            isResultShowing = true;
            spinBtn.disabled = true;
            spinBtn.textContent = 'กำลังหมุน...';

            Promise.resolve(useSpinCredit()).then(function(ok) {
                if (!ok) {
                    isSpinning = false;
                    isResultShowing = false;
                    spinBtn.disabled = false;
                    spinBtn.textContent = 'หมุนเลย!';
                    return;
                }

                var totalRate = items.reduce(function(sum, item) { return sum + Math.max(0, Number(item.rate) || 0); }, 0);
                var winnerIndex = Math.max(0, items.findIndex(function(item) { return String(item.name).toUpperCase() === 'MISS'; }));
                if (totalRate > 0) {
                    var random = Math.random() * totalRate;
                    var cumulative = 0;
                    winnerIndex = 0;
                    for (var i = 0; i < items.length; i++) {
                        cumulative += Math.max(0, Number(items[i].rate) || 0);
                        if (random < cumulative) {
                            winnerIndex = i;
                            break;
                        }
                    }
                }

                var segmentAngle = 360 / items.length;
                var winnerCenterAngle = (winnerIndex * segmentAngle) + (segmentAngle / 2);
                var targetAngle = 360 - winnerCenterAngle;
                var spins = 5 + Math.floor(Math.random() * 3);
                var finalRotation = currentRotation + (spins * 360) + targetAngle - (currentRotation % 360);

                canvas.classList.add('is-spinning');
                canvas.style.willChange = 'transform';
                canvas.style.transition = 'transform 4.2s cubic-bezier(0.16, 0.72, 0.12, 1)';
                canvas.style.transform = 'translateZ(0) rotate(' + finalRotation + 'deg)';
                currentRotation = finalRotation;

                setTimeout(function() {
                    var prize = items[winnerIndex].name;
                    recordSpinResult(prize);
                    showResult(prize);
                    isSpinning = false;
                    canvas.style.willChange = 'auto';
                    canvas.classList.remove('is-spinning');
                }, 4200);
            });
        }

        function showResult(prize) {
            const now = new Date();
            const dateStr = now.toLocaleDateString('th-TH', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            const timeStr = now.toLocaleTimeString('th-TH', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });

            document.getElementById('prizeText').textContent = prize;
            document.getElementById('resultDate').textContent = dateStr;
            document.getElementById('resultTime').textContent = timeStr;
            document.getElementById('resultCodeUsed').textContent = currentCode || '-';

            document.getElementById('resultDisplay').classList.add('show');
            createConfetti();
            var spinsLeft = null;
            if (apiBase()) {
                var v = document.getElementById('spinsValue').textContent;
                var num = parseInt(v, 10);
                if (!isNaN(num)) spinsLeft = num;
            } else {
                var codes = getCodes();
                var codeData = codes.find(function(c) { return c.code === currentCode; });
                if (codeData && codeData.spins !== undefined) spinsLeft = codeData.spins;
            }
            if (typeof window.sendDiscordWebhook === 'function') {
                window.sendDiscordWebhook(prize, currentCode, dateStr, timeStr, spinsLeft);
            }
        }

        function closeResult() {
            document.getElementById('resultDisplay').classList.remove('show');
            isResultShowing = false;
            
            var spinBtn = document.getElementById('spinBtn');
            if (apiBase()) {
                var v = document.getElementById('spinsValue').textContent;
                var left = parseInt(v, 10) || 0;
                if (left > 0) {
                    spinBtn.disabled = false;
                    spinBtn.textContent = 'หมุนเลย!';
                }
            } else {
                var codes = getCodes();
                var codeData = codes.find(function(c) { return c.code === currentCode; });
                if (codeData && codeData.spins > 0) {
                    spinBtn.disabled = false;
                    spinBtn.textContent = 'หมุนเลย!';
                }
            }
        }

        function createConfetti() {
            const colors = ['#FFD700', '#FF6B6B', '#4CAF50', '#2196F3', '#FF9800', '#E91E63'];
            
            const confettiCount = window.innerWidth >= 900 ? 24 : 16;
            for (let i = 0; i < confettiCount; i++) {
                const confetti = document.createElement('div');
                confetti.className = 'confetti';
                confetti.style.left = Math.random() * 100 + 'vw';
                confetti.style.top = '-10px';
                confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
                confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
                confetti.style.width = (Math.random() * 10 + 5) + 'px';
                confetti.style.height = (Math.random() * 10 + 5) + 'px';
                document.body.appendChild(confetti);

                const animation = confetti.animate([
                    { transform: 'translateY(0) rotate(0deg)', opacity: 1 },
                    { transform: `translateY(100vh) rotate(${Math.random() * 720}deg)`, opacity: 0 }
                ], {
                    duration: Math.random() * 2500 + 2000,
                    easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
                });

                animation.onfinish = () => confetti.remove();
            }
        }

        document.getElementById('codeInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                verifyCode();
            }
        });

        function renderPrizesGrid() {
            const container = document.getElementById('prizesGrid');
            container.innerHTML = items.map(item => `
                <div class="prize-item">
                    <div class="prize-dot" style="background: ${item.color};"></div>
                    <div class="prize-name">${item.name}</div>
                </div>
            `).join('');
        }

        applyWheelSettingsFromUrl();
        drawWheel();
        renderCodeHistory();
        renderSpinHistory();
        renderPrizesGrid();

        if (typeof window.LINK_CREATE_CODE === 'string' && window.LINK_CREATE_CODE) {
            var el = document.getElementById('linkToCreateCode');
            if (el) el.setAttribute('href', window.LINK_CREATE_CODE);

        }


