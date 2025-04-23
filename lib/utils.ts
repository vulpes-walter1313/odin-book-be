import { init } from "@paralleldrive/cuid2";

export function createIdBatchesForDeletion(
  idList: string[],
  numInBatch: number,
): string[][] {
  const imgIdBatches: string[][] = [];
  const loopTimes = Math.ceil(idList.length / numInBatch);
  for (let i = 0; i < loopTimes; i++) {
    const imgIdBatch: string[] = [];
    let round = 1;
    while (round <= numInBatch) {
      round++;
      const imgId = idList.pop();
      if (!imgId) break;
      imgIdBatch.push(imgId);
    }
    imgIdBatches.push(imgIdBatch);
  }
  return imgIdBatches;
}

export function generateRandomUsername() {
  const createId = init({
    length: 12,
  });
  return `momo_${createId()}`;
}
