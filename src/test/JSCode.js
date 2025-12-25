export let count = 0;
export function test(a) {
 return a + count;
}

function sortArray(arr) {
  for(let i=0; i<arr.length; i++) {
    for(let j=0; j<i; j++) {
      if (arr[i] < arr[j]) {
        [arr[i], arr[j]] = [arr[j], arr[i]]
      }
    }
  }
  return arr;
}

console.log(sortArray([1,3,2,5,4]));