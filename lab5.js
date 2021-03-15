const textract = require('textract');
const path = require('path');
const {promisify} = require('util');

const alphabet = 'АБВГҐДЕЄЖЗИІЇЙКЛМНОПРСТУФХЦЧШЩЬЮЯ';
const m = alphabet.length;
const a = 31; // m - 1 (67 - 1 = 66)
const b = 7;

function encode(data, a, b, m) {
  return encodeHalf(encodeHalf(data, a, b, m), a, b, m);
}

function encodeHalf(data, a, b, m) {
  let result = '';
  for (let symbol of data) {
    const x = getCodeByChar(symbol);
    let E;
    if (x === -1) {
      E = symbol;
    } else {
      E = (a * x + b) % m;
    }
    result += getCharByCode(E);
  }
  return result;
}

function decode(data, a1, b, m) {
  return decodeHalf(decodeHalf(data, a1, b, m), a1, b, m);
}

function decodeHalf(data, a1, b, m) {
  let result = '';
  for (let symbol of data) {
    const x = getCodeByChar(symbol);
    let E;
    if (x === -1) {
      E = symbol;
    } else {
      E = (a1 * (x + m - b)) % m;
    }
    result += getCharByCode(E);
  }
  return result;
}

function getCodeByChar(char) {
  return alphabet.indexOf(char);
}

function getCharByCode(code) {
  return alphabet[code];
}

function gcdExtended(a, b) {
  if (a === 0) {
    return [b, 0, 1];
  }
  [gcd, y, y1] = gcdExtended(b % a, a);
  let x = y1 - Math.floor(b / a) * y;
  return [gcd, x, y];
}

function crack(data, encoded, m) {
  const relativePrime = [];
  for (let i = 0; i < m; i++) {
    if ((gcdExtended(i, m)[1] % m + m) % m) {
      relativePrime.push(i);
    }
  }

  let keys = [];
  for (let a of relativePrime) {
    for (let b = 0; b < m; b++) {
      if (encode(data, a, b, m) === encoded) {
        keys.push([a, b]);
      }
    }
  }

  return keys;
}

function decorate(func, message) {
  return function () {
    let time = process.hrtime();
    const startTime = time[0] * 1000 + time[1] / 1000000;
    const result = func.apply(this, arguments);
    time = process.hrtime();
    const endTime = time[0] * 1000 + time[1] / 1000000;
    const diff = endTime - startTime;
    console.log(message, diff > 100 ? Math.floor(diff) : diff, 'ms');
    return result;
  }
}

function processData(data) {
  let a1 = gcdExtended(a, m)[1];
  a1 = (a1 % m + m) % m;

  const encoded = decorate(encode, 'Encoding time:')(data, a, b, m);
// console.log('Encoded:', encoded);

  const decoded = decorate(decode, 'Decoding time:')(encoded, a1, b, m);
// console.log('Decoded', decoded);

  const keys = decorate(crack, 'Cracking time:')(data, encoded, m);
  let i = 0;
  for (let [keyA, keyB] of keys) {
    console.log('Cracked key #' + ++i, '- a:', keyA, 'b:', keyB);
  }
}

function readFile(fileName) {
  return promisify(textract.fromFileWithPath)(path.join(process.cwd(), fileName));
}

function generateRandomText(len) {
  let result = '';
  for (let i = 0; i < len; i++) {
    result += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return result;
}

(async function () {
  try {
    for (let fileName of ['test1.docx', 'test2.docx', 'test3']) {
      let data;
      if (fileName === 'test3') {
        data = generateRandomText(100000);
      } else {
        data = await readFile(fileName);
      }
      data = data.toUpperCase();
      console.log('-'.repeat(50));
      console.log('Data length:', data.length);
      processData(data);
      console.log('-'.repeat(50));
    }
  } catch (e) {
    console.error(e);
  }
})();
