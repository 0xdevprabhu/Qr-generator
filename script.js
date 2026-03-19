/** * Core Application Logic (Lego Block: QR Engine)
 * Modular components using vanilla JS. No logic altered.
 */

// State Management
let qrCode;
let logoBase64 = null;
let updateTimeout;
let bulkBlobs = []; 

// DOM Elements
const DOM = {
    tabs: { single: document.getElementById('tabSingle'), bulk: document.getElementById('tabBulk') },
    sections: { single: document.getElementById('sectionSingle'), bulk: document.getElementById('sectionBulk'), bulkRes: document.getElementById('sectionBulkResults') },
    actions: { single: document.getElementById('actionsSingle') },
    qrType: document.getElementById('qrType'),
    inputGroups: document.querySelectorAll('.input-group'),
    preview: document.getElementById('qrPreview'),
    inputs: {
        url: document.getElementById('valUrl'), text: document.getElementById('valText'),
        wifiSsid: document.getElementById('valWifiSsid'), wifiPass: document.getElementById('valWifiPass'), wifiEnc: document.getElementById('valWifiEnc'), wifiHidden: document.getElementById('valWifiHidden'),
        vcName: document.getElementById('valVcardName'), vcPhone: document.getElementById('valVcardPhone'), vcEmail: document.getElementById('valVcardEmail'), vcComp: document.getElementById('valVcardCompany'), vcAddr: document.getElementById('valVcardAddress'),
        emTo: document.getElementById('valEmailTo'), emSub: document.getElementById('valEmailSub'), emBody: document.getElementById('valEmailBody'),
        phone: document.getElementById('valPhone'),
        smsPhone: document.getElementById('valSmsPhone'), smsMsg: document.getElementById('valSmsMsg'),
        geoLat: document.getElementById('valGeoLat'), geoLng: document.getElementById('valGeoLng'),
        bulk: document.getElementById('valBulk')
    },
    opts: {
        colorDark: document.getElementById('optColorDark'), colorDarkText: document.getElementById('optColorDarkText'),
        colorLight: document.getElementById('optColorLight'), colorLightText: document.getElementById('optColorLightText'),
        gradEnable: document.getElementById('optGradEnable'), gradType: document.getElementById('optGradType'), grad1: document.getElementById('optGrad1'), grad2: document.getElementById('optGrad2'), gradControls: document.getElementById('gradControls'),
        dots: document.getElementById('optDots'), cornerSq: document.getElementById('optCornerSquare'), cornerDt: document.getElementById('optCornerDot'),
        errLvl: document.getElementById('optErrorLevel'), size: document.getElementById('optSize'), sizeLbl: document.getElementById('lblSize'),
        logoFile: document.getElementById('optLogoFile'), logoMargin: document.getElementById('optLogoMargin'), logoScale: document.getElementById('optLogoScale'), clearLogo: document.getElementById('btnClearLogo')
    }
};

// Initialize Application
function initApp() {
    setupEventListeners();
    loadState();
    initQR();
}

