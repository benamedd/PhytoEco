// ==========================================
// 1. GLOBAL DATASETS & BASELINES
// ==========================================
let sampleData = {};

// Metrics global variables
let currentS = 0;
let currentH = 0;
let currentJ = 0;
let currentTrueDiv = 0;
let currentSimpsonDom = 0;
let currentGini = 0;
let currentBerger = 0;
let currentMargalef = 0;
let currentJaccard = 0;
let currentBray = 0;

let rankChart = null;

// DOM Elements
const speciesInput = document.getElementById('species-name');
const countInput = document.getElementById('species-count');
const addBtn = document.getElementById('add-btn');
const tableBody = document.querySelector('#sample-table tbody');
const exportBtn = document.getElementById('export-btn');

// ==========================================
// 2. EVENT LISTENERS & BASIC ACTIONS
// ==========================================
addBtn.addEventListener('click', () => {
    const name = speciesInput.value.trim();
    const count = parseInt(countInput.value);

    if (name && count > 0) {
        if (sampleData[name]) {
            sampleData[name] += count;
        } else {
            sampleData[name] = count;
        }
        speciesInput.value = '';
        countInput.value = '';
        updateUI();
        
        if (window.MathJax) {
            MathJax.typesetPromise();
        }
    }
});

function deleteSpecies(name) {
    delete sampleData[name];
    updateUI();
}

