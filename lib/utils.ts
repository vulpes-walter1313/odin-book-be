import db from "@/db/db";

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

export async function clearOldUserBans() {
  const now = new Date();
  try {
    const updatedUsersResult = await db.user.updateMany({
      where: {
        bannedUntil: {
          lte: now,
        },
      },
      data: {
        bannedUntil: null,
      },
    });
    console.log(`Unbanned ${updatedUsersResult.count} users.`);
  } catch (err) {
    console.error("Error unbanning users", err);
  }
}
