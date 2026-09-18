document.getElementById('telegramButton').onclick = function() {
    window.location.href = 'https://t.me/warp_1_1_1_1';
}

document.getElementById('projectsButton').onclick = function() {
    window.location.href = 'https://my-other-projects.vercel.app/';
}

document.getElementById('adButton').onclick = function() {
    window.location.href = 'https://t.me/AgnosiaVPN_bot'
}

document.getElementById('promoButton').onclick = function() {
    window.location.href = 'https://storage.googleapis.com/amnezia/amnezia.org?m-path=premium&arf=VG755WBZDBAPGGYM';
}

document.getElementById('keepaliveInput')?.addEventListener('input', () => generateConfig());
let currentSession = null;
let serversList = [];
let timerInterval = null;
let serversByCountryCache = {};

document.addEventListener('DOMContentLoaded', () => {
  checkCachedSession();
  initToggles(); 
  initClientToggle();
});

function checkCachedSession() {
  const cachedSession = localStorage.getItem('protonSession');
  const expires = localStorage.getItem('protonSessionExpires');
  if (cachedSession && expires) {
    const now = new Date().getTime();
    if (now < parseInt(expires)) {
      // Преобразуем сохраненную JSON-строку обратно в объект
                    try {
                        currentSession = JSON.parse(cachedSession);
                    } catch (e) {
                        // Фолбэк на случай, если это была обычная строка
                        currentSession = cachedSession;
                    }
                    
                    startTimer(parseInt(expires));
                    
                    // Загружаем серверы, используя восстановленную сессию
                    fetchAndRenderServers(currentSession).then(() => {
                        showAlert('Сессия восстановлена. Серверы загружены!');
                    }).catch(err => {
                        showAlert('Ошибка при загрузке серверов: ' + err.message, true);
                        clearSession(); // Сбрасываем битую сессию
                    });
                } else {
                    // Время истекло
                    clearSession();
                }
            }
        }

        function showAlert(msg, isError = false) {
            const box = document.getElementById('alertBox');
            box.textContent = msg;
            box.className = `mb-4 p-4 rounded text-sm font-semibold block ${isError ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`;
            setTimeout(() => { box.classList.add('hidden'); }, 5000);
        }

async function apiRequest(endpoint, body = null) {
            const baseUrl = 'https://proton-api.vercel.app'
            const headers = { 'Content-Type': 'application/json' };
            const options = {
                method: 'POST', 
                headers: headers
            };
            if (body !== null) options.body = JSON.stringify(body);

            const res = await fetch(`${baseUrl}${endpoint}`, options);
            const data = await res.json();
            
            if (!data.ok) {
                const errorMessage = data.error || 'Произошла неизвестная ошибка (см. консоль)';
                
                // Если API возвращает ошибку токена или авторизации, принудительно сбрасываем сессию
                const lowerError = errorMessage.toLowerCase();
                if (lowerError.includes('token') || lowerError.includes('session') || res.status === 401 || res.status === 403) {
                    // Вызываем clearSession, если она уже загружена
                    if (typeof clearSession === 'function') {
                        clearSession();
                    }
                    // Меняем текст ошибки на более понятный для пользователя
                    throw new Error('Сессия устарела или недействительна. Пожалуйста, подключитесь заново.');
                }
                
                throw new Error(errorMessage);
            }
            
            return data;
        }

function startTimer(expirationTime) {
            const btn = document.getElementById('btnConnect');
            const timerContainer = document.getElementById('timerContainer');
            const timerText = document.getElementById('timerText');
            btn.style.display = 'none';
            timerContainer.classList.remove('hidden');
            timerContainer.classList.add('flex'); 

            if (timerInterval) clearInterval(timerInterval);

            timerInterval = setInterval(() => {
                const now = new Date().getTime();
                const distance = expirationTime - now;

                if (distance <= 0) {
                    clearInterval(timerInterval);
                    clearSession();
                    showAlert('Время сессии истекло. Пожалуйста, подключитесь заново.', true);
                    return;
                }

                const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((distance % (1000 * 60)) / 1000);

                timerText.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            }, 1000);
        }

async function fetchAndRenderServers(session) {
    const serversData = await apiRequest('/api/proton/servers', { session: session });
    serversList = serversData.servers;

    // Группируем серверы
    serversByCountryCache = serversList.reduce((acc, srv) => {
        const country = srv.exitCountry || 'Неизвестно';
        if (!acc[country]) acc[country] = [];
        acc[country].push(srv);
        return acc;
    }, {});

    // Обновляем количество на кнопках
    const countryCount = Object.keys(serversByCountryCache).length;
    const totalCount = serversList.length;

    const btnCountry = document.getElementById('btnDwnlCountry');
    const btnAll = document.getElementById('btnDwnlAll');

    if (btnCountry) btnCountry.textContent = `Скачать .conf файл каждой страны (${countryCount})`;
    if (btnAll) btnAll.textContent = `Скачать все .conf файлы (${totalCount})`;

    // Рендерим фильтры и список
    renderFilterButtons(Object.keys(serversByCountryCache).sort());
    renderServersList('all');

    document.getElementById('step2').classList.remove('hidden');
}

// Рендер радио-фильтров с использованием внешних CSS классов
function renderFilterButtons(countries) {
            const container = document.getElementById('filterContainer');
            container.innerHTML = '';
            
            const filterOptions = ['all', ...countries];

            filterOptions.forEach((country) => {
                const isAll = country === 'all';
                
                const label = document.createElement('label');
                // Присваиваем базовый класс, и active если это выбранный элемент
                label.className = isAll ? 'filter-option active' : 'filter-option';

                const radio = document.createElement('input');
                radio.type = 'radio';
                radio.name = 'countryFilter';
                radio.value = country;
                radio.className = 'hidden';
                radio.checked = isAll;

                radio.onchange = () => {
                    renderServersList(country);
                    
                    // Убираем класс 'active' у всех остальных
                    container.querySelectorAll('.filter-option').forEach(l => {
                        l.classList.remove('active');
                    });
                    
                    // Добавляем 'active' текущему
                    label.classList.add('active');
                };

                const text = isAll ? '🌍 Все' : `${getFlagEmoji(country)} ${country}`;
                
                label.appendChild(radio);
                label.appendChild(document.createTextNode(text));
                container.appendChild(label);
            });
        }