// Setup Event Listeners
function setupEventListeners() {
    DOM.tabs.single.addEventListener('click', () => switchMode('single'));
    DOM.tabs.bulk.addEventListener('click', () => switchMode('bulk'));

    DOM.qrType.addEventListener('change', (e) => {
        DOM.inputGroups.forEach(g => {
            g.classList.add('hidden');
            g.classList.remove('block');
        });
        const activeGroup = document.getElementById(`group-${e.target.value}`);
        activeGroup.classList.remove('hidden');
        activeGroup.classList.add('block');
        triggerGenerate();
    });

    Object.values(DOM.inputs).forEach(input => {
        if (input) input.addEventListener('input', triggerGenerate);
    });

    const styleInputs = [DOM.opts.colorDark, DOM.opts.colorLight, DOM.opts.gradType, DOM.opts.grad1, DOM.opts.grad2, DOM.opts.dots, DOM.opts.cornerSq, DOM.opts.cornerDt, DOM.opts.errLvl, DOM.opts.size, DOM.opts.logoMargin, DOM.opts.logoScale];
    styleInputs.forEach(input => input.addEventListener('input', triggerGenerate));

    DOM.opts.colorDark.addEventListener('input', (e) => DOM.opts.colorDarkText.value = e.target.value);
    DOM.opts.colorDarkText.addEventListener('input', (e) => { DOM.opts.colorDark.value = e.target.value; triggerGenerate(); });
    DOM.opts.colorLight.addEventListener('input', (e) => DOM.opts.colorLightText.value = e.target.value);
    DOM.opts.colorLightText.addEventListener('input', (e) => { DOM.opts.colorLight.value = e.target.value; triggerGenerate(); });

    DOM.opts.gradEnable.addEventListener('change', (e) => {
        if (e.target.checked) {
            DOM.opts.gradControls.classList.remove('hidden');
            setTimeout(() => DOM.opts.gradControls.classList.add('active'), 10);
        } else {
            DOM.opts.gradControls.classList.remove('active');
            setTimeout(() => DOM.opts.gradControls.classList.add('hidden'), 300);
        }
        triggerGenerate();
    });

    DOM.opts.size.addEventListener('input', (e) => DOM.opts.sizeLbl.textContent = e.target.value);

    DOM.opts.logoFile.addEventListener('change', handleLogoUpload);
    DOM.opts.clearLogo.addEventListener('click', () => {
        logoBase64 = null;
        DOM.opts.clearLogo.classList.add('hidden');
        DOM.opts.logoFile.value = '';
        triggerGenerate();
    });

    document.getElementById('toggleStyle').addEventListener('click', () => {
        const content = document.getElementById('styleContent');
        const icon = document.getElementById('styleIcon');
        content.classList.toggle('hidden');
        icon.classList.toggle('rotate-180');
    });

    document.getElementById('btnDlPng').addEventListener('click', () => downloadSingle('png'));
    document.getElementById('btnDlSvg').addEventListener('click', () => downloadSingle('svg'));
    document.getElementById('btnCopy').addEventListener('click', copyToClipboard);
    document.getElementById('btnReset').addEventListener('click', resetAll);
    document.getElementById('btnGenerateBulk').addEventListener('click', generateBulk);
    document.getElementById('btnDlZip').addEventListener('click', downloadZip);
}

function initQR() {
    qrCode = new QRCodeStyling(getQROptions());
    qrCode.append(DOM.preview);
    generateQR();
}

function getQROptions(customData = null) {
    const size = parseInt(DOM.opts.size.value);
    const data = customData !== null ? customData : getActiveDataString();

    let options = {
        width: size, height: size,
        data: data || 'https://example.com',
        margin: 10,
        qrOptions: { errorCorrectionLevel: DOM.opts.errLvl.value },
        imageOptions: { hideBackgroundDots: true, imageSize: DOM.opts.logoScale.value / 100, margin: parseInt(DOM.opts.logoMargin.value) },
        dotsOptions: { type: DOM.opts.dots.value },
        backgroundOptions: { color: DOM.opts.colorLight.value },
        cornersSquareOptions: { type: DOM.opts.cornerSq.value },
        cornersDotOptions: { type: DOM.opts.cornerDt.value }
    };

    if (DOM.opts.gradEnable.checked) {
        options.dotsOptions.gradient = {
            type: DOM.opts.gradType.value,
            colorStops: [{ offset: 0, color: DOM.opts.grad1.value }, { offset: 1, color: DOM.opts.grad2.value }]
        };
    } else {
        options.dotsOptions.color = DOM.opts.colorDark.value;
        options.cornersSquareOptions.color = DOM.opts.colorDark.value;
        options.cornersDotOptions.color = DOM.opts.colorDark.value;
    }

    if (logoBase64) options.image = logoBase64;
    return options;
}

