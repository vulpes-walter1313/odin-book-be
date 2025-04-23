import db from "@/db/db";

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