// Рендер выпадающего списка
function renderServersList(countryFilter) {
            const select = document.getElementById('serverSelect');
            select.innerHTML = '';

            // Определяем, какие страны показывать
            const countriesToShow = (countryFilter === 'all') 
                ? Object.keys(serversByCountryCache).sort() 
                : [countryFilter];

            countriesToShow.forEach(country => {
                const optgroup = document.createElement('optgroup');
                const flag = getFlagEmoji(country);
                optgroup.label = flag ? `${flag} ${country}` : country;

                const servers = serversByCountryCache[country];
                
                // Сортировка по нагрузке
                servers.sort((a, b) => a.load - b.load || a.name.localeCompare(b.name));

                servers.forEach(srv => {
                    const option = document.createElement('option');
                    option.value = srv.id;
                    const cleanName = srv.name.replace('-FREE#', '_');
                    const loadSymbol = getLoadSymbol(srv.load);
                    
                    option.dataset.name = cleanName; 
                    option.textContent = `${loadSymbol} ${cleanName} (${srv.city}) [${srv.load}%]`;
                    optgroup.appendChild(option);
                });

                select.appendChild(optgroup);
            });
        }

async function connectProxy() {
            const btn = document.getElementById('btnConnect');
            btn.textContent = 'Загрузка...';
            btn.disabled = true;

            try {
                const sessionData = await apiRequest('/api/proton/session', {});
                currentSession = sessionData.session;
                const expires = new Date().getTime() + 24 * 60 * 60 * 1000;
                localStorage.setItem('protonSession', JSON.stringify(currentSession));
                localStorage.setItem('protonSessionExpires', expires.toString());
                startTimer(expires);
                await fetchAndRenderServers(currentSession);
                showAlert('Успешно подключено. Серверы загружены!');
} catch (error) {
                showAlert(error.message, true);
                console.error(error);
                // Возвращаем кнопку при ошибке через стиль
                btn.style.display = 'block'; 
            } finally {
                btn.textContent = 'Подключиться и получить серверы';
                btn.disabled = false;
            }
        }

// Получение или генерация приватного ключа
async function getOrGeneratePrivateKey() {
    let wgPrivKeyBase64 = localStorage.getItem('wgPrivateKey');
    let cachedCert = localStorage.getItem('protonCertData');

    if (wgPrivKeyBase64 && cachedCert) {
        return wgPrivKeyBase64;
    }

    const seed = nacl.randomBytes(32);
    const edKeyPair = nacl.sign.keyPair.fromSeed(seed);
    const edPubKeyBase64 = nacl.util.encodeBase64(edKeyPair.publicKey);
    const pemPublicKey = `-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEA${edPubKeyBase64}\n-----END PUBLIC KEY-----\n`;

    const hash = nacl.hash(seed);
    const wgPrivKey = new Uint8Array(32);
    for (let i = 0; i < 32; i++) wgPrivKey[i] = hash[i];
    wgPrivKey[0] &= 248;
    wgPrivKey[31] &= 127;
    wgPrivKey[31] |= 64;

    wgPrivKeyBase64 = nacl.util.encodeBase64(wgPrivKey);

    const certData = await apiRequest('/api/proton/certificate', {
        session: currentSession,
        clientPublicKey: pemPublicKey,
        persistent: true
    });

    localStorage.setItem('wgPrivateKey', wgPrivKeyBase64);
    localStorage.setItem('protonCertData', JSON.stringify(certData));

    return wgPrivKeyBase64;
}