// ==========================================
// 3. CORE PROCESSING ENGINE (updateUI)
// ==========================================
function updateUI() {
    // Check if dataset is empty
    if (Object.keys(sampleData).length === 0) {
        resetOutputs();
        tableBody.innerHTML = '<tr><td colspan="3" style="text-align:center;">No data entered yet.</td></tr>';
        return;
    }

    // --- RENDER DATA TABLE ---
    tableBody.innerHTML = '';
    for (const [species, count] of Object.entries(sampleData)) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${species}</td>
            <td>${count}</td>
            <td><button class="delete-btn" onclick="deleteSpecies('${species}')" style="background:#c62828; color:white; border:none; padding:3px 8px; cursor:pointer; border-radius:3px;">Delete</button></td>
        `;
        tableBody.appendChild(row);
    }

    // --- PRE-CALCULATIONS ---
    const N = Object.values(sampleData).reduce((sum, val) => sum + val, 0);
    currentS = Object.keys(sampleData).length;

    // --- ALPHA DIVERSITY CALCULATIONS ---
    // 1. Species Richness (S)
    document.getElementById('calc-s').innerText = currentS;

    // 2. Margalef's Richness Index (d)
    currentMargalef = (N > 1 && currentS > 1) ? (currentS - 1) / Math.log(N) : 0;
    document.getElementById('calc-margalef').innerText = currentMargalef.toFixed(3);

    // 3. Shannon-Wiener Index (H' in nats) & Components
    currentH = 0;
    let sumPiSq = 0; // For Simpson
    let maxAbundance = 0; // For Berger-Parker

    for (const count of Object.values(sampleData)) {
        let p_i = count / N;
        currentH += p_i * Math.log(p_i);
        sumPiSq += p_i * p_i;
        if (count > maxAbundance) {
            maxAbundance = count;
        }
    }
    currentH = -currentH;
    document.getElementById('calc-h').innerText = currentH.toFixed(4);

    // 4. Shannon Equitability (J')
    currentJ = (currentS > 1) ? currentH / Math.log(currentS) : 0;
    document.getElementById('calc-j').innerText = (currentJ * 100).toFixed(1) + '%';

    // 5. True Diversity (1D)
    currentTrueDiv = Math.exp(currentH);
    document.getElementById('calc-true-div').innerText = currentTrueDiv.toFixed(1);

    // 6. Simpson Dominance (D) & Gini-Simpson Index (1-D)
    currentSimpsonDom = sumPiSq;
    currentGini = 1 - sumPiSq;
    document.getElementById('calc-simp-dom').innerText = (currentSimpsonDom * 100).toFixed(1) + '%';
    document.getElementById('calc-gini').innerText = (currentGini * 100).toFixed(1) + '%';

    // 7. Berger-Parker Dominance Index (d_BP)
    currentBerger = (N > 0) ? maxAbundance / N : 0;
    document.getElementById('calc-berger').innerText = (currentBerger * 100).toFixed(1) + '%';

    // --- BETA DIVERSITY CALCULATIONS (vs Dynamic Baseline Control) ---
    const sampleSpecies = Object.keys(sampleData);
    
    // Génération automatique d'une baseline virtuelle représentant une monoculture
    // stricte de l'espèce ultra-dominante capturée dans l'échantillon de terrain.
    let dynamicBaseline = {};
    if (sampleSpecies.length > 0) {
        const mainSpecies = Object.keys(sampleData).reduce((a, b) => sampleData[a] > sampleData[b] ? a : b);
        dynamicBaseline[mainSpecies] = N; // Niveaux standardisés sur la taille totale N de l'échantillon
    }
    const baselineSpecies = Object.keys(dynamicBaseline);
    
    // Jaccard Similarity Coefficient
    const intersection = sampleSpecies.filter(s => baselineSpecies.includes(s));
    const union = Array.from(new Set([...sampleSpecies, ...baselineSpecies]));
    currentJaccard = union.length > 0 ? intersection.length / union.length : 0;
    document.getElementById('calc-jaccard').innerText = (currentJaccard * 100).toFixed(1) + '%';

    // Bray-Curtis Dissimilarity
    let diffSum = 0;
    let totalSum = 0;
    for (const sp of union) {
        const countS = sampleData[sp] || 0;
        const countB = dynamicBaseline[sp] || 0;
        diffSum += Math.abs(countS - countB);
        totalSum += (countS + countB);
    }
    currentBray = totalSum > 0 ? diffSum / totalSum : 0;
    document.getElementById('calc-bray').innerText = currentBray.toFixed(3);

    // --- PURE ECOLOGICAL STRUCTURE DIAGNOSTIC ---
    const statusBox = document.getElementById('status-indicator');
    const statusText = document.getElementById('status-text');
    statusBox.className = "status-box"; 

    if (currentJ >= 0.75 && currentS >= 4) {
        statusBox.classList.add('status-good');
        statusText.innerText = "High Eco-Resilience: Balanced community structure. Strong niche differentiation and biological buffering. System is stable.";
    } else if (currentJ >= 0.45 && currentJ < 0.75) {
        statusBox.classList.add('status-warning');
        statusText.innerText = "Moderate Stress: Early signs of community simplification. An organism might be emerging as dominant. Monitor dynamic.";
    } else {
        statusBox.classList.add('status-danger');
        statusText.innerText = "Ecological Crisis: Severe dominance profile detected. Complete community simplification. High risk of crop vulnerability.";
    }

    // --- GRAPHICS: WHITTAKER PLOT ---
    const sortedAbundances = Object.values(sampleData).sort((a, b) => b - a);
    const ranks = sortedAbundances.map((_, index) => `Rank ${index + 1}`);

    if (rankChart) { rankChart.destroy(); }
    
    const ctx = document.getElementById('rankAbundanceChart').getContext('2d');
    rankChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ranks,
            datasets: [{
                label: 'Rank-Abundance Curve (Whittaker)',
                data: sortedAbundances,
                borderColor: '#2e7d32',
                backgroundColor: 'rgba(46, 125, 50, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, title: { display: true, text: 'Abundance (Individuals)' } },
                x: { title: { display: true, text: 'Community Rank' } }
            }
        }
    });
}

function resetOutputs() {
    currentS = 0; currentH = 0; currentJ = 0; currentTrueDiv = 0;
    currentSimpsonDom = 0; currentGini = 0; currentBerger = 0; currentMargalef = 0;
    currentJaccard = 0; currentBray = 0;

    document.getElementById('calc-s').innerText = '0';
    document.getElementById('calc-margalef').innerText = '0.000';
    document.getElementById('calc-h').innerText = '0.0000';
    document.getElementById('calc-j').innerText = '0.0%';
    document.getElementById('calc-true-div').innerText = '0.0';
    document.getElementById('calc-simp-dom').innerText = '0.0%';
    document.getElementById('calc-gini').innerText = '0.0%';
    document.getElementById('calc-berger').innerText = '0.0%';
    document.getElementById('calc-jaccard').innerText = '0.00%';
    document.getElementById('calc-bray').innerText = '0.000';
    document.getElementById('status-text').innerText = "No data recorded yet. Please add sample entries.";
    document.getElementById('status-indicator').className = "status-box status-neutral";
    if (rankChart) { rankChart.destroy(); }
}

// ==========================================
// 4. DATA-URI EXPORT REGULATION
// ==========================================
exportBtn.addEventListener('click', () => {
    if (Object.keys(sampleData).length === 0) return;
    
    let csvRows = [];
    csvRows.push("Parameter_or_Taxon,Value_or_Count");
    
    // Exporting All Calculated Ecological Indicators
    csvRows.push(`Species Richness (S),${currentS}`);
    csvRows.push(`Margalef Richness (d),${currentMargalef.toFixed(4)}`);
    csvRows.push(`Shannon Entropy (H' nat),${currentH.toFixed(4)}`);
    csvRows.push(`Shannon Equitability (J' %),${(currentJ * 100).toFixed(2)}%`);
    csvRows.push(`True Diversity (1D),${currentTrueDiv.toFixed(2)}`);
    csvRows.push(`Simpson Dominance (D %),${(currentSimpsonDom * 100).toFixed(2)}%`);
    csvRows.push(`Gini-Simpson Index (1-D %),${(currentGini * 100).toFixed(2)}%`);
    csvRows.push(`Berger-Parker Dominance (d_BP %),${(currentBerger * 100).toFixed(2)}%`);
    csvRows.push(`Jaccard Similarity %, ${(currentJaccard * 100).toFixed(2)}%`);
    csvRows.push(`Bray-Curtis Dissimilarity,${currentBray.toFixed(4)}`);
    
    csvRows.push(",");
    csvRows.push("RAW INVENTORIES (Input Data),");
    
    for (const [species, count] of Object.entries(sampleData)) {
        csvRows.push(`${species},${count}`);
    }
    
    const csvString = csvRows.join("\n");
    const csvContent = "data:text/csv;charset=utf-8,%EF%BB%BF" + encodeURIComponent(csvString);
    
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", "phytoeco_ecological_report.csv");
    document.body.appendChild(link);
    
    link.click();
    document.body.removeChild(link);
});