function getActiveDataString() {
    const type = DOM.qrType.value;
    let str = '';
    switch (type) {
        case 'url':
            str = DOM.inputs.url.value || 'https://example.com';
            if (!/^https?:\/\//i.test(str)) str = 'https://' + str;
            break;
        case 'text': str = DOM.inputs.text.value || 'Hello World'; break;
        case 'wifi':
            str = `WIFI:T:${DOM.inputs.wifiEnc.value};S:${DOM.inputs.wifiSsid.value};P:${DOM.inputs.wifiPass.value};H:${DOM.inputs.wifiHidden.checked ? 'true' : 'false'};;`;
            break;
        case 'vcard':
            str = `BEGIN:VCARD\nVERSION:3.0\nN:${DOM.inputs.vcName.value}\nTEL:${DOM.inputs.vcPhone.value}\nEMAIL:${DOM.inputs.vcEmail.value}\nORG:${DOM.inputs.vcComp.value}\nADR:;;${DOM.inputs.vcAddr.value}\nEND:VCARD`;
            break;
        case 'email': str = `mailto:${DOM.inputs.emTo.value}?subject=${encodeURIComponent(DOM.inputs.emSub.value)}&body=${encodeURIComponent(DOM.inputs.emBody.value)}`; break;
        case 'phone': str = `tel:${DOM.inputs.phone.value}`; break;
        case 'sms': str = `smsto:${DOM.inputs.smsPhone.value}:${DOM.inputs.smsMsg.value}`; break;
        case 'geo': str = `geo:${DOM.inputs.geoLat.value},${DOM.inputs.geoLng.value}`; break;
    }
    return str;
}

function triggerGenerate() {
    clearTimeout(updateTimeout);
    updateTimeout = setTimeout(() => { generateQR(); saveState(); }, 200);
}

function generateQR() {
    if (!qrCode) return;
    qrCode.update(getQROptions());
}

function handleLogoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        logoBase64 = event.target.result;
        DOM.opts.clearLogo.classList.remove('hidden');
        triggerGenerate();
    };
    reader.readAsDataURL(file);
}

function switchMode(mode) {
    if (mode === 'single') {
        DOM.tabs.single.classList.add('active'); DOM.tabs.bulk.classList.remove('active');
        DOM.sections.single.classList.remove('hidden'); DOM.sections.bulk.classList.add('hidden');
        DOM.actions.single.classList.remove('hidden'); DOM.sections.bulkRes.classList.add('hidden');
    } else {
        DOM.tabs.bulk.classList.add('active'); DOM.tabs.single.classList.remove('active');
        DOM.sections.bulk.classList.remove('hidden'); DOM.sections.single.classList.add('hidden');
        DOM.actions.single.classList.add('hidden');
        if (bulkBlobs.length > 0) DOM.sections.bulkRes.classList.remove('hidden');
    }
}

function downloadSingle(ext) {
    qrCode.download({ name: `qr-${DOM.qrType.value}-${Date.now()}`, extension: ext });
    showToast(`Downloaded ${ext.toUpperCase()} successfully!`);
}

async function copyToClipboard() {
    try {
        const blob = await qrCode.getRawData('png');
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        showToast("QR Code copied to clipboard!");
    } catch (err) { showToast("Copy failed. Ensure site is HTTPS."); }
}

async function generateBulk() {
    const lines = DOM.inputs.bulk.value.split('\n').map(l => l.trim()).filter(l => l !== '');
    if (lines.length === 0) return showToast("Please enter data for bulk generation.");
    if (lines.length > 100) return showToast("Max 100 lines at a time to prevent browser freeze.");

    document.getElementById('bulkSpinner').classList.remove('hidden');
    const grid = document.getElementById('bulkGrid');
    grid.innerHTML = '';
    bulkBlobs = [];
    DOM.sections.bulkRes.classList.remove('hidden');
    document.getElementById('bulkCount').textContent = lines.length;

    for (let i = 0; i < lines.length; i++) {
        const data = lines[i];
        const tempQr = new QRCodeStyling(getQROptions(data));
        const blob = await tempQr.getRawData('png');
        bulkBlobs.push({ name: `qr-${i + 1}.png`, blob: blob });

        const card = document.createElement('div');
        card.className = "bulk-card";
        const previewContainer = document.createElement('div');
        
        const smallOpts = getQROptions(data);
        smallOpts.width = 120; smallOpts.height = 120;
        new QRCodeStyling(smallOpts).append(previewContainer);

        const label = document.createElement('p');
        label.title = data;
        label.textContent = data;
        
        card.appendChild(previewContainer);
        card.appendChild(label);
        grid.appendChild(card);
    }
    document.getElementById('bulkSpinner').classList.add('hidden');
    showToast(`Generated ${lines.length} QR codes!`);
}