// Формирование текста конфигурации для любого сервера
function buildConfigString(server, wgPrivKeyBase64) {
    const selectedPort = document.querySelector('input[name="wgPort"]:checked')?.value || '51820';
    const isClash = document.getElementById('clash')?.checked;
	const mtuInput = document.getElementById('mtu');
    const mtuVal = mtuInput?.value.trim() || mtuInput?.placeholder || '1420';

    // --- AWG 1.0 ---
    const isAwg1 = document.getElementById('switchOption1')?.checked;
    let jc = '', jmin = '', jmax = '';
    let interfaceOptions = '';

    if (isAwg1) {
        jc = '3'; jmin = '1'; jmax = '3';

        if (document.getElementById('junk2')?.checked) {
            jc = '30'; jmin = '10'; jmax = '30';
        } else if (document.getElementById('junk3')?.checked) {
            const jcInput = document.getElementById('jc1');
            const jminInput = document.getElementById('jmin1');
            const jmaxInput = document.getElementById('jmax1');

            jc = jcInput?.value.trim() || jcInput?.placeholder || '128';
            jmin = jminInput?.value.trim() || jminInput?.placeholder || '1279';
            jmax = jmaxInput?.value.trim() || jmaxInput?.placeholder || '1280';
        }

        interfaceOptions += `\nS1 = 0\nS2 = 0\nS3 = 0\nS4 = 0\nJc = ${jc}\nJmin = ${jmin}\nJmax = ${jmax}\nH1 = 1\nH2 = 2\nH3 = 3\nH4 = 4`;
    }

    // --- AWG 2.0 ---
    const isAwg2 = document.getElementById('switchOption2')?.checked;
    let i1Val = '';
    let i2Val = '';
    if (isAwg2) {
        const isAwg = document.getElementById('awg')?.checked || isClash;
        const isWiresock = document.getElementById('wiresock')?.checked;

        if (isAwg) {
            const i1Input = document.getElementById('i1');
            i1Val = i1Input?.value.trim() || '<b 0xce000000010897a297ecc34cd6dd000044d0ec2e2e1ea2991f467ace4222129b5a098823784694b4897b9986ae0b7280135fa85e196d9ad980b150122129ce2a9379531b0fd3e871ca5fdb883c369832f730e272d7b8b74f393f9f0fa43f11e510ecb2219a52984410c204cf875585340c62238e14ad04dff382f2c200e0ee22fe743b9c6b8b043121c5710ec289f471c91ee414fca8b8be8419ae8ce7ffc53837f6ade262891895f3f4cecd31bc93ac5599e18e4f01b472362b8056c3172b513051f8322d1062997ef4a383b01706598d08d48c221d30e74c7ce000cdad36b706b1bf9b0607c32ec4b3203a4ee21ab64df336212b9758280803fcab14933b0e7ee1e04a7becce3e2633f4852585c567894a5f9efe9706a151b615856647e8b7dba69ab357b3982f554549bef9256111b2d67afde0b496f16962d4957ff654232aa9e845b61463908309cfd9de0a6abf5f425f577d7e5f6440652aa8da5f73588e82e9470f3b21b27b28c649506ae1a7f5f15b876f56abc4615f49911549b9bb39dd804fde182bd2dcec0c33bad9b138ca07d4a4a1650a2c2686acea05727e2a78962a840ae428f55627516e73c83dd8893b02358e81b524b4d99fda6df52b3a8d7a5291326e7ac9d773c5b43b8444554ef5aea104a738ed650aa979674bbed38da58ac29d87c29d387d80b526065baeb073ce65f075ccb56e47533aef357dceaa8293a523c5f6f790be90e4731123d3c6152a70576e90b4ab5bc5ead01576c68ab633ff7d36dcde2a0b2c68897e1acfc4d6483aaaeb635dd63c96b2b6a7a2bfe042f6aed82e5363aa850aace12ee3b1a93f30d8ab9537df483152a5527faca21efc9981b304f11fc95336f5b9637b174c5a0659e2b22e159a9fed4b8e93047371175b1d6d9cc8ab745f3b2281537d1c75fb9451871864efa5d184c38c185fd203de206751b92620f7c369e031d2041e152040920ac2c5ab5340bfc9d0561176abf10a147287ea90758575ac6a9f5ac9f390d0d5b23ee12af583383d994e22c0cf42383834bcd3ada1b3825a0664d8f3fb678261d57601ddf94a8a68a7c273a18c08aa99c7ad8c6c42eab67718843597ec9930457359dfdfbce024afc2dcf9348579a57d8d3490b2fa99f278f1c37d87dad9b221acd575192ffae1784f8e60ec7cee4068b6b988f0433d96d6a1b1865f4e155e9fe020279f434f3bf1bd117b717b92f6cd1cc9bea7d45978bcc3f24bda631a36910110a6ec06da35f8966c9279d130347594f13e9e07514fa370754d1424c0a1545c5070ef9fb2acd14233e8a50bfc5978b5bdf8bc1714731f798d21e2004117c61f2989dd44f0cf027b27d4019e81ed4b5c31db347c4a3a4d85048d7093cf16753d7b0d15e078f5c7a5205dc2f87e330a1f716738dce1c6180e9d02869b5546f1c4d2748f8c90d9693cba4e0079297d22fd61402dea32ff0eb69ebd65a5d0b687d87e3a8b2c42b648aa723c7c7daf37abcc4bb85caea2ee8f55bec20e913b3324ab8f5c3304f820d42ad1b9f2ffc1a3af9927136b4419e1e579ab4c2ae3c776d293d397d575df181e6cae0a4ada5d67ecea171cca3288d57c7bbdaee3befe745fb7d634f70386d873b90c4d6c6596bb65af68f9e5121e67ebf0d89d3c909ceedfb32ce9575a7758ff080724e1ab5d5f43074ecb53a479af21ed03d7b6899c36631c0166f9d47e5e1d4528a5d3d3f744029c4b1c190cbfbad06f5f83f7ad0429fa9a2719c56ffe3783460e166de2d8>';
            if (i1Val) interfaceOptions += `\nI1 = ${i1Val}`;

            const i2Input = document.getElementById('i2');
            i2Val = i2Input?.value.trim() || i1Val;
            if (i2Val) interfaceOptions += `\nI2 = ${i2Val}`;

            ['i3', 'i4', 'i5'].forEach((id, index) => {
                const val = document.getElementById(id)?.value.trim();
                if (val) interfaceOptions += `\nI${index + 3} = ${val}`;
            });
        } else if (isWiresock) {
            const idVal = document.getElementById('id')?.value || 'apteka.ru';
            const ipVal = document.getElementById('ip')?.value || 'quic';
            const ibVal = document.getElementById('ib')?.value || 'curl';

            if (idVal) interfaceOptions += `\nId = ${idVal}`;
            if (ipVal) interfaceOptions += `\nIp = ${ipVal}`;
            if (ibVal) interfaceOptions += `\nIb = ${ibVal}`;
        }
    }

    // --- AWG 3.0 ---
    const isAwg3 = document.getElementById('switchOption3')?.checked;
    const getValue = (id) => {
        const el = document.getElementById(id);
        return el?.value.trim() || el?.placeholder || '';
    };

    const cpa = isAwg3 ? getValue('cpaInput') : '';
    const rkat = isAwg3 ? getValue('rkatInput') : '';
    const rt = isAwg3 ? getValue('rtInput') : '';
    const rat = isAwg3 ? getValue('ratInput') : '';
    const kt = isAwg3 ? getValue('ktInput') : '';
    const mha = isAwg3 ? getValue('mhaInput') : '';

    if (isAwg3) {
        if (cpa) interfaceOptions += `\nContentPaddingAddition = ${cpa}`;
        if (rkat) interfaceOptions += `\nRekeyAfterTime = ${rkat}`;
        if (rt) interfaceOptions += `\nRekeyTimeout = ${rt}`;
        if (rat) interfaceOptions += `\nRejectAfterTime = ${rat}`;
        if (kt) interfaceOptions += `\nKeepaliveTimeout = ${kt}`;
        if (mha) interfaceOptions += `\nMaxHandshakeAttempts = ${mha}`;
    }

    // --- AWG 3.1 ---
const isAwg31 = document.getElementById('switchOption6')?.checked;
const isRandomTrailers = document.getElementById('switchOption7')?.checked;
const isDisableCookies = document.getElementById('switchOption8')?.checked;

if (isAwg31) {
    if (isRandomTrailers) interfaceOptions += `\nRandomTrailers = on`;
    if (isDisableCookies) interfaceOptions += `\nDisableCookies = on`;
}

    let cleanName = server.name.replace('-FREE#', ' ').replace(/_/g, ' ');
    
    const flag = getFlagEmoji(server.exitCountry);
    if (flag) {
        cleanName = `${flag} ${cleanName}`;
    }

    // --- ВЫВОД ДЛЯ CLASH ---
    if (isClash) {
        let awgOptionsYaml = '';
        if (isAwg1) {
            awgOptionsYaml += `\n    jc: ${jc}\n    jmin: ${jmin}\n    jmax: ${jmax}\n    s1: 0\n    s2: 0\n    h1: 1\n    h2: 2\n    h3: 3\n    h4: 4`;
        }
        if (isAwg2) {
            if (i1Val) awgOptionsYaml += `\n    i1: ${i1Val}`;

            if (i2Val) awgOptionsYaml += `\n    i2: ${i2Val}`;
            
            ['i3', 'i4', 'i5'].forEach((id) => {
                const val = document.getElementById(id)?.value.trim();
                if (val) awgOptionsYaml += `\n    ${id}: ${val}`;
            });
        }
        if (isAwg3) {
            if (cpa) awgOptionsYaml += `\n    content-padding-addition: ${cpa}`;
            if (rkat) awgOptionsYaml += `\n    rekey-after-time: ${rkat}`;
            if (rt) awgOptionsYaml += `\n    rekey-timeout: ${rt}`;
            if (rat) awgOptionsYaml += `\n    reject-after-time: ${rat}`;
            if (kt) awgOptionsYaml += `\n    keepalive-timeout: ${kt}`;
            if (mha) awgOptionsYaml += `\n    max-handshake-attempts: ${mha}`;
        }

		if (isAwg31) {
    if (isRandomTrailers) awgOptionsYaml += `\n    random-trailers: true`;
    if (isDisableCookies) awgOptionsYaml += `\n    disable-cookies: true`;
}

        const amneziaBlock = awgOptionsYaml ? `\n  amnezia-wg-option:${awgOptionsYaml}` : '';

        return `proton: &proton
  type: wireguard
  ip: 10.2.0.2
  ipv6: 2a07:b944::2:2
  private-key: ${wgPrivKeyBase64}
  udp: true
  mtu: ${mtuVal}
  remote-dns-resolve: true
  dns: [10.2.0.1, 2a07:b944::2:1]
  port: ${selectedPort}${amneziaBlock}

proxies:
- name: "${cleanName}"
  <<: *proton
  server: ${server.entryIp}
  public-key: ${server.publicKey}
    
proxy-groups:
- name: ProtonVPN
  type: select
  icon: https://res.cloudinary.com/dbulfrlrz/image/upload/v1703162849/static/logos/icons/vpn_f9embt.svg
  proxies:
    - "${cleanName}"
  url: 'http://speed.cloudflare.com/'
rules:
- MATCH,ProtonVPN`;
    }

    // --- СТАНДАРТНЫЙ ВЫВОД (.conf) ---
    const excludeLan = document.getElementById('switchOption4')?.checked;
    const allowedIPs = excludeLan 
        ? '1.0.0.0/8, 2.0.0.0/7, 4.0.0.0/6, 8.0.0.0/7, 11.0.0.0/8, 12.0.0.0/6, 16.0.0.0/4, 32.0.0.0/3, 64.0.0.0/3, 96.0.0.0/4, 112.0.0.0/5, 120.0.0.0/6, 124.0.0.0/7, 126.0.0.0/8, 128.0.0.0/3, 160.0.0.0/5, 168.0.0.0/8, 169.0.0.0/9, 169.128.0.0/10, 169.192.0.0/11, 169.224.0.0/12, 169.240.0.0/13, 169.248.0.0/14, 169.252.0.0/15, 169.255.0.0/16, 170.0.0.0/7, 172.0.0.0/12, 172.32.0.0/11, 172.64.0.0/10, 172.128.0.0/9, 173.0.0.0/8, 174.0.0.0/7, 176.0.0.0/4, 192.0.0.0/9, 192.128.0.0/11, 192.160.0.0/13, 192.169.0.0/16, 192.170.0.0/15, 192.172.0.0/14, 192.176.0.0/12, 192.192.0.0/10, 193.0.0.0/8, 194.0.0.0/7, 196.0.0.0/6, 200.0.0.0/5, 208.0.0.0/4, 224.0.0.0/4, ::/1, 8000::/2, c000::/3, e000::/4, f000::/5, f800::/6, fe00::/9, fec0::/10, ff00::/8'
        : '0.0.0.0/0, ::/0';

    let peerOptions = '';
    const isKeepalive = document.getElementById('switchOption5')?.checked;
    if (isKeepalive) {
        const pkInput = document.getElementById('keepaliveInput');
        const pkVal = pkInput?.value.trim() || pkInput?.placeholder || '25';
        peerOptions += `\nPersistentKeepalive = ${pkVal}`;
    }

    return `[Interface]
PrivateKey = ${wgPrivKeyBase64}
Address = 10.2.0.2/32, 2a07:b944::2:2/128
DNS = 10.2.0.1, 2a07:b944::2:1
MTU = ${mtuVal}${interfaceOptions}

[Peer]
# Server: ${server.name}
PublicKey = ${server.publicKey}
Endpoint = ${server.entryIp}:${selectedPort}
AllowedIPs = ${allowedIPs}${peerOptions}`;
}

