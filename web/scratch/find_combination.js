const weights = [2, 6, 4, 4, 1, 2, 2, 1]; // non-Fase-2 weights
// Fase 2 weights: 93 items of weight 0.43

const finalScores = [1.0, 0.4, 0.5, 0.2]; // Cumple with link, Cumple no link, Parcial with link, Parcial no link

// Let's find if any combination of single item score * weight equals roughly 0.49
// Or if multiple items sum to 0.49

const possibleSingleContributions = [];
// For non-Fase-2:
weights.forEach(w => {
    finalScores.forEach(fs => {
        const contrib = w * fs;
        possibleSingleContributions.push({ name: `Weight ${w} * FS ${fs}`, val: contrib });
    });
});
// For Fase-2 (weight 0.43):
finalScores.forEach(fs => {
    const contrib = 0.43 * fs;
    possibleSingleContributions.push({ name: `Weight 0.43 * FS ${fs}`, val: contrib });
});

possibleSingleContributions.forEach(item => {
    const score = (item.val / 61.99) * 100;
    if (score >= 0.75 && score <= 0.85) {
        console.log(`Single Item match: ${item.name} = ${item.val.toFixed(3)} (score = ${score.toFixed(3)}%)`);
    }
});

// Let's also check pairs:
for (let i = 0; i < possibleSingleContributions.length; i++) {
    for (let j = i; j < possibleSingleContributions.length; j++) {
        const sum = possibleSingleContributions[i].val + possibleSingleContributions[j].val;
        const score = (sum / 61.99) * 100;
        if (score >= 0.75 && score <= 0.85) {
            console.log(`Pair match: ${possibleSingleContributions[i].name} + ${possibleSingleContributions[j].name} = ${sum.toFixed(3)} (score = ${score.toFixed(3)}%)`);
        }
    }
}