async function downloadZip() {
    if (bulkBlobs.length === 0) return;
    const zip = new JSZip();
    const folder = zip.folder("QR_Magic_Exports");
    bulkBlobs.forEach(item => folder.file(item.name, item.blob));
    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url; a.download = `QR_Magic_Bulk_${Date.now()}.zip`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    showToast("ZIP downloaded successfully!");
}

function saveState() {
    localStorage.setItem('qrMagicState', JSON.stringify({
        type: DOM.qrType.value,
        opts: {
            colorDark: DOM.opts.colorDark.value, colorLight: DOM.opts.colorLight.value,
            gradEnable: DOM.opts.gradEnable.checked, gradType: DOM.opts.gradType.value, grad1: DOM.opts.grad1.value, grad2: DOM.opts.grad2.value,
            dots: DOM.opts.dots.value, cornerSq: DOM.opts.cornerSq.value, cornerDt: DOM.opts.cornerDt.value,
            errLvl: DOM.opts.errLvl.value, size: DOM.opts.size.value, logoMargin: DOM.opts.logoMargin.value, logoScale: DOM.opts.logoScale.value
        }
    }));
}

function loadState() {
    try {
        const saved = JSON.parse(localStorage.getItem('qrMagicState'));
        if (!saved) return;
        DOM.qrType.value = saved.type || 'url';
        DOM.qrType.dispatchEvent(new Event('change'));
        if (saved.opts) {
            DOM.opts.colorDark.value = saved.opts.colorDark || '#000000'; DOM.opts.colorDarkText.value = DOM.opts.colorDark.value;
            DOM.opts.colorLight.value = saved.opts.colorLight || '#ffffff'; DOM.opts.colorLightText.value = DOM.opts.colorLight.value;
            DOM.opts.gradEnable.checked = saved.opts.gradEnable || false; DOM.opts.gradEnable.dispatchEvent(new Event('change'));
            DOM.opts.gradType.value = saved.opts.gradType || 'linear'; DOM.opts.grad1.value = saved.opts.grad1 || '#4f46e5'; DOM.opts.grad2.value = saved.opts.grad2 || '#9333ea';
            DOM.opts.dots.value = saved.opts.dots || 'square'; DOM.opts.cornerSq.value = saved.opts.cornerSq || 'square'; DOM.opts.cornerDt.value = saved.opts.cornerDt || 'square';
            DOM.opts.errLvl.value = saved.opts.errLvl || 'Q'; DOM.opts.size.value = saved.opts.size || '400'; DOM.opts.sizeLbl.textContent = DOM.opts.size.value;
            DOM.opts.logoMargin.value = saved.opts.logoMargin || '5'; DOM.opts.logoScale.value = saved.opts.logoScale || '40';
        }
    } catch (e) { console.error("Could not load state", e); }
}

function resetAll() {
    if (confirm("Are you sure you want to reset all designs and data?")) {
        localStorage.removeItem('qrMagicState'); location.reload();
    }
}

function showToast(msg) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<svg width="20" height="20" fill="none" stroke="#4ade80" viewBox="0 0 24 24" style="margin-right:8px; vertical-align:middle;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>${msg}`;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 3000);
}

window.addEventListener('DOMContentLoaded', initApp);