async function generateConfig() {
    const btn = document.getElementById('btnGenerate');
    btn.textContent = 'Генерация...';
    btn.disabled = true;

    try {
        // 1. Получаем/генерируем приватный ключ WireGuard
        const wgPrivKeyBase64 = await getOrGeneratePrivateKey();

        // 2. Находим выбранный сервер из списка
        const serverId = document.getElementById('serverSelect').value;
        const server = serversList.find(s => s.id === serverId);

        if (!server) {
            throw new Error('Выбранный сервер не найден');
        }

        // 3. Собираем текст конфигурации
        const configStr = buildConfigString(server, wgPrivKeyBase64);

        // 4. Помещаем в поле текста и отображаем 3-й шаг
        document.getElementById('wgConfigText').value = configStr;

        const step3 = document.getElementById('step3');
        const wasHidden = step3.classList.contains('hidden');
        step3.classList.remove('hidden');

        // Уведомление показываем только при первой генерации
        if (wasHidden) {
            showAlert('Конфигурация успешно создана');
        }
    } catch (error) {
        showAlert(error.message, true);
        console.error(error);
    } finally {
        btn.textContent = 'Сгенерировать конфиг';
        btn.disabled = false;
    }
}

function clearSession() {
    localStorage.removeItem('protonSession');
    localStorage.removeItem('protonSessionExpires');
    
    // Очищаем кэш ключей и сертификатов
    localStorage.removeItem('wgPrivateKey'); 
    localStorage.removeItem('protonCertData'); 
    localStorage.removeItem('wgSeed'); // Оставлено на случай миграции со старой версии
    
    currentSession = null;
    
    if (timerInterval) clearInterval(timerInterval);
    
    const btn = document.getElementById('btnConnect');
    const timerContainer = document.getElementById('timerContainer');
    
    if (btn) btn.style.display = 'block';
    if (timerContainer) {
        timerContainer.classList.add('hidden');
        timerContainer.classList.remove('flex');
    }
    
    document.getElementById('step2').classList.add('hidden');
    document.getElementById('step3').classList.add('hidden');
}

