const arr = ['A.5.3', 'A.5.1', 'A.5.10', 'A.5.2.a', 'A.5.1.a', 'A.5.2'];
arr.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
console.log(arr);