function downloadConfig() {
    const text = document.getElementById('wgConfigText').value;
    const select = document.getElementById('serverSelect');
    const selectedOption = select.options[select.selectedIndex];
    const isClash = document.getElementById('clash')?.checked;
    
    const serverName = selectedOption.dataset.name || selectedOption.value;
    const ext = isClash ? 'yaml' : 'conf';
    
    const blob = new Blob([text], { type: 'application/x-config; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${serverName}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Скачивание конфига с минимальной нагрузкой по каждой стране
async function downloadCountriesZip() {
    const btn = document.getElementById('btnDwnlCountry');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Создание ZIP...';

    try {
        const privKey = await getOrGeneratePrivateKey();
        const zip = new JSZip();
        
        const isClash = document.getElementById('clash')?.checked;
        const ext = isClash ? 'yaml' : 'conf';

        Object.keys(serversByCountryCache).forEach(country => {
            const servers = [...serversByCountryCache[country]];
            // Сортируем по наименьшей нагрузке
            servers.sort((a, b) => a.load - b.load || a.name.localeCompare(b.name));
            const bestServer = servers[0];

            if (bestServer) {
                // Имя файла остается в безопасном формате с подчеркиванием
                const fileName = bestServer.name.replace('-FREE#', '_');
                const configText = buildConfigString(bestServer, privKey);
                zip.file(`${fileName}.${ext}`, configText);
            }
        });

        const content = await zip.generateAsync({ type: 'blob' });
        saveBlobAsFile(content, 'ProtonVPN_Countries.zip');
    } catch (error) {
        showAlert('Ошибка при создании архива: ' + error.message, true);
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
}

// Скачивание всех доступных конфигов
async function downloadAllZip() {
    const btn = document.getElementById('btnDwnlAll');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Создание ZIP...';

    try {
        const privKey = await getOrGeneratePrivateKey();
        const zip = new JSZip();

        const isClash = document.getElementById('clash')?.checked;
        const ext = isClash ? 'yaml' : 'conf';

        serversList.forEach(server => {
            // Имя файла остается в безопасном формате с подчеркиванием
            const fileName = server.name.replace('-FREE#', '_');
            const configText = buildConfigString(server, privKey);
            zip.file(`${fileName}.${ext}`, configText);
        });

        const content = await zip.generateAsync({ type: 'blob' });
        saveBlobAsFile(content, 'ProtonVPN_All.zip');
    } catch (error) {
        showAlert('Ошибка при создании архива: ' + error.message, true);
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
}

// Вспомогательное скачивание Blob-файлов
function saveBlobAsFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Эмодзи флага из двухбуквенного кода страны
function getFlagEmoji(countryCode) {
    if (!countryCode || countryCode.length !== 2) return '';
    const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
}

// Индикатор нагрузки
function getLoadSymbol(load) {
    if (load < 30) return '🟢'; 
    if (load < 60) return '🟡'; 
    if (load < 90) return '🟠'; 
    return '🔴';                
}

function initToggles() {
    const switch1 = document.getElementById('switchOption1');
    const switch2 = document.getElementById('switchOption2');
    const switch3 = document.getElementById('switchOption3');
    const switch4 = document.getElementById('switchOption6');

    const updateVisibility = () => {
        document.querySelectorAll('.musor1').forEach(el => {
            el.style.display = switch1 && switch1.checked ? '' : 'none';
        });
        document.querySelectorAll('.musor2').forEach(el => {
            el.style.display = switch2 && switch2.checked ? '' : 'none';
        });
        document.querySelectorAll('.musor3').forEach(el => {
            el.style.display = switch3 && switch3.checked ? 'grid' : 'none';
        });
		document.querySelectorAll('.musor4').forEach(el => {
            el.style.display = switch4 && switch4.checked ? '' : 'none';
        });
    };

    updateVisibility();

    if (switch1) switch1.addEventListener('change', updateVisibility);
    if (switch2) switch2.addEventListener('change', updateVisibility);
    if (switch3) switch3.addEventListener('change', updateVisibility);
    if (switch4) switch4.addEventListener('change', updateVisibility);
    document.querySelectorAll('input[name="junk"]').forEach(radio => {
        radio.addEventListener('change', () => generateConfig());
    });
    ['mtu', 'jc1', 'jmin1', 'jmax1', 'cpaInput', 'mhaInput', 'ktInput', 'ratInput', 'rkatInput', 'rtInput'].forEach(id => {document.getElementById(id)?.addEventListener('input', () => generateConfig());});

	['i1', 'i2', 'i3', 'i4', 'i5', 'id', 'ip', 'ib'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', () => generateConfig());
    document.getElementById(id)?.addEventListener('change', () => generateConfig());});
   ['switchOption7', 'switchOption8'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', () => generateConfig());
});
}

function initClientToggle() {
    const optionRadios = document.querySelectorAll('input[name="option"]');
    const wireSockDiv = document.getElementById('WireSockdiv');
    const awgDiv = document.getElementById('awgdiv');

    if (!wireSockDiv || !awgDiv) return;

    const updateVisibility = () => {
        const isWiresock = document.getElementById('wiresock')?.checked;

        wireSockDiv.classList.toggle('hidden', !isWiresock);
        awgDiv.classList.toggle('hidden', isWiresock);

        // Если сгенерированный конфиг уже отображается (шаг 3), сразу пересоздаем его
        if (!document.getElementById('step3').classList.contains('hidden')) {
            generateConfig();
        }
    };

    optionRadios.forEach(radio => radio.addEventListener('change', updateVisibility));
    updateVisibility();
}

function getRandomInt(min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }

// Случайно AWG 1.0
function randomizeAwg1() {
    const junk3 = document.getElementById('junk3');
    if (junk3) junk3.checked = true;
    const jc = getRandomInt(1, 100);
    const jmin = getRandomInt(1, 200);
    const jmax = getRandomInt(jmin + 1, 201);
    const jcInput = document.getElementById('jc1');
    const jminInput = document.getElementById('jmin1');
    const jmaxInput = document.getElementById('jmax1');
    if (jcInput) jcInput.value = jc;
    if (jminInput) jminInput.value = jmin;
    if (jmaxInput) jmaxInput.value = jmax;
    if (!document.getElementById('step3').classList.contains('hidden')) {
        generateConfig();
    }
}

// Случайно AWG 2.0
function randomizeAwg2() {
    const i1List = [
'<b 0xce000000010897a297ecc34cd6dd000044d0ec2e2e1ea2991f467ace4222129b5a098823784694b4897b9986ae0b7280135fa85e196d9ad980b150122129ce2a9379531b0fd3e871ca5fdb883c369832f730e272d7b8b74f393f9f0fa43f11e510ecb2219a52984410c204cf875585340c62238e14ad04dff382f2c200e0ee22fe743b9c6b8b043121c5710ec289f471c91ee414fca8b8be8419ae8ce7ffc53837f6ade262891895f3f4cecd31bc93ac5599e18e4f01b472362b8056c3172b513051f8322d1062997ef4a383b01706598d08d48c221d30e74c7ce000cdad36b706b1bf9b0607c32ec4b3203a4ee21ab64df336212b9758280803fcab14933b0e7ee1e04a7becce3e2633f4852585c567894a5f9efe9706a151b615856647e8b7dba69ab357b3982f554549bef9256111b2d67afde0b496f16962d4957ff654232aa9e845b61463908309cfd9de0a6abf5f425f577d7e5f6440652aa8da5f73588e82e9470f3b21b27b28c649506ae1a7f5f15b876f56abc4615f49911549b9bb39dd804fde182bd2dcec0c33bad9b138ca07d4a4a1650a2c2686acea05727e2a78962a840ae428f55627516e73c83dd8893b02358e81b524b4d99fda6df52b3a8d7a5291326e7ac9d773c5b43b8444554ef5aea104a738ed650aa979674bbed38da58ac29d87c29d387d80b526065baeb073ce65f075ccb56e47533aef357dceaa8293a523c5f6f790be90e4731123d3c6152a70576e90b4ab5bc5ead01576c68ab633ff7d36dcde2a0b2c68897e1acfc4d6483aaaeb635dd63c96b2b6a7a2bfe042f6aed82e5363aa850aace12ee3b1a93f30d8ab9537df483152a5527faca21efc9981b304f11fc95336f5b9637b174c5a0659e2b22e159a9fed4b8e93047371175b1d6d9cc8ab745f3b2281537d1c75fb9451871864efa5d184c38c185fd203de206751b92620f7c369e031d2041e152040920ac2c5ab5340bfc9d0561176abf10a147287ea90758575ac6a9f5ac9f390d0d5b23ee12af583383d994e22c0cf42383834bcd3ada1b3825a0664d8f3fb678261d57601ddf94a8a68a7c273a18c08aa99c7ad8c6c42eab67718843597ec9930457359dfdfbce024afc2dcf9348579a57d8d3490b2fa99f278f1c37d87dad9b221acd575192ffae1784f8e60ec7cee4068b6b988f0433d96d6a1b1865f4e155e9fe020279f434f3bf1bd117b717b92f6cd1cc9bea7d45978bcc3f24bda631a36910110a6ec06da35f8966c9279d130347594f13e9e07514fa370754d1424c0a1545c5070ef9fb2acd14233e8a50bfc5978b5bdf8bc1714731f798d21e2004117c61f2989dd44f0cf027b27d4019e81ed4b5c31db347c4a3a4d85048d7093cf16753d7b0d15e078f5c7a5205dc2f87e330a1f716738dce1c6180e9d02869b5546f1c4d2748f8c90d9693cba4e0079297d22fd61402dea32ff0eb69ebd65a5d0b687d87e3a8b2c42b648aa723c7c7daf37abcc4bb85caea2ee8f55bec20e913b3324ab8f5c3304f820d42ad1b9f2ffc1a3af9927136b4419e1e579ab4c2ae3c776d293d397d575df181e6cae0a4ada5d67ecea171cca3288d57c7bbdaee3befe745fb7d634f70386d873b90c4d6c6596bb65af68f9e5121e67ebf0d89d3c909ceedfb32ce9575a7758ff080724e1ab5d5f43074ecb53a479af21ed03d7b6899c36631c0166f9d47e5e1d4528a5d3d3f744029c4b1c190cbfbad06f5f83f7ad0429fa9a2719c56ffe3783460e166de2d8>',
'<b 0xc3000000010828cc76e6712c410c000044d0a2465e075ad0f01564ee338a44a2023493b8e15237b38843001050a4f4bf2a2cfb40695fe5ff42a70c0990053428d982902a32ca57e8b98909370223db26cd729039d5717f730c935603e2a1f7e452ebbeb6236f02198a9e5293322ab2895f935827f58ffe0a2ca638599a6218bc847fd5e1c801cd487cfb10d308156e7ce4c91cf522097cab6d079acc9e7ef18f231ee6ac13f7bd3d03db41dc27953d32d1aaa35932add5b567769a35fc7e3ec9175211afba7b945492b7f2e8b141c450585f09eb9c38a760b4f6fd36257830c47bd028f35ac1b00cbf6c59030d67363e28a8a2e70190a23fbcc10941537db75c01b82f8be3d0ba7fd0f9ab534a36dcefff49ecb9a63d3be1f14ab0376d4f9686fa6478816c183f07179778593821b89a035cfa92ec13c5cd2991180278ed125264fb3a512d0480a73d69218aad3477f2c741981da881a0146002435fd1f15a0c38715396ea6989b4275137f52ea5fd771e9dc0f552755062e21c996b36e97850bf70fce2f98d26837585d28219a7a30d0cc910ff04a920bb69c714c0142193f267d917aab11058f197a6a66cd752aff348d334186bf91a69843f3452b953fc732449c58dc8aa4bcac89aa661f90891da751978f17a62f7b8f847f440f7210dd05574dbd78e4feb4ac478f275f4044c7170f74221abdda3b8fc0c129ae35d3fabac349d81ba9042b4782819ea81665d06691195bd9e7abf6f0e065a092811e9ea5b113207ef06de5768ebe62e8ee94ae4beb5bc4f9996c2c70c7d620da7fedbb2b9709a45584b5ae0fdc1f746b4afc7f100bc2888611b46e2ac243e136bb100e9db3022f472aac8801e77d15960a031e3f8fea5cf8f8703bdb1357800adc802b702c547f4e5f75eb4b6e5eb9327876c77dcfb3baf696a276d6779ab337fc1aa0b03222a6acda0b04a4220f77fd04ce14f083445e55ff88260834582531d759683e1b2d8abc885664cfba1f49f9bdcf26fca845fde45a0ca08a90794cf70338f1031c5098664f10e830d5b3437c7c367c8a0faa16d81471111b616b2f710edfcab27f5f1a7a33daa20ea6e8e5dcd624c6d8f2c048543d025eb970a8eb8aa09c8b4d0be42d6426961a624e37366c21b7e6ca24d09aa3e46a03e3dfc09eafd9d213752b2ca903d11626eb672d5dc116507c6cd2e43f59a6c964937cd9d8f1e54b05f4486c780c46a5718a3baedf93a5cd9b374097bc6db16aa272b6e0a935b35c3f721e206804c45ec5b4a4dadfbb28a9bd08d4a1590f05ef21185c00f8ca250fb31fe549845d39b6ced2e64c00ad5dac27d550313ac778a981a8b5ce2290bb2d90a50717f004d66ff122a395bba9fc67d38bfbfd549389622431afd241ce7a0d755e7016ee37ada01b09e51f4f39aa3785cc162726d23ad98e1f6d1f4346bd221b7401334d89c07e1ede4aec076933ae6d39bddef5d76e7d1fe8053fb1aca8c35d61b60648c5a1487365b0ca365c1689d8fbfc2267f24cbf90474c92be350f5e664b01ef1c8538b25296d643ceed009cb5da29c0a451be67ef626237066946379385f9c79276117598cd462ac0221fe93a46034df330144f9ccfc5d8560e8df7b19849cf7d65b79f21d3f05f61496ac7da3ffaf87b14171cb7e959c3e98fdef862f7cbf9eaebae74b1c9b09d102bff1fc82e0cf32c96b4dcc5cba0d7d3555bc8a5c722965af0c0c2f0dbb24ca1cbde23cfcd39ce86ecffe102f48cf657833fe578e5439>',
'<b 0xcd00000001019500004050389e9d50b54adf3d7b201298e06ddc84decc476cbaae7f5caa99df689a3d8bc8cdf4f1d328ca82147d4afbcd607f76c4ec72dcfa3831afb10b2469557a604f9bfc70d78c149fc6fbc2217d7b1ff6166e>',
'<b 0xc60000000101bb000040558c2ae6e3c71616f422e6ad8eab2d0eb44a382d875408669cd7ac2f83ceb694ae427ecd53f305bb1549d724f677b91470ba751baaa08c6fbc84a15788ef55dfa8b1fe28a22219dc653dfe48687d599df52b054a074b>',
'<b 0xc70000000101eb00004055988000e4d3995e7951b41d23dbb150e211e82942d2acbfc4b0596a070887a0e75c6e9e125b838da7e42a511b381741c47bb784a497a0a47327046ce4e2007d611c6c119779f0f2e340d5d6c4525a87754d7c997c09>',
'<b 0xc70000000101650000404f6b94de035f849525165e329deb8bee1c814b614afc258f10b2bcb94b47d63ed696b908e2f751b48fedbe6fe1f476ee242a0603c9025d69074985363ea70f637a2662e66e35c89094595b79bd152d85>'
    ];

    const randomIndex = Math.floor(Math.random() * i1List.length);
    const i1Input = document.getElementById('i1');
    if (i1Input) {
        i1Input.value = i1List[randomIndex];
    }
    if (!document.getElementById('step3').classList.contains('hidden')) {
        generateConfig();
    }
}
function randomizeWireSock() {
const domains = [
    '175bru.ru',
    '1tv.ru',
    '2an.ru',
    '2gis.ru',
    '360tv.ru',
    '4ege.ru',
    '5-tv.ru',
    '9111.ru',
    'akbars.ru',
    'allhockey.ru',
    'amalgama-lab.com',
    'apteka.ru',
    'aptekamos.ru',
    'arbitr.ru',
    'arhangelskoe.su',
    'artchive.ru',
    'arzamas.academy',
    'asna.ru',
    'ati.su',
    'autonews.ru',
    'av.ru',
    'avtovzglyad.ru',
    'baby.ru',
    'babyblog.ru',
    'bashinform.ru',
    'bbr.ru',
    'beeline.ru',
    'belkacar.ru',
    'blizko.ru',
    'bolshoi.ru',
    'borodino.ru',
    'bspb.ru',
    'c2dns.net',
    'c2dns.ru',
    'cdek.ru',
    'championat.com',
    'chitalnya.ru',
    'consmed.ru',
    'consultant.ru',
    'cosmo.ru',
    'ctc.ru',
    'culture.ru',
    'dalenabank.ru',
    'datalesson.ru',
    'deepseek.com',
    'delimobil.ru',
    'delivery-club.ru',
    'dellin.ru',
    'dixy.ru',
    'dnevnik.ru',
    'dns-shop.ru',
    'docdoc.ru',
    'doctis.ru',
    'domashniy.ru',
    'doverie-tv.ru',
    'dzen.ru',
    'e-katalog.ru',
    'eapteka.ru',
    'edadeal.ru',
    'edimdoma.ru',
    'edu.ru',
    'elibrary.ru',
    'f1news.ru',
    'fantlab.ru',
    'fedsfm.ru',
    'fighttime.ru',
    'filmpro.ru',
    'fipi.ru',
    'fips.ru',
    'fitseven.ru',
    'forumhouse.ru',
    'foxford.ru',
    'friday.ru',
    'fsb.ru',
    'fss.ru',
    'fssprus.ru',
    'garant.ru',
    'gaso.ru',
    'gismeteo.ru',
    'gks.ru',
    'gosfilmofond.ru',
    'goskatalog.ru',
    'habr.ru',
    'health-diet.ru',
    'hermitagemuseum.org',
    'hi-news.ru',
    'histrf.ru',
    'ilibrary.ru',
    'in-space.ru',
    'indicator.ru',
    'infourok.ru',
    'interneturok.ru',
    'invb.ru',
    'irecommend.ru',
    'is74.ru',
    'ivi.ru',
    'joomag.com',
    'jv.ru',
    'karcher.ru',
    'kartaslov.ru',
    'karusel-tv.ru',
    'khl.ru',
    'kinopoisk.ru',
    'knigogid.ru',
    'kodeks.ru',
    'kolesa.ru',
    'kommersant.ru',
    'kopilkaurokov.ru',
    'kp.ru',
    'kreml.ru',
    'lektorium.tv',
    'letidor.ru',
    'lib.ru',
	'linkgroup.ru',
    'litres.ru',
    'livejournal.com',
    'livelib.ru',
    'livesport.ru',
    'lizaalert.org',
    'm24.ru',
    'maam.ru',
    'magnit.ru',
    'mail.ru',
    'mariinsky.ru',
    'matchtv.ru',
    'med-otzyv.ru',
    'medi.ru',
    'mediametrics.ru',
    'medicalinsider.ru',
    'medihost.ru',
    'medikforum.ru',
    'medlinks.ru',
    'medportal.ru',
    'medside.ru',
    'megafon.ru',
    'mel.fm',
    'mirtesen.ru',
    'mirtv.ru',
    'mkala.ru',
    'mob-edu.ru',
    'moluch.ru',
    'moskb.ru',
    'mts.ru',
    'multiurok.ru',
    'mybook.ru',
    'myskills.ru',
    'naked-science.ru',
    'nat-geo.ru',
    'nauchniestati.ru',
    'netology.ru',
    'nevasport.ru',
    'nic.ru',
    'nkj.ru',
    'nplus1.ru',
    'nskbl.ru',
    'nsportal.ru',
    'ntv.ru',
    'nukadeti.ru',
    'obrazovaka.ru',
    'ohotniki.ru',
    'olimpiada.ru',
    'onlinedoctor.ru',
    'onlinetrade.ru',
    'oprf.ru',
    'otr-online.ru',
    'otzovik.com',
    'oum.ru',
    'ped-kopilka.ru',
    'pedsovet.org',
    'pervbank.ru',
    'pikabu.ru',
    'pochtabank.ru',
    'popmech.ru',
    'postupi.online',
    'povar.ru',
    'professionali.ru',
    'profi.ru',
    'proza.ru',
    'psbank.ru',
    'pypi.org',
    'radiomayak.ru',
    'radiorus.ru',
    'radiovesti.ru',
    'rbc.ru',
    'ren.tv',
    'rgo.ru',
    'ria.ru',
    'rlsnet.ru',
    'rosbank.ru',
    'rosreestr.ru',
    'rosuchebnik.ru',
    'rsl.ru',
    'rt.ru',
    'rulit.me',
    'rusarchives.ru',
    'rusmuseum.ru',
    'rusneb.ru',
    'russkiiyazyk.ru',
    'rustih.ru',
    'rutube.ru',
    'samlib.ru',
    'sdamgia.ru',
    'selfpub.ru',
    'shm.ru',
    'sirius.online',
    'skyeng.ru',
    'sledcom.ru',
    'sm-news.ru',
    'smi2.ru',
    'smotrim.ru',
    'soccer.ru',
    'sovcombank.ru',
    'sovsport.ru',
    'spastv.ru',
    'sport24.ru',
    'sportmail.ru',
    'sportrbc.ru',
    'sportsdaily.ru',
    'stihi.ru',
    'sudact.ru',
    'sudrf.ru',
    'tamtam.chat',
    'tatar-inform.ru',
    'tele2.ru',
    'teleprogramma.pro',
    'tiu.ru',
    'tnt-online.ru',
    'tretyakovgallery.ru',
    'trudvsem.ru',
    'tv3.ru',
    'tvc.ru',
    'tvkultura.ru',
    'tvzvezda.ru',
    'ucheba.ru',
    'uchi.ru',
    'uchportal.ru',
    'unicreditbank.ru',
    'ura.news',
    'uteka.ru',
    'utkonos.ru',
    'vbr.ru',
    'verumreactor.ru',
    'vesti.ru',
    'vgtrk.ru',
    'videouroki.net',
    'vitrina.tv',
    'vk.ru',
    'vkvideo.ru',
    'vm.ru',
    'vokrugsveta.ru',
    'vrachirf.ru',
    'vsrf.ru',
    'webinar.ru',
    'wi-fi.ru',
    'wikireading.ru',
    'woman.ru',
    'worldskills.ru',
    'xn--80aesfpebagmfblc0a.xn--p1ai',
    'xn--80afcdbalict6afooklqi5o.xn--p1ai',
    'xn--j1ahfl.xn--p1ai',
    'xn----7sbb5adknde1cb0dyd.xn--p1ai',
    'xn--2020-f4dsa7cb5cl7h.xn--p1ai',
    'yaklass.ru',
    'youdo.com',
    'youla.ru',
    'zakon.ru',
    'zdorovie.ru',
    'zdorovieinfo.ru',
    'znaika.ru',
    'zoon.ru'];
    const randomDomain = domains[Math.floor(Math.random() * domains.length)];

    const idInput = document.getElementById('id');
    if (idInput) {
        idInput.value = randomDomain;
    }

    // Автоматически перегенерируем конфиг, если блок результатов уже показан
    if (!document.getElementById('step3').classList.contains('hidden')) {
        generateConfig();
    }
}

// Случайно AWG 3.0
function randomizeAwg3() {
    const getRandomRange = (minLow, minHigh, maxLow, maxHigh) => {
        const min = Math.floor(Math.random() * (minHigh - minLow + 1)) + minLow;
        const max = Math.floor(Math.random() * (maxHigh - maxLow + 1)) + maxLow;
        return `${min}-${max}`;
    };

    const cpa = document.getElementById('cpaInput');
    const mha = document.getElementById('mhaInput');
    const kt = document.getElementById('ktInput');
    const rat = document.getElementById('ratInput');
    const rkat = document.getElementById('rkatInput');
    const rt = document.getElementById('rtInput');

    if (cpa) cpa.value = getRandomRange(5, 49, 50, 110);    
    if (mha) mha.value = getRandomRange(5, 24, 25, 40);      
    if (kt) kt.value = getRandomRange(5, 10, 11, 25);       
    if (rat) rat.value = getRandomRange(50, 99, 100, 200);  
    if (rkat) rkat.value = getRandomRange(50, 99, 100, 150); 
    if (rt) rt.value = getRandomRange(3, 9, 10, 15);           

    if (!document.getElementById('step3').classList.contains('hidden')) {
        generateConfig();
    }
}

// Подтверждение если нажата клавиша Enter без Shift
document.addEventListener('DOMContentLoaded', function() {

const textareas = document.querySelectorAll('.jc');
    
    textareas.forEach(textarea => {
        textarea.addEventListener('keydown', function(e) {       
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.blur();
            }
        });
    });
});

// Открытие modal
document.querySelector('.genbtn')?.addEventListener('click', function() {
    const modal = document.getElementById('Modal');
    if (modal) {
        modal.style.display = 'block';
    }
});

// Закрытие модального окна при клике на крестик
function closeModal() {
    const modal = document.getElementById('Modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Закрытие модального окна при клике вне его области
window.addEventListener('click', function(event) {
    const modal = document.getElementById('Modal');
    if (modal && event.target === modal) {
        modal.style.display = 'none';
    }
});

// Обработчик для кнопки подтверждения в модальном окне
const selectDomainBtn = document.getElementById('selectDomain');
if (selectDomainBtn) {
    selectDomainBtn.addEventListener('click', async function() {
    const domainInput = document.getElementById('domain');
    const domain = domainInput.value.trim();
    
    if (domain) {
        const i1 = await generateI1FromDomain(domain);
		document.getElementById('i1').value = i1;
        closeModal();
        generateConfig();
		
    } else {
        alert('Пожалуйста, введите домен');
    }
});
}

function toggleClashSettings() {
    const isClash = document.getElementById('clash')?.checked;
    
    const excludeLan = document.getElementById('switchOption4'); //[cite: 1]
    const persistentKeepalive = document.getElementById('switchOption5'); //[cite: 1]
    const keepaliveInput = document.getElementById('keepaliveInput'); //[cite: 1]

    const label4 = excludeLan?.closest('.switch-label');
    const label5 = persistentKeepalive?.closest('.switch-label');
    
    const track4 = label4?.querySelector('.switch-track');
    const track5 = label5?.querySelector('.switch-track');

    if (isClash) {
        if (excludeLan) {
            excludeLan.disabled = true;
            excludeLan.checked = false; //[cite: 1]
        }
        if (label4) label4.classList.add('opacity-50', 'cursor-not-allowed');
        if (track4) track4.classList.add('cursor-not-allowed');

        if (persistentKeepalive) {
            persistentKeepalive.disabled = true;
            persistentKeepalive.checked = false; //[cite: 1]
        }
        if (label5) label5.classList.add('opacity-50', 'cursor-not-allowed');
        if (track5) track5.classList.add('cursor-not-allowed');

        if (keepaliveInput) {
            keepaliveInput.disabled = true;
            keepaliveInput.classList.add('opacity-50', 'cursor-not-allowed');
        }
    } else {
        if (excludeLan) excludeLan.disabled = false;
        if (label4) label4.classList.remove('opacity-50', 'cursor-not-allowed');
        if (track4) track4.classList.remove('cursor-not-allowed');

        if (persistentKeepalive) persistentKeepalive.disabled = false;
        if (label5) label5.classList.remove('opacity-50', 'cursor-not-allowed');
        if (track5) track5.classList.remove('cursor-not-allowed');

        if (keepaliveInput) {
            keepaliveInput.disabled = false;
            keepaliveInput.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    }
}

// Привязываем обработчик к радиокнопкам выбора клиента и вызываем при загрузке[cite: 2]
document.querySelectorAll('input[name="option"]').forEach(radio => {
    radio.addEventListener('change', toggleClashSettings);
});

document.addEventListener('DOMContentLoaded', () => {
    toggleClashSettings();
});